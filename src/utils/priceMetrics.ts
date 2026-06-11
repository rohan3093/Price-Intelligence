/**
 * Price Metrics Calculator
 * 
 * Automatically calculates price changes, best available prices, and other metrics
 * from listing data for market overview and analytics.
 */

import { Asset, PricePoint, SizeVariant } from "../types";

// Absolute floor for plausible INR quotes. Anything at or below this is treated
// as a data artefact (₹1 / ₹10 scrape noise) and excluded before any min /
// median / mark / spread math. Mark price and spread consume validated quotes only.
export const MIN_PLAUSIBLE_PRICE = 1000;

// Reject a quote below this fraction of the asset's reference (retail or median).
// Catches "₹1,718 on a ₹15k shoe" that the flat ₹1000 floor misses. Low-side only.
export const RELATIVE_FLOOR_PCT = 0.35;

// When no REAL 30d history exists, show a labelled "vs retail" (off mark) instead
// of a blank. Set false to show "—" until real history accrues.
export const SHOW_VS_RETAIL_WHEN_NO_HISTORY = true;

/** Keep only finite, positive quotes at or above the absolute plausibility floor. */
export function filterPlausiblePrices(prices: number[]): number[] {
  return prices.filter(
    (p) => typeof p === "number" && isFinite(p) && p >= MIN_PLAUSIBLE_PRICE
  );
}

/** Median of a numeric list (sorted copy). Returns undefined for empty input. */
function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Derive a reference price for the relative floor: analyst-entered retailIndia
 * when it is itself plausible, else the median of floor-passing asks. Used only
 * to reject absurdly-low quotes — never to fabricate a price or a change.
 */
export function referencePrice(
  retailIndia: number | undefined,
  askPrices: number[]
): number | undefined {
  if (retailIndia && retailIndia >= MIN_PLAUSIBLE_PRICE) return retailIndia;
  return median(filterPlausiblePrices(askPrices));
}

/**
 * Validate quotes against both the absolute floor and a relative floor.
 * Low-side only: high quotes are NEVER capped (international landed cost is
 * legitimately high). When no reference exists, falls back to the absolute floor.
 */
export function filterValidQuotes(
  prices: number[],
  reference: number | undefined
): number[] {
  const floored = filterPlausiblePrices(prices);
  if (reference === undefined) return floored;
  const relFloor = RELATIVE_FLOOR_PCT * reference;
  return floored.filter((p) => p >= relFloor);
}

export type MarkPriceMode = "mid" | "ask-median" | "bid-only";

export interface MarkMetrics {
  /** Lowest validated ask (WTS + marketplace + international landed). */
  bestAsk?: number;
  /** Highest validated bid (WhatsApp WTB). */
  bestBid?: number;
  /** Reference mark price; see MarkPriceMode for derivation. */
  markPrice?: number;
  /** How markPrice was derived. Undefined when no validated quotes exist. */
  markMode?: MarkPriceMode;
  /** Absolute spread (bestAsk − bestBid); only when both sides exist. */
  spreadAbs?: number;
  /** Spread as a fraction of mark price; only when both sides exist. */
  spreadPct?: number;
  /** True when only one side of the book has validated quotes. */
  oneSided: boolean;
  /** Count of validated asks / bids that fed the math. */
  askCount: number;
  bidCount: number;
}

/**
 * Compute exchange-style mark price and spread from raw quote prices.
 *
 * Operates on VALIDATED, floor-filtered quotes only:
 *   bestAsk  = min of validated ask-side prices
 *   bestBid  = max of validated bid-side prices
 *   markPrice:
 *     both sides -> (bestBid + bestAsk) / 2     (mid)
 *     asks only  -> median of validated asks    (ask-median)
 *     bids only  -> bestBid                      (bid-only, indicative)
 *   spreadAbs = bestAsk − bestBid ; spreadPct = spreadAbs / markPrice
 *
 * @param askPrices raw ask-side prices (intl should already be landed cost)
 * @param bidPrices raw bid-side prices (WhatsApp WTB)
 * @param retailIndia analyst-entered retail, used to anchor the relative floor
 */
