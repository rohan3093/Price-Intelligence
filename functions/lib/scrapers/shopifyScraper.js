"use strict";
/**
 * Generic Shopify Scraper
 *
 * Works with ANY Shopify-based store by leveraging the standard
 * `/products.json` and `/search/suggest.json` endpoints that all
 * Shopify stores expose.
 *
 * Key learnings from real Indian marketplace stores:
 *  - Most stores don't use standard Nike/Adidas SKUs in their data
 *  - Search by product name is far more reliable than by SKU
 *  - Size can be in option1, option2, or option3 (varies per store)
 *  - `available` can be null for consignment items — treat as available
 *  - Tags rarely contain standard style codes
 *
 * To add a new Shopify marketplace, just add a config entry in
 * `marketplaceConfigs.ts` — no custom scraping code needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShopifyScraper = createShopifyScraper;
exports.scrapeShopifyStore = scrapeShopifyStore;
exports.scrapeStoreBulk = scrapeStoreBulk;
exports.extractProductJsonUrl = extractProductJsonUrl;
exports.fetchProductByUrl = fetchProductByUrl;
exports.convertProductToListings = convertProductToListings;
// ── Default helpers ──────────────────────────────────────────────────
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-IN,en;q=0.9",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
};
/**
 * Normalise variant size strings into a consistent "UK X" format.
 * Handles: "9", "UK 9", "UK9", "US 10", "EU 43", "7.5",
 *          "BLACK / UK 9" (CrepdogCrew style),
 *          "6 UK", "8.5 US" (number-first format),
 *          "UK 6(EU39)" (parenthetical EU annotation), etc.
 */
function defaultNormaliseSize(raw) {
    let trimmed = raw.trim();
    // Strip parenthetical EU size annotations like "UK 6(EU39)" → "UK 6"
    trimmed = trimmed.replace(/\s*\(EU\s?\d+(?:\.\d+)?\)/i, "");
    // Already in "UK X" format (e.g. "UK 9", "UK9", "uk 9.5")
    if (/^UK\s?\d/i.test(trimmed)) {
        return trimmed.replace(/^UK\s?/i, "UK ");
    }
    // Number-first UK format: "6 UK", "9.5 UK" → "UK 6", "UK 9.5"
    const numFirstUk = trimmed.match(/^(\d+(?:\.\d+)?)\s*UK$/i);
    if (numFirstUk) {
        return `UK ${numFirstUk[1]}`;
    }
    // Plain number (most common on Indian Shopify stores — usually UK sizes)
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return `UK ${trimmed}`;
    }
    // "US X" or "EU X" — keep as-is for now, analysts can normalise later
    if (/^(US|EU)\s?\d/i.test(trimmed)) {
        return trimmed.replace(/^(US|EU)\s?/i, (m) => m.trim().toUpperCase() + " ");
    }
    // Number-first US/EU format: "10 US", "43 EU" → "US 10", "EU 43"
    const numFirstOther = trimmed.match(/^(\d+(?:\.\d+)?)\s*(US|EU)$/i);
    if (numFirstOther) {
        return `${numFirstOther[2].toUpperCase()} ${numFirstOther[1]}`;
    }
    // Fallback — return as-is (still usable, won't be dropped)
    return trimmed;
}
/**
 * Extract the size value from a product variant.
 *
 * Shopify stores put the size in different option slots:
 *  - Some use option1 = Size (simple stores)
 *  - Some use option1 = Color, option2 = Size (CrepdogCrew)
 *  - Some use option names like "Sizes", "Shoe Size", "UK Size"
 *  - Some encode it in the variant title: "BLACK / UK 9"
 *
 * This function checks the product's `options` array to find which
 * option position contains a size-related name, then reads the correct
 * variant field.
 */
