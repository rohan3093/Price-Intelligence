"use strict";
/**
 * StockX Scraper — GraphQL API approach
 *
 * StockX exposes a GraphQL API at gateway.stockx.com/api/graphql.
 * (The old /api/p/e reverse proxy was retired in late 2025.)
 *
 * Product IDs are now UUIDs, so we first resolve the URL slug to a
 * UUID via `browse(query:)`, then fetch full variant data via
 * `product(id: UUID)`.
 *
 * The endpoint requires TLS fingerprint impersonation to bypass
 * protection. We use `got-scraping` (ESM, loaded via dynamic import)
 * which handles this automatically.
 *
 * URL format analysts enter:
 *   https://stockx.com/nike-air-force-1-low-white-07
 *   https://stockx.com/air-jordan-1-low-alternate-royal-toe
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStockXProduct = fetchStockXProduct;
// ── GraphQL queries ───────────────────────────────────────────────────
const BROWSE_QUERY = `
  query Browse($query: String!) {
    browse(query: $query) {
      results {
        edges {
          node {
            ... on Product {
              id
              title
              urlKey
            }
          }
        }
      }
    }
  }
`.trim();
const PRODUCT_QUERY = `
  query GetProduct($id: String!, $currencyCode: CurrencyCode) {
    product(id: $id) {
      id
      title
      urlKey
      media {
        imageUrl
        smallImageUrl
      }
      market(currencyCode: $currencyCode) {
        bidAskData {
          lowestAsk
          highestBid
        }
      }
      variants {
        id
        sizeChart {
          baseSize
          displayOptions {
            size
            type
          }
        }
        market(currencyCode: $currencyCode) {
          bidAskData {
            lowestAsk
            highestBid
            numberOfAsks
            numberOfBids
          }
          salesInformation {
            lastSale
          }
        }
      }
    }
  }
`.trim();
const STOCKX_API_URL = "https://gateway.stockx.com/api/graphql";
const STOCKX_HEADERS = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "apollographql-client-name": "Iron",
    "apollographql-client-version": "2025.12.08.00",
    "app-platform": "Iron",
    "app-version": "2025.12.08.00",
    Origin: "https://stockx.com",
};
// ── Slug extraction ───────────────────────────────────────────────────
function extractSlug(productUrl) {
    try {
        const url = new URL(productUrl);
        // Remove locale prefix if present: /en-gb/nike-air-force-1... → nike-air-force-1...
        const segments = url.pathname.split("/").filter(Boolean);
        // The product slug is typically the last segment (or after locale)
        const slug = segments[segments.length - 1];
        if (slug && slug.length > 3 && !slug.includes("."))
            return slug;
    }
    catch (_a) {
        // Invalid URL
    }
    return null;
}
// ── Size normalisation ────────────────────────────────────────────────
function extractUkSize(displayOptions, baseSize) {
    // Strategy 1: Direct UK size from displayOptions
    const ukOpt = displayOptions.find((o) => o.type === "uk");
    if (ukOpt) {
        let size = ukOpt.size.trim();
        // StockX format: "UK 6 (EU 39)" → strip parenthetical EU
        size = size.replace(/\s*\(EU\s*\d+(?:\.\d+)?\)/, "").trim();
        // Ensure "UK " prefix
        if (!size.startsWith("UK ")) {
            size = `UK ${size}`;
        }
        return size;
    }
    // Strategy 2: Convert US Men's → UK (US − 1)
    const usOpt = displayOptions.find((o) => o.type === "us m" || o.type === "us" || o.type === "us men");
    if (usOpt) {
        const usNum = parseFloat(usOpt.size);
        if (!isNaN(usNum) && usNum > 1) {
            const uk = usNum - 1;
            return `UK ${uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1)}`;
        }
    }
    // Strategy 3: Use baseSize as US and convert
    if (baseSize) {
        const num = parseFloat(baseSize);
        if (!isNaN(num) && num > 1) {
            const uk = num - 1;
            return `UK ${uk % 1 === 0 ? uk.toFixed(0) : uk.toFixed(1)}`;
        }
    }
    return "";
}
// ── got-scraping loader (ESM dynamic import) ──────────────────────────
let _gotScraping = null;
async function getGotScraping() {
    if (!_gotScraping) {
        const mod = await Function('return import("got-scraping")')();
        _gotScraping = mod.gotScraping;
    }
    return _gotScraping;
}
// ── GraphQL helpers ───────────────────────────────────────────────────
async function gqlRequest(gotScraping, operationName, query, variables) {
    var _a;
    const res = await gotScraping({
        url: STOCKX_API_URL,
        method: "POST",
        headers: STOCKX_HEADERS,
        body: JSON.stringify({ operationName, variables, query }),
        timeout: { request: 20000 },
    });
    if (res.statusCode !== 200) {
        throw new Error(`HTTP ${res.statusCode}`);
    }
    const data = JSON.parse(res.body);
    if ((_a = data.errors) === null || _a === void 0 ? void 0 : _a.length) {
        throw new Error(data.errors[0].message);
    }
    return data.data;
}
/**
 * Resolve a URL slug to a StockX product UUID.
 *
 * StockX switched from slug-based to UUID-based product IDs (late 2025).
 * We use the browse query to search, then match on urlKey.
 */
