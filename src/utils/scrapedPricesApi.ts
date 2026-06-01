/**
 * Scraped Prices API
 *
 * Firestore queries for the scraped_prices collection.
 * Used by the ScrapedPricesReview component in the Analyst Dashboard.
 *
 * Flow:
 *   Scraper → scraped_prices (status: pending_review)
 *   Analyst reviews → approve / reject / edit
 *   Approve → writes price into live asset's pricePoints.marketplace[]
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  limit,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase";
import { PricePoint } from "../types";

// ── Types ────────────────────────────────────────────────────────────

export interface ScrapedPrice {
  id: string; // Firestore doc ID

  // Asset reference
  assetId: string;
  assetSku: string;
  assetName: string;

  // Marketplace info
  marketplace: string;
  marketplaceDisplayName: string;
  channel: string;

  // Listing data
  sku: string;
  name: string; // Product name on the marketplace (may differ from asset name)
  size: string;
  price: number;
  listingCount: number;
  url: string | null;
  condition: string;
  sellerName: string | null;
  image: string | null;
  platformVariantId: string | null;

  /**
   * Whether the store physically holds this item in stock.
   *   - true  = in the store's warehouse / ready to ship
   *   - false = listed by a seller but not confirmed in-hand
   *   - null/undefined = unknown
   */
  inStock?: boolean | null;

  // Review workflow
  status: "pending_review" | "approved" | "rejected" | "edited";
  batchId: string;
  batchDate: string;
  scrapedAt: Timestamp | null;

  // International pricing breakdown (only for channel === "international")
  priceUsd?: number | null; // Original USD price from platform
  platformFeeUsd?: number | null; // Platform buyer fees (processing + shipping) in USD
  exchangeRate?: number | null; // USD→INR rate used for conversion
  // Legacy fields from old reshipping model (kept for backward compat with existing docs)
  reshippingCostUsd?: number | null;
  reshippingCostInr?: number | null;
  reshippingCost?: number;

  // Analyst review
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  editedPrice?: number; // If analyst edited the price
}

export interface ScrapedPriceGroup {
  assetId: string;
  assetName: string;
  assetSku: string;
  image: string | null;
  listings: ScrapedPrice[];
}

export interface ScrapeRun {
  id: string;
  totalListings: number;
  byMarketplace: Record<string, number>;
  assetsScraped: number;
  errors: string[];
  batchId: string;
  durationMs: number;
  completedAt: Timestamp | null;
}

// ── Queries ──────────────────────────────────────────────────────────

/**
 * Get count of pending review items (for badge)
 */