function extractSizeFromVariant(variant, product) {
    // Strategy 1: Use the product's options metadata to find any size-related option.
    //   Matches: "Size", "Sizes", "Shoe Size", "UK Size", "size", etc.
    if (product.options && product.options.length > 0) {
        const sizeOption = product.options.find((opt) => /size/i.test(opt.name));
        if (sizeOption) {
            const position = sizeOption.position; // 1, 2, or 3
            const value = position === 1
                ? variant.option1
                : position === 2
                    ? variant.option2
                    : variant.option3;
            if (value)
                return value;
        }
    }
    // Strategy 2: Check each option value for a UK/US/EU size pattern or plain number
    const options = [variant.option1, variant.option2, variant.option3];
    for (const opt of options) {
        if (!opt)
            continue;
        const trimmed = opt.trim();
        // Match: "UK 9", "US 10", "EU 43", "9", "9.5", "6 UK", "8.5 US"
        if (/UK\s?\d|US\s?\d|EU\s?\d|\d+\s*UK|\d+\s*US|\d+\s*EU|^\d+(\.\d+)?$/i.test(trimmed)) {
            return trimmed;
        }
    }
    // Strategy 3: Parse from variant title (e.g. "BLACK / UK 9", "BLACK / 9")
    if (variant.title) {
        const sizeMatch = variant.title.match(/\b(UK\s?\d[\d.]*|US\s?\d[\d.]*|EU\s?\d[\d.]*|\d+\.?\d*\s*UK|\d+\.?\d*\s*US|\d+\.?\d*\s*EU|\d+\.?\d*)\b/i);
        if (sizeMatch) {
            return sizeMatch[1];
        }
    }
    // Strategy 4: If product has only one option and it's not "Color"/"Colour",
    //   assume it's the size option
    if (product.options && product.options.length === 1) {
        const onlyOpt = product.options[0];
        if (!/colou?r|style|material/i.test(onlyOpt.name)) {
            const value = variant.option1;
            if (value && value.trim())
                return value.trim();
        }
    }
    console.warn(`[Shopify] Could not extract size from variant ${variant.id} (title: "${variant.title}", ` +
        `opt1: "${variant.option1}", opt2: "${variant.option2}", opt3: "${variant.option3}")`);
    return null;
}
/**
 * Normalise a product/asset name for comparison.
 * Strips common prefixes, articles, punctuation, and extra whitespace.
 */
