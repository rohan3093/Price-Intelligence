"use strict";
/**
 * FindYourKicks Scraper
 *
 * Extracts product data from FindYourKicks' React Server Components (RSC) stream.
 *
 * FindYourKicks is a Next.js app that embeds product data inside
 * `self.__next_f.push()` script blocks as escaped JSON within an RSC payload.
 *
 * The product object contains:
 *   - name, slug, colourway, releasedate, brand
 *   - thumbnail_img → { file_name: "uploads/all/…" }
 *   - vendor_products[] → each vendor's price for a specific size
 *     {
 *       price: 8850,
 *       product_stock_id: { variant: "UK 9.5", variant_id: 20 },
 *       vendor_product_id: 102845,
 *       vendor_product_qty: 1,
 *       vendor_name: "Vihaan Soni"
 *     }
 *
 * Since multiple vendors may list the same size, we take the LOWEST price
 * for each unique size.
 *
 * Image base URL: https://cdn.findyourkicks.com/
 * Page URL format: https://findyourkicks.com/product/{slug}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFindYourKicksProduct = fetchFindYourKicksProduct;
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-IN,en;q=0.9",
};
const FYK_CDN_BASE = "https://cdn.findyourkicks.com/";
// ── Size normalisation ────────────────────────────────────────────────
function normaliseSize(raw) {
    let s = raw.trim();
    // Ensure "UK " prefix
    if (/^UK\s?\d/i.test(s)) {
        return s.replace(/^UK\s?/i, "UK ");
    }
    if (/^\d+(\.\d+)?$/.test(s)) {
        return `UK ${s}`;
    }
    return s;
}
// ── RSC payload extraction ────────────────────────────────────────────
/**
 * Extract the product object from the RSC `self.__next_f.push()` stream.
 *
 * The data sits inside a large escaped-JSON payload. We look for the
 * `"vendor_products":[…]` pattern and extract the surrounding product object.
 */