export function computeMarkMetrics(
  askPrices: number[],
  bidPrices: number[],
  retailIndia?: number
): MarkMetrics {
  const reference = referencePrice(retailIndia, askPrices);
  const asks = filterValidQuotes(askPrices, reference);
  const bids = filterValidQuotes(bidPrices, reference);

  const bestAsk = asks.length > 0 ? Math.min(...asks) : undefined;
  const bestBid = bids.length > 0 ? Math.max(...bids) : undefined;

  let markPrice: number | undefined;
  let markMode: MarkPriceMode | undefined;
  let spreadAbs: number | undefined;
  let spreadPct: number | undefined;

  if (bestAsk !== undefined && bestBid !== undefined) {
    markPrice = (bestBid + bestAsk) / 2;
    markMode = "mid";
    spreadAbs = bestAsk - bestBid;
    spreadPct = markPrice > 0 ? spreadAbs / markPrice : undefined;
  } else if (bestAsk !== undefined) {
    markPrice = median(asks);
    markMode = "ask-median";
  } else if (bestBid !== undefined) {
    markPrice = bestBid;
    markMode = "bid-only";
  }

  return {
    bestAsk,
    bestBid,
    markPrice,
    markMode,
    spreadAbs,
    spreadPct,
    oneSided: (bestAsk === undefined) !== (bestBid === undefined),
    askCount: asks.length,
    bidCount: bids.length,
  };
}

/**
 * Calculate the best available price from price points
 */
export function calculateBestAvailablePrice(
  pricePoints: {
    whatsapp?: PricePoint[];
    marketplace?: PricePoint[];
    international?: PricePoint[];
    b2b?: PricePoint[];
    endCustomer?: PricePoint[];
    stockxGoat?: PricePoint[];
  },
  retailIndia?: number
): number | undefined {
  const allPrices: number[] = [];

  // New channel-based structure
  if ('whatsapp' in pricePoints) {
    if (pricePoints.whatsapp) allPrices.push(...pricePoints.whatsapp.map(p => p.price));
    if (pricePoints.marketplace) allPrices.push(...pricePoints.marketplace.map(p => p.price));
    if (pricePoints.international) allPrices.push(...pricePoints.international.map(p => p.price));
  }
  // Legacy structure
  else if ('b2b' in pricePoints) {
    if (pricePoints.b2b) allPrices.push(...pricePoints.b2b.map(p => p.price));
    if (pricePoints.endCustomer) allPrices.push(...pricePoints.endCustomer.map(p => p.price));
    if (pricePoints.stockxGoat) allPrices.push(...pricePoints.stockxGoat.map(p => p.price));
  }

  const reference = referencePrice(retailIndia, allPrices);
  const validated = filterValidQuotes(allPrices, reference);
  if (validated.length === 0) return undefined;
  return Math.min(...validated);
}

/**
 * Calculate price range string
 */
