/**
 * Public request/response shapes for the /scrape endpoint.
 *
 * The shape of `ScrapedListing` mirrors `functions/src/scrapers/types.ts`
 * so the Firebase Function side can pass results straight through to
 * Firestore without any field re-mapping.
 */

export type SiteId = "stockx" | "goat";

export interface ScrapeRequestEntry {
  /** The original product page URL (or slug-bearing URL) the orchestrator wants scraped. */
  url: string;
  /** Asset SKU to stamp onto every returned listing (orchestrator dedups per asset+source). */
  sku: string;
}

export interface ScrapeRequest {
  site: SiteId;
  entries: ScrapeRequestEntry[];
}

export interface ScrapedListing {
  sku: string;
  name: string;
  size: string;
  /** USD for international (stockx/goat); INR for marketplace stores. */
  price: number;
  listingCount: number;
  url?: string;
  condition?: string;
  sellerName?: string;
  image?: string;
  platformVariantId?: string;
  inStock?: boolean;
}

export interface ScrapeResultEntry {
  /** Echoes back the request URL so the orchestrator can correlate. */
  url: string;
  success: boolean;
  listings: ScrapedListing[];
  /** Short, human-readable failure cause when success=false. */
  error?: string;
  /** Time spent on this single entry (page nav + parsing). */
  durationMs: number;
}

export interface ScrapeResponse {
  site: SiteId;
  /** Total time spent on the whole batch (incl. browser warmup). */
  totalDurationMs: number;
  /** True if the browser launched and the batch completed; per-entry success is in `results`. */
  ok: boolean;
  results: ScrapeResultEntry[];
}
