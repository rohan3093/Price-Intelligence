/**
 * StockX scraper — page-navigation + response-interception strategy.
 *
 * Why this shape (and not the in-browser `gateway.stockx.com` fetch the
 * old scraper used):
 *
 *   1. `gateway.stockx.com` is a different host from `stockx.com`. A
 *      browser-context fetch from a stockx.com page is cross-origin and
 *      triggers a CORS preflight (because of custom `apollographql-*`
 *      headers). Cloudflare's bot tier on `gateway.stockx.com` blocks
 *      that preflight, even with a real Chromium handshake and valid
 *      cf_clearance cookies (verified 2026-05-12).
 *
 *   2. The StockX web app itself uses a SAME-ORIGIN proxy at
 *      `stockx.com/api/graphql`. But even hitting THAT directly with our
 *      own fetch returns 403 — Cloudflare appears to check additional
 *      signals beyond TLS + cookies (likely a CSRF/anti-forgery header
 *      that React injects).
 *
 *   3. What does work: let the StockX product page do its own GraphQL
 *      calls during normal load. Those calls succeed (real React app,
 *      real headers, real cookies, real timing). We intercept the
 *      `GetMarketData` response for bid/ask data, and read sizes from
 *      `__NEXT_DATA__` which is server-side embedded in every product
 *      page.
 *
 * Output is byte-identical to what the old scraper produced through
 * 2026-04-29 (the last day it worked).
 */

import type { BrowserContext } from "playwright";
import { newContext } from "./browser";
import { Semaphore } from "./semaphore";
import { ScrapedListing, ScrapeRequestEntry, ScrapeResultEntry } from "./types";

const STOCKX_BASE = "https://stockx.com";
const GRAPHQL_PATH = "/api/graphql";
const NAV_TIMEOUT_MS = 35000;
const MARKET_WAIT_MS = 12000;

// 5 concurrent product pages per browser instance. Cloud Run with 2 GB
// RAM comfortably handles this; going higher risks OOM on Chromium.
const STOCKX_CONCURRENCY = 5;

// ── Types (subset of StockX's GraphQL responses) ─────────────────────

interface SXSizeChartOption {
  size: string;
  type: string;
}

interface SXVariantWithSize {
  id: string;
  sizeChart?: {
    baseSize?: string;
    displayOptions?: SXSizeChartOption[];
  };
}

interface SXVariantWithMarket {
  id: string;
  market?: {
    state?: {
      lowestAsk?: { amount?: number } | null;
      numberOfAsks?: number;
    };
  };
}

interface SXProductFromNextData {
  title: string;
  urlKey: string;
  media?: { imageUrl?: string; smallImageUrl?: string };
  variants: SXVariantWithSize[];
}

interface SXMarketDataResponse {
  data?: {
    product?: {
      variants?: SXVariantWithMarket[];
    };
  };
}

// ── Slug extraction ──────────────────────────────────────────────────

function extractSlug(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 3 && !slug.includes(".")) return slug;
  } catch {
    /* */
  }
  return null;
}

// ── UK size normalisation (ported 1:1 from legacy scraper) ───────────

function extractUkSize(
  displayOptions: SXSizeChartOption[],
  baseSize?: string
): string {
  const ukOpt = displayOptions.find((o) => o.type === "uk");
  if (ukOpt) {
    let size = ukOpt.size.trim();
    size = size.replace(/\s*\(EU\s*\d+(?:\.\d+)?\)/, "").trim();
    if (!size.startsWith("UK ")) size = `UK ${size}`;
    return size;
  }

  const usOpt = displayOptions.find(
    (o) => o.type === "us m" || o.type === "us" || o.type === "us men"
  );
  if (usOpt) {
    const usNum = parseFloat(usOpt.size);
    if (!isNaN(usNum) && usNum > 1) {
      const uk = usNum - 1;
      return `UK ${uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1)}`;
    }
  }

  if (baseSize) {
    const num = parseFloat(baseSize);
    if (!isNaN(num) && num > 1) {
      const uk = num - 1;
      return `UK ${uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1)}`;
    }
  }

  return "";
}

// ── Extract product (with sizes) from __NEXT_DATA__ ──────────────────

