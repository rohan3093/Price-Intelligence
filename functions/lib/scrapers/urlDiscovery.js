"use strict";
/**
 * URL Discovery
 *
 * Scans existing asset price points in Firestore to discover marketplace
 * base URLs that analysts have already entered. This means:
 *
 *  - No guessing URLs in config files
 *  - If an analyst enters a listing from a new store, we automatically
 *    discover it on the next scrape run
 *  - If a store changes domains, the new URL propagates naturally
 *
 * Flow:
 *  1. Read all assets from Firestore
 *  2. Walk every size → pricePoints.marketplace → extract `url` fields
 *  3. Parse each URL to get `{ origin, marketplaceId }`
 *  4. Group by marketplaceId, pick the most common base URL
 *  5. Return a map of { marketplaceId → baseUrl }
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverMarketplaceUrls = discoverMarketplaceUrls;
exports.isShopifyStore = isShopifyStore;
exports.discoverAndVerifyShopifyStores = discoverAndVerifyShopifyStores;
const admin = __importStar(require("firebase-admin"));
// ── Known marketplace display name mapping ───────────────────────────
// Maps marketplace IDs to their known display names (from your dropdowns)
const KNOWN_DISPLAY_NAMES = {
    crepdogcrew: "CrepdogCrew",
    mainstreet: "Mainstreet Marketplace",
    culturecircle: "Culture Circle",
    hypefly: "Hypefly",
    dawntown: "Dawntown",
    "10hillsstudio": "10 Hills Studio",
    findyourkicks: "Find Your Kicks",
    instagram: "Instagram Seller",
    facebook: "Facebook Marketplace",
};
// ── Core discovery logic ─────────────────────────────────────────────
/**
 * Extract the base URL (origin) from a full product URL.
 * e.g. "https://www.crepdogcrew.com/products/jordan-1-low?variant=123"
 *    → "https://www.crepdogcrew.com"
 */
function extractBaseUrl(fullUrl) {
    try {
        const url = new URL(fullUrl);
        return url.origin; // e.g. "https://www.crepdogcrew.com"
    }
    catch (_a) {
        return null;
    }
}
/**
 * Scan all assets in Firestore and discover marketplace base URLs
 * from existing analyst-entered price points.
 */
async function discoverMarketplaceUrls() {
    var _a;
    const startTime = Date.now();
    const db = admin.firestore();
    // Map: marketplaceId → { baseUrl → count }
    const urlCounts = new Map();
    // Map: marketplaceId → displayName
    const displayNames = new Map();
    // Map: marketplaceId → sample URLs
    const sampleUrls = new Map();
    let totalUrlsScanned = 0;
    // Fetch all assets
    const assetsSnap = await db.collection("assets").get();
    for (const doc of assetsSnap.docs) {
        const data = doc.data();
        const sizes = data.sizes || [];
        for (const size of sizes) {
            // Check the new channel-based structure
            const pricePoints = size.pricePoints;
            if (!pricePoints)
                continue;
            // Scan marketplace price points (the channel we care about)
            const marketplaceListings = pricePoints.marketplace || [];
            for (const listing of marketplaceListings) {
                if (!listing.url)
                    continue;
                totalUrlsScanned++;
                const baseUrl = extractBaseUrl(listing.url);
                if (!baseUrl)
                    continue;
                // Determine the marketplace ID from source or marketplaceName
                const marketplaceId = listing.source ||
                    ((_a = listing.marketplaceName) === null || _a === void 0 ? void 0 : _a.toLowerCase().replace(/\s+/g, "")) ||
                    null;
                if (!marketplaceId)
                    continue;
                // Track URL counts
                if (!urlCounts.has(marketplaceId)) {
                    urlCounts.set(marketplaceId, new Map());
                }
                const counts = urlCounts.get(marketplaceId);
                counts.set(baseUrl, (counts.get(baseUrl) || 0) + 1);
                // Track display name (prefer marketplaceName, fallback to known names)
                if (listing.marketplaceName && !displayNames.has(marketplaceId)) {
                    displayNames.set(marketplaceId, listing.marketplaceName);
                }
                // Collect sample URLs (max 3)
                if (!sampleUrls.has(marketplaceId)) {
                    sampleUrls.set(marketplaceId, []);
                }
                const samples = sampleUrls.get(marketplaceId);
                if (samples.length < 3) {
                    samples.push(listing.url);
                }
            }
            // Also scan international listings for future use
            // (StockX/Goat URLs could be useful later)
        }
    }
    // Build the discovered marketplaces list
    const discovered = [];
    for (const [marketplaceId, counts] of urlCounts.entries()) {
        // Pick the base URL with the highest count (most common)
        let bestUrl = "";
        let bestCount = 0;
        let totalCount = 0;
        for (const [url, count] of counts.entries()) {
            totalCount += count;
            if (count > bestCount) {
                bestCount = count;
                bestUrl = url;
            }
        }
        // Skip non-scrapable sources (instagram, facebook)
        if (marketplaceId === "instagram" ||
            marketplaceId === "facebook" ||
            marketplaceId === "other") {
            continue;
        }
        discovered.push({
            id: marketplaceId,
            displayName: displayNames.get(marketplaceId) ||
                KNOWN_DISPLAY_NAMES[marketplaceId] ||
                marketplaceId,
            baseUrl: bestUrl,
            urlCount: totalCount,
            sampleUrls: sampleUrls.get(marketplaceId) || [],
            isShopify: null, // Will be checked separately if needed
        });
    }
    // Sort by URL count descending (most data = most important)
    discovered.sort((a, b) => b.urlCount - a.urlCount);
    return {
        discovered,
        totalUrlsScanned,
        durationMs: Date.now() - startTime,
    };
}
/**
 * Check if a URL points to a Shopify store by hitting /products.json.
 * Returns true if the response looks like Shopify product data.
 */
async function isShopifyStore(baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/products.json?limit=1`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "application/json",
            },
        });
        if (!response.ok)
            return false;
        const data = await response.json();
        // Shopify stores return { products: [...] }
        return Array.isArray(data === null || data === void 0 ? void 0 : data.products);
    }
    catch (_a) {
        return false;
    }
}
/**
 * Discover marketplace URLs and verify which ones are Shopify stores.
 * Returns only verified Shopify stores as ShopifyStoreConfig objects,
 * ready to be used by the scraper.
 */
async function discoverAndVerifyShopifyStores() {
    const discovery = await discoverMarketplaceUrls();
    console.log(`[Discovery] Found ${discovery.discovered.length} marketplace(s) from ${discovery.totalUrlsScanned} URL(s)`);
    const configs = [];
    for (const marketplace of discovery.discovered) {
        console.log(`[Discovery] Checking ${marketplace.displayName} (${marketplace.baseUrl})...`);
        const shopify = await isShopifyStore(marketplace.baseUrl);
        marketplace.isShopify = shopify;
        if (shopify) {
            console.log(`[Discovery] ✅ ${marketplace.displayName} is Shopify — adding to scrapers`);
            configs.push({
                id: marketplace.id,
                displayName: marketplace.displayName,
                baseUrl: marketplace.baseUrl,
                channel: "marketplace",
                enabled: true, // Auto-discovered = auto-enabled
                delayMs: 600,
            });
        }
        else {
            console.log(`[Discovery] ❌ ${marketplace.displayName} is NOT Shopify (or unreachable) — skipping`);
        }
    }
    return { configs, discovery };
}
//# sourceMappingURL=urlDiscovery.js.map