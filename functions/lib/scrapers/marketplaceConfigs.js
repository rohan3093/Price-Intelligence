"use strict";
/**
 * Marketplace Configurations
 *
 * Each entry defines a Shopify-based Indian sneaker marketplace.
 * URLs are auto-discovered from analyst-entered listing data in Firestore,
 * but pinned here as the source of truth for the scraper.
 *
 * ┌────────────────────────────────────────────────────────────────┐
 * │  Adding a new marketplace?                                     │
 * │                                                                │
 * │  1. Add a config below with the store's base URL               │
 * │  2. Set enabled: true                                          │
 * │  3. Deploy — it's automatically included in the next scrape    │
 * │                                                                │
 * │  OR: just let analysts enter listings with URLs — the          │
 * │  discovery system will auto-detect new Shopify stores.         │
 * │                                                                │
 * │  Optional: add normaliseSize / matchesAsset overrides if the   │
 * │  store uses non-standard size labels or SKU formats.           │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Last verified: 2026-02-16 via discoverMarketplaces?verify=true
 *
 * Non-Shopify stores (need custom scrapers):
 *  - Culture Circle (culture-circle.com) — 510 listings
 *  - Hypefly (hypefly.co.in) — 475 listings
 *  - Find Your Kicks (findyourkicks.com) — 326 listings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHOPIFY_MARKETPLACE_CONFIGS = void 0;
exports.getEnabledShopifyConfigs = getEnabledShopifyConfigs;
exports.getShopifyConfigById = getShopifyConfigById;
/**
 * Get all enabled Shopify store configs.
 * Used by the bulk orchestrator to run parallel catalog scrapes.
 */
function getEnabledShopifyConfigs() {
    return exports.SHOPIFY_MARKETPLACE_CONFIGS.filter((c) => c.enabled);
}
/**
 * Get a specific Shopify config by marketplace ID.
 */
function getShopifyConfigById(id) {
    return exports.SHOPIFY_MARKETPLACE_CONFIGS.find((c) => c.id === id);
}
exports.SHOPIFY_MARKETPLACE_CONFIGS = [
    // ─── Verified Shopify Stores (auto-discovered from analyst data) ───
    {
        id: "crepdogcrew",
        displayName: "CrepdogCrew",
        baseUrl: "https://crepdogcrew.com", // was www.crepdogcrew.com — analysts use non-www
        channel: "marketplace",
        enabled: true,
        delayMs: 600,
    },
    {
        id: "dawntown",
        displayName: "Dawntown",
        baseUrl: "https://dawntown.co.in", // was dawntown.in — WRONG, discovered correct URL
        channel: "marketplace",
        enabled: true,
        delayMs: 600,
    },
    {
        id: "mainstreet",
        displayName: "Mainstreet Marketplace",
        baseUrl: "https://marketplace.mainstreet.co.in", // was mainstreetmarketplace.in — WRONG
        channel: "marketplace",
        enabled: true,
        delayMs: 600,
    },
    {
        id: "10hillsstudio",
        displayName: "10 Hills Studio",
        baseUrl: "https://10hillsstudio.com", // NEW — discovered from 264 analyst listings
        channel: "marketplace",
        enabled: true,
        delayMs: 600,
    },
    {
        id: "hustleculture",
        displayName: "Hustle Culture",
        baseUrl: "https://hustleculture.co.in", // NEW — discovered from analyst listings
        channel: "marketplace",
        enabled: true,
        delayMs: 600,
    },
    // ─── Non-Shopify Stores (need custom scrapers) ────────────────────
    // These are tracked for reference but disabled because they don't
    // expose Shopify's /products.json or /search/suggest.json endpoints.
    {
        id: "culturecircle",
        displayName: "Culture Circle",
        baseUrl: "https://www.culture-circle.com", // was culturecircle.in — WRONG
        channel: "marketplace",
        enabled: false, // Not Shopify — needs custom scraper
        delayMs: 600,
    },
    {
        id: "hypefly",
        displayName: "Hypefly",
        baseUrl: "https://hypefly.co.in",
        channel: "marketplace",
        enabled: false, // Not Shopify — needs custom scraper
        delayMs: 600,
    },
    {
        id: "findyourkicks",
        displayName: "Find Your Kicks",
        baseUrl: "https://findyourkicks.com",
        channel: "marketplace",
        enabled: false, // Not Shopify — uses /product/ not /products/
        delayMs: 600,
    },
];
//# sourceMappingURL=marketplaceConfigs.js.map