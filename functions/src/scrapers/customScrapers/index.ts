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
 *   - StockX          (GraphQL API + got-scraping TLS impersonation)
 *   - GOAT            (REST API — /api/v1/product_templates + /product_variants)
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
}

const CUSTOM_STORES: CustomStoreConfig[] = [
  {
    id: "culturecircle",
    displayName: "Culture Circle",
    domains: ["culture-circle.com", "www.culture-circle.com"],
    fetchProduct: fetchCultureCircleProduct,
  },
  {
    id: "hypefly",
    displayName: "HypeFly",
    domains: ["hypefly.co.in", "www.hypefly.co.in"],
    fetchProduct: fetchHypeflyProduct,
  },
  {
    id: "findyourkicks",
    displayName: "FindYourKicks",
    domains: ["findyourkicks.com", "www.findyourkicks.com"],
    fetchProduct: fetchFindYourKicksProduct,
  },
  {
    id: "stockx",
    displayName: "StockX",
    domains: ["stockx.com", "www.stockx.com"],
    fetchProduct: fetchStockXProduct,
  },
  {
    id: "goat",
    displayName: "GOAT",
    domains: ["goat.com", "www.goat.com"],
    fetchProduct: fetchGoatProduct,
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