async function resolveSlugToUuid(gotScraping, slug) {
    var _a, _b;
    try {
        const data = await gqlRequest(gotScraping, "Browse", BROWSE_QUERY, { query: slug });
        const edges = ((_b = (_a = data === null || data === void 0 ? void 0 : data.browse) === null || _a === void 0 ? void 0 : _a.results) === null || _b === void 0 ? void 0 : _b.edges) || [];
        if (edges.length === 0) {
            console.warn(`[StockX] Browse returned 0 results for "${slug}"`);
            return null;
        }
        // Prefer exact urlKey match
        const exact = edges.find((e) => e.node.urlKey === slug);
        if (exact)
            return exact.node.id;
        // Fall back to first result (browse ranks by relevance)
        console.log(`[StockX] No exact urlKey match for "${slug}", using best match: "${edges[0].node.urlKey}"`);
        return edges[0].node.id;
    }
    catch (err) {
        console.warn(`[StockX] Browse failed for "${slug}": ${err.message}`);
        return null;
    }
}
async function fetchStockXGraphQL(slug, currencyCode = "USD") {
    const gotScraping = await getGotScraping();
    // Step 1: Resolve slug → UUID
    const uuid = await resolveSlugToUuid(gotScraping, slug);
    if (!uuid) {
        console.warn(`[StockX] Could not resolve UUID for slug: ${slug}`);
        return null;
    }
    // Step 2: Fetch full product data by UUID
    try {
        const data = await gqlRequest(gotScraping, "GetProduct", PRODUCT_QUERY, { id: uuid, currencyCode });
        return (data === null || data === void 0 ? void 0 : data.product) || null;
    }
    catch (err) {
        console.warn(`[StockX] Product fetch failed for ${slug} (${uuid}): ${err.message}`);
        return null;
    }
}
// ── Main fetch function ───────────────────────────────────────────────
async function fetchStockXProduct(productUrl, assetSku) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const slug = extractSlug(productUrl);
    if (!slug) {
        console.warn(`[StockX] Could not extract slug from ${productUrl}`);
        return [];
    }
    const product = await fetchStockXGraphQL(slug);
    if (!product) {
        console.warn(`[StockX] No product data for slug: ${slug}`);
        return [];
    }
    const image = ((_a = product.media) === null || _a === void 0 ? void 0 : _a.imageUrl) || ((_b = product.media) === null || _b === void 0 ? void 0 : _b.smallImageUrl) || undefined;
    const pageUrl = `https://stockx.com/${product.urlKey || slug}`;
    const listings = [];
    let skippedNoAsk = 0;
    let skippedZeroAsks = 0;
    let skippedNoSize = 0;
    for (const variant of product.variants) {
        const lowestAsk = (_d = (_c = variant.market) === null || _c === void 0 ? void 0 : _c.bidAskData) === null || _d === void 0 ? void 0 : _d.lowestAsk;
        if (!lowestAsk || lowestAsk <= 0) {
            skippedNoAsk++;
            continue;
        }
        // Skip variants with 0 asks (no one is actually selling)
        if (((_f = (_e = variant.market) === null || _e === void 0 ? void 0 : _e.bidAskData) === null || _f === void 0 ? void 0 : _f.numberOfAsks) === 0) {
            skippedZeroAsks++;
            continue;
        }
        const ukSize = extractUkSize(((_g = variant.sizeChart) === null || _g === void 0 ? void 0 : _g.displayOptions) || [], (_h = variant.sizeChart) === null || _h === void 0 ? void 0 : _h.baseSize);
        if (!ukSize) {
            skippedNoSize++;
            console.warn(`[StockX] Could not extract UK size for variant ${variant.id}, ` +
                `baseSize: ${(_j = variant.sizeChart) === null || _j === void 0 ? void 0 : _j.baseSize}, ` +
                `displayOptions: ${JSON.stringify(((_k = variant.sizeChart) === null || _k === void 0 ? void 0 : _k.displayOptions) || [])}`);
            continue;
        }
        listings.push({
            sku: assetSku,
            name: product.title,
            size: ukSize,
            price: Math.round(lowestAsk),
            listingCount: ((_m = (_l = variant.market) === null || _l === void 0 ? void 0 : _l.bidAskData) === null || _m === void 0 ? void 0 : _m.numberOfAsks) || 1,
            url: pageUrl,
            condition: "new",
            sellerName: "StockX",
            image,
            platformVariantId: `stockx-${variant.id}`,
            inStock: true, // Every StockX listing with a lowestAsk has active sellers
        });
    }
    console.log(`[StockX] "${product.title}": ${listings.length} listing(s) from ${product.variants.length} variants ` +
        `(skipped: ${skippedNoAsk} no-ask, ${skippedZeroAsks} zero-asks, ${skippedNoSize} no-size)`);
    return listings;
}
//# sourceMappingURL=stockx.js.map