function normaliseName(name) {
    return name
        .toLowerCase()
        .replace(/^(the|nike|air|adidas|new balance|puma|asics)\s+/i, "")
        .replace(/[''"`\-()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
/**
 * Extract key words from a product name for search.
 * Takes the asset name and produces a concise search query that
 * Indian Shopify stores will understand.
 *
 * e.g. "Air Jordan 1 Low Alternate Royal Toe" → "Jordan 1 Low Royal Toe"
 */
function assetNameToSearchQuery(assetName) {
    // Remove common prefixes that add noise to search
    let query = assetName
        .replace(/^Air\s+/i, "")
        .replace(/^Nike\s+/i, "")
        .replace(/^Adidas\s+/i, "")
        .replace(/[''"`()]/g, "")
        .trim();
    // If query is too long, take first 4-5 significant words
    const words = query.split(/\s+/);
    if (words.length > 5) {
        query = words.slice(0, 5).join(" ");
    }
    return query;
}
/**
 * Safely get tags as an array.
 * The `/products/{handle}.json` endpoint returns tags as a comma-separated
 * string, while `/search/suggest.json` returns them as an array.
 */
function getTagsArray(tags) {
    if (Array.isArray(tags))
        return tags;
    if (typeof tags === "string")
        return tags.split(",").map((t) => t.trim()).filter(Boolean);
    return [];
}
/**
 * Default asset matcher: fuzzy name matching.
 * Checks if the Shopify product is the same sneaker as the asset.
 */
function defaultMatchesAsset(product, assetName, sku) {
    const normalAsset = normaliseName(assetName);
    const normalProduct = normaliseName(product.title);
    // 1. Exact or near-exact name match
    if (normalProduct === normalAsset)
        return true;
    if (normalProduct.includes(normalAsset) || normalAsset.includes(normalProduct)) {
        return true;
    }
    // 2. Word-overlap scoring (most reliable for Indian stores where names differ slightly)
    //    e.g. "Jordan 1 Low OG Obsidian UNC" vs "Air Jordan 1 Low Obsidian UNC"
    const assetWords = normalAsset.split(/\s+/).filter((w) => w.length > 1);
    const productWords = new Set(normalProduct.split(/\s+/));
    const matchingWords = assetWords.filter((w) => productWords.has(w));
    const overlapRatio = assetWords.length > 0 ? matchingWords.length / assetWords.length : 0;
    if (overlapRatio >= 0.6)
        return true;
    // 3. Check SKU in tags, variant SKUs, title, or body_html
    if (sku) {
        const skuClean = sku.toLowerCase().replace(/[-\s]/g, "");
        // Check variant SKUs
        if (product.variants.some((v) => v.sku && v.sku.toLowerCase().replace(/[-\s]/g, "") === skuClean)) {
            return true;
        }
        // Check tags (handle both string and array formats)
        const tagsArr = getTagsArray(product.tags);
        if (tagsArr.some((tag) => tag.toLowerCase().replace(/[-\s]/g, "") === skuClean)) {
            return true;
        }
        // Check title contains SKU
        if (product.title.toLowerCase().replace(/[-\s]/g, "").includes(skuClean)) {
            return true;
        }
        // Check body_html contains SKU (some stores put it in the description)
        if (product.body_html &&
            product.body_html.toLowerCase().replace(/[-\s]/g, "").includes(skuClean)) {
            return true;
        }
    }
    return false;
}
// ── Core: fetch products from a Shopify store ────────────────────────
/**
 * Search for products on a Shopify store.
 *
 * Strategy:
 *  1. Try searching by SKU first (fast, precise — works on some stores)
 *  2. If no results, search by product name (works on all stores)
 *  3. Each result is validated against the asset name for accuracy
 */
async function fetchProducts(config, assetName, sku) {
    var _a, _b;
    const matchesAsset = config.matchesAsset || defaultMatchesAsset;
    const results = [];
    // Build search queries: try SKU first, then name-based queries
    const searchQueries = [];
    if (sku)
        searchQueries.push(sku);
    searchQueries.push(assetNameToSearchQuery(assetName));
    for (const searchQuery of searchQueries) {
        // Strategy 1: Search suggest endpoint (fast, targeted)
        try {
            const searchUrl = `${config.baseUrl}/search/suggest.json?q=${encodeURIComponent(searchQuery)}` +
                `&resources[type]=product&resources[limit]=10`;
            console.log(`[${config.id}] Searching: "${searchQuery}"`);
            const searchRes = await fetch(searchUrl, { headers: DEFAULT_HEADERS });
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const suggestedProducts = ((_b = (_a = searchData === null || searchData === void 0 ? void 0 : searchData.resources) === null || _a === void 0 ? void 0 : _a.results) === null || _b === void 0 ? void 0 : _b.products) || [];
                console.log(`[${config.id}] Search returned ${suggestedProducts.length} suggestion(s) for "${searchQuery}"`);
                // Fetch full product data for each handle (we need variants + options)
                for (const suggested of suggestedProducts) {
                    try {
                        const productUrl = `${config.baseUrl}/products/${suggested.handle}.json`;
                        const productRes = await fetch(productUrl, {
                            headers: DEFAULT_HEADERS,
                        });
                        if (productRes.ok) {
                            const data = await productRes.json();
                            if (data.product &&
                                matchesAsset(data.product, assetName, sku)) {
                                // Avoid duplicates
                                if (!results.find((r) => r.id === data.product.id)) {
                                    results.push(data.product);
                                }
                            }
                        }
                        await sleep(config.delayMs || 500);
                    }
                    catch (_c) {
                        // Individual product fetch failed — continue
                    }
                }
            }
        }
        catch (err) {
            console.warn(`[${config.id}] Search suggest failed for "${searchQuery}":`, err);
        }
        // If we found results with this query, no need to try more queries
        if (results.length > 0)
            break;
    }
    return results;
}
// ── Convert Shopify products to ScrapedListings ──────────────────────
function shopifyProductToListings(product, sku, config) {
    const normaliseSize = config.normaliseSize || defaultNormaliseSize;
    const listings = [];
    const image = product.images && product.images.length > 0
        ? product.images[0].src
        : undefined;
    const totalVariants = product.variants.length;
    let skippedNoPrice = 0;
    let skippedNoSize = 0;
    let inStockCount = 0;
    for (const variant of product.variants) {
        // Don't filter on `available` — consignment/marketplace stores often mark
        // variants as available=false even though they're purchasable. The price
        // check below is the reliable signal. We capture `available` as `inStock`
        // metadata instead.
        const isInStock = variant.available === true;
        if (isInStock)
            inStockCount++;
        const price = parseFloat(variant.price);
        if (isNaN(price) || price <= 0) {
            skippedNoPrice++;
            continue;
        }
        // Extract size from the correct option field
        const rawSize = extractSizeFromVariant(variant, product);
        if (!rawSize) {
            skippedNoSize++;
            continue;
        }
        const size = normaliseSize(rawSize);
        if (!size) {
            skippedNoSize++;
            continue;
        }
        listings.push({
            sku,
            name: product.title,
            size,
            price: Math.round(price),
            listingCount: 1,
            url: `${config.baseUrl}/products/${product.handle}?variant=${variant.id}`,
            condition: "new",
            sellerName: config.displayName,
            image,
            platformVariantId: `${config.id}-${variant.id}`,
            inStock: isInStock,
        });
    }
    // Always log — helps diagnose missing sizes
    const optionNames = (product.options || []).map((o) => o.name).join(", ");
    console.log(`[${config.id}] "${product.title}": ${totalVariants} variants → ` +
        `${listings.length} listings (${inStockCount} in-stock` +
        `${skippedNoPrice ? `, ${skippedNoPrice} no-price` : ""}` +
        `${skippedNoSize ? `, ${skippedNoSize} no-size` : ""})` +
        ` [options: ${optionNames || "none"}]`);
    return listings;
}
// ── Factory: create a MarketplaceScraper from a Shopify config ───────
function createShopifyScraper(config) {
    return {
        id: config.id,
        displayName: config.displayName,
        channel: config.channel,
        enabled: config.enabled,
        async scrapeBysku(sku, assetName) {
            const searchName = assetName || sku;
            console.log(`[${config.id}] Searching for "${searchName}" (SKU: ${sku}) on ${config.displayName}...`);
            const products = await fetchProducts(config, searchName, sku);
            return processProducts(products, sku, config);
        },
        async scrapeByQuery(queryStr) {
            console.log(`[${config.id}] Searching for "${queryStr}" on ${config.displayName}...`);
            const products = await fetchProducts(config, queryStr, "");
            return processProducts(products, "", config);
        },
    };
}
/**
 * Enhanced scrape function that uses both asset name and SKU.
 * Called directly by the orchestrator for better search results.
 */
async function scrapeShopifyStore(config, assetName, sku) {
    console.log(`[${config.id}] Searching for "${assetName}" (${sku}) on ${config.displayName}...`);
    const products = await fetchProducts(config, assetName, sku);
    return processProducts(products, sku, config);
}
// ── Shared post-processing ───────────────────────────────────────────
function processProducts(products, sku, config) {
    console.log(`[${config.id}] Found ${products.length} matching product(s)`);
    const allListings = [];
    for (const product of products) {
        const listings = shopifyProductToListings(product, sku, config);
        allListings.push(...listings);
    }
    // Deduplicate by size (keep lowest price per size)
    const bySize = new Map();
    for (const listing of allListings) {
        const existing = bySize.get(listing.size);
        if (!existing || listing.price < existing.price) {
            bySize.set(listing.size, listing);
        }
    }
    const deduped = Array.from(bySize.values());
    console.log(`[${config.id}] ${deduped.length} listings (${allListings.length} before dedup)`);
    return deduped;
}
// ── Bulk catalog scraping (10-50x faster) ────────────────────────────
/**
 * Fetch the entire product catalog from a Shopify store.
 *
 * Most Indian sneaker stores have 500–2,000 products, which fit in
 * 2–8 pages of 250 products each.  This eliminates the need for
 * per-asset search queries entirely.
 *
 * Shopify's standard `/products.json` endpoint supports pagination
 * and returns full product data including variants, options, and images.
 */
async function fetchFullCatalog(config) {
    const allProducts = [];
    let page = 1;
    const maxPages = 12; // Safety cap: 3,000 products max
    while (page <= maxPages) {
        try {
            const url = `${config.baseUrl}/products.json?limit=250&page=${page}`;
            console.log(`[${config.id}] Fetching catalog page ${page}...`);
            const res = await fetch(url, { headers: DEFAULT_HEADERS });
            if (!res.ok) {
                console.warn(`[${config.id}] Catalog page ${page} returned ${res.status}`);
                break;
            }
            const data = await res.json();
            const products = data.products || [];
            if (products.length === 0)
                break; // No more pages
            allProducts.push(...products);
            // If we got fewer than 250, that was the last page
            if (products.length < 250)
                break;
            page++;
            // Light delay between pages (same host rate limiting)
            await sleep(Math.min(config.delayMs || 400, 400));
        }
        catch (err) {
            console.warn(`[${config.id}] Catalog fetch failed at page ${page}:`, err);
            break;
        }
    }
    console.log(`[${config.id}] Catalog loaded: ${allProducts.length} products in ${page} page(s)`);
    return allProducts;
}
/**
 * Scrape ALL assets at once by pre-fetching the store's full catalog.
 *
 * Instead of making 1 search + N detail requests per asset (hundreds of
 * network calls), we fetch the entire catalog in 4–8 paginated requests
 * and match all assets against it locally in memory.
 *
 * Returns a map of assetId → ScrapedListing[].
 *
 * Performance:
 *   Before: 107 assets × 1 search + ~3 detail fetches = ~400+ requests  (~12s/asset)
 *   After:  4–8 catalog pages                          = ~8 requests     (~3s total)
 */
async function scrapeStoreBulk(config, assets) {
    const resultMap = new Map();
    const matchesAsset = config.matchesAsset || defaultMatchesAsset;
    // Step 1: Fetch entire catalog (the big win — 4–8 requests instead of hundreds)
    const catalog = await fetchFullCatalog(config);
    if (catalog.length === 0) {
        console.log(`[${config.id}] Empty catalog — skipping`);
        return resultMap;
    }
    // Step 2: For each asset, find matching products locally (instant, no network!)
    for (const asset of assets) {
        if (!asset.sku && !asset.name)
            continue;
        const matchingProducts = catalog.filter((product) => matchesAsset(product, asset.name, asset.sku));
        if (matchingProducts.length > 0) {
            const allListings = [];
            for (const product of matchingProducts) {
                const listings = shopifyProductToListings(product, asset.sku, config);
                allListings.push(...listings);
            }
            // Deduplicate by size (keep lowest price per size)
            const bySize = new Map();
            for (const listing of allListings) {
                const existing = bySize.get(listing.size);
                if (!existing || listing.price < existing.price) {
                    bySize.set(listing.size, listing);
                }
            }
            const deduped = Array.from(bySize.values());
            if (deduped.length > 0) {
                resultMap.set(asset.id, deduped);
            }
        }
    }
    console.log(`[${config.id}] Bulk scrape complete: matched ${resultMap.size}/${assets.length} assets, ` +
        `${Array.from(resultMap.values()).reduce((sum, l) => sum + l.length, 0)} total listings`);
    return resultMap;
}
// ── URL-Direct Scraping (v3) ─────────────────────────────────────────
//
// Instead of fetching entire catalogs or searching by name, we go
// DIRECTLY to the product URLs that analysts have already entered in
// each asset's pricePoints.marketplace[].url field.
//
// This is the fastest AND most accurate approach because:
//   1. The analyst has already validated the product→asset mapping
//   2. One request per unique product (not per store catalog)
//   3. Zero fuzzy matching — guaranteed correct product
//   4. Works for ANY Shopify store, no config needed
/**
 * Extract the Shopify product JSON URL from a full product page URL.
 *
 * Handles various URL formats:
 *  - https://www.crepdogcrew.com/products/jordan-1-low-royal-toe
 *  - https://www.crepdogcrew.com/products/jordan-1-low-royal-toe?variant=123
 *  - https://www.crepdogcrew.com/collections/jordan/products/jordan-1-low
 *
 * Returns: https://www.crepdogcrew.com/products/jordan-1-low-royal-toe.json
 */
function extractProductJsonUrl(fullUrl) {
    try {
        const url = new URL(fullUrl);
        const productsMatch = url.pathname.match(/\/products\/([^/?#]+)/);
        if (!productsMatch)
            return null;
        // Strip existing .json extension if present (avoid .json.json)
        const handle = productsMatch[1].replace(/\.json$/i, "");
        if (!handle)
            return null;
        return `${url.origin}/products/${handle}.json`;
    }
    catch (_a) {
        return null;
    }
}
/**
 * Fetch a single Shopify product by its product page URL.
 * Appends .json to get structured data with all variants, sizes, and prices.
 * Retries up to 2 times on transient failures (network errors, 429, 5xx).
 */
async function fetchProductByUrl(productPageUrl) {
    const jsonUrl = extractProductJsonUrl(productPageUrl);
    if (!jsonUrl) {
        console.warn(`[fetchProductByUrl] Could not extract JSON URL from: ${productPageUrl}`);
        return { product: null, jsonUrl: productPageUrl };
    }
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(jsonUrl, { headers: DEFAULT_HEADERS });
            if (res.ok) {
                const data = await res.json();
                return { product: data.product || null, jsonUrl };
            }
            const isRetryable = res.status === 429 || res.status >= 500;
            if (isRetryable && attempt < MAX_RETRIES) {
                const backoff = (attempt + 1) * 1000;
                console.warn(`[fetchProductByUrl] ${jsonUrl} returned ${res.status}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await sleep(backoff);
                continue;
            }
            console.warn(`[fetchProductByUrl] ${jsonUrl} returned ${res.status}`);
            return { product: null, jsonUrl };
        }
        catch (err) {
            if (attempt < MAX_RETRIES) {
                const backoff = (attempt + 1) * 1000;
                console.warn(`[fetchProductByUrl] ${jsonUrl} failed (${err.message}), retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await sleep(backoff);
                continue;
            }
            console.warn(`[fetchProductByUrl] Failed to fetch ${jsonUrl}:`, err);
            return { product: null, jsonUrl };
        }
    }
    return { product: null, jsonUrl };
}
/**
 * Convert a Shopify product to ScrapedListings using minimal store info.
 *
 * This is the URL-direct equivalent — no ShopifyStoreConfig needed,
 * just the store ID, name, and base URL (all extracted from the
 * analyst-entered URL).
 */
function convertProductToListings(product, sku, storeId, storeName, baseUrl) {
    return shopifyProductToListings(product, sku, {
        id: storeId,
        displayName: storeName,
        baseUrl,
        channel: "marketplace",
        enabled: true,
    });
}
// ── Utility ──────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=shopifyScraper.js.map