export async function getPendingReviewCount(): Promise<number> {
  if (!db) return 0;
  try {
    const q = query(
      collection(db, "scraped_prices"),
      where("status", "==", "pending_review")
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Failed to get pending review count:", error);
    return 0;
  }
}

/**
 * Fetch all scraped prices with a given status.
 * Default: pending_review
 *
 * For pending_review: fetches ALL items (no limit) since the orchestrator
 * cleans up old pending items before each new scrape, keeping the count
 * manageable (~10-15K max). For "all": caps at maxResults to avoid huge reads.
 *
 * Note: We avoid orderBy("scrapedAt") in the composite query because
 * it requires a composite index that may take time to build. Instead
 * we sort client-side after fetching.
 */
export async function fetchScrapedPrices(
  status: "pending_review" | "approved" | "rejected" | "all" = "pending_review",
  maxResults: number = 5000
): Promise<ScrapedPrice[]> {
  if (!db) return [];

  try {
    let q;
    if (status === "all") {
      q = query(
        collection(db, "scraped_prices"),
        orderBy("scrapedAt", "desc"),
        limit(maxResults)
      );
    } else {
      // No limit for pending_review — the orchestrator deletes old pending
      // items before each scrape, so there's only one batch worth of data.
      // This ensures ALL sizes from ALL stores are visible for review.
      q = query(
        collection(db, "scraped_prices"),
        where("status", "==", status)
      );
    }

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ScrapedPrice[];

    // Sort client-side (descending by scrapedAt)
    results.sort((a, b) => {
      const ta = a.scrapedAt?.seconds ?? 0;
      const tb = b.scrapedAt?.seconds ?? 0;
      return tb - ta;
    });

    return results;
  } catch (error) {
    console.error("Failed to fetch scraped prices:", error);
    return [];
  }
}

/**
 * Group scraped prices by asset for easier review.
 */
export function groupByAsset(prices: ScrapedPrice[]): ScrapedPriceGroup[] {
  const groups = new Map<string, ScrapedPriceGroup>();

  for (const price of prices) {
    if (!groups.has(price.assetId)) {
      groups.set(price.assetId, {
        assetId: price.assetId,
        assetName: price.assetName,
        assetSku: price.assetSku,
        image: price.image,
        listings: [],
      });
    }
    groups.get(price.assetId)!.listings.push(price);
  }

  // Sort groups by number of listings (most first)
  return Array.from(groups.values()).sort(
    (a, b) => b.listings.length - a.listings.length
  );
}

/**
 * Approve a scraped price — marks it as approved.
 * The caller is responsible for writing the price into the live asset.
 */
export async function approveScrapedPrice(
  docId: string,
  reviewerEmail: string
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const ref = doc(db, "scraped_prices", docId);
  await updateDoc(ref, {
    status: "approved",
    reviewedBy: reviewerEmail,
    reviewedAt: Timestamp.now(),
  });
}

/**
 * Reject a scraped price.
 */
export async function rejectScrapedPrice(
  docId: string,
  reviewerEmail: string
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const ref = doc(db, "scraped_prices", docId);
  await updateDoc(ref, {
    status: "rejected",
    reviewedBy: reviewerEmail,
    reviewedAt: Timestamp.now(),
  });
}

/**
 * Approve a scraped price with an edited price value.
 */
export async function approveWithEdit(
  docId: string,
  editedPrice: number,
  reviewerEmail: string
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");

  const ref = doc(db, "scraped_prices", docId);
  await updateDoc(ref, {
    status: "edited",
    editedPrice,
    reviewedBy: reviewerEmail,
    reviewedAt: Timestamp.now(),
  });
}

/**
 * Bulk approve all scraped prices from a specific marketplace.
 * Uses writeBatch for atomic, fast updates.
 */
export async function bulkApproveByMarketplace(
  marketplace: string,
  reviewerEmail: string
): Promise<number> {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "scraped_prices"),
    where("status", "==", "pending_review"),
    where("marketplace", "==", marketplace)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const batchSize = 400;
  let count = 0;

  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(i, i + batchSize);

    for (const docSnap of chunk) {
      batch.update(docSnap.ref, {
        status: "approved",
        reviewedBy: reviewerEmail,
        reviewedAt: Timestamp.now(),
      });
      count++;
    }

    await batch.commit();
  }

  return count;
}

/**
 * Bulk approve all pending listings for a specific asset.
 * Uses writeBatch for atomic, fast updates (instead of sequential updateDoc).
 */
export async function bulkApproveByAsset(
  assetId: string,
  reviewerEmail: string
): Promise<number> {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "scraped_prices"),
    where("status", "==", "pending_review"),
    where("assetId", "==", assetId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  // Use writeBatch for atomic, fast updates (max 500 per batch)
  const batchSize = 400;
  let count = 0;

  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(i, i + batchSize);

    for (const docSnap of chunk) {
      batch.update(docSnap.ref, {
        status: "approved",
        reviewedBy: reviewerEmail,
        reviewedAt: Timestamp.now(),
      });
      count++;
    }

    await batch.commit();
  }

  return count;
}

/**
 * Convert a scraped price to a PricePoint that can be added to an asset's
 * price points (marketplace or international, based on channel).
 */
export function scrapedPriceToPricePoint(scraped: ScrapedPrice): PricePoint {
  return {
    price: scraped.editedPrice || scraped.price,
    listingCount: scraped.listingCount,
    lastSeen: scraped.scrapedAt?.toDate() || new Date(),
    channel: scraped.channel === "international" ? "international" : "marketplace",
    source: scraped.marketplace,
    marketplaceName: scraped.marketplaceDisplayName,
    sellerName: scraped.sellerName || undefined,
    size: scraped.size,
    url: scraped.url || undefined,
    condition: (scraped.condition as "new" | "used" | "deadstock") || "new",
  };
}

