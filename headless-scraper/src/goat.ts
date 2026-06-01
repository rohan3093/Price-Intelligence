/**
 * GOAT scraper — fires the existing GOAT REST API from inside a warm
 * Playwright browser context.
 *
 * Same rationale as stockx.ts: GOAT's /api/v1/* endpoints went behind
 * Cloudflare's strict bot tier on 2026-04-23 and now return 403 +
 * cf-mitigated=challenge for any non-browser TLS handshake (see
 * scrape_runs from 2026-04-24 onward).
 *
 * Flow per product (matches the original scraper byte-for-byte):
 *   1. GET /api/v1/product_templates/{slug}
 *      → template metadata (id, name, sku, image, gender)
 *   2. GET /api/v1/product_variants?productTemplateId={id}
 *      → every size variant with lowestPriceCents
 *
 * We fire both calls from inside a `page.evaluate()` so they go out
 * through Chromium's TLS stack with the Cloudflare clearance cookies
 * the page got on warmup.
 */

import type { BrowserContext, Page } from "playwright";
import { newContext } from "./browser";
import { Semaphore } from "./semaphore";
import { ScrapedListing, ScrapeRequestEntry, ScrapeResultEntry } from "./types";

// Fallback if the batch is empty. In practice we warm up on the FIRST
// entry's URL — see scrapeGoatBatch below for the rationale.
const GOAT_WARMUP_FALLBACK_URL =
  "https://www.goat.com/sneakers/air-jordan-1-low-alternate-royal-toe-553558-140";

interface GoatProductTemplate {
  id: number;
  name: string;
  slug: string;
  sku: string;
  mainPictureUrl?: string;
  pictureUrl?: string;
  productTemplateExternalPictures?: Array<{ mainPictureUrl?: string }>;
  sizeUnit?: string;
  gender?: string[];
  singleGender?: string;
}

interface GoatVariant {
  size: number;
  sizeOption: { value: string; presentation: string };
  shoeCondition: string;
  boxCondition: string;
  lowestPriceCents: {
    currency: string;
    amount: number;
    amountUsdCents: number;
  };
  instantShipLowestPriceCents?: { currency: string; amount?: number };
  lastSoldPriceCents?: { currency: string; amount?: number } | null;
  stockStatus?: string | null;
}

// ── Slug extraction (matches existing functions/src code) ────────────

function extractSlug(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 3) return slug;
  } catch {
    /* */
  }
  return null;
}

// ── US → UK conversion (matches existing functions/src code) ─────────

function usToUkSize(usSize: number, gender?: string): string {
  const offset = gender === "women" ? 2 : 1;
  const ukSize = usSize - offset;
  if (ukSize <= 0 || ukSize > 20) return "";
  return `UK ${ukSize % 1 === 0 ? ukSize.toFixed(0) : ukSize.toFixed(1)}`;
}

// ── In-browser fetch helper ──────────────────────────────────────────

