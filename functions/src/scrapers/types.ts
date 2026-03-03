/**
 * Shared types for the marketplace scraper framework.
 *
 * Every scraper (Shopify-based or custom) implements the MarketplaceScraper
 * interface.  The orchestrator calls `scrapeBysku()` for each tracked asset
 * and writes the results to a Firestore staging collection where analysts
 * review them before they go live.
 */

// ── Channel / marketplace enums (mirrors src/types but kept standalone
//    so Cloud Functions don't depend on the frontend) ─────────────────

export type MarketChannel = "whatsapp" | "marketplace" | "international";

export type IndianMarketplace =
  | "crepdogcrew"
  | "mainstreet"
  | "culturecircle"
  | "hypefly"
  | "dawntown"
  | "10hillsstudio"
  | "findyourkicks"
  | "instagram"
  | "facebook"
  | "other";

// ── Scraped listing (raw output from a scraper) ─────────────────────

export interface ScrapedListing {
  /** The SKU we searched for */
  sku: string;
  /** Product name as listed on the site */
  name: string;
  /** Normalised size string, e.g. "UK 9" */
  size: string;
  /** Price in INR */
  price: number;
  /** Quantity available at this price (default 1) */
  listingCount: number;
  /** Direct link to the listing / product page */
  url?: string;
  /** Condition of the product */
  condition?: "new" | "used" | "deadstock";
  /** Seller / store name if available */
  sellerName?: string;
  /** Product image URL */
  image?: string;
  /** Original variant ID from the platform (for dedup) */
  platformVariantId?: string;
  /**
   * Whether the store physically holds this item in stock.
   *   - true  = in the store's warehouse / ready to ship
   *   - false = listed by a seller but not confirmed in-hand
   *   - null/undefined = unknown (e.g. StockX/GOAT where this distinction doesn't apply)
   *
   * On consignment platforms (CrepdogCrew, 10 Hills Studio, HypeFly, etc.)
   * this maps to Shopify's `variant.available` field.
   */
  inStock?: boolean | null;
}

// ── Scraper interface ────────────────────────────────────────────────

export interface MarketplaceScraper {
  /** Unique marketplace identifier (matches IndianMarketplace type) */
  id: string;
  /** Human-readable name shown to analysts */
  displayName: string;
  /** Which channel this marketplace belongs to */
  channel: MarketChannel;
  /** Whether the scraper is currently active */
  enabled: boolean;
  /**
   * Scrape all listings for a given asset.
   * @param sku        Standard style code (e.g. "553558-042")
   * @param assetName  Full asset name (e.g. "Air Jordan 1 Low Alternate Royal Toe")
   *                   — many Indian marketplaces don't index by SKU so name-based
   *                   search is the primary strategy.
   */
  scrapeBysku(sku: string, assetName?: string): Promise<ScrapedListing[]>;
  /** Optional: scrape by free-text query (fallback when SKU search fails) */
  scrapeByQuery?(query: string): Promise<ScrapedListing[]>;
}

// ── Scraped price document stored in Firestore ───────────────────────

export type ScrapedPriceStatus = "pending_review" | "approved" | "rejected";

export interface ScrapedPriceDoc {
  /** Firestore asset document ID */
  assetId: string;
  /** SKU that was searched */
  assetSku: string;
  /** Marketplace scraper ID */
  marketplace: string;
  /** Human-readable marketplace name */
  marketplaceDisplayName: string;
  /** Channel category */
  channel: MarketChannel;
  /** Raw scraped listing data */
  listing: ScrapedListing;
  /** Review status */
  status: ScrapedPriceStatus;
  /** When the scrape ran */
  scrapedAt: FirebaseFirestore.FieldValue | Date;
  /** Which scrape batch this belongs to (for grouping) */
  batchId?: string;
}

// ── Orchestrator result summary ──────────────────────────────────────

export interface ScrapeRunResult {
  /** Total listings found across all marketplaces */
  totalListings: number;
  /** Listings per marketplace */
  byMarketplace: Record<string, number>;
  /** Assets that were scraped */
  assetsScraped: number;
  /** Errors encountered (non-fatal) */
  errors: string[];
  /** Batch ID for this run */
  batchId: string;
  /** Duration in ms */
  durationMs: number;
}

