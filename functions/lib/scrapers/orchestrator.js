"use strict";
/**
 * Scraper Orchestrator (v3 — URL-Direct Scraping)
 *
 * Instead of fetching entire store catalogs and fuzzy-matching products,
 * we go DIRECTLY to the product URLs that analysts have already entered
 * in each asset's pricePoints.marketplace[].url field.
 *
 * Why this is the right approach:
 *   - Analysts already validated the product→asset mapping when they entered the URL
 *   - No fuzzy name matching → zero false positives or negatives
 *   - One fetch per unique product URL → minimal network requests
 *   - Works for ANY Shopify store automatically (no config files needed)
 *
 * Performance:
 *   v1 (per-asset search): 107 assets × 5 stores × ~3 requests = ~1,600 requests (~21 min)
 *   v2 (bulk catalog):     5 stores × ~6 catalog pages          = ~30 requests    (~30-60s)
 *   v3 (URL-direct):       ~80 unique product URLs               = ~80 requests    (~15-30s)
 *
 * Flow:
 *   1. Load all assets with their marketplace URLs from Firestore
 *   2. Extract unique product URLs, grouped by store
 *   3. Fetch each product page in parallel across stores (sequential within store)
 *   4. Convert Shopify product data to ScrapedListings
 *   5. Write results to "scraped_prices" with status "pending_review"
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
exports.runDailyScrape = runDailyScrape;
exports.scrapeAsset = scrapeAsset;
exports.getScraperStatus = getScraperStatus;
const admin = __importStar(require("firebase-admin"));
const shopifyScraper_1 = require("./shopifyScraper");
const customScrapers_1 = require("./customScrapers");
const marketplaceConfigs_1 = require("./marketplaceConfigs");
// Lazy getter — avoids calling admin.firestore() before initializeApp()
function getDb() {
    return admin.firestore();
}
// ── URL → Store resolver ──────────────────────────────────────────────
/**
 * Derive the correct marketplace source ID and display name from a URL's
 * hostname. This is MORE RELIABLE than the analyst-entered `source` field,
 * which can be wrong when multiple store URLs are grouped under one entry.
 *
 * Falls back to the Firestore listing data if the URL doesn't match any
 * known store.
 */
function resolveStoreFromUrl(url, fallbackSource, fallbackName) {
    try {
        const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
        // Check custom scrapers first (Culture Circle, HypeFly, FYK, StockX, GOAT)
        const customConfig = (0, customScrapers_1.getCustomStoreConfig)(url);
        if (customConfig) {
            return {
                source: customConfig.id,
                marketplaceName: customConfig.displayName,
            };
        }
        // Check Shopify store configs
        for (const config of marketplaceConfigs_1.SHOPIFY_MARKETPLACE_CONFIGS) {
            const configHost = new URL(config.baseUrl).hostname
                .toLowerCase()
                .replace(/^www\./, "");
            if (hostname === configHost) {
                return {
                    source: config.id,
                    marketplaceName: config.displayName,
                };
            }
        }
    }
    catch (_a) {
        // URL parsing failed — fall through to fallback
    }
    // Unknown store — use Firestore data as fallback
    return { source: fallbackSource, marketplaceName: fallbackName };
}
// ── International pricing constants ──────────────────────────────────
/** Flat reshipping + processing fee added to international prices (in USD) */
const RESHIPPING_FEE_USD = 100;
/** Fallback exchange rate if live API is unavailable */
const FALLBACK_USD_INR_RATE = 87;
/** Cache for exchange rate within a single scrape run */
let _cachedExchangeRate = null;
/**
 * Fetch live USD→INR exchange rate (cached for the duration of the scrape).
 */
