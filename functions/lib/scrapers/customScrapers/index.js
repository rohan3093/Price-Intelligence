"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomScraperUrl = isCustomScraperUrl;
exports.isCustomStoreEnabled = isCustomStoreEnabled;
exports.getCustomStoreConfig = getCustomStoreConfig;
exports.fetchCustomProduct = fetchCustomProduct;
const cultureCircle_1 = require("./cultureCircle");
const hypefly_1 = require("./hypefly");
const findYourKicks_1 = require("./findYourKicks");
const stockx_1 = require("./stockx");
const goat_1 = require("./goat");
const CUSTOM_STORES = [
    {
        id: "culturecircle",
        displayName: "Culture Circle",
        domains: ["culture-circle.com", "www.culture-circle.com"],
        fetchProduct: cultureCircle_1.fetchCultureCircleProduct,
        enabled: true,
    },
    {
        id: "hypefly",
        displayName: "HypeFly",
        domains: ["hypefly.co.in", "www.hypefly.co.in"],
        fetchProduct: hypefly_1.fetchHypeflyProduct,
        enabled: true,
    },
    {
        id: "findyourkicks",
        displayName: "FindYourKicks",
        domains: ["findyourkicks.com", "www.findyourkicks.com"],
        fetchProduct: findYourKicks_1.fetchFindYourKicksProduct,
        enabled: true,
    },
    {
        id: "stockx",
        displayName: "StockX",
        domains: ["stockx.com", "www.stockx.com"],
        fetchProduct: stockx_1.fetchStockXProduct,
        // Disabled — awaiting StockX Developer API access (developer.stockx.com).
        // See customScrapers/stockx.ts for the full status writeup.
        enabled: false,
    },
    {
        id: "goat",
        displayName: "GOAT",
        domains: ["goat.com", "www.goat.com"],
        fetchProduct: goat_1.fetchGoatProduct,
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
function isCustomScraperUrl(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return CUSTOM_STORES.some((store) => store.domains.includes(hostname));
    }
    catch (_a) {
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
function isCustomStoreEnabled(source) {
    const store = CUSTOM_STORES.find((s) => s.id === source);
    if (!store)
        return true;
    return store.enabled;
}
/**
 * Get the custom store config for a URL, or null if not custom.
 */
function getCustomStoreConfig(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return (CUSTOM_STORES.find((store) => store.domains.includes(hostname)) ||
            null);
    }
    catch (_a) {
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
async function fetchCustomProduct(productUrl, assetSku) {
    const config = getCustomStoreConfig(productUrl);
    if (!config)
        return null;
    const listings = await config.fetchProduct(productUrl, assetSku);
    return {
        listings,
        storeId: config.id,
        storeName: config.displayName,
    };
}
//# sourceMappingURL=index.js.map