/**
 * Write approved scraped prices into the live asset's sizes[].pricePoints
 *
 * Channel-aware:
 *   - channel "marketplace" → writes to pricePoints.marketplace[]
 *   - channel "international" → writes to pricePoints.international[]
 *
 * For each ScrapedPrice:
 *   1. Find the matching size entry in the asset's `sizes` array
 *   2. If the size exists, merge the new PricePoint into the correct channel array
 *      (replacing any existing entry from the same source for that size)
 *   3. If the size doesn't exist, create a new SizeVariant with defaults
 *   4. Write the updated `sizes` and `lastUpdated` back to Firestore
 */
export async function writeScrapedPricesToAsset(
  assetId: string,
  approvedPrices: ScrapedPrice[]
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  if (approvedPrices.length === 0) return;

  const assetRef = doc(db, "assets", assetId);
  const assetSnap = await getDoc(assetRef);

  if (!assetSnap.exists()) {
    console.warn(`[writeScrapedPricesToAsset] Asset ${assetId} not found`);
    return;
  }

  const data = assetSnap.data();
  const sizes: any[] = data.sizes || [];

  for (const scraped of approvedPrices) {
    // Determine which channel array to write to
    const channel = scraped.channel === "international" ? "international" : "marketplace";

    // Build a clean PricePoint for Firestore
    const newPoint: any = {
      price: scraped.editedPrice || scraped.price,
      listingCount: scraped.listingCount || 1,
      lastSeen: scraped.scrapedAt ? (typeof scraped.scrapedAt.toDate === 'function' ? scraped.scrapedAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString(),
      channel,
      source: scraped.marketplace,
      marketplaceName: scraped.marketplaceDisplayName,
      sellerName: scraped.sellerName || null,
      size: scraped.size,
      url: scraped.url || null,
      condition: scraped.condition || "new",
    };

    // For international prices, store the USD breakdown for reference.
    // Note: price already includes platform buyer fees (processing + shipping),
    // so no separate reshippingCost is needed.
    if (channel === "international") {
      newPoint.priceUsd = scraped.priceUsd ?? null;
      newPoint.exchangeRate = scraped.exchangeRate ?? null;
    }

    // Find matching size entry
    let sizeEntry = sizes.find(
      (s: any) => s.size === scraped.size
    );

    if (!sizeEntry) {
      // Create a new size entry with channel-based pricePoints
      sizeEntry = {
        size: scraped.size,
        b2bMarketPrice: "",
        endCustomerMarketPrice: "",
        stockxGoatPrice: "",
        fairRange: "",
        confidence: 0,
        change30d: "",
        change90d: "",
        liquidity: "",
        volumeLabel: "",
        pricePoints: {
          whatsapp: [],
          marketplace: [],
          international: [],
        },
      };
      sizes.push(sizeEntry);
    }

    // Ensure pricePoints structure exists
    if (!sizeEntry.pricePoints) {
      sizeEntry.pricePoints = {
        whatsapp: [],
        marketplace: [],
        international: [],
      };
    }
    // Ensure the target channel array exists
    if (!(channel in sizeEntry.pricePoints)) {
      sizeEntry.pricePoints[channel] = [];
    }

    const targetArray: any[] = sizeEntry.pricePoints[channel];

    // Remove any existing entry from the same source for this size
    // (to avoid duplicates — we always want the freshest data per source)
    const existingIdx = targetArray.findIndex(
      (p: any) => p.source === scraped.marketplace
    );
    if (existingIdx >= 0) {
      targetArray.splice(existingIdx, 1);
    }

    // Add the new point
    targetArray.push(newPoint);
  }

  // Write back to Firestore
  await updateDoc(assetRef, {
    sizes,
    lastUpdated: new Date().toISOString(),
  });

  console.log(
    `[writeScrapedPricesToAsset] Wrote ${approvedPrices.length} price(s) to asset ${assetId}`
  );
}

/**
 * Fetch recent scrape runs for the history view.
 */
export async function fetchScrapeRuns(maxResults: number = 10): Promise<ScrapeRun[]> {
  if (!db) return [];

  try {
    const q = query(
      collection(db, "scrape_runs"),
      orderBy("completedAt", "desc"),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScrapeRun[];
  } catch (error) {
    console.error("Failed to fetch scrape runs:", error);
    return [];
  }
}

