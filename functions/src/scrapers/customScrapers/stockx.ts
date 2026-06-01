/**
 * StockX Scraper — DISABLED (pending Developer API access)
 *
 * Status (as of 2026-05-12):
 *   StockX's internal GraphQL endpoint at gateway.stockx.com went behind
 *   Cloudflare's strict bot tier on 2026-04-29. Every direct request now
 *   returns HTTP 403 with `cf-mitigated: challenge`. Verified live —
 *   this is not a code regression. `got-scraping` with HTTP/2 + browser
 *   TLS impersonation, browser-context fetch from a warmed Playwright
 *   page, and same-origin /api/graphql proxy calls all fail.
 *
 * Path forward:
 *   We've applied for access to StockX's official Developer API at
 *   developer.stockx.com. Once approved, this file will be rewritten
 *   to call /v2/catalog/products/{id}/variants and /v2/markets — those
 *   endpoints sit on a separate API gateway that's not behind the
 *   public-site Cloudflare tier and have no rate issues for our volume.
 *
 * Until then this scraper short-circuits to [] so the orchestrator
 * records "no listings from StockX" cleanly. The size-normalisation
 * and slug helpers below are kept because the Developer API ingestion
 * code will reuse them.
 */

import { ScrapedListing } from "../types";

// ── Helpers preserved for the Developer API rewrite ───────────────────

/**
 * Pull the product slug from a StockX product URL.
 *
 *   https://stockx.com/nike-air-force-1-low-flax-2019
 *     → "nike-air-force-1-low-flax-2019"
 */
export function extractStockXSlug(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 3 && !slug.includes(".")) return slug;
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * Pick the UK size for a StockX variant, falling back to US-M − 1 if
 * the variant doesn't carry a UK display option.
 *
 * Used by the (currently-disabled) listing pipeline; exported so the
 * Developer API rewrite can drop straight in.
 */
export function stockxUkSize(
  displayOptions: Array<{ size: string; type: string }>,
  baseSize?: string
): string {
  const uk = displayOptions.find((o) => o.type === "uk");
  if (uk) {
    let size = uk.size.trim().replace(/\s*\(EU\s*\d+(?:\.\d+)?\)/, "").trim();
    if (!size.startsWith("UK ")) size = `UK ${size}`;
    return size;
  }

  const usM = displayOptions.find(
    (o) => o.type === "us m" || o.type === "us" || o.type === "us men"
  );
  if (usM) {
    const usNum = parseFloat(usM.size);
    if (!isNaN(usNum) && usNum > 1) {
      const uk2 = usNum - 1;
      return `UK ${uk2 % 1 === 0 ? uk2.toFixed(0) : uk2.toFixed(1)}`;
    }
  }

  if (baseSize) {
    const num = parseFloat(baseSize);
    if (!isNaN(num) && num > 1) {
      const uk2 = num - 1;
      return `UK ${uk2 % 1 === 0 ? uk2.toFixed(0) : uk2.toFixed(1)}`;
    }
  }

  return "";
}

// ── Disabled scraper entry point ──────────────────────────────────────

// Module-level flag so we log the disabled-status banner exactly once
// per Cloud Function instance lifetime, not once per URL.
let _disabledNoticeLogged = false;

export async function fetchStockXProduct(
  _productUrl: string,
  _assetSku: string
): Promise<ScrapedListing[]> {
  if (!_disabledNoticeLogged) {
    _disabledNoticeLogged = true;
    console.log(
      "[StockX] scraper disabled — awaiting StockX Developer API " +
        "access (developer.stockx.com). All StockX URLs this run will " +
        "produce zero listings. Re-enable by replacing fetchStockXProduct " +
        "with the Developer API implementation."
    );
  }
  return [];
}