export function calculatePriceRange(prices: number[]): string {
  if (prices.length === 0) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}`;
}

/**
 * Extract prices from price points by channel
 */
export function extractPricesByChannel(pricePoints: {
  whatsapp?: PricePoint[];
  marketplace?: PricePoint[];
  international?: PricePoint[];
  b2b?: PricePoint[];
  endCustomer?: PricePoint[];
  stockxGoat?: PricePoint[];
}): {
  whatsapp: number[];
  marketplace: number[];
  international: number[];
} {
  // New channel-based structure
  if ('whatsapp' in pricePoints) {
    return {
      whatsapp: pricePoints.whatsapp?.map(p => p.price) || [],
      marketplace: pricePoints.marketplace?.map(p => p.price) || [],
      international: pricePoints.international?.map(p => p.price) || [],
    };
  }
  // Legacy structure
  else if ('b2b' in pricePoints) {
    return {
      whatsapp: pricePoints.b2b?.map(p => p.price) || [],
      marketplace: pricePoints.endCustomer?.map(p => p.price) || [],
      international: pricePoints.stockxGoat?.map(p => p.price) || [],
    };
  }

  return { whatsapp: [], marketplace: [], international: [] };
}

/**
 * change30d / change90d are NOT derived here anymore.
 *
 * They come from the REAL daily mark-price series accumulated in Firestore
 * (priceHistory/{assetId}/days/...), computed by the scheduled snapshot Cloud
 * Function (functions/src/priceHistory.ts) as today's mark vs the mark ~N days
 * ago, and written back onto the asset. Manual priceAnchors.historical30d/90d
 * and any vs-retail fallback have been removed — those mislabelled a discount as
 * a "30d" move. Enrichment below preserves whatever real change the snapshot job
 * has written; it never fabricates one.
 */

/**
 * Calculate confidence score based on number of data points
 */
export function calculateConfidence(dataPoints: number): number {
  if (dataPoints >= 100) return 85;
  if (dataPoints >= 50) return 75;
  if (dataPoints >= 30) return 70;
  if (dataPoints >= 20) return 65;
  if (dataPoints >= 10) return 60;
  return 50;
}

/**
 * Calculate liquidity level based on listing counts
 */
export function calculateLiquidity(totalListings: number): string {
  if (totalListings >= 100) return "High";
  if (totalListings >= 50) return "Medium";
  if (totalListings >= 20) return "Low";
  return "Very Low";
}

/**
 * Calculate volume label
 */
export function calculateVolumeLabel(totalListings: number): string {
  if (totalListings >= 100) return "Very Active";
  if (totalListings >= 50) return "Active";
  if (totalListings >= 20) return "Moderate";
  if (totalListings >= 10) return "Limited";
  return "Scarce";
}

/**
 * Count total data points from all channels
 */
export function countDataPoints(pricePoints: {
  whatsapp?: PricePoint[];
  marketplace?: PricePoint[];
  international?: PricePoint[];
  b2b?: PricePoint[];
  endCustomer?: PricePoint[];
  stockxGoat?: PricePoint[];
}): number {
  // New channel-based structure
  if ('whatsapp' in pricePoints) {
    const whatsappCount = pricePoints.whatsapp?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    const marketplaceCount = pricePoints.marketplace?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    const intlCount = pricePoints.international?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    return whatsappCount + marketplaceCount + intlCount;
  }
  // Legacy structure
  else if ('b2b' in pricePoints) {
    const b2bCount = pricePoints.b2b?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    const endCustomerCount = pricePoints.endCustomer?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    const stockxGoatCount = pricePoints.stockxGoat?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    return b2bCount + endCustomerCount + stockxGoatCount;
  }

  return 0;
}

/**
 * Calculate all metrics for a size variant
 * This auto-populates all the fields needed for market overview
 */
export function calculateSizeMetrics(
  size: SizeVariant,
  priceAnchors: {
    historical30d?: { min: number; max: number };
    historical90d?: { min: number; max: number };
    retailIndia?: number;
    retailGlobal?: number;
  }
): Partial<SizeVariant> {
  const pricePoints = size.pricePoints || size.legacyPricePoints;
  if (!pricePoints) {
    return {
      bestAvailablePrice: undefined,
      change30d: null,
      change90d: null,
      confidence: 50,
      liquidity: "Very Low",
      volumeLabel: "Scarce",
      dataPoints: 0,
    };
  }

  const prices = extractPricesByChannel(pricePoints);
  const allPrices = [...prices.whatsapp, ...prices.marketplace, ...prices.international];
  
  const bestAvailablePrice = calculateBestAvailablePrice(pricePoints, priceAnchors.retailIndia);
  const dataPoints = countDataPoints(pricePoints);
  const totalListings = dataPoints;

  // Calculate b2bMarketPrice (whatsapp channel)
  const b2bMarketPrice = prices.whatsapp.length > 0 
    ? calculatePriceRange(prices.whatsapp)
    : size.b2bMarketPrice || "";

  // Calculate endCustomerMarketPrice (marketplace channel)
  const endCustomerMarketPrice = prices.marketplace.length > 0
    ? calculatePriceRange(prices.marketplace)
    : size.endCustomerMarketPrice || "";

  // Calculate stockxGoatPrice (international channel)
  const stockxGoatPrice = prices.international.length > 0
    ? calculatePriceRange(prices.international)
    : size.stockxGoatPrice || "";

  // Calculate fair range (average of all channels)
  const fairRange = allPrices.length > 0
    ? calculatePriceRange(allPrices)
    : size.fairRange || "";

  // change30d/90d are owned by the daily snapshot job (real history). Preserve
  // whatever it has written; treat empty strings as "no real change yet" (null).
  const change30d = size.change30d ? size.change30d : null;
  const change90d = size.change90d ? size.change90d : null;

  return {
    bestAvailablePrice,
    b2bMarketPrice,
    endCustomerMarketPrice,
    stockxGoatPrice,
    fairRange,
    change30d,
    change90d,
    confidence: calculateConfidence(dataPoints),
    liquidity: calculateLiquidity(totalListings),
    volumeLabel: calculateVolumeLabel(totalListings),
    dataPoints,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate asset-level metrics from default size or first size
 * This populates the legacy fields at the asset level
 */
export function calculateAssetLevelMetrics(asset: Asset): Partial<Asset> {
  if (!asset.sizes || asset.sizes.length === 0) {
    return {
      bestAvailablePrice: undefined,
      change30d: null,
      change90d: null,
      confidence: 50,
      liquidity: "Very Low",
      volumeLabel: "Scarce",
      dataPoints: 0,
    };
  }

  // Find default size or use first size
  const defaultSize = asset.sizes.find(s => s.size === asset.defaultSize) || asset.sizes[0];
  
  // Use asset-level priceAnchors or empty object
  const priceAnchors = asset.priceAnchors || {};
  
  // Calculate metrics for the default size
  const sizeMetrics = calculateSizeMetrics(defaultSize, priceAnchors);

  return {
    bestAvailablePrice: sizeMetrics.bestAvailablePrice,
    b2bMarketPrice: sizeMetrics.b2bMarketPrice,
    endCustomerMarketPrice: sizeMetrics.endCustomerMarketPrice,
    stockxGoatPrice: sizeMetrics.stockxGoatPrice,
    fairRange: sizeMetrics.fairRange,
    change30d: sizeMetrics.change30d,
    change90d: sizeMetrics.change90d,
    confidence: sizeMetrics.confidence,
    liquidity: sizeMetrics.liquidity,
    volumeLabel: sizeMetrics.volumeLabel,
    dataPoints: sizeMetrics.dataPoints,
  };
}

/**
 * Calculate listings snapshot from all sizes
 * Aggregates counts across all size variants
 */
function calculateListingsSnapshot(sizes: SizeVariant[]): {
  b2bCount: number;
  consumerCount: number;
  intlCount: number;
} {
  let b2bCount = 0;
  let consumerCount = 0;
  let intlCount = 0;

  sizes.forEach(size => {
    const pricePoints = size.pricePoints || size.legacyPricePoints;
    if (!pricePoints) return;

    // New channel-based structure
    if ('whatsapp' in pricePoints) {
      b2bCount += pricePoints.whatsapp?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
      consumerCount += pricePoints.marketplace?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
      intlCount += pricePoints.international?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    }
    // Legacy structure
    else if ('b2b' in pricePoints) {
      b2bCount += pricePoints.b2b?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
      consumerCount += pricePoints.endCustomer?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
      intlCount += pricePoints.stockxGoat?.reduce((sum, p) => sum + (p.listingCount || 1), 0) || 0;
    }
  });

  return { b2bCount, consumerCount, intlCount };
}

/**
 * Calculate volatility based on price variance
 * Analyzes price spread to determine market volatility
 */
function calculateVolatility(
  allPrices: number[],
  existingVolatility?: string
): "low" | "medium" | "high" {
  // If already set, keep it
  if (existingVolatility && ['low', 'medium', 'high'].includes(existingVolatility)) {
    return existingVolatility as "low" | "medium" | "high";
  }

  // If no prices, default to medium
  if (allPrices.length === 0) return "medium";

  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const avg = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;

  // Calculate coefficient of variation (standard deviation / mean)
  const variance = allPrices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / allPrices.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / avg) * 100;

  // Also look at price range as % of average
  const priceRangePercent = ((max - min) / avg) * 100;

  // Determine volatility
  if (coefficientOfVariation < 5 && priceRangePercent < 15) {
    return "low"; // Tight price clustering
  } else if (coefficientOfVariation > 15 || priceRangePercent > 40) {
    return "high"; // Wide price spread
  } else {
    return "medium"; // Moderate variance
  }
}

/**
 * Enrich an asset with calculated metrics
 * This updates both size-level and asset-level fields
 */
export function enrichAssetWithMetrics(asset: Asset): Asset {
  // Calculate metrics for each size
  const enrichedSizes = (asset.sizes || []).map(size => ({
    ...size,
    ...calculateSizeMetrics(size, asset.priceAnchors || {}),
  }));

  // Calculate asset-level metrics from default size
  const assetMetrics = calculateAssetLevelMetrics({
    ...asset,
    sizes: enrichedSizes,
  });

  // Calculate listings snapshot for market overview
  const listingsSnapshot = calculateListingsSnapshot(enrichedSizes);

  // Calculate volatility from all prices across all sizes
  const allPrices: number[] = [];
  enrichedSizes.forEach(size => {
    const pricePoints = size.pricePoints || size.legacyPricePoints;
    if (pricePoints) {
      const prices = extractPricesByChannel(pricePoints);
      allPrices.push(...prices.whatsapp, ...prices.marketplace, ...prices.international);
    }
  });
  const volatility = calculateVolatility(allPrices, asset.volatility);

  return {
    ...asset,
    ...assetMetrics,
    sizes: enrichedSizes,
    listingsSnapshot,
    volatility,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Backfill metrics for all assets
 * Useful for migrating existing data
 */
export function backfillAllAssetMetrics(assets: Asset[]): Asset[] {
  console.log(`Backfilling metrics for ${assets.length} assets...`);
  const enrichedAssets = assets.map(enrichAssetWithMetrics);
  console.log(`Backfill complete. Enriched ${enrichedAssets.length} assets.`);
  return enrichedAssets;
}

