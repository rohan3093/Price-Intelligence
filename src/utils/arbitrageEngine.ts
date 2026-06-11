/**
 * Arbitrage Engine
 *
 * Computes cross-channel arbitrage opportunities for Indian sneaker resale.
 * Factors in: per-platform fees, data freshness, market depth, turnaround
 * time, price-trend risk, and capital efficiency — not just raw spread.
 */

import { Asset, SizeVariant, PricePoint, MarketChannel } from "../types";

// ─── Platform Fee Config ──────────────────────────────────────
// Sell-side commission rates by Indian marketplace (source key, lowercased).
// These replace the old blanket 8.5%.
export const PLATFORM_SELL_FEES: Record<string, number> = {
  crepdogcrew: 0.095,
  mainstreet: 0.08,
  culturecircle: 0.10,
  hypefly: 0.09,
  dawntown: 0.085,
  "10hillsstudio": 0.08,
  hustleculture: 0.09,
  findyourkicks: 0.09,
  instagram: 0.0, // peer-to-peer, no platform fee
  facebook: 0.0,
  other: 0.085,
};

export const DEFAULT_MARKETPLACE_FEE = 0.085; // fallback if platform unknown
export const DEFAULT_INTL_RESHIPPING = 0; // New prices include platform fees; legacy data with reshippingCost still gets added

// ─── Turnaround Time Estimates (days) ─────────────────────────
// Keyed by "buyChannel→sellChannel"
const TURNAROUND_DAYS: Record<string, { min: number; max: number }> = {
  "whatsapp→whatsapp": { min: 0, max: 2 },
  "whatsapp→marketplace": { min: 1, max: 4 },
  "marketplace→whatsapp": { min: 1, max: 4 },
  "marketplace→marketplace": { min: 2, max: 5 },
  "international→whatsapp": { min: 10, max: 21 },
  "international→marketplace": { min: 12, max: 24 },
};
const DEFAULT_TURNAROUND = { min: 3, max: 7 };

// ─── Strategy Classification ──────────────────────────────────
export type Strategy = "flip" | "import" | "cross-list" | "p2p";

export type RiskLevel = "low" | "medium" | "high";

// ─── Exported Types ───────────────────────────────────────────
export interface ArbSide {
  channel: MarketChannel;
  source: string; // human-readable label
  marketplaceKey?: string; // raw key for fee lookup
  price: number; // raw listing price
  allIn: number; // buy: price + shipping; sell: same as price
  net: number; // sell: price after fees; buy: same as allIn
  count: number; // listing depth at this price
  lastSeen?: Date | string;
  url?: string;
  sellerContact?: string;
  sellerLocation?: string;
}

export type SellReliability = "confirmed-demand" | "consignment";

export interface ArbitrageOpportunity {
  // Context
  assetId?: number;
  assetName?: string;
  size?: string;

  // Trade legs
  buy: ArbSide;
  sell: ArbSide;

  // Core financials
  netProfit: number;
  netPct: number; // netProfit / buy.allIn

  // ── Sophistication layer ──
  strategy: Strategy;
  turnaroundDays: { min: number; max: number };
  confidence: number; // 0–100
  risk: RiskLevel;
  scalable: number; // how many units you can move (min of buy/sell depth)
  liquidity: string; // from SizeVariant — "Low", "Medium", "High", etc.
  liquidityScore: number; // numeric 0–100 for sorting
  sellReliability: SellReliability; // confirmed-demand (WA WTB) vs consignment (marketplace)

  // Breakdown for UI tooltips
  sellFeeRate: number; // the fee % applied on sell side
  sellFeeAmount: number; // ₹ deducted
  buyShippingCost: number; // ₹ added on buy side (reshipping for intl)
}

export interface ArbitrageConfig {
  minNetPct: number;
  minNetRs: number;
  enabledChannels: {
    whatsapp: boolean;
    marketplace: boolean;
    international: boolean;
  };
  strategyFilter?: Strategy | "all";
  minConfidence?: number; // 0–100, filter out low confidence
  limit: number;
}

export const DEFAULT_CONFIG: ArbitrageConfig = {
  minNetPct: 0.03,
  minNetRs: 0,
  enabledChannels: { whatsapp: true, marketplace: true, international: true },
  strategyFilter: "all",
  minConfidence: 0,
  limit: 50,
};