async function getExchangeRate() {
    var _a;
    if (_cachedExchangeRate)
        return _cachedExchangeRate;
    try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        if (res.ok) {
            const data = await res.json();
            if ((_a = data === null || data === void 0 ? void 0 : data.rates) === null || _a === void 0 ? void 0 : _a.INR) {
                _cachedExchangeRate = data.rates.INR;
                console.log(`[Orchestrator] Live exchange rate: ₹${_cachedExchangeRate}/USD`);
                return _cachedExchangeRate;
            }
        }
    }
    catch (err) {
        console.warn("[Orchestrator] Failed to fetch exchange rate:", err);
    }
    console.warn(`[Orchestrator] Using fallback exchange rate: ₹${FALLBACK_USD_INR_RATE}/USD`);
    _cachedExchangeRate = FALLBACK_USD_INR_RATE;
    return _cachedExchangeRate;
}
// ── Main orchestrator ────────────────────────────────────────────────
/**
 * Run a full scrape cycle by directly fetching the product URLs
 * that analysts have already entered in each asset's marketplace listings.
 *
 * @param assetIds  Optional: only scrape specific asset IDs (for testing).
 */
async function runDailyScrape(assetIds, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_skipDiscovery = false) {
    var _a;
    const startTime = Date.now();
    const batchId = `scrape-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
    const db = getDb();
    console.log(`[Orchestrator] Starting URL-direct scrape batch ${batchId}`);
    // 1. Load all assets with FULL data (sizes + pricePoints + marketplace URLs)
    let assetsSnap;
    if (assetIds && assetIds.length > 0) {
        const refs = assetIds.map((id) => db.collection("assets").doc(id));
        const docs = await db.getAll(...refs);
        assetsSnap = docs.filter((d) => d.exists);
    }
    else {
        const snapshot = await db.collection("assets").get();
        assetsSnap = snapshot.docs;
    }
    console.log(`[Orchestrator] Loaded ${assetsSnap.length} asset(s)`);
    // 2. Extract all unique marketplace product URLs from asset data
    //    Key = jsonUrl, deduped per (asset + product)
    const urlEntries = new Map(); // jsonUrl → entry
    const allAssets = [];
    const seen = new Set(); // "assetId::jsonUrl" dedup
    for (const doc of assetsSnap) {
        const data = doc.data();
        const assetId = doc.id;
        const assetSku = data.sku || "";
        const assetName = data.name || "";
        allAssets.push({ id: assetId, sku: assetSku, name: assetName });
        const sizes = data.sizes || [];
        for (const size of sizes) {
            const pricePoints = size.pricePoints;
            if (!pricePoints)
                continue;
            // Scan both marketplace AND international channels for URLs
            const channelsToScan = [
                { listings: pricePoints.marketplace || [], channel: "marketplace" },
                { listings: pricePoints.international || [], channel: "international" },
            ];
            for (const { listings: channelListings, channel } of channelsToScan) {
                for (const listing of channelListings) {
                    if (!listing.url)
                        continue;
                    // Detect if this is a custom (non-Shopify) scraper URL
                    const isCustom = (0, customScrapers_1.isCustomScraperUrl)(listing.url);
                    // For Shopify stores: convert to .json URL
                    // For custom stores (including StockX/GOAT): use the original URL as the key
                    let entryKey;
                    let jsonUrl;
                    if (isCustom) {
                        // Custom scrapers: strip query params for dedup (e.g. ?size=UK6, ?variant=123)
                        try {
                            const url = new URL(listing.url);
                            url.search = "";
                            entryKey = url.toString();
                        }
                        catch (_b) {
                            entryKey = listing.url;
                        }
                        jsonUrl = entryKey; // Custom scrapers use the original URL
                    }
                    else {
                        // Shopify stores: convert to .json URL
                        const shopifyJsonUrl = (0, shopifyScraper_1.extractProductJsonUrl)(listing.url);
                        if (!shopifyJsonUrl)
                            continue;
                        entryKey = shopifyJsonUrl;
                        jsonUrl = shopifyJsonUrl;
                    }
                    // Dedup: same asset + same product = one fetch
                    const dedupeKey = `${assetId}::${entryKey}`;
                    if (seen.has(dedupeKey))
                        continue;
                    seen.add(dedupeKey);
                    // Extract base URL from the product URL
                    let baseUrl;
                    try {
                        baseUrl = new URL(listing.url).origin;
                    }
                    catch (_c) {
                        continue;
                    }
                    // Derive the correct source from the URL's hostname, NOT from
                    // the Firestore listing metadata (which can be wrong when analysts
                    // group multiple store URLs under one marketplace entry).
                    const firestoreFallbackSource = listing.source ||
                        ((_a = listing.marketplaceName) === null || _a === void 0 ? void 0 : _a.toLowerCase().replace(/\s+/g, "")) ||
                        "unknown";
                    const firestoreFallbackName = listing.marketplaceName || listing.source || "Unknown Store";
                    const { source, marketplaceName } = resolveStoreFromUrl(listing.url, firestoreFallbackSource, firestoreFallbackName);
                    // Group by entryKey — same product page might be referenced by different assets
                    if (urlEntries.has(entryKey)) {
                        urlEntries.get(entryKey).assets.push({
                            id: assetId,
                            sku: assetSku,
                            name: assetName,
                        });
                    }
                    else {
                        urlEntries.set(entryKey, {
                            jsonUrl,
                            originalUrl: listing.url,
                            baseUrl,
                            source,
                            marketplaceName,
                            isCustom,
                            channel,
                            assets: [{ id: assetId, sku: assetSku, name: assetName }],
                        });
                    }
                }
            }
        }
    }
    const totalUrls = urlEntries.size;
    console.log(`[Orchestrator] Found ${totalUrls} unique product URL(s) across ${allAssets.length} asset(s)`);
    // Group URLs by store base URL (for parallel fetching + rate limiting)
    const byStore = new Map();
    for (const entry of urlEntries.values()) {
        const storeEntries = byStore.get(entry.baseUrl) || [];
        storeEntries.push(entry);
        byStore.set(entry.baseUrl, storeEntries);
    }
    const storeCount = byStore.size;
    const storeNames = Array.from(byStore.entries()).map(([, entries]) => entries[0].marketplaceName);
    console.log(`[Orchestrator] Scraping ${storeCount} store(s): ${storeNames.join(", ")}`);
    const result = {
        totalListings: 0,
        byMarketplace: {},
        assetsScraped: allAssets.length,
        errors: [],
        batchId,
        durationMs: 0,
        uniqueProductUrls: totalUrls,
        storesScraped: storeCount,
    };
    if (totalUrls === 0) {
        console.warn("[Orchestrator] No marketplace URLs found in any asset. " +
            "Make sure analysts have entered product URLs in marketplace listings.");
        result.durationMs = Date.now() - startTime;
        return result;
    }
    // ── Progress tracking ──────────────────────────────────────────────
    const progressRef = db.collection("scrape_progress").doc("current");
    const updateProgress = async (update) => {
        try {
            await progressRef.set(update, { merge: true });
        }
        catch (_a) {
            // Don't let progress tracking failures break the scrape
        }
    };
    // Signal start
    await updateProgress({
        status: "in_progress",
        batchId,
        phase: "initializing",
        totalAssets: allAssets.length,
        completedAssets: 0,
        totalStores: storeCount,
        completedStores: 0,
        totalUrls,
        fetchedUrls: 0,
        currentAssetName: "",
        currentMarketplace: "",
        scraperNames: storeNames,
        totalScrapers: storeCount,
        totalListings: 0,
        byMarketplace: {},
        errors: 0,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 3. Clear ALL old pending_review entries to start fresh.
    //    Each scrape produces a complete dataset, so old pending entries are stale.
    //    Firestore batches are limited to 500 writes, so we loop until done.
    const today = new Date().toISOString().slice(0, 10);
    try {
        await updateProgress({ phase: "clearing_stale" });
        let totalDeleted = 0;
        let hasMore = true;
        while (hasMore) {
            const oldEntries = await db
                .collection("scraped_prices")
                .where("status", "==", "pending_review")
                .limit(500) // Firestore batch limit
                .get();
            if (oldEntries.empty) {
                hasMore = false;
                break;
            }
            const deleteBatch = db.batch();
            oldEntries.docs.forEach((d) => deleteBatch.delete(d.ref));
            await deleteBatch.commit();
            totalDeleted += oldEntries.size;
            console.log(`[Orchestrator] Deleted ${oldEntries.size} stale entries (${totalDeleted} total so far)`);
            // If we got fewer than 500, that was the last batch
            if (oldEntries.size < 500) {
                hasMore = false;
            }
        }
        if (totalDeleted > 0) {
            console.log(`[Orchestrator] Cleared ${totalDeleted} total stale pending_review entries`);
        }
    }
    catch (err) {
        console.warn("[Orchestrator] Failed to clear stale entries:", err);
    }
    // 4. Fetch all products — parallel across stores, sequential within each store
    await updateProgress({ phase: "scraping" });
    const completedStores = { count: 0 };
    const fetchedUrls = { count: 0 };
    // Each store runs in parallel
    const storeResults = await Promise.all(Array.from(byStore.entries()).map(async ([storeBaseUrl, storeEntries]) => {
        const storeName = storeEntries[0].marketplaceName;
        const storeSource = storeEntries[0].source;
        try {
            await updateProgress({
                currentMarketplace: `Fetching ${storeName}… (${storeEntries.length} products)`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Fetch each product URL sequentially within this store (rate limiting)
            const storeListings = [];
            let consecutive404s = 0;
            const MAX_CONSECUTIVE_404S = 5; // Skip store if first 5 URLs all 404
            for (const entry of storeEntries) {
                // Skip remaining URLs if store appears non-functional
                if (consecutive404s >= MAX_CONSECUTIVE_404S) {
                    fetchedUrls.count++;
                    continue;
                }
                let entryListings = [];
                let fetchSuccess = false;
                if (entry.isCustom) {
                    // ── Custom scraper path ──────────────────────────
                    const customResult = await (0, customScrapers_1.fetchCustomProduct)(entry.jsonUrl, // For custom scrapers, jsonUrl = original URL
                    entry.assets[0].sku);
                    if (customResult && customResult.listings.length > 0) {
                        entryListings = customResult.listings;
                        fetchSuccess = true;
                    }
                }
                else {
                    // ── Shopify .json path ───────────────────────────
                    const { product } = await (0, shopifyScraper_1.fetchProductByUrl)(entry.jsonUrl);
                    if (product) {
                        fetchSuccess = true;
                        for (const asset of entry.assets) {
                            const listings = (0, shopifyScraper_1.convertProductToListings)(product, asset.sku, entry.source, entry.marketplaceName, entry.baseUrl);
                            entryListings.push(...listings);
                        }
                    }
                }
                fetchedUrls.count++;
                if (!fetchSuccess) {
                    consecutive404s++;
                }
                else {
                    consecutive404s = 0; // Reset on success
                }
                // Assign listings to each asset that references this product URL
                if (entryListings.length > 0) {
                    if (entry.isCustom) {
                        // Custom scrapers return listings with the first asset's SKU.
                        // For multi-asset references, assign to each asset.
                        for (const asset of entry.assets) {
                            const assetListings = entryListings.map((l) => (Object.assign(Object.assign({}, l), { sku: asset.sku })));
                            storeListings.push({
                                assetId: asset.id,
                                assetSku: asset.sku,
                                assetName: asset.name,
                                source: entry.source,
                                marketplaceName: entry.marketplaceName,
                                channel: entry.channel,
                                listings: assetListings,
                            });
                        }
                    }
                    else {
                        // Shopify: listings were already generated per-asset above
                        for (const asset of entry.assets) {
                            const assetListings = entryListings.filter((l) => l.sku === asset.sku);
                            if (assetListings.length > 0) {
                                storeListings.push({
                                    assetId: asset.id,
                                    assetSku: asset.sku,
                                    assetName: asset.name,
                                    source: entry.source,
                                    marketplaceName: entry.marketplaceName,
                                    channel: entry.channel,
                                    listings: assetListings,
                                });
                            }
                        }
                    }
                }
                // Rate limit: 300ms between requests to same store
                await sleep(300);
                // Update progress periodically
                if (fetchedUrls.count % 5 === 0) {
                    await updateProgress({
                        fetchedUrls: fetchedUrls.count,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
            completedStores.count++;
            const storeListingCount = storeListings.reduce((sum, s) => sum + s.listings.length, 0);
            await updateProgress({
                completedStores: completedStores.count,
                fetchedUrls: fetchedUrls.count,
                currentMarketplace: `${storeName} ✓ (${storeListingCount} listings)`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            if (consecutive404s >= MAX_CONSECUTIVE_404S) {
                console.warn(`[Orchestrator] ${storeName}: skipped after ${MAX_CONSECUTIVE_404S} consecutive failures`);
            }
            console.log(`[Orchestrator] ${storeName}: fetched ${storeEntries.length} products → ${storeListingCount} listings`);
            return {
                storeBaseUrl,
                storeName,
                storeSource,
                storeListings,
                storeListingCount,
                error: null,
            };
        }
        catch (err) {
            completedStores.count++;
            const errMsg = `${storeName}: ${err.message}`;
            console.error(`[Orchestrator] Store ${storeName} failed:`, err);
            await updateProgress({
                completedStores: completedStores.count,
                currentMarketplace: `${storeName} ✗`,
                errors: result.errors.length + 1,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return {
                storeBaseUrl,
                storeName,
                storeSource,
                storeListings: [],
                storeListingCount: 0,
                error: errMsg,
            };
        }
    }));
    // 5. Write all results to Firestore
    await updateProgress({
        phase: "writing",
        currentMarketplace: "Writing results…",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Fetch exchange rate once for international price conversion
    // Reset cache for each run to get a fresh rate
    _cachedExchangeRate = null;
    const exchangeRate = await getExchangeRate();
    const intlPricing = {
        exchangeRate,
        reshippingFeeUsd: RESHIPPING_FEE_USD,
    };
    console.log(`[Orchestrator] International pricing: $${RESHIPPING_FEE_USD} reshipping, ₹${exchangeRate}/USD`);
    for (const storeResult of storeResults) {
        if (storeResult.error) {
            result.errors.push(storeResult.error);
            continue;
        }
        if (storeResult.storeListingCount === 0)
            continue;
        // Group by (assetId + source + channel) and deduplicate by size within each group
        const byAssetSourceChannel = new Map();
        for (const entry of storeResult.storeListings) {
            const key = `${entry.assetId}::${entry.source}::${entry.channel}`;
            if (!byAssetSourceChannel.has(key)) {
                byAssetSourceChannel.set(key, {
                    asset: {
                        id: entry.assetId,
                        sku: entry.assetSku,
                        name: entry.assetName,
                    },
                    source: entry.source,
                    marketplaceName: entry.marketplaceName,
                    channel: entry.channel,
                    listings: [],
                });
            }
            byAssetSourceChannel.get(key).listings.push(...entry.listings);
        }
        // Write each (asset, source, channel) group, deduplicating by size
        for (const [, group] of byAssetSourceChannel) {
            // Dedup by size (keep lowest price per size)
            const bySize = new Map();
            for (const listing of group.listings) {
                const existing = bySize.get(listing.size);
                if (!existing || listing.price < existing.price) {
                    bySize.set(listing.size, listing);
                }
            }
            const deduped = Array.from(bySize.values());
            await writeListingsToFirestore(deduped, group.asset, group.source, group.marketplaceName, group.channel, batchId, today, 
            // Pass international pricing only for international channel
            group.channel === "international" ? intlPricing : undefined);
        }
        result.totalListings += storeResult.storeListingCount;
        result.byMarketplace[storeResult.storeSource] =
            (result.byMarketplace[storeResult.storeSource] || 0) +
                storeResult.storeListingCount;
        console.log(`[Orchestrator] ${storeResult.storeName}: ${storeResult.storeListingCount} listing(s) written`);
    }
    result.durationMs = Date.now() - startTime;
    console.log(`[Orchestrator] Scrape complete. ` +
        `${result.totalListings} listings from ${result.storesScraped} store(s). ` +
        `${totalUrls} product URLs fetched. ` +
        `${result.errors.length} error(s). ` +
        `Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    // 6. Write final progress + summary
    await updateProgress({
        status: "complete",
        phase: "done",
        completedAssets: allAssets.length,
        completedStores: storeCount,
        fetchedUrls: totalUrls,
        totalListings: result.totalListings,
        byMarketplace: result.byMarketplace,
        errors: result.errors.length,
        durationMs: result.durationMs,
        currentAssetName: "",
        currentMarketplace: "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    try {
        await db.collection("scrape_runs").doc(batchId).set(Object.assign(Object.assign({}, result), { completedAt: admin.firestore.FieldValue.serverTimestamp() }));
    }
    catch (err) {
        console.warn("[Orchestrator] Failed to write scrape run summary:", err);
    }
    return result;
}
// ── Write scraped listings to Firestore staging collection ───────────
async function writeListingsToFirestore(listings, asset, marketplaceId, marketplaceDisplayName, channel, batchId, batchDate, 
/** For international listings: the exchange rate and reshipping fee used */
intlPricing) {
    const db = getDb();
    const batch = db.batch();
    for (const listing of listings) {
        // For international listings, convert USD → INR and add reshipping fee
        let finalPrice = listing.price;
        let priceUsd = null;
        let reshippingCostUsd = null;
        let reshippingCostInr = null;
        let exchangeRate = null;
        if (channel === "international" && intlPricing) {
            priceUsd = listing.price; // Original USD price from scraper
            reshippingCostUsd = intlPricing.reshippingFeeUsd;
            exchangeRate = intlPricing.exchangeRate;
            reshippingCostInr = Math.round(reshippingCostUsd * exchangeRate);
            // Landed price in INR = (platform USD price + reshipping fee) × exchange rate
            finalPrice = Math.round((priceUsd + reshippingCostUsd) * exchangeRate);
        }
        const ref = db.collection("scraped_prices").doc();
        batch.set(ref, Object.assign(Object.assign(Object.assign({ 
            // Asset reference
            assetId: asset.id, assetSku: asset.sku, assetName: asset.name, 
            // Marketplace info
            marketplace: marketplaceId, marketplaceDisplayName,
            channel, 
            // Listing data (flattened for easy querying)
            sku: listing.sku, name: listing.name, size: listing.size, price: finalPrice, listingCount: listing.listingCount, url: listing.url || null, condition: listing.condition || "new", sellerName: listing.sellerName || null, image: listing.image || null, platformVariantId: listing.platformVariantId || null }, (listing.inStock !== undefined && listing.inStock !== null
            ? { inStock: listing.inStock }
            : {})), (channel === "international" && intlPricing
            ? {
                priceUsd,
                reshippingCostUsd,
                reshippingCostInr,
                exchangeRate,
            }
            : {})), { 
            // Review workflow
            status: "pending_review", batchId,
            batchDate, scrapedAt: admin.firestore.FieldValue.serverTimestamp(), 
            // Will be set when analyst reviews
            reviewedBy: null, reviewedAt: null }));
    }
    await batch.commit();
}
// ── Scrape a single asset (URL-direct) ───────────────────────────────
/**
 * Scrape all marketplace URLs for a single asset.
 * Reads the asset's pricePoints.marketplace[].url fields and fetches
 * each product page directly.
 */
async function scrapeAsset(assetId) {
    var _a;
    const db = getDb();
    const assetDoc = await db.collection("assets").doc(assetId).get();
    if (!assetDoc.exists) {
        throw new Error(`Asset ${assetId} not found`);
    }
    const data = assetDoc.data();
    const sku = data.sku || "";
    const name = data.name || "";
    // Extract unique product URLs from this asset's marketplace listings
    const urlMap = new Map();
    const sizes = data.sizes || [];
    for (const size of sizes) {
        const pricePoints = size.pricePoints;
        if (!pricePoints)
            continue;
        for (const listing of pricePoints.marketplace || []) {
            if (!listing.url)
                continue;
            const isCustom = (0, customScrapers_1.isCustomScraperUrl)(listing.url);
            let entryKey;
            let jsonUrl;
            if (isCustom) {
                try {
                    const url = new URL(listing.url);
                    url.search = "";
                    entryKey = url.toString();
                }
                catch (_b) {
                    entryKey = listing.url;
                }
                jsonUrl = entryKey;
            }
            else {
                const shopifyJsonUrl = (0, shopifyScraper_1.extractProductJsonUrl)(listing.url);
                if (!shopifyJsonUrl)
                    continue;
                entryKey = shopifyJsonUrl;
                jsonUrl = shopifyJsonUrl;
            }
            if (urlMap.has(entryKey))
                continue;
            let baseUrl;
            try {
                baseUrl = new URL(listing.url).origin;
            }
            catch (_c) {
                continue;
            }
            // Derive the correct source from the URL's hostname (same as orchestrator)
            const fallbackSrc = listing.source ||
                ((_a = listing.marketplaceName) === null || _a === void 0 ? void 0 : _a.toLowerCase().replace(/\s+/g, "")) ||
                "unknown";
            const fallbackName = listing.marketplaceName || listing.source || "Unknown Store";
            const resolved = resolveStoreFromUrl(listing.url, fallbackSrc, fallbackName);
            urlMap.set(entryKey, {
                jsonUrl,
                originalUrl: listing.url,
                baseUrl,
                source: resolved.source,
                marketplaceName: resolved.marketplaceName,
                isCustom,
            });
        }
    }
    console.log(`[scrapeAsset] Asset "${name}" (${sku}): found ${urlMap.size} unique product URL(s)`);
    const allListings = [];
    const errors = [];
    // Fetch each product URL
    for (const [, entry] of urlMap) {
        try {
            if (entry.isCustom) {
                // Custom (non-Shopify) scraper
                const customResult = await (0, customScrapers_1.fetchCustomProduct)(entry.jsonUrl, sku);
                if (customResult && customResult.listings.length > 0) {
                    allListings.push(...customResult.listings.map((l) => (Object.assign(Object.assign({}, l), { marketplace: customResult.storeId }))));
                }
            }
            else {
                // Shopify .json scraper
                const { product } = await (0, shopifyScraper_1.fetchProductByUrl)(entry.jsonUrl);
                if (product) {
                    const listings = (0, shopifyScraper_1.convertProductToListings)(product, sku, entry.source, entry.marketplaceName, entry.baseUrl);
                    allListings.push(...listings.map((l) => (Object.assign(Object.assign({}, l), { marketplace: entry.source }))));
                }
            }
        }
        catch (err) {
            errors.push(`${entry.source}: ${err.message}`);
        }
        // Light rate limiting
        await sleep(300);
    }
    console.log(`[scrapeAsset] Found ${allListings.length} listing(s) for "${name}" (${sku}) from ${urlMap.size} product URL(s)`);
    return { listings: allListings, errors };
}
// ── Get scraper status ───────────────────────────────────────────────
async function getScraperStatus() {
    var _a, _b, _c;
    const db = getDb();
    const assetsSnap = await db.collection("assets").get();
    // Count URLs per marketplace
    const storeStats = new Map();
    for (const doc of assetsSnap.docs) {
        const data = doc.data();
        for (const size of data.sizes || []) {
            // Scan both marketplace and international channels
            const allListings = [
                ...(((_a = size.pricePoints) === null || _a === void 0 ? void 0 : _a.marketplace) || []),
                ...(((_b = size.pricePoints) === null || _b === void 0 ? void 0 : _b.international) || []),
            ];
            for (const listing of allListings) {
                if (!listing.url)
                    continue;
                const source = listing.source ||
                    ((_c = listing.marketplaceName) === null || _c === void 0 ? void 0 : _c.toLowerCase().replace(/\s+/g, "")) ||
                    "unknown";
                let baseUrl;
                try {
                    baseUrl = new URL(listing.url).origin;
                }
                catch (_d) {
                    continue;
                }
                if (!storeStats.has(source)) {
                    storeStats.set(source, {
                        displayName: listing.marketplaceName || listing.source || "Unknown",
                        baseUrl,
                        urlCount: 0,
                    });
                }
                storeStats.get(source).urlCount++;
            }
        }
    }
    return Array.from(storeStats.entries())
        .map(([id, stats]) => ({
        id,
        displayName: stats.displayName,
        baseUrl: stats.baseUrl,
        urlCount: stats.urlCount,
        type: (0, customScrapers_1.isCustomScraperUrl)(stats.baseUrl + "/test")
            ? "custom (url-direct)"
            : "shopify (url-direct)",
    }))
        .sort((a, b) => b.urlCount - a.urlCount);
}
// ── Utility ──────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=orchestrator.js.map