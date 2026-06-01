/**
 * Cloud Run HTTP entrypoint.
 *
 * Two real endpoints + a health probe:
 *
 *   GET  /healthz       → 200 if process is alive (Cloud Run startup probe)
 *   POST /scrape        → batch-scrape (auth required)
 *
 * Auth: shared secret in `Authorization: Bearer <token>`. The token is
 * configured via the SCRAPER_SHARED_SECRET env var (set as a Cloud Run
 * secret reference at deploy time) and the matching value lives in
 * Firebase functions:config `scraper.secret`.
 *
 * Concurrency model: Cloud Run runs one container instance per VM and
 * we set max instances = 1 (scraping is once-a-day, no need to scale).
 * Inside a single instance, requests are serialised at the browser level
 * via `BATCH_LOCK`, but each batch internally uses 5-8 concurrent fetches.
 */

import express, { Request, Response } from "express";
import { shutdown } from "./browser";
import { scrapeStockXBatch } from "./stockx";
import { scrapeGoatBatch } from "./goat";
import { ScrapeRequest, ScrapeResponse, SiteId } from "./types";

const PORT = Number(process.env.PORT) || 8080;
const SHARED_SECRET = process.env.SCRAPER_SHARED_SECRET || "";

if (!SHARED_SECRET) {
  console.warn(
    "[server] SCRAPER_SHARED_SECRET not set — all /scrape requests will be rejected"
  );
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Avoid running two scrape batches in parallel inside the same container.
// We only have one Chromium and one warm context per call, but multiple
// concurrent batches would compete for memory.
let BATCH_LOCK: Promise<void> = Promise.resolve();

function authOK(req: Request): boolean {
  if (!SHARED_SECRET) return false;
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return false;
  return h.slice(7).trim() === SHARED_SECRET;
}

app.post("/scrape", async (req: Request, res: Response) => {
  if (!authOK(req)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const body = req.body as Partial<ScrapeRequest>;
  const site = body.site as SiteId | undefined;
  const entries = body.entries;

  if (!site || (site !== "stockx" && site !== "goat")) {
    res.status(400).json({ ok: false, error: "site must be 'stockx' or 'goat'" });
    return;
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ ok: false, error: "entries must be a non-empty array" });
    return;
  }
  if (entries.length > 500) {
    res.status(400).json({ ok: false, error: "max 500 entries per batch" });
    return;
  }
  for (const e of entries) {
    if (!e || typeof e.url !== "string" || typeof e.sku !== "string") {
      res
        .status(400)
        .json({ ok: false, error: "each entry must have { url: string, sku: string }" });
      return;
    }
  }

  const t0 = Date.now();
  console.log(
    `[server] /scrape site=${site} entries=${entries.length} — queuing…`
  );

  // Serialise batches per-instance.
  let release: () => void = () => {};
  const myTurn = new Promise<void>((r) => (release = r));
  const prev = BATCH_LOCK;
  BATCH_LOCK = myTurn;

  try {
    await prev;
    console.log(`[server] /scrape site=${site} — running`);
    const results =
      site === "stockx"
        ? await scrapeStockXBatch(entries)
        : await scrapeGoatBatch(entries);

    const totalDurationMs = Date.now() - t0;
    const successes = results.filter((r) => r.success).length;
    const totalListings = results.reduce((s, r) => s + r.listings.length, 0);
    console.log(
      `[server] /scrape site=${site} done — ${successes}/${results.length} ok, ` +
        `${totalListings} listings, ${totalDurationMs}ms`
    );

    const resp: ScrapeResponse = {
      site,
      totalDurationMs,
      ok: true,
      results,
    };
    res.status(200).json(resp);
  } catch (err: any) {
    console.error(`[server] /scrape site=${site} threw:`, err);
    res.status(500).json({
      ok: false,
      error: err?.message || "internal error",
    });
  } finally {
    release();
  }
});

const server = app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});

// Cloud Run sends SIGTERM with a 10s grace period before SIGKILL.
async function gracefulExit(signal: string): Promise<void> {
  console.log(`[server] ${signal} received — shutting down`);
  server.close();
  await shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => void gracefulExit("SIGTERM"));
process.on("SIGINT", () => void gracefulExit("SIGINT"));
