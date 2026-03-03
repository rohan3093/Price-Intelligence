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
 *   - StockX          (GraphQL API + got-scraping TLS impersonation)
 *   - GOAT            (REST API — /api/v1/product_templates + /product_variants)
 *
 * How the orchestrator uses this:
 *   1. First checks if the URL is a known custom scraper via `isCustomScraperUrl()`
 *   2. If yes → `fetchCustomProduct()` handles the scraping
 *   3. If no  → existing Shopify .json logic handles it
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomScraperUrl = isCustomScraperUrl;
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
    },
    {
        id: "hypefly",
        displayName: "HypeFly",
        domains: ["hypefly.co.in", "www.hypefly.co.in"],
        fetchProduct: hypefly_1.fetchHypeflyProduct,
    },
    {
        id: "findyourkicks",
        displayName: "FindYourKicks",
        domains: ["findyourkicks.com", "www.findyourkicks.com"],
        fetchProduct: findYourKicks_1.fetchFindYourKicksProduct,
    },
    {
        id: "stockx",
        displayName: "StockX",
        domains: ["stockx.com", "www.stockx.com"],
        fetchProduct: stockx_1.fetchStockXProduct,
    },
    {
        id: "goat",
        displayName: "GOAT",
        domains: ["goat.com", "www.goat.com"],
        fetchProduct: goat_1.fetchGoatProduct,
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