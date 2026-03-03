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

import { ScrapedListing } from "../types";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json",
};

// ── Types (from GOAT API) ─────────────────────────────────────────────

interface GoatProductTemplate {
  id: number;
  name: string;
  slug: string;
  sku: string;
  mainPictureUrl?: string;
  pictureUrl?: string;
  productTemplateExternalPictures?: Array<{ mainPictureUrl?: string }>;
  sizeUnit?: string; // "us"
  gender?: string[];
  singleGender?: string;
}

interface GoatVariant {
  size: number;
  sizeOption: { value: string; presentation: string };
  shoeCondition: string; // "new_no_defects" | "new_with_defects" | "used"
  boxCondition: string; // "good_condition" | "no_original_box" | "badly_damaged" | "missing_lid"
  lowestPriceCents: { currency: string; amount: number; amountUsdCents: number };
  instantShipLowestPriceCents?: { currency: string; amount?: number };
  lastSoldPriceCents?: { currency: string; amount?: number } | null;
  stockStatus?: string | null;
}

// ── Size conversion ───────────────────────────────────────────────────

function usToUkSize(usSize: number, gender?: string): string {
  // Women's: UK = US − 2  |  Men's/Unisex: UK = US − 1
  const offset = gender === "women" ? 2 : 1;
  const ukSize = usSize - offset;
  if (ukSize <= 0 || ukSize > 20) return "";

  // Format: "UK 9" or "UK 9.5"
  return `UK ${ukSize % 1 === 0 ? ukSize.toFixed(0) : ukSize.toFixed(1)}`;
}

// ── Slug extraction ───────────────────────────────────────────────────

function extractSlug(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    // /sneakers/air-jordan-1-retro-high-...-555088-134
    const segments = url.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug && slug.length > 3) return slug;
  } catch {
    // Invalid URL
  }
  return null;
}

// ── API calls ─────────────────────────────────────────────────────────

async function fetchProductTemplate(
  slug: string
): Promise<GoatProductTemplate | null> {
  const url = `https://www.goat.com/api/v1/product_templates/${slug}`;
  try {
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) {
      console.warn(`[GOAT] Template API returned ${res.status} for ${slug}`);
      return null;
    }
    const data = await res.json();
    if (!data || !data.id) return null;
    return data as GoatProductTemplate;
  } catch (err: any) {
    console.warn(`[GOAT] Template API failed for ${slug}: ${err.message}`);
    return null;
  }
}

async function fetchProductVariants(
  templateId: number
): Promise<GoatVariant[]> {
  const url = `https://www.goat.com/api/v1/product_variants?productTemplateId=${templateId}`;
  try {
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) {
      console.warn(
        `[GOAT] Variants API returned ${res.status} for template ${templateId}`
      );
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as GoatVariant[];
  } catch (err: any) {
    console.warn(
      `[GOAT] Variants API failed for template ${templateId}: ${err.message}`
    );
    return [];
  }
}

// ── Main fetch function ───────────────────────────────────────────────

export async function fetchGoatProduct(
  productUrl: string,
  assetSku: string
): Promise<ScrapedListing[]> {
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
    console.warn(
      `[GOAT] No variants returned for "${template.name}" (id: ${template.id})`
    );
    return [];
  }

  // Step 3: Per-size condition selection
  //   For each UK size, prefer the best condition tier with the lowest price:
  //     Tier 0 — Deadstock: new_no_defects + good_condition (best)
  //     Tier 1 — New, box issue: new_no_defects + any other box condition
  //     Tier 2 — New with defects: new_with_defects + any box condition
  //   Within the same tier, keep the lowest price.
  //   Skip used items entirely.

  const image =
    template.mainPictureUrl ||
    template.pictureUrl ||
    template.productTemplateExternalPictures?.[0]?.mainPictureUrl ||
    undefined;

  const gender = template.singleGender || "men";
  const pageUrl = `https://www.goat.com/sneakers/${slug}`;

  const byUkSize = new Map<
    string,
    { price: number; usSize: number; tier: number }
  >();

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
    if (
      variant.shoeCondition === "new_no_defects" &&
      variant.boxCondition === "good_condition"
    ) {
      tier = 0; // Perfect deadstock
    } else if (variant.shoeCondition === "new_no_defects") {
      tier = 1; // New shoe, box issue
    }

    const existing = byUkSize.get(ukSize);
    // Prefer better tier (lower number); within same tier, prefer lower price
    if (
      !existing ||
      tier < existing.tier ||
      (tier === existing.tier && priceUsd < existing.price)
    ) {
      byUkSize.set(ukSize, { price: priceUsd, usSize, tier });
    }
  }

  const listings: ScrapedListing[] = [];
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

  console.log(
    `[GOAT] "${template.name}": ${listings.length} listing(s) from ${allVariants.length} variants ` +
    `(skipped: ${skippedUsed} used, ${skippedNoPrice} no-price, ${skippedNoSize} no-size)`
  );
  return listings;
}