// ─── Summary Stats ────────────────────────────────────────────
export interface ArbitrageSummary {
  totalOpportunities: number;
  bestQuickFlip: ArbitrageOpportunity | null;
  highestConfidence: ArbitrageOpportunity | null;
  bestScalePlay: ArbitrageOpportunity | null;
  avgRoi: number;
  avgConfidence: number;
  byStrategy: Record<Strategy, number>;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Look up the sell fee for a specific marketplace */
export function getSellFee(marketplaceKey?: string): number {
  if (!marketplaceKey) return DEFAULT_MARKETPLACE_FEE;
  const key = marketplaceKey.toLowerCase().replace(/[\s-]/g, "");
  return PLATFORM_SELL_FEES[key] ?? DEFAULT_MARKETPLACE_FEE;
}

/** Extract price points from a SizeVariant, handling legacy + new structure */
export function extractPricePoints(
  size: SizeVariant,
  channel: MarketChannel
): PricePoint[] {
  if (size.pricePoints) return size.pricePoints[channel] || [];
  if (size.legacyPricePoints) {
    if (channel === "whatsapp") return size.legacyPricePoints.b2b || [];
    if (channel === "marketplace") return size.legacyPricePoints.endCustomer || [];
    return size.legacyPricePoints.stockxGoat || [];
  }
  return [];
}

/** How many days old is this data point? */
function dataAgeDays(lastSeen?: Date | string): number {
  if (!lastSeen) return 30; // assume stale if unknown
  const d = typeof lastSeen === "string" ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  return Math.max(0, (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** Freshness score: 100 = just seen, decays over 30 days to 0 */
function freshnessScore(lastSeen?: Date | string): number {
  const age = dataAgeDays(lastSeen);
  if (age <= 1) return 100;
  if (age >= 30) return 5;
  // Exponential decay: halves every 7 days
  return Math.max(5, Math.round(100 * Math.pow(0.5, age / 7)));
}

/** Depth score: more listings = more confidence the price is real */
function depthScore(count: number): number {
  if (count >= 5) return 100;
  if (count >= 3) return 80;
  if (count >= 2) return 60;
  return 30; // single listing — least reliable
}

/** Convert liquidity string to numeric score for sorting */
export function liquidityToScore(liq?: string): number {
  if (!liq) return 30;
  const l = liq.toLowerCase().trim();
  if (l === "very high" || l === "excellent") return 100;
  if (l === "high") return 80;
  if (l === "medium" || l === "moderate") return 60;
  if (l === "low") return 35;
  if (l === "very low" || l === "dead") return 10;
  return 30; // unknown
}

/** Liquidity display color */
export function liquidityColor(liq?: string): string {
  const score = liquidityToScore(liq);
  if (score >= 70) return "text-up";
  if (score >= 50) return "text-yellow-600";
  return "text-down";
}

/** Sell reliability label for display */
export function sellReliabilityLabel(r: SellReliability): string {
  switch (r) {
    case "confirmed-demand": return "Confirmed Demand";
    case "consignment": return "Consignment";
  }
}

/**
 * Compute confidence 0–100 from freshness + depth on both sides.
 * Marketplace sell-side gets a penalty: Indian marketplaces operate on
 * consignment / source-on-order — the listed price is aspirational, not
 * guaranteed demand like a WhatsApp "WTB" post.
 */
function computeConfidence(buy: ArbSide, sell: ArbSide): number {
  const buyFresh = freshnessScore(buy.lastSeen);
  const sellFresh = freshnessScore(sell.lastSeen);
  const buyDepth = depthScore(buy.count);
  const sellDepth = depthScore(sell.count);

  // Weighted: freshness matters more than depth
  const buyScore = buyFresh * 0.6 + buyDepth * 0.4;
  let sellScore = sellFresh * 0.6 + sellDepth * 0.4;

  // Marketplace sell penalty: consignment model means the sell price
  // is not confirmed demand. Apply a 0.6x multiplier.
  if (sell.channel === "marketplace") {
    sellScore *= 0.6;
  }

  // Overall = geometric mean of both sides (both must be decent)
  return Math.round(Math.sqrt(buyScore * sellScore));
}

/** Classify the strategy based on buy→sell channel pair */
function classifyStrategy(buyChannel: MarketChannel, sellChannel: MarketChannel): Strategy {
  if (buyChannel === "international") return "import";
  if (buyChannel === sellChannel && buyChannel === "whatsapp") return "p2p";
  if (buyChannel === "whatsapp" && sellChannel === "marketplace") return "flip";
  if (buyChannel === "marketplace" && sellChannel === "whatsapp") return "flip";
  return "cross-list";
}

/** Get turnaround time for a channel pair */
function getTurnaround(buyChannel: MarketChannel, sellChannel: MarketChannel): { min: number; max: number } {
  const key = `${buyChannel}→${sellChannel}`;
  return TURNAROUND_DAYS[key] || DEFAULT_TURNAROUND;
}

/** Assess risk: combines price trend direction + volatility + timeline + strategy */
function assessRisk(
  strategy: Strategy,
  turnaround: { min: number; max: number },
  sizeData?: { change30d?: string | null; volatility?: "low" | "medium" | "high" }
): RiskLevel {
  let riskScore = 0;

  // Strategy-inherent risk: import has customs/shipping uncertainty
  if (strategy === "import") riskScore += 1;

  // Timeline risk: longer = riskier
  const avgDays = (turnaround.min + turnaround.max) / 2;
  if (avgDays > 14) riskScore += 3;
  else if (avgDays > 5) riskScore += 1.5;
  else riskScore += 0;

  // Volatility risk
  const vol = sizeData?.volatility;
  if (vol === "high") riskScore += 3;
  else if (vol === "medium") riskScore += 1.5;
  else riskScore += 0;

  // Trend risk: if trending down and you're holding for days, margin can evaporate
  const change = sizeData?.change30d;
  if (change) {
    const pct = parseFloat(change.replace(/[^0-9.\-+]/g, ""));
    if (!isNaN(pct)) {
      if (pct < -5) riskScore += 2; // declining fast
      else if (pct < 0) riskScore += 1; // declining slowly
      // rising = no additional risk
    }
  }

  if (riskScore >= 5) return "high";
  if (riskScore >= 2.5) return "medium";
  return "low";
}

// ─── Buy-side cost calculation ────────────────────────────────

function computeBuyAllIn(price: number, channel: MarketChannel, reshippingCost?: number): { allIn: number; shippingCost: number } {
  if (channel === "international") {
    const shipping = reshippingCost ?? DEFAULT_INTL_RESHIPPING;
    return { allIn: price + shipping, shippingCost: shipping };
  }
  return { allIn: price, shippingCost: 0 };
}

// ─── Sell-side net calculation ────────────────────────────────

function computeSellNet(
  price: number,
  channel: MarketChannel,
  marketplaceKey?: string
): { net: number; feeRate: number; feeAmount: number } {
  if (channel === "marketplace") {
    const feeRate = getSellFee(marketplaceKey);
    const feeAmount = Math.round(price * feeRate);
    return { net: price - feeAmount, feeRate, feeAmount };
  }
  // WhatsApp: peer-to-peer, no platform fee
  return { net: price, feeRate: 0, feeAmount: 0 };
}

// ─── Pool Builders ────────────────────────────────────────────

function buildBuyPool(size: SizeVariant, enabledChannels: ArbitrageConfig["enabledChannels"]): ArbSide[] {
  const pool: ArbSide[] = [];

  // WhatsApp buy
  if (enabledChannels.whatsapp) {
    const wa = extractPricePoints(size, "whatsapp").filter(
      (p) => !p.transactionType || p.transactionType === "buy" || p.transactionType === "both"
    );
    for (const p of wa) {
      const ch = p.channel || "whatsapp";
      if (ch !== "whatsapp" && !enabledChannels[ch]) continue;
      const { allIn, shippingCost: _ } = computeBuyAllIn(p.price, ch);
      pool.push({
        channel: ch,
        source: p.sellerName || p.source || p.marketplaceName || "WhatsApp",
        price: p.price,
        allIn,
        net: allIn,
        count: p.listingCount ?? 1,
        lastSeen: p.lastSeen,
        url: p.url,
        sellerContact: p.sellerContact,
        sellerLocation: p.sellerLocation,
      });
    }
  }

  // Marketplace buy
  if (enabledChannels.marketplace) {
    const mp = extractPricePoints(size, "marketplace");
    for (const p of mp) {
      const ch = p.channel || "marketplace";
      if (ch !== "marketplace" && !enabledChannels[ch]) continue;
      pool.push({
        channel: ch,
        source: p.marketplaceName || p.source || "Marketplace",
        marketplaceKey: p.marketplaceName || p.source,
        price: p.price,
        allIn: p.price,
        net: p.price,
        count: p.listingCount ?? 1,
        lastSeen: p.lastSeen,
        url: p.url,
        sellerLocation: p.sellerLocation,
      });
    }
  }

  // International buy
  if (enabledChannels.international) {
    const intl = extractPricePoints(size, "international");
    for (const p of intl) {
      const ch = p.channel || "international";
      if (ch !== "international" && !enabledChannels[ch]) continue;
      const { allIn } = computeBuyAllIn(p.price, "international", p.reshippingCost);
      pool.push({
        channel: "international",
        source: p.marketplaceName || p.source || "International",
        marketplaceKey: p.marketplaceName || p.source,
        price: p.price,
        allIn,
        net: allIn,
        count: p.listingCount ?? 1,
        lastSeen: p.lastSeen,
        url: p.url,
        sellerLocation: p.sellerLocation,
      });
    }
  }

  return pool;
}

function buildSellPool(size: SizeVariant, enabledChannels: ArbitrageConfig["enabledChannels"]): ArbSide[] {
  const pool: ArbSide[] = [];

  // WhatsApp sell
  if (enabledChannels.whatsapp) {
    const wa = extractPricePoints(size, "whatsapp").filter(
      (p) => p.transactionType === "sell" || p.transactionType === "both"
    );
    for (const p of wa) {
      const ch = p.channel || "whatsapp";
      if (ch !== "whatsapp" && !enabledChannels[ch]) continue;
      pool.push({
        channel: ch,
        source: p.sellerName || p.source || p.marketplaceName || "WhatsApp",
        price: p.price,
        allIn: p.price,
        net: p.price, // no fee
        count: p.listingCount ?? 1,
        lastSeen: p.lastSeen,
        url: p.url,
        sellerContact: p.sellerContact,
        sellerLocation: p.sellerLocation,
      });
    }
  }

  // Marketplace sell
  if (enabledChannels.marketplace) {
    const mp = extractPricePoints(size, "marketplace");
    for (const p of mp) {
      const ch = p.channel || "marketplace";
      if (ch !== "marketplace" && !enabledChannels[ch]) continue;
      const mkKey = p.marketplaceName || p.source;
      const { net } = computeSellNet(p.price, "marketplace", mkKey);
      pool.push({
        channel: ch,
        source: p.marketplaceName || p.source || "Marketplace",
        marketplaceKey: mkKey,
        price: p.price,
        allIn: p.price,
        net,
        count: p.listingCount ?? 1,
        lastSeen: p.lastSeen,
        url: p.url,
        sellerLocation: p.sellerLocation,
      });
    }
  }

  return pool;
}

// ─── Core Computation ─────────────────────────────────────────

/**
 * Compute all arbitrage opportunities for one size of one asset.
 */
export function computeOpportunities(
  size: SizeVariant,
  config: ArbitrageConfig,
  context?: { assetId: number; assetName: string; volatility?: "low" | "medium" | "high" }
): ArbitrageOpportunity[] {
  const buyPool = buildBuyPool(size, config.enabledChannels);
  const sellPool = buildSellPool(size, config.enabledChannels);
  const opps: ArbitrageOpportunity[] = [];

  for (const buy of buyPool) {
    for (const sell of sellPool) {
      // Skip identical listing pairs
      if (
        buy.channel === sell.channel &&
        buy.price === sell.price &&
        buy.source === sell.source
      ) {
        continue;
      }

      // Financials
      const { net: sellNet, feeRate, feeAmount } = computeSellNet(
        sell.price,
        sell.channel,
        sell.marketplaceKey
      );
      const { shippingCost } = computeBuyAllIn(buy.price, buy.channel);
      const netProfit = sellNet - buy.allIn;
      const netPct = buy.allIn > 0 ? netProfit / buy.allIn : 0;

      // Apply filters
      if (netProfit < config.minNetRs) continue;
      if (netPct < config.minNetPct) continue;
      if (netPct > 5.0) continue; // suppress anomalous spreads (>500% ROI = data artefact)

      // Sophistication layer
      const strategy = classifyStrategy(buy.channel, sell.channel);
      if (config.strategyFilter && config.strategyFilter !== "all" && strategy !== config.strategyFilter) {
        continue;
      }

      const turnaroundDays = getTurnaround(buy.channel, sell.channel);

      const confidence = computeConfidence(buy, sell);
      if (config.minConfidence && confidence < config.minConfidence) continue;

      const risk = assessRisk(strategy, turnaroundDays, {
        change30d: size.change30d,
        volatility: context?.volatility,
      });

      const scalable = Math.min(buy.count, sell.count);
      const liq = size.liquidity || "N/A";
      const liqScore = liquidityToScore(size.liquidity);

      // Marketplace sells are consignment/source-on-order — not real demand
      const sellReliability: SellReliability =
        sell.channel === "marketplace" ? "consignment" : "confirmed-demand";

      opps.push({
        assetId: context?.assetId,
        assetName: context?.assetName,
        size: size.size,
        buy,
        sell,
        netProfit,
        netPct,
        strategy,
        turnaroundDays,
        confidence,
        risk,
        scalable,
        liquidity: liq,
        liquidityScore: liqScore,
        sellReliability,
        sellFeeRate: feeRate,
        sellFeeAmount: feeAmount,
        buyShippingCost: shippingCost,
      });
    }
  }

  return opps;
}

/**
 * Multi-asset scanner — iterates all assets × all sizes.
 */
export function scanAllAssets(
  assets: Asset[],
  config: ArbitrageConfig
): ArbitrageOpportunity[] {
  const all: ArbitrageOpportunity[] = [];

  for (const asset of assets) {
    for (const size of asset.sizes || []) {
      all.push(
        ...computeOpportunities(size, config, {
          assetId: asset.id,
          assetName: asset.name,
          volatility: asset.volatility,
        })
      );
    }
  }

  // Primary sort: confidence desc (most executable first), then netPct, then netProfit
  return all
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (b.netPct !== a.netPct) return b.netPct - a.netPct;
      return b.netProfit - a.netProfit;
    })
    .slice(0, config.limit);
}

// ─── Summary Builder ──────────────────────────────────────────

export function buildSummary(opps: ArbitrageOpportunity[]): ArbitrageSummary {
  const byStrategy: Record<Strategy, number> = {
    "flip": 0,
    "import": 0,
    "cross-list": 0,
    "p2p": 0,
  };

  let sumRoi = 0;
  let sumConf = 0;
  let bestQuickFlip: ArbitrageOpportunity | null = null;
  let highestConf: ArbitrageOpportunity | null = null;
  let bestScale: ArbitrageOpportunity | null = null;

  for (const opp of opps) {
    byStrategy[opp.strategy]++;
    sumRoi += opp.netPct;
    sumConf += opp.confidence;

    // Best flip: highest ROI among flip or p2p strategies
    if (opp.strategy === "flip" || opp.strategy === "p2p") {
      if (!bestQuickFlip || opp.netPct > bestQuickFlip.netPct) {
        bestQuickFlip = opp;
      }
    }

    // Highest confidence: most likely to be executable
    if (!highestConf || opp.confidence > highestConf.confidence) {
      highestConf = opp;
    }

    // Best scale play: most units × highest total profit
    const oppTotal = opp.scalable * opp.netProfit;
    const bestTotal = bestScale ? bestScale.scalable * bestScale.netProfit : 0;
    if (oppTotal > bestTotal) {
      bestScale = opp;
    }
  }

  const n = opps.length || 1;
  return {
    totalOpportunities: opps.length,
    bestQuickFlip,
    highestConfidence: highestConf,
    bestScalePlay: bestScale,
    avgRoi: sumRoi / n,
    avgConfidence: Math.round(sumConf / n),
    byStrategy,
  };
}

// ─── Display Helpers ──────────────────────────────────────────

export function channelLabel(ch: MarketChannel): string {
  switch (ch) {
    case "whatsapp": return "WhatsApp";
    case "marketplace": return "Marketplace";
    case "international": return "International";
    default: return ch;
  }
}

export function strategyLabel(s: Strategy): string {
  switch (s) {
    case "flip": return "Flip";
    case "import": return "Import";
    case "cross-list": return "Cross-List";
    case "p2p": return "P2P";
    default: return s;
  }
}

export function riskColor(r: RiskLevel): string {
  switch (r) {
    case "low": return "text-up";
    case "medium": return "text-yellow-600";
    case "high": return "text-down";
  }
}

export function riskBgColor(r: RiskLevel): string {
  switch (r) {
    case "low": return "bg-up/10";
    case "medium": return "bg-yellow-50";
    case "high": return "bg-down/10";
  }
}

export function confidenceColor(c: number): string {
  if (c >= 70) return "text-up";
  if (c >= 40) return "text-yellow-600";
  return "text-down";
}

export function strategyIcon(s: Strategy): string {
  switch (s) {
    case "flip": return "⚡";
    case "import": return "🌍";
    case "cross-list": return "🔄";
    case "p2p": return "💬";
    default: return "📊";
  }
}

/** Color for turnaround time display */
export function turnaroundColor(days: { min: number; max: number }): string {
  const avg = (days.min + days.max) / 2;
  if (avg <= 3) return "text-up";
  if (avg <= 7) return "text-yellow-600";
  return "text-down";
}

/** Human-readable time horizon label */
export function turnaroundLabel(days: { min: number; max: number }): string {
  if (days.max <= 2) return "Same day";
  if (days.max <= 5) return `${days.min}–${days.max} days`;
  if (days.max <= 14) return `~${Math.round((days.min + days.max) / 2)} days`;
  return `${days.min}–${days.max} days`;
}