function extractProductFromNextData(nd: any): SXProductFromNextData | null {
  // Walk the React Query cache embedded in every StockX product page:
  //   props.pageProps.req.appContext.states.query.value.queries[]
  // The "GetProduct" queryHash carries variants[*].sizeChart and title/media.
  const queries: Array<{ queryHash?: string; state?: { data?: any } }> =
    nd?.props?.pageProps?.req?.appContext?.states?.query?.value?.queries || [];

  for (const q of queries) {
    const product = q?.state?.data?.product;
    if (!product) continue;
    const v0 = product?.variants?.[0];
    if (v0?.sizeChart && product.title && product.urlKey) {
      return product;
    }
  }
  return null;
}

// ── Per-entry scrape ─────────────────────────────────────────────────

async function scrapeOne(
  ctx: BrowserContext,
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

  const page = await ctx.newPage();

  // Hook in the response listener BEFORE navigation so we don't miss
  // an early GetMarketData response.
  let resolveMarket: (m: SXMarketDataResponse) => void = () => {};
  let rejectMarket: (e: Error) => void = () => {};
  const marketPromise = new Promise<SXMarketDataResponse>((resolve, reject) => {
    resolveMarket = resolve;
    rejectMarket = reject;
  });

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes(GRAPHQL_PATH)) return;
    if (response.status() !== 200) return;
    let body: string;
    try {
      body = await response.text();
    } catch {
      return;
    }
    let parsed: SXMarketDataResponse;
    try {
      parsed = JSON.parse(body);
    } catch {
      return;
    }
    // Detect by shape, not by operation name (StockX has renamed ops in
    // the past — this is robust against another rename).
    const v0 = parsed?.data?.product?.variants?.[0];
    if (v0 && "market" in v0) {
      resolveMarket(parsed);
    }
  });

  try {
    await page.goto(`${STOCKX_BASE}/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });

    // Race the market-data response against a timeout
    const marketData = await Promise.race([
      marketPromise,
      new Promise<SXMarketDataResponse>((_, reject) => {
        setTimeout(
          () => reject(new Error(`GetMarketData not received within ${MARKET_WAIT_MS}ms`)),
          MARKET_WAIT_MS
        );
      }),
    ]).catch((err) => {
      void rejectMarket; // suppress unused warning
      throw err;
    });

    // Pull product + sizes from __NEXT_DATA__
    const ndText = await page
      .locator("script#__NEXT_DATA__")
      .innerText({ timeout: 5000 });
    const nd = JSON.parse(ndText);
    const product = extractProductFromNextData(nd);
    if (!product) {
      return {
        url: entry.url,
        success: false,
        listings: [],
        error: "no product in __NEXT_DATA__ queries cache",
        durationMs: Date.now() - t0,
      };
    }

    // Build variantId → market map
    const marketByVariant = new Map<string, SXVariantWithMarket["market"]>();
    for (const v of marketData?.data?.product?.variants || []) {
      marketByVariant.set(v.id, v.market);
    }

    const image =
      product.media?.imageUrl || product.media?.smallImageUrl || undefined;
    const pageUrl = `${STOCKX_BASE}/${product.urlKey || slug}`;

    const listings: ScrapedListing[] = [];
    for (const v of product.variants || []) {
      const market = marketByVariant.get(v.id);
      const lowestAsk = market?.state?.lowestAsk?.amount;
      if (!lowestAsk || lowestAsk <= 0) continue;
      if ((market?.state?.numberOfAsks || 0) === 0) continue;

      const ukSize = extractUkSize(
        v.sizeChart?.displayOptions || [],
        v.sizeChart?.baseSize
      );
      if (!ukSize) continue;

      listings.push({
        sku: entry.sku,
        name: product.title,
        size: ukSize,
        price: Math.round(lowestAsk),
        listingCount: market?.state?.numberOfAsks || 1,
        url: pageUrl,
        condition: "new",
        sellerName: "StockX",
        image,
        platformVariantId: `stockx-${v.id}`,
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
      error: err?.message?.slice(0, 200) || "unknown",
      durationMs: Date.now() - t0,
    };
  } finally {
    try {
      await page.close();
    } catch {
      /* */
    }
  }
}

// ── Public batch entry point ─────────────────────────────────────────

export async function scrapeStockXBatch(
  entries: ScrapeRequestEntry[]
): Promise<ScrapeResultEntry[]> {
  let ctx: BrowserContext | null = null;
  try {
    ctx = await newContext();
    const sem = new Semaphore(STOCKX_CONCURRENCY);
    const tasks = entries.map((e) => sem.run(() => scrapeOne(ctx!, e)));
    return await Promise.all(tasks);
  } finally {
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        /* */
      }
    }
  }
}