async function fetchInBrowser(page: Page, url: string): Promise<any> {
  const result = await page.evaluate(async (u) => {
    const res = await fetch(u, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    const text = await res.text();
    return { status: res.status, body: text };
  }, url);

  if (result.status !== 200) {
    throw new Error(`HTTP ${result.status}`);
  }
  try {
    return JSON.parse(result.body);
  } catch {
    throw new Error("non-JSON response");
  }
}

// ── Per-entry scrape ─────────────────────────────────────────────────

async function scrapeOne(
  page: Page,
  entry: ScrapeRequestEntry
): Promise<ScrapeResultEntry> {
  const t0 = Date.now();
  const slug = extractSlug(entry.url);
  if (!slug) {
    return {
      url: entry.url,
      success: false,
      listings: [],
      error: "could not extract slug",
      durationMs: Date.now() - t0,
    };
  }

  try {
    const template: GoatProductTemplate | null = await fetchInBrowser(
      page,
      `https://www.goat.com/api/v1/product_templates/${slug}`
    );
    if (!template || !template.id) {
      return {
        url: entry.url,
        success: false,
        listings: [],
        error: "no template",
        durationMs: Date.now() - t0,
      };
    }

    const variants: GoatVariant[] = await fetchInBrowser(
      page,
      `https://www.goat.com/api/v1/product_variants?productTemplateId=${template.id}`
    );
    if (!Array.isArray(variants) || variants.length === 0) {
      return {
        url: entry.url,
        success: false,
        listings: [],
        error: "no variants",
        durationMs: Date.now() - t0,
      };
    }

    const image =
      template.mainPictureUrl ||
      template.pictureUrl ||
      template.productTemplateExternalPictures?.[0]?.mainPictureUrl ||
      undefined;
    const gender = template.singleGender || "men";
    const pageUrl = `https://www.goat.com/sneakers/${slug}`;

    // Same per-size condition-tier selection as the legacy scraper:
    //   tier 0 — new_no_defects + good_condition (deadstock)
    //   tier 1 — new_no_defects + any other box
    //   tier 2 — new_with_defects
    //   skip   — anything `used*`
    const byUkSize = new Map<
      string,
      { price: number; usSize: number; tier: number }
    >();

    for (const v of variants) {
      if (!v.shoeCondition || !v.shoeCondition.startsWith("new")) continue;
      if (!v.lowestPriceCents || v.lowestPriceCents.amount <= 0) continue;

      const ukSize = usToUkSize(v.size, gender);
      if (!ukSize) continue;

      const priceUsd = Math.round(v.lowestPriceCents.amount / 100);
      if (priceUsd <= 0) continue;

      let tier = 2;
      if (
        v.shoeCondition === "new_no_defects" &&
        v.boxCondition === "good_condition"
      ) {
        tier = 0;
      } else if (v.shoeCondition === "new_no_defects") {
        tier = 1;
      }

      const existing = byUkSize.get(ukSize);
      if (
        !existing ||
        tier < existing.tier ||
        (tier === existing.tier && priceUsd < existing.price)
      ) {
        byUkSize.set(ukSize, { price: priceUsd, usSize: v.size, tier });
      }
    }

    const listings: ScrapedListing[] = [];
    for (const [ukSize, data] of byUkSize) {
      listings.push({
        sku: entry.sku,
        name: template.name,
        size: ukSize,
        price: data.price,
        listingCount: 1,
        url: pageUrl,
        condition: "new",
        sellerName: "GOAT",
        image,
        platformVariantId: `goat-${template.id}-${data.usSize}`,
        inStock: true,
      });
    }

    return {
      url: entry.url,
      success: true,
      listings,
      durationMs: Date.now() - t0,
    };
  } catch (err: any) {
    return {
      url: entry.url,
      success: false,
      listings: [],
      error: err?.message || "unknown",
      durationMs: Date.now() - t0,
    };
  }
}

// ── Public batch entry point ─────────────────────────────────────────

// Lower than StockX: each GOAT entry fires 2 API calls; we don't want to
// burst Cloudflare's per-page rate limiter (which sometimes blocks even
// authenticated browser sessions if traffic looks bot-like).
const GOAT_CONCURRENCY = 5;

export async function scrapeGoatBatch(
  entries: ScrapeRequestEntry[]
): Promise<ScrapeResultEntry[]> {
  let ctx: BrowserContext | null = null;
  let warmupPage: Page | null = null;
  try {
    ctx = await newContext();
    warmupPage = await ctx.newPage();
    // Cloudflare on goat.com only issues `cf_clearance` (and __cf_bm) when
    // the JS challenge fires on a non-trivial page. The homepage at
    // goat.com/ doesn't trigger it — but a /sneakers/{slug} product page
    // always does. Without that cookie, all subsequent /api/v1/* calls
    // return 403 cf-mitigated=challenge (verified 2026-05-12).
    const warmupUrl = entries[0]?.url || GOAT_WARMUP_FALLBACK_URL;
    const warmStart = Date.now();
    await warmupPage.goto(warmupUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    // A short additional wait gives Cloudflare's challenge script time to
    // run and set the clearance cookie before we start firing API calls.
    await warmupPage.waitForTimeout(2500);
    console.log(`[goat] warmup loaded ${warmupUrl} in ${Date.now() - warmStart}ms`);

    const sem = new Semaphore(GOAT_CONCURRENCY);
    const tasks = entries.map((e) =>
      sem.run(() => scrapeOne(warmupPage as Page, e))
    );
    return await Promise.all(tasks);
  } finally {
    if (warmupPage) {
      try {
        await warmupPage.close();
      } catch {
        /* */
      }
    }
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        /* */
      }
    }
  }
}
