"use strict";
/**
 * GOAT Scraper — REST API approach
 *
 * GOAT exposes two public API endpoints that work without any browser
 * impersonation or Cloudflare bypass:
 *
 *   1. GET /api/v1/product_templates/{slug}
 *      → Returns product metadata (name, id, sku, image, sizeOptions)
 *
 *   2. GET /api/v1/product_variants?productTemplateId={id}
 *      → Returns all size-level pricing (lowest ask, condition, etc.)
 *
 * URL format analysts enter:
 *   https://www.goat.com/sneakers/air-jordan-1-retro-high-og-university-blue-555088-134
 *
 * We extract the slug from the URL, call the two endpoints, and produce
 * ScrapedListing[] with size-level prices.
 *
 * Sizing:
 *   GOAT uses US Men's sizing. We convert to UK: UK = US − 1.
 *   Half sizes are preserved (e.g. US 10.5 → UK 9.5).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGoatProduct = fetchGoatProduct;
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/json",
};
// ── Size conversion ───────────────────────────────────────────────────
function usToUkSize(usSize, gender) {
    // Women's: UK = US − 2  |  Men's/Unisex: UK = US − 1
    const offset = gender === "women" ? 2 : 1;
    const ukSize = usSize - offset;
    if (ukSize <= 0 || ukSize > 20)
        return "";
    // Format: "UK 9" or "UK 9.5"
    return `UK ${ukSize % 1 === 0 ? ukSize.toFixed(0) : ukSize.toFixed(1)}`;
}
// ── Slug extraction ───────────────────────────────────────────────────
function extractSlug(productUrl) {
    try {
        const url = new URL(productUrl);
        // /sneakers/air-jordan-1-retro-high-...-555088-134
        const segments = url.pathname.split("/").filter(Boolean);
        const slug = segments[segments.length - 1];
        if (slug && slug.length > 3)
            return slug;
    }
    catch (_a) {
        // Invalid URL
    }
    return null;
}
// ── API calls ─────────────────────────────────────────────────────────
async function fetchProductTemplate(slug) {
    const url = `https://www.goat.com/api/v1/product_templates/${slug}`;
    try {
        const res = await fetch(url, { headers: DEFAULT_HEADERS });
        if (!res.ok) {
            console.warn(`[GOAT] Template API returned ${res.status} for ${slug}`);
            return null;
        }
        const data = await res.json();
        if (!data || !data.id)
            return null;
        return data;
    }
    catch (err) {
        console.warn(`[GOAT] Template API failed for ${slug}: ${err.message}`);
        return null;
    }
}
async function fetchProductVariants(templateId) {
    const url = `https://www.goat.com/api/v1/product_variants?productTemplateId=${templateId}`;
    try {
        const res = await fetch(url, { headers: DEFAULT_HEADERS });
        if (!res.ok) {
            console.warn(`[GOAT] Variants API returned ${res.status} for template ${templateId}`);
            return [];
        }
        const data = await res.json();
        if (!Array.isArray(data))
            return [];
        return data;
    }
    catch (err) {
        console.warn(`[GOAT] Variants API failed for template ${templateId}: ${err.message}`);
        return [];
    }
}
// ── Main fetch function ───────────────────────────────────────────────
async function fetchGoatProduct(productUrl, assetSku) {
    var _a, _b;
    const slug = extractSlug(productUrl);
    if (!slug) {
        console.warn(`[GOAT] Could not extract slug from ${productUrl}`);
        return [];
    }
    // Step 1: Get product metadata (name, id, image)
    const template = await fetchProductTemplate(slug);
    if (!template) {
        console.warn(`[GOAT] No product template found for slug: ${slug}`);
        return [];
    }
    // Step 2: Get all size-level pricing
    const allVariants = await fetchProductVariants(template.id);
    if (allVariants.length === 0) {
        console.warn(`[GOAT] No variants returned for "${template.name}" (id: ${template.id})`);
        return [];
    }
    // Step 3: Per-size condition selection
    //   For each UK size, prefer the best condition tier with the lowest price:
    //     Tier 0 — Deadstock: new_no_defects + good_condition (best)
    //     Tier 1 — New, box issue: new_no_defects + any other box condition
    //     Tier 2 — New with defects: new_with_defects + any box condition
    //   Within the same tier, keep the lowest price.
    //   Skip used items entirely.
    const image = template.mainPictureUrl ||
        template.pictureUrl ||
        ((_b = (_a = template.productTemplateExternalPictures) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.mainPictureUrl) ||
        undefined;
    const gender = template.singleGender || "men";
    const pageUrl = `https://www.goat.com/sneakers/${slug}`;
    const byUkSize = new Map();
    let skippedUsed = 0;
    let skippedNoPrice = 0;
    let skippedNoSize = 0;
    for (const variant of allVariants) {
        // Skip used items
        if (!variant.shoeCondition.startsWith("new")) {
            skippedUsed++;
            continue;
        }
        if (!variant.lowestPriceCents || variant.lowestPriceCents.amount <= 0) {
            skippedNoPrice++;
            continue;
        }
        const usSize = variant.size;
        const ukSize = usToUkSize(usSize, gender);
        if (!ukSize) {
            skippedNoSize++;
            continue;
        }
        const priceUsd = Math.round(variant.lowestPriceCents.amount / 100);
        if (priceUsd <= 0) {
            skippedNoPrice++;
            continue;
        }
        // Determine condition tier
        let tier = 2; // new_with_defects
        if (variant.shoeCondition === "new_no_defects" &&
            variant.boxCondition === "good_condition") {
            tier = 0; // Perfect deadstock
        }
        else if (variant.shoeCondition === "new_no_defects") {
            tier = 1; // New shoe, box issue
        }
        const existing = byUkSize.get(ukSize);
        // Prefer better tier (lower number); within same tier, prefer lower price
        if (!existing ||
            tier < existing.tier ||
            (tier === existing.tier && priceUsd < existing.price)) {
            byUkSize.set(ukSize, { price: priceUsd, usSize, tier });
        }
    }
    const listings = [];
    for (const [ukSize, data] of byUkSize) {
        listings.push({
            sku: assetSku,
            name: template.name,
            size: ukSize,
            price: data.price,
            listingCount: 1,
            url: pageUrl,
            condition: "new",
            sellerName: "GOAT",
            image,
            platformVariantId: `goat-${template.id}-${data.usSize}`,
            inStock: true, // Every GOAT listing with a price has active sellers
        });
    }
    console.log(`[GOAT] "${template.name}": ${listings.length} listing(s) from ${allVariants.length} variants ` +
        `(skipped: ${skippedUsed} used, ${skippedNoPrice} no-price, ${skippedNoSize} no-size)`);
    return listings;
}
//# sourceMappingURL=goat.js.map