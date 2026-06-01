/**
 * Custom Scraper Router
 *
 * Routes product URLs to the appropriate scraper based on the store's domain.
 * Falls back to Shopify .json scraping for unknown stores.
 *
 * Supported custom scrapers:
 *   - Culture Circle  (JSON-LD structured data)
 *   - HypeFly         (__NEXT_DATA__ + JSON-LD)
 *   - FindYourKicks   (RSC stream embedded data)
 *   - StockX          (DISABLED — awaiting Developer API access; see stockx.ts)
 *   - GOAT            (DISABLED — Cloudflare bot-protected, alternative TBD;
 *                      see goat.ts)
 *
 * Note: disabled scrapers still appear in the registry and run on the
 * normal scrape path. They short-circuit to [] internally so the
 * orchestrator records them as "0 listings, fetch-success=false" cleanly
 * rather than tossing errors. URL detection (`isCustomScraperUrl`) still
 * routes StockX/GOAT URLs here — it's the fetch step that's a no-op.
 *
 * How the orchestrator uses this:
 *   1. First checks if the URL is a known custom scraper via `isCustomScraperUrl()`
 *   2. If yes → `fetchCustomProduct()` handles the scraping
 *   3. If no  → existing Shopify .json logic handles it
 */

import { ScrapedListing } from "../types";
import { fetchCultureCircleProduct } from "./cultureCircle";
import { fetchHypeflyProduct } from "./hypefly";
import { fetchFindYourKicksProduct } from "./findYourKicks";
import { fetchStockXProduct } from "./stockx";
import { fetchGoatProduct } from "./goat";

// ── Store detection ───────────────────────────────────────────────────

type CustomStoreId = "culturecircle" | "hypefly" | "findyourkicks" | "stockx" | "goat";

interface CustomStoreConfig {
  id: CustomStoreId;
  displayName: string;
  /** Domains that this scraper handles (without www.) */
  domains: string[];
  /** Fetch product data from a URL */
  fetchProduct: (url: string, assetSku: string) => Promise<ScrapedListing[]>;
  /**
   * Whether the scraper is currently operational. Disabled scrapers are
   * recognised by `isCustomScraperUrl` / `getCustomStoreConfig` (so URL
   * routing still works) but the orchestrator skips the entire store's
   * URL list without making any network calls — see the orchestrator's
   * `isCustomStoreEnabled` check.
   *
   * Flip to `true` once the underlying replacement is in place. See the
   * per-scraper module docstring for context on each disable.
   */
  enabled: boolean;
}

const CUSTOM_STORES: CustomStoreConfig[] = [
  {
    id: "culturecircle",
    displayName: "Culture Circle",
    domains: ["culture-circle.com", "www.culture-circle.com"],
    fetchProduct: fetchCultureCircleProduct,
    enabled: true,
  },
  {
    id: "hypefly",
    displayName: "HypeFly",
    domains: ["hypefly.co.in", "www.hypefly.co.in"],
    fetchProduct: fetchHypeflyProduct,
    enabled: true,
  },
  {
    id: "findyourkicks",
    displayName: "FindYourKicks",
    domains: ["findyourkicks.com", "www.findyourkicks.com"],
    fetchProduct: fetchFindYourKicksProduct,
    enabled: true,
  },
  {
    id: "stockx",
    displayName: "StockX",
    domains: ["stockx.com", "www.stockx.com"],
    fetchProduct: fetchStockXProduct,
    // Disabled — awaiting StockX Developer API access (developer.stockx.com).
    // See customScrapers/stockx.ts for the full status writeup.
    enabled: false,
  },
  {
    id: "goat",
    displayName: "GOAT",
    domains: ["goat.com", "www.goat.com"],
    fetchProduct: fetchGoatProduct,
    // Disabled — Cloudflare bot tier blocks both direct fetches and our
    // Playwright/stealth bypass after the first ~20 requests per IP.
    // See customScrapers/goat.ts for the full status writeup and the
    // open follow-up (residential proxy vs managed scraper vs drop).
    enabled: false,
  },
];

/**
 * Check if a URL belongs to a known custom (non-Shopify) scraper.
 */
export function isCustomScraperUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return CUSTOM_STORES.some((store) =>
      store.domains.includes(hostname)
    );
  } catch {
    return false;
  }
}

/**
 * Whether the custom-scraper with this source id is operational.
 *
 * The orchestrator uses this at the per-store level to skip disabled
 * scrapers' entire URL lists in one shot — avoiding ~200 per-URL no-op
 * fetch calls (each of which would otherwise be counted as a failure
 * and trip the consecutive-failures circuit breaker) and the
 * accompanying warn-level log spam.
 *
 * For unknown / non-custom sources this returns `true` so non-custom
 * stores (Shopify) aren't accidentally skipped.
 */
export function isCustomStoreEnabled(source: string): boolean {
  const store = CUSTOM_STORES.find((s) => s.id === source);
  if (!store) return true;
  return store.enabled;
}

/**
 * Get the custom store config for a URL, or null if not custom.
 */
export function getCustomStoreConfig(
  url: string
): CustomStoreConfig | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      CUSTOM_STORES.find((store) => store.domains.includes(hostname)) ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Fetch product data from a custom (non-Shopify) store.
 *
 * @param productUrl  The full product page URL
 * @param assetSku    The asset's SKU (passed through to listings)
 * @returns           Object with listings and store metadata
 */
export async function fetchCustomProduct(
  productUrl: string,
  assetSku: string
): Promise<{
  listings: ScrapedListing[];
  storeId: string;
  storeName: string;
} | null> {
  const config = getCustomStoreConfig(productUrl);
  if (!config) return null;

  const listings = await config.fetchProduct(productUrl, assetSku);

  return {
    listings,
    storeId: config.id,
    storeName: config.displayName,
  };
}

