"use strict";
/**
 * Scraper Registry
 *
 * Central registry of all marketplace scrapers.
 *
 * Two sources of scrapers:
 *  1. **Static configs** (marketplaceConfigs.ts) — hardcoded overrides,
 *     custom normalisation functions, or stores you want to force-enable/disable.
 *  2. **Discovered configs** (urlDiscovery.ts) — auto-discovered from
 *     analyst-entered listing URLs in Firestore. These are Shopify stores
 *     that analysts have already been entering data for.
 *
 * Merge strategy: static configs take priority. If a marketplace exists
 * in both static and discovered, the static config wins. Discovered
 * stores that aren't in the static list are auto-added and auto-enabled.
 *
 * Usage:
 *   import { buildScrapers, getScraperStatus } from './registry';
 *   const { scrapers, discovery } = await buildScrapers();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnabledScrapers = getEnabledScrapers;
exports.getScraper = getScraper;
exports.buildScrapers = buildScrapers;
exports.getScraperStatus = getScraperStatus;
const shopifyScraper_1 = require("./shopifyScraper");
const marketplaceConfigs_1 = require("./marketplaceConfigs");
const urlDiscovery_1 = require("./urlDiscovery");
// ── Static scrapers (always available, no async) ─────────────────────
const staticShopifyScrapers = marketplaceConfigs_1.SHOPIFY_MARKETPLACE_CONFIGS.filter((c) => c.enabled).map(shopifyScraper_1.createShopifyScraper);
// Custom (non-Shopify) scrapers can be added here
const customScrapers = [];
// ── Simple getters for when you don't need discovery ─────────────────
/** Get statically configured + enabled scrapers (no Firestore scan) */
function getEnabledScrapers() {
    return [...staticShopifyScrapers, ...customScrapers];
}
/** Get a specific scraper by marketplace ID (static only) */
function getScraper(id) {
    return [...staticShopifyScrapers, ...customScrapers].find((s) => s.id === id);
}
// ── Dynamic builder (with Firestore discovery) ───────────────────────
/**
 * Build the full set of scrapers by:
 *  1. Loading static configs
 *  2. Discovering marketplace URLs from Firestore
 *  3. Merging (static takes priority)
 *
 * This is async because it reads Firestore and makes HTTP calls to
 * verify Shopify stores. Use this for the full scrape run.
 */
async function buildScrapers() {
    // 1. Discover from Firestore
    const { configs: discoveredConfigs, discovery } = await (0, urlDiscovery_1.discoverAndVerifyShopifyStores)();
    // 2. Build a set of IDs from static configs (all of them, even disabled)
    const staticIds = new Set(marketplaceConfigs_1.SHOPIFY_MARKETPLACE_CONFIGS.map((c) => c.id));
    // 3. Find discovered stores that aren't in the static list
    const newDiscoveredConfigs = discoveredConfigs.filter((dc) => !staticIds.has(dc.id));
    // 4. For static configs that are enabled but have no URL (or wrong URL),
    //    update them from discovery if available
    const discoveredUrlMap = new Map(discoveredConfigs.map((dc) => [dc.id, dc.baseUrl]));
    const mergedStaticConfigs = marketplaceConfigs_1.SHOPIFY_MARKETPLACE_CONFIGS.map((staticConfig) => {
        const discoveredUrl = discoveredUrlMap.get(staticConfig.id);
        if (discoveredUrl && !staticConfig.enabled) {
            // Static config is disabled — enable it now that we have a
            // verified URL from analyst data
            console.log(`[Registry] Enabling "${staticConfig.id}" — URL discovered from analyst data: ${discoveredUrl}`);
            return Object.assign(Object.assign({}, staticConfig), { baseUrl: discoveredUrl, enabled: true });
        }
        if (discoveredUrl && discoveredUrl !== staticConfig.baseUrl) {
            // Static config has a different URL than what analysts entered.
            // Trust the analyst-entered URL.
            console.log(`[Registry] Updating "${staticConfig.id}" URL: ${staticConfig.baseUrl} → ${discoveredUrl}`);
            return Object.assign(Object.assign({}, staticConfig), { baseUrl: discoveredUrl });
        }
        return staticConfig;
    });
    // 5. Build final scraper list
    const allConfigs = [
        ...mergedStaticConfigs.filter((c) => c.enabled),
        ...newDiscoveredConfigs,
    ];
    const scrapers = [
        ...allConfigs.map(shopifyScraper_1.createShopifyScraper),
        ...customScrapers,
    ];
    console.log(`[Registry] Built ${scrapers.length} scraper(s): ` +
        `${mergedStaticConfigs.filter((c) => c.enabled).length} static + ` +
        `${newDiscoveredConfigs.length} discovered + ` +
        `${customScrapers.length} custom`);
    return { scrapers, discovery };
}
// ── Status reporting ─────────────────────────────────────────────────
/** Get a summary of all statically configured scrapers and their status */
function getScraperStatus() {
    return marketplaceConfigs_1.SHOPIFY_MARKETPLACE_CONFIGS.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        channel: s.channel,
        enabled: s.enabled,
        baseUrl: s.baseUrl,
        source: "static",
    }));
}
//# sourceMappingURL=registry.js.map