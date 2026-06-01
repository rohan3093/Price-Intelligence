/**
 * GOAT Scraper — DISABLED (Cloudflare-blocked, alternative TBD)
 *
 * Status (as of 2026-05-12):
 *   GOAT's REST API at /api/v1/product_templates and /api/v1/product_variants
 *   went behind Cloudflare's strict bot tier sometime around 2026-04-23.
 *   Every direct request returns HTTP 403 with `cf-mitigated: challenge`.
 *
 *   We explored a Cloud Run + Playwright + stealth bypass (a real Chrome
 *   browser warming up on a product page to obtain `cf_clearance`, then
 *   firing same-origin /api/v1/* calls from inside the page). That works
 *   for the first ~20 requests per IP, then Cloudflare's heuristics
 *   escalate and start issuing JS challenges on every API call regardless
 *   of clearance cookies. From Cloud Run with a fresh IP per cold start,
 *   we'd be permanently in "first 20 requests" mode but the IP reputation
 *   builds up against us across runs. Not a durable solution.
 *
 * Path forward:
 *   GOAT does NOT publish a public developer API. Options being weighed:
 *     - residential proxy pool (Bright Data / Oxylabs ~$50-100/mo)
 *     - managed scraping service (ScraperAPI / ZenRows / Scrapfly)
 *     - dropping GOAT coverage entirely
 *   No decision yet — handled as a follow-up after StockX Developer API
 *   access is sorted.
 *
 * Until a decision is made this scraper short-circuits to [] so the
 * orchestrator records "no listings from GOAT" cleanly. The US→UK size
 * conversion + slug helpers below are kept because any future GOAT
 * ingestion path will reuse them.
 */

import { ScrapedListing } from "../types";

// ── Helpers preserved for whichever GOAT solution we adopt ────────────

/**
 * Pull the product slug from a GOAT product URL.
 *
 *   https://www.goat.com/sneakers/air-jordan-1-low-alternate-royal-toe-553558-140
 *     → "air-jordan-1-low-alternate-royal-toe-553558-140"
 */
export function extractGoatSlug(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 3) return slug;
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * GOAT publishes sizing in US (men's by default, women's for women-only
 * silhouettes). Convert to UK:
 *   - Men:   UK = US − 1
 *   - Women: UK = US − 2
 *
 * Returns "" for invalid / out-of-range sizes so the caller can skip.
 */
export function goatUsToUkSize(usSize: number, gender?: string): string {
  const offset = gender === "women" ? 2 : 1;
  const uk = usSize - offset;
  if (uk <= 0 || uk > 20) return "";
  return `UK ${uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1)}`;
}

// ── Disabled scraper entry point ──────────────────────────────────────

// Module-level flag so we log the disabled-status banner exactly once
// per Cloud Function instance lifetime, not once per URL.
let _disabledNoticeLogged = false;

export async function fetchGoatProduct(
  _productUrl: string,
  _assetSku: string
): Promise<ScrapedListing[]> {
  if (!_disabledNoticeLogged) {
    _disabledNoticeLogged = true;
    console.log(
      "[GOAT] scraper disabled — GOAT's /api/v1/* endpoints are behind " +
        "Cloudflare bot protection that we don't currently bypass " +
        "reliably. All GOAT URLs this run will produce zero listings. " +
        "Tracking follow-up: choose between residential proxy, managed " +
        "scraping service, or dropping GOAT coverage."
    );
  }
  return [];
}
