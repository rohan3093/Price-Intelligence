/**
 * Culture Circle Scraper
 *
 * Extracts product data from Culture Circle's JSON-LD structured data.
 *
 * Culture Circle embeds standard schema.org Product JSON-LD in every product page,
 * including an AggregateOffer with individual Offer objects per size. This gives us:
 *   - Product name, brand, image
 *   - Every available size with its price and availability
 *   - Direct URLs per size variant
 *
 * URL format: https://www.culture-circle.com/products/all/{slug}?size=UK6
 * Data source: <script type="application/ld+json"> (3rd block — Product type)
 */

import { ScrapedListing } from "../types";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-IN,en;q=0.9",
};

// ── JSON-LD types ─────────────────────────────────────────────────────

interface JsonLdOffer {
  "@type": "Offer";
  name: string; // e.g. "UK12", "UK8", "UK5(GS)"
  price: string | number;
  priceCurrency: string;
  sku?: string;
  availability: string; // "https://schema.org/InStock" or "https://schema.org/OutOfStock"
  url?: string;
}

interface JsonLdProduct {
  "@type": "Product";
  name: string;
  image?: string[];
  brand?: { "@type": "Brand"; name: string };
  sku?: string;
  description?: string;
  offers?: {
    "@type": "AggregateOffer";
    lowPrice?: string | number;
    highPrice?: string | number;
    offerCount?: string | number;
    offers?: JsonLdOffer[];
  };
}

// ── Size normalisation ────────────────────────────────────────────────

function normaliseSize(raw: string): string {
  let s = raw.trim();
  // Strip "(GS)" suffix — grade school sizing
  s = s.replace(/\(GS\)/i, "").trim();
  // Ensure "UK " prefix
  if (/^UK\s?\d/i.test(s)) {
    return s.replace(/^UK\s?/i, "UK ");
  }
  // Plain number
  if (/^\d+(\.\d+)?$/.test(s)) {
    return `UK ${s}`;
  }
  return s;
}

// ── Main fetch function ───────────────────────────────────────────────

/**
 * Fetch product data from a Culture Circle product page.
 *
 * @param productUrl  The full product page URL (with or without ?size= param)
 * @param assetSku    The asset's SKU (passed through to ScrapedListing)
 * @returns           Array of ScrapedListings (one per available size)
 */
export async function fetchCultureCircleProduct(
  productUrl: string,
  assetSku: string
): Promise<ScrapedListing[]> {
  // Strip size query param — we want ALL sizes from JSON-LD
  let fetchUrl: string;
  try {
    const url = new URL(productUrl);
    url.searchParams.delete("size");
    fetchUrl = url.toString();
  } catch {
    fetchUrl = productUrl;
  }

  try {
    const res = await fetch(fetchUrl, { headers: DEFAULT_HEADERS });
    if (!res.ok) {
      console.warn(
        `[CultureCircle] ${fetchUrl} returned ${res.status}`
      );
      return [];
    }

    const html = await res.text();

    // Extract all JSON-LD blocks
    const jsonLdBlocks: string[] = [];
    const regex =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      jsonLdBlocks.push(match[1]);
    }

    // Find the Product-type JSON-LD block
    let product: JsonLdProduct | null = null;
    for (const block of jsonLdBlocks) {
      try {
        const data = JSON.parse(block);
        if (data["@type"] === "Product") {
          product = data;
          break;
        }
      } catch {
        // Malformed JSON — skip
      }
    }

    if (!product) {
      console.warn(
        `[CultureCircle] No Product JSON-LD found on ${fetchUrl}`
      );
      return [];
    }

    // Extract listings from offers
    const offers = product.offers?.offers || [];
    if (offers.length === 0) {
      console.warn(
        `[CultureCircle] Product "${product.name}" has no size offers`
      );
      return [];
    }

    const image = product.image?.[0] || undefined;
    const listings: ScrapedListing[] = [];
    let skippedNoPrice = 0;
    let skippedNoSize = 0;
    let inStockCount = 0;

    for (const offer of offers) {
      // Don't filter on availability — consignment stores may mark items
      // OutOfStock even when purchasable. Capture as inStock metadata.
      const isInStock = !(
        offer.availability &&
        offer.availability.includes("OutOfStock")
      );
      if (isInStock) inStockCount++;

      const price =
        typeof offer.price === "string"
          ? parseFloat(offer.price)
          : offer.price;
      if (isNaN(price) || price <= 0) {
        skippedNoPrice++;
        continue;
      }

      const size = normaliseSize(offer.name);
      if (!size) {
        skippedNoSize++;
        console.warn(
          `[CultureCircle] Could not normalise size from offer name: "${offer.name}"`
        );
        continue;
      }

      listings.push({
        sku: assetSku,
        name: product.name,
        size,
        price: Math.round(price),
        listingCount: 1,
        url: offer.url || fetchUrl,
        condition: "new",
        sellerName: "Culture Circle",
        image,
        platformVariantId: `culturecircle-${offer.sku || offer.name}`,
        inStock: isInStock,
      });
    }

    console.log(
      `[CultureCircle] "${product.name}": ${listings.length} listing(s) from ${offers.length} offers ` +
      `(${inStockCount} in-stock, skipped: ${skippedNoPrice} no-price, ${skippedNoSize} no-size)`
    );
    return listings;
  } catch (err: any) {
    console.warn(
      `[CultureCircle] Failed to fetch ${fetchUrl}: ${err.message}`
    );
    return [];
  }
}

