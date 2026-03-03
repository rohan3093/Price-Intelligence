/**
 * HypeFly Scraper
 *
 * Extracts product data from HypeFly's __NEXT_DATA__ embedded JSON and
 * falls back to JSON-LD structured data.
 *
 * HypeFly migrated from Shopify to a custom Strapi CMS + Next.js setup
 * (circa early 2026). Each product page now contains:
 *   1. __NEXT_DATA__  → Strapi product with productVariants, prices, images
 *   2. JSON-LD        → schema.org Product with per-size Offer array
 *
 * We prefer __NEXT_DATA__ because it has richer variant info (quantity,
 * compare-at prices, shipping mode) but fall back to JSON-LD if parsing fails.
 *
 * URL format: https://hypefly.co.in/products/{slug}?variant={id}
 */

import { ScrapedListing } from "../types";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-IN,en;q=0.9",
};

// ── Size normalisation ────────────────────────────────────────────────

function normaliseSize(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\(EU\d+(\.\d+)?\)/i, "").trim();
  s = s.replace(/\(GS\)/i, "").trim();
  if (/^UK\s?\d/i.test(s)) {
    return s.replace(/^UK\s?/i, "UK ");
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    return `UK ${s}`;
  }
  return s;
}

// ── __NEXT_DATA__ extraction (Strapi CMS format) ─────────────────────

interface StrapiVariantPrice {
  id: number;
  shippingMode: string;
  salePrice: number;
  compareAtPrice: number | null;
}

interface StrapiVariant {
  id: number;
  size: string;
  quantity: number;
  prices: StrapiVariantPrice[];
}

interface StrapiImageAttr {
  url: string;
  name?: string;
  alternativeText?: string;
}

interface StrapiProduct {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  outOfStock?: boolean;
  lowestPrice?: number;
  productVariants: StrapiVariant[];
  images?: {
    data: Array<{ id: number; attributes: StrapiImageAttr }> | null;
  };
}

function parseNextData(html: string): StrapiProduct | null {
  const match = html.match(
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    const product =
      data?.props?.pageProps?.product ||
      data?.props?.pageProps?.data?.product;

    if (product && product.name && product.productVariants) {
      return product;
    }
  } catch {
    // Malformed JSON
  }
  return null;
}

// ── JSON-LD fallback ──────────────────────────────────────────────────

interface JsonLdOffer {
  "@type": "Offer";
  name?: string;
  sku?: string;
  price: string | number;
  priceCurrency?: string;
  availability?: string;
  url?: string;
}

interface JsonLdProduct {
  "@type": "Product";
  name: string;
  image?: string | string[];
  offers?:
    | { "@type": "AggregateOffer"; offers?: JsonLdOffer[] }
    | JsonLdOffer
    | JsonLdOffer[];
}

function parseJsonLd(html: string): JsonLdProduct | null {
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "Product") return data;
    } catch {
      // skip
    }
  }
  return null;
}

// ── Main fetch function ───────────────────────────────────────────────

export async function fetchHypeflyProduct(
  productUrl: string,
  assetSku: string
): Promise<ScrapedListing[]> {
  let fetchUrl: string;
  try {
    const url = new URL(productUrl);
    url.searchParams.delete("variant");
    fetchUrl = url.toString();
  } catch {
    fetchUrl = productUrl;
  }

  try {
    const res = await fetch(fetchUrl, { headers: DEFAULT_HEADERS });
    if (!res.ok) {
      console.warn(`[HypeFly] ${fetchUrl} returned ${res.status}`);
      return [];
    }

    const html = await res.text();

    // Strategy 1: __NEXT_DATA__ (Strapi CMS format)
    const strapiProduct = parseNextData(html);
    if (strapiProduct) {
      return convertStrapiToListings(strapiProduct, assetSku);
    }

    // Strategy 2: JSON-LD fallback
    const jsonLdProduct = parseJsonLd(html);
    if (jsonLdProduct) {
      return convertJsonLdToListings(jsonLdProduct, assetSku, fetchUrl);
    }

    console.warn(`[HypeFly] No extractable data found on ${fetchUrl}`);
    return [];
  } catch (err: any) {
    console.warn(
      `[HypeFly] Failed to fetch ${fetchUrl}: ${err.message}`
    );
    return [];
  }
}

function convertStrapiToListings(
  product: StrapiProduct,
  assetSku: string
): ScrapedListing[] {
  const imageData = product.images?.data;
  const image =
    imageData && imageData.length > 0
      ? imageData[0].attributes.url
      : undefined;

  const listings: ScrapedListing[] = [];
  let skippedNoPrice = 0;
  let skippedNoSize = 0;
  let inStockCount = 0;

  for (const variant of product.productVariants) {
    const isInStock = variant.quantity > 0;
    if (isInStock) inStockCount++;

    // Pick the lowest salePrice across shipping modes
    const validPrices = (variant.prices || [])
      .map((p) => p.salePrice)
      .filter((p) => p > 0);

    if (validPrices.length === 0) {
      skippedNoPrice++;
      continue;
    }
    const price = Math.min(...validPrices);

    const rawSize = variant.size;
    if (!rawSize) {
      skippedNoSize++;
      console.warn(
        `[HypeFly] Variant ${variant.id} has no size field`
      );
      continue;
    }

    const size = normaliseSize(rawSize);
    if (!size) {
      skippedNoSize++;
      continue;
    }

    listings.push({
      sku: assetSku,
      name: product.name,
      size,
      price: Math.round(price),
      listingCount: 1,
      url: `https://hypefly.co.in/products/${product.slug}?variant=${variant.id}`,
      condition: "new",
      sellerName: "HypeFly",
      image,
      platformVariantId: `hypefly-${variant.id}`,
      inStock: isInStock,
    });
  }

  console.log(
    `[HypeFly] "${product.name}" (__NEXT_DATA__): ${listings.length} listing(s) from ${product.productVariants.length} variants ` +
    `(${inStockCount} in-stock, skipped: ${skippedNoPrice} no-price, ${skippedNoSize} no-size)`
  );
  return listings;
}