function extractProductFromRsc(html) {
    // Strategy: find the escaped JSON containing vendor_products
    // The RSC stream has double-escaped quotes: \"key\":\"value\"
    const vpIdx = html.indexOf('\\"vendor_products\\"');
    if (vpIdx < 0)
        return null;
    // Walk backwards to find the start of the product object: {"id":
    // The product object starts with {"id":NNNN,"name":...
    const productIdPattern = '\\"product\\":{';
    let searchStart = Math.max(0, vpIdx - 5000);
    let objStart = html.indexOf(productIdPattern, searchStart);
    // If not found with "product":{, try to find {"id": pattern closer to vendor_products
    if (objStart < 0 || objStart > vpIdx) {
        // Try a simpler approach: look for {"id": before vendor_products
        const simplePattern = '{\\"id\\":';
        let pos = vpIdx;
        while (pos > searchStart) {
            pos = html.lastIndexOf(simplePattern, pos - 1);
            if (pos < 0)
                break;
            // Verify this is the product object (should have "name" and "slug" nearby)
            const nextChunk = html.substring(pos, pos + 200);
            if (nextChunk.includes('\\"name\\"') && nextChunk.includes('\\"slug\\"')) {
                objStart = pos;
                break;
            }
        }
    }
    else {
        // Advance past "product":{ to point at the actual object
        objStart += productIdPattern.length - 1; // Point at {
    }
    if (objStart < 0) {
        console.warn("[FindYourKicks] Could not find product object start");
        return null;
    }
    // Find the end of vendor_products array (]}) and then the end of the product object
    // We need to balance braces
    let depth = 0;
    let objEnd = -1;
    for (let i = objStart; i < html.length && i < objStart + 20000; i++) {
        const char = html[i];
        // Skip escaped characters
        if (char === "\\" && i + 1 < html.length && html[i + 1] === "\\") {
            i++; // Skip escape
            continue;
        }
        if (char === "{")
            depth++;
        if (char === "}") {
            depth--;
            if (depth === 0) {
                objEnd = i + 1;
                break;
            }
        }
    }
    if (objEnd < 0) {
        console.warn("[FindYourKicks] Could not find product object end");
        return null;
    }
    const rawJson = html.substring(objStart, objEnd);
    // Unescape the JSON: \" → "
    const unescaped = rawJson.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    try {
        const product = JSON.parse(unescaped);
        if (product.name && product.vendor_products) {
            return product;
        }
    }
    catch (err) {
        // The brace-matching might have gone wrong. Try a regex approach.
        console.warn(`[FindYourKicks] JSON parse failed, trying regex fallback: ${err.message}`);
    }
    // Regex fallback: extract vendor_products array directly
    return extractProductRegexFallback(html, vpIdx);
}
function extractProductRegexFallback(html, vpIdx) {
    try {
        // Extract name
        const nameMatch = html.match(/\\"name\\":\\"([^"\\]*(?:\\.[^"\\]*)*)\\"/);
        const name = nameMatch ? nameMatch[1].replace(/\\"/g, '"') : "Unknown";
        // Extract slug
        const slugMatch = html.match(/\\"slug\\":\\"([^"\\]*(?:\\.[^"\\]*)*)\\"/);
        const slug = slugMatch ? slugMatch[1] : "";
        // Extract thumbnail
        const thumbMatch = html.match(/\\"file_name\\":\\"(uploads\/all\/[^"\\]*)\\"/);
        const thumbnail = thumbMatch ? thumbMatch[1] : undefined;
        // Extract vendor_products array as string
        const vpStart = html.indexOf("[", vpIdx);
        if (vpStart < 0)
            return null;
        let depth = 0;
        let vpEnd = -1;
        for (let i = vpStart; i < html.length && i < vpStart + 10000; i++) {
            if (html[i] === "[")
                depth++;
            if (html[i] === "]") {
                depth--;
                if (depth === 0) {
                    vpEnd = i + 1;
                    break;
                }
            }
        }
        if (vpEnd < 0)
            return null;
        const vpRaw = html
            .substring(vpStart, vpEnd)
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        const vendorProducts = JSON.parse(vpRaw);
        return {
            id: 0,
            name,
            slug,
            thumbnail_img: thumbnail ? { file_name: thumbnail } : undefined,
            vendor_products: vendorProducts,
        };
    }
    catch (err) {
        console.warn(`[FindYourKicks] Regex fallback also failed: ${err.message}`);
        return null;
    }
}
// ── Main fetch function ───────────────────────────────────────────────
async function fetchFindYourKicksProduct(productUrl, assetSku) {
    var _a, _b;
    try {
        const res = await fetch(productUrl, { headers: DEFAULT_HEADERS });
        if (!res.ok) {
            console.warn(`[FindYourKicks] ${productUrl} returned ${res.status}`);
            return [];
        }
        const html = await res.text();
        const product = extractProductFromRsc(html);
        if (!product) {
            console.warn(`[FindYourKicks] Could not extract product data from ${productUrl}`);
            return [];
        }
        if (!product.vendor_products || product.vendor_products.length === 0) {
            console.warn(`[FindYourKicks] "${product.name}" has no vendor listings`);
            return [];
        }
        const image = product.thumbnail_img
            ? `${FYK_CDN_BASE}${product.thumbnail_img.file_name}`
            : undefined;
        // Group vendor listings by size and take the LOWEST price for each.
        // Don't filter on qty — even if qty=0, the listing and its price are
        // valuable intelligence. Track whether ANY vendor has stock per size.
        const bestBySize = new Map();
        let skippedNoPrice = 0;
        let skippedNoSize = 0;
        for (const vp of product.vendor_products) {
            if (vp.price <= 0) {
                skippedNoPrice++;
                continue;
            }
            const rawSize = (_a = vp.product_stock_id) === null || _a === void 0 ? void 0 : _a.variant;
            if (!rawSize) {
                skippedNoSize++;
                console.warn(`[FindYourKicks] Vendor product ${vp.vendor_product_id} has no variant/size`);
                continue;
            }
            const size = normaliseSize(rawSize);
            if (!size) {
                skippedNoSize++;
                continue;
            }
            const hasStock = vp.vendor_product_qty > 0;
            const existing = bestBySize.get(size);
            if (!existing || vp.price < existing.price) {
                bestBySize.set(size, {
                    price: vp.price,
                    vendor: vp,
                    anyInStock: hasStock || ((_b = existing === null || existing === void 0 ? void 0 : existing.anyInStock) !== null && _b !== void 0 ? _b : false),
                });
            }
            else if (hasStock && !existing.anyInStock) {
                // Same price bucket but this vendor has stock
                existing.anyInStock = true;
            }
        }
        const listings = [];
        let inStockCount = 0;
        for (const [size, { price, vendor, anyInStock }] of bestBySize) {
            if (anyInStock)
                inStockCount++;
            listings.push({
                sku: assetSku,
                name: product.name,
                size,
                price: Math.round(price),
                listingCount: 1,
                url: `https://findyourkicks.com/product/${product.slug}`,
                condition: "new",
                sellerName: "FindYourKicks",
                image,
                platformVariantId: `fyk-${vendor.vendor_product_id}`,
                inStock: anyInStock,
            });
        }
        console.log(`[FindYourKicks] "${product.name}": ${listings.length} size(s) from ${product.vendor_products.length} vendor listing(s) ` +
            `(${inStockCount} in-stock, skipped: ${skippedNoPrice} no-price, ${skippedNoSize} no-size)`);
        return listings;
    }
    catch (err) {
        console.warn(`[FindYourKicks] Failed to fetch ${productUrl}: ${err.message}`);
        return [];
    }
}
//# sourceMappingURL=findYourKicks.js.map