function convertJsonLdToListings(
  product: JsonLdProduct,
  assetSku: string,
  pageUrl: string
): ScrapedListing[] {
  const image = Array.isArray(product.image)
    ? product.image[0]
    : product.image || undefined;

  // Handle three formats:
  // 1. offers: [ {Offer}, {Offer} ]          (HypeFly's actual format)
  // 2. offers: { AggregateOffer, offers: [] } (standard Schema.org)
  // 3. offers: {Offer}                        (single offer)
  let offers: JsonLdOffer[] = [];

  if (Array.isArray(product.offers)) {
    offers = product.offers;
  } else if (
    product.offers &&
    typeof product.offers === "object" &&
    "@type" in product.offers
  ) {
    if (
      product.offers["@type"] === "AggregateOffer" &&
      "offers" in product.offers
    ) {
      offers = (product.offers as any).offers || [];
    } else if (product.offers["@type"] === "Offer") {
      offers = [product.offers as JsonLdOffer];
    }
  }

  if (offers.length === 0) {
    console.warn(`[HypeFly] JSON-LD: no offers found for "${product.name}"`);
    return [];
  }

  const listings: ScrapedListing[] = [];
  let inStockCount = 0;

  for (const offer of offers) {
    // Don't filter on availability — consignment stores mark items OutOfStock
    // even when purchasable. Capture as inStock metadata instead.
    const isInStock = !(
      offer.availability &&
      offer.availability.includes("OutOfStock")
    );
    if (isInStock) inStockCount++;

    const price =
      typeof offer.price === "string"
        ? parseFloat(offer.price)
        : offer.price;
    if (isNaN(price) || price <= 0) continue;

    // Extract size from offer name, SKU, or URL.
    const rawSize = extractSizeFromOffer(offer);
    if (!rawSize) {
      console.warn(
        `[HypeFly] Could not extract size from offer: ` +
        `name="${offer.name}", sku="${offer.sku}", url="${offer.url}"`
      );
      continue;
    }

    const size = normaliseSize(rawSize);
    if (!size) continue;

    listings.push({
      sku: assetSku,
      name: product.name,
      size,
      price: Math.round(price),
      listingCount: 1,
      url: offer.url || pageUrl,
      condition: "new",
      sellerName: "HypeFly",
      image,
      platformVariantId: `hypefly-${offer.sku || offer.name}`,
      inStock: isInStock,
    });
  }

  console.log(
    `[HypeFly] "${product.name}" (JSON-LD): ${listings.length} listing(s) from ${offers.length} offers ` +
    `(${inStockCount} in-stock)`
  );
  return listings;
}

/**
 * Extract a size string from a JSON-LD offer using multiple strategies.
 */
function extractSizeFromOffer(offer: JsonLdOffer): string {
  // Strategy 1: Last segment after "-" in offer name (most common)
  //   "Air Jordan 1 Low-UK 7" → "UK 7"
  //   "Air Jordan 1 Low - 9.5" → "9.5"
  if (offer.name) {
    const dashIdx = offer.name.lastIndexOf("-");
    if (dashIdx >= 0) {
      const candidate = offer.name.substring(dashIdx + 1).trim();
      if (looksLikeSize(candidate)) return candidate;
    }
  }

  // Strategy 2: Last segment after "-" in SKU
  //   "553558-140-UK 7" → "UK 7"
  if (offer.sku) {
    const dashIdx = offer.sku.lastIndexOf("-");
    if (dashIdx >= 0) {
      const candidate = offer.sku.substring(dashIdx + 1).trim();
      if (looksLikeSize(candidate)) return candidate;
    }
  }

  // Strategy 3: Regex match for UK/US/EU size anywhere in name or SKU
  for (const field of [offer.name, offer.sku]) {
    if (!field) continue;
    const match = field.match(
      /\b(UK\s?\d[\d.]*|US\s?\d[\d.]*|EU\s?\d[\d.]*)\b/i
    );
    if (match) return match[1];
  }

  // Strategy 4: Extract from URL query params (?size=UK7)
  if (offer.url) {
    try {
      const url = new URL(offer.url);
      const sizeParam = url.searchParams.get("size");
      if (sizeParam && looksLikeSize(sizeParam)) return sizeParam;
    } catch {
      // Invalid URL — skip
    }
  }

  // Strategy 5: Plain number at the end of name (e.g. "Product Name 9.5")
  if (offer.name) {
    const trailingNum = offer.name.match(/\b(\d+(?:\.\d+)?)\s*$/);
    if (trailingNum) return trailingNum[1];
  }

  return "";
}

/** Quick check: does a string look like a shoe size? */
function looksLikeSize(s: string): boolean {
  if (!s) return false;
  const t = s.trim();
  // "UK 9", "US 10.5", "EU 43", "9", "9.5", "UK9", "6 UK"
  return /^(UK|US|EU)?\s?\d+(\.\d+)?(\s*(UK|US|EU))?$/i.test(t);
}

