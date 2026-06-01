import React, { useMemo, useState } from "react";
import { Asset, PricePoint, MarketChannel } from "../types";

interface MarketOverviewProps {
  assets: Asset[];
  onSelectAsset?: (id: number) => void;
}

interface TopMover {
  asset: Asset;
  size: string | undefined;
  changePercent: number;
  currentPrice: number | undefined;
}

interface ChannelStats {
  /** Display name shown in the UI (e.g. "WhatsApp", "Culture Circle") */
  name: string;
  /** Average within-asset spread as a percent. Lower = tighter = more efficient. */
  averageSpreadPct: number;
  /** Number of (asset, size) combinations that contributed a spread sample. */
  sampleCount: number;
  /** Total listing count seen on this channel today. */
  listingCount: number;
}

interface MarketSnapshot {
  totalAssets: number;
  healthIndex: number;
  averageChange30d: number;
  marketBreadthPct: number; // % of assets with positive 30d change
  averageCrossChannelSpread: number; // avg gap between cheapest & priciest channel tier per asset
  highSignalMovers: number; // |change30d| >= 5
  mostActiveChannelTier: string; // "WhatsApp" | "Marketplaces" | "International" | "—"
  channelStats: ChannelStats[];
  topMovers: TopMover[];
}

const HIGH_SIGNAL_THRESHOLD = 5;

function parseChangePercent(changeStr: string | undefined): number | null {
  if (!changeStr) return null;
  const match = changeStr.match(/[+-]?[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function getDefaultSizeVariant(asset: Asset) {
  const target = asset.defaultSize || asset.size;
  return asset.sizes?.find((s) => s.size === target) ?? asset.sizes?.[0];
}

function getAssetBestPrice(asset: Asset): number | undefined {
  if (asset.bestAvailablePrice !== undefined) return asset.bestAvailablePrice;
  const sizeVariant = getDefaultSizeVariant(asset);
  return sizeVariant?.bestAvailablePrice;
}

function getAssetChange30d(asset: Asset): number | null {
  const top = parseChangePercent(asset.change30d);
  if (top !== null) return top;
  const sizeVariant = getDefaultSizeVariant(asset);
  return parseChangePercent(sizeVariant?.change30d);
}

/** Resolve a human-friendly channel name from a PricePoint. */
function getChannelName(p: PricePoint): string {
  if (p.channel === "whatsapp") return "WhatsApp";
  if (p.marketplaceName && p.marketplaceName.trim().length > 0) {
    return p.marketplaceName.trim();
  }
  // Fallback: derive from source slug.
  const src = (p.source || "").toLowerCase();
  const sourceMap: Record<string, string> = {
    stockx: "StockX",
    goat: "GOAT",
    crepdogcrew: "CrepdogCrew",
    mainstreet: "Mainstreet",
    culturecircle: "Culture Circle",
    hypefly: "HypeFly",
    findyourkicks: "Find Your Kicks",
    dawntown: "Dawntown",
    "10hillsstudio": "10 Hills Studio",
    hustleculture: "Hustle Culture",
  };
  if (sourceMap[src]) return sourceMap[src];
  if (p.channel === "international") return "International";
  return "Marketplace";
}

function tierLabel(tier: MarketChannel): string {
  if (tier === "whatsapp") return "WhatsApp";
  if (tier === "marketplace") return "Marketplaces";
  return "International";
}

function gatherPricePoints(asset: Asset): { tier: MarketChannel; size: string; points: PricePoint[] }[] {
  const out: { tier: MarketChannel; size: string; points: PricePoint[] }[] = [];
  asset.sizes?.forEach((sv) => {
    const pp = sv.pricePoints;
    if (!pp) return;
    if (pp.whatsapp?.length) out.push({ tier: "whatsapp", size: sv.size, points: pp.whatsapp });
    if (pp.marketplace?.length) out.push({ tier: "marketplace", size: sv.size, points: pp.marketplace });
    if (pp.international?.length) out.push({ tier: "international", size: sv.size, points: pp.international });
  });
  return out;
}

function computeSnapshot(assets: Asset[]): MarketSnapshot {
  if (assets.length === 0) {
    return {
      totalAssets: 0,
      healthIndex: 50,
      averageChange30d: 0,
      marketBreadthPct: 0,
      averageCrossChannelSpread: 0,
      highSignalMovers: 0,
      mostActiveChannelTier: "—",
      channelStats: [],
      topMovers: [],
    };
  }

  // --- Movers, breadth, average 30d change ---
  const moverCandidates: TopMover[] = [];
  const changes: number[] = [];
  let positive = 0;
  let highSignal = 0;

  assets.forEach((asset) => {
    const change = getAssetChange30d(asset);
    const price = getAssetBestPrice(asset);
    if (change !== null) {
      changes.push(change);
      if (change > 0) positive += 1;
      if (Math.abs(change) >= HIGH_SIGNAL_THRESHOLD) highSignal += 1;
      moverCandidates.push({
        asset,
        size: asset.defaultSize || asset.size || asset.sizes?.[0]?.size,
        changePercent: change,
        currentPrice: price,
      });
    }
  });

  const averageChange30d =
    changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const marketBreadthPct =
    assets.length > 0 ? (positive / assets.length) * 100 : 0;

  // Sort by absolute movement so we surface true signal — gainers and losers compete equally.
  moverCandidates.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const topMovers = moverCandidates.slice(0, 3);

  // --- Channel-level stats (per specific channel name) ---
  const channelAggregates = new Map<
    string,
    { spreadSum: number; spreadCount: number; listings: number }
  >();
  // --- Channel-tier listing volume (for "Most Active Channel") ---
  const tierListings: Record<MarketChannel, number> = {
    whatsapp: 0,
    marketplace: 0,
    international: 0,
  };
  // --- Cross-channel spread per asset (default size only) ---
  const crossChannelSpreads: number[] = [];

  assets.forEach((asset) => {
    // Build a per-asset, per-channel-name bucket of all observed prices, plus a per-tier min for cross spread.
    const buckets = gatherPricePoints(asset);
    if (buckets.length === 0) return;

    // Per-tier min price aggregated across sizes (proxy for "best price in this tier for this asset").
    const tierMin: Partial<Record<MarketChannel, number>> = {};

    // Per (size, channelName) buckets to compute within-channel spread.
    const perSizeChannelPrices = new Map<string, number[]>();

    buckets.forEach(({ tier, size, points }) => {
      points.forEach((p) => {
        if (typeof p.price !== "number" || !isFinite(p.price) || p.price <= 0) return;
        const cnt = p.listingCount || 1;

        // Tier-level totals (for most active channel today).
        tierListings[tier] += cnt;

        // Tier-level min for cross-channel spread.
        const cur = tierMin[tier];
        if (cur === undefined || p.price < cur) tierMin[tier] = p.price;

        // Per-channel name bucket.
        const channelName = getChannelName(p);
        const agg = channelAggregates.get(channelName) ?? {
          spreadSum: 0,
          spreadCount: 0,
          listings: 0,
        };
        agg.listings += cnt;
        channelAggregates.set(channelName, agg);

        // Within-channel spread sample bucket.
        const key = `${size}::${channelName}`;
        const arr = perSizeChannelPrices.get(key) ?? [];
        arr.push(p.price);
        perSizeChannelPrices.set(key, arr);
      });
    });

    // Compute within-channel spread for each (size, channelName) bucket on this asset.
    perSizeChannelPrices.forEach((prices, key) => {
      if (prices.length < 2) return;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min <= 0) return;
      const spreadPct = ((max - min) / min) * 100;
      const channelName = key.split("::")[1];
      const agg = channelAggregates.get(channelName);
      if (!agg) return;
      agg.spreadSum += spreadPct;
      agg.spreadCount += 1;
    });

    // Cross-channel spread for this asset: range across tier-level min prices.
    const tierPrices = Object.values(tierMin).filter(
      (v): v is number => typeof v === "number"
    );
    if (tierPrices.length >= 2) {
      const min = Math.min(...tierPrices);
      const max = Math.max(...tierPrices);
      if (min > 0) crossChannelSpreads.push(((max - min) / min) * 100);
    }
  });

  const channelStats: ChannelStats[] = [];
  channelAggregates.forEach((agg, name) => {
    if (agg.spreadCount < 1) return; // require at least one spread observation
    channelStats.push({
      name,
      averageSpreadPct: agg.spreadSum / agg.spreadCount,
      sampleCount: agg.spreadCount,
      listingCount: agg.listings,
    });
  });
  channelStats.sort((a, b) => a.averageSpreadPct - b.averageSpreadPct);

  const averageCrossChannelSpread =
    crossChannelSpreads.length > 0
      ? crossChannelSpreads.reduce((a, b) => a + b, 0) / crossChannelSpreads.length
      : 0;

  // Most active tier (today): pick the tier with the highest aggregated listing count;
  // if no price-point data, fall back to listingsSnapshot rollup.
  let mostActiveTier: MarketChannel | null = null;
  let mostActiveCount = 0;
  (Object.keys(tierListings) as MarketChannel[]).forEach((tier) => {
    if (tierListings[tier] > mostActiveCount) {
      mostActiveCount = tierListings[tier];
      mostActiveTier = tier;
    }
  });
  if (mostActiveTier === null) {
    let snap = { whatsapp: 0, marketplace: 0, international: 0 };
    assets.forEach((a) => {
      const s = a.listingsSnapshot;
      if (!s) return;
      snap.whatsapp += s.b2bCount || 0;
      snap.marketplace += s.consumerCount || 0;
      snap.international += s.intlCount || 0;
    });
    const tiers: MarketChannel[] = ["whatsapp", "marketplace", "international"];
    let best = 0;
    tiers.forEach((t) => {
      if (snap[t] > best) {
        best = snap[t];
        mostActiveTier = t;
      }
    });
  }

  // Health index: blend breadth, average return, and cross-channel efficiency.
  // 0–100 scale where higher = healthier.
  const breadthScore = marketBreadthPct; // already 0–100
  const returnScore = Math.max(0, Math.min(100, 50 + averageChange30d * 4));
  const efficiencyScore = Math.max(0, 100 - averageCrossChannelSpread * 2);
  const healthIndex = Math.round(
    breadthScore * 0.4 + returnScore * 0.4 + efficiencyScore * 0.2
  );

  return {
    totalAssets: assets.length,
    healthIndex,
    averageChange30d: Math.round(averageChange30d * 10) / 10,
    marketBreadthPct: Math.round(marketBreadthPct),
    averageCrossChannelSpread: Math.round(averageCrossChannelSpread * 10) / 10,
    highSignalMovers: highSignal,
    mostActiveChannelTier: mostActiveTier ? tierLabel(mostActiveTier) : "—",
    channelStats,
    topMovers,
  };
}

const formatPrice = (price: number | undefined): string =>
  price === undefined ? "—" : `₹${price.toLocaleString("en-IN")}`;

const formatSignedPercent = (value: number): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

const formatPercent = (value: number, digits = 1): string =>
  `${value.toFixed(digits)}%`;

const spreadDescriptor = (spread: number): string => {
  if (spread <= 0) return "Spreads stable";
  if (spread <= 5) return "Spreads tight";
  if (spread <= 10) return "Spreads normal";
  return "Spreads wide";
};

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden
    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
  >
    <path
      d="M2 3.5L5 6.5L8 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
    />
  </svg>
);

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  assets,
  onSelectAsset,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const snapshot = useMemo(() => computeSnapshot(assets), [assets]);

  const healthTone =
    snapshot.healthIndex >= 65
      ? "text-green-600"
      : snapshot.healthIndex <= 40
      ? "text-red-500"
      : "text-brand-black";

  const changeTone =
    snapshot.averageChange30d > 0
      ? "text-green-600"
      : snapshot.averageChange30d < 0
      ? "text-red-500"
      : "text-brand-black";

  const pulseLine = `${snapshot.totalAssets} ${
    snapshot.totalAssets === 1 ? "asset" : "assets"
  } tracked · ${spreadDescriptor(snapshot.averageCrossChannelSpread)} · ${
    snapshot.highSignalMovers
  } high-signal mover${snapshot.highSignalMovers === 1 ? "" : "s"}`;

  const tightest = snapshot.channelStats[0];
  const widest = snapshot.channelStats[snapshot.channelStats.length - 1];
  const maxSpread = widest ? widest.averageSpreadPct : 0;

  return (
    <section className="border-b border-brand-gray/20 bg-white">
      {/* Collapsed header — always visible. Tap/click to toggle. */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between gap-4 px-3 md:px-4 py-2.5 hover:bg-brand-gray/5 transition-colors text-left"
      >
        <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wide text-brand-black/50">
              Health
            </span>
            <span className={`font-mono-numeric font-bold text-sm ${healthTone}`}>
              {snapshot.healthIndex}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wide text-brand-black/50">
              30d
            </span>
            <span className={`font-mono-numeric font-bold text-sm ${changeTone}`}>
              {formatSignedPercent(snapshot.averageChange30d)}
            </span>
          </div>

          <span
            className="hidden sm:block text-xs text-brand-black/60 truncate"
            title={pulseLine}
          >
            {pulseLine}
          </span>
        </div>

        <span className="flex items-center gap-1.5 flex-shrink-0 text-[10px] uppercase tracking-wide text-brand-black/40">
          <span className="hidden sm:inline">{isExpanded ? "Hide" : "Detail"}</span>
          <Chevron open={isExpanded} />
        </span>
      </button>

      {/* Mobile-only pulse line (hidden in collapsed header above for sm+) */}
      {!isExpanded && (
        <div
          className="sm:hidden px-3 pb-2 text-xs text-brand-black/60 truncate"
          title={pulseLine}
        >
          {pulseLine}
        </div>
      )}

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-brand-gray/20 px-3 md:px-4 py-4 space-y-5 bg-white">
          {/* Section 1: Market Pulse */}
          <div>
            <h3 className="font-heading text-sm tracking-wide text-brand-black mb-2">
              MARKET PULSE
            </h3>
            <div className="grid grid-cols-2 gap-px bg-brand-gray/30 border border-brand-gray/30">
              <StatTile
                label="Assets Tracked"
                value={snapshot.totalAssets.toString()}
              />
              <StatTile
                label="Avg Cross-Channel Spread"
                value={formatPercent(snapshot.averageCrossChannelSpread)}
              />
              <StatTile
                label="Market Breadth"
                value={`${snapshot.marketBreadthPct}%`}
                hint="positive 30d"
                valueClassName={
                  snapshot.marketBreadthPct >= 50
                    ? "text-green-600"
                    : "text-brand-black"
                }
              />
              <StatTile
                label="Most Active Channel"
                value={snapshot.mostActiveChannelTier}
                isText
              />
            </div>
          </div>

          {/* Section 2: Top Movers */}
          <div>
            <h3 className="font-heading text-sm tracking-wide text-brand-black mb-2">
              TOP MOVERS
            </h3>
            {snapshot.topMovers.length === 0 ? (
              <div className="text-xs text-brand-black/50 px-1 py-3">
                No 30d movement data available.
              </div>
            ) : (
              <div className="border border-brand-gray/30 divide-y divide-brand-gray/20">
                {snapshot.topMovers.map((m) => {
                  const tone =
                    m.changePercent > 0
                      ? "text-green-600"
                      : m.changePercent < 0
                      ? "text-red-500"
                      : "text-brand-black";
                  return (
                    <button
                      key={m.asset.id}
                      type="button"
                      onClick={() => onSelectAsset?.(m.asset.id)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-brand-gray/10 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-brand-black truncate">
                          {m.asset.name}
                        </div>
                        {m.size && (
                          <div className="text-[10px] uppercase tracking-wide text-brand-black/50">
                            {m.size}
                          </div>
                        )}
                      </div>
                      <div className="flex items-baseline gap-3 flex-shrink-0">
                        <span className="text-xs font-mono-numeric text-brand-black/70">
                          {formatPrice(m.currentPrice)}
                        </span>
                        <span
                          className={`text-sm font-mono-numeric font-bold ${tone} w-16 text-right`}
                        >
                          {formatSignedPercent(m.changePercent)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Channel Efficiency */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-heading text-sm tracking-wide text-brand-black">
                CHANNEL EFFICIENCY
              </h3>
              <span className="text-[10px] uppercase tracking-wide text-brand-black/40">
                avg in-channel spread
              </span>
            </div>
            {snapshot.channelStats.length === 0 ? (
              <div className="text-xs text-brand-black/50 px-1 py-3">
                Not enough listings to rank channel efficiency yet.
              </div>
            ) : (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-brand-black/50 mb-1">
                  Tightest spreads
                </div>
                <div className="border border-brand-gray/30 divide-y divide-brand-gray/20">
                  {snapshot.channelStats.map((c) => {
                    const widthPct =
                      maxSpread > 0
                        ? Math.max(4, (c.averageSpreadPct / maxSpread) * 100)
                        : 0;
                    return (
                      <div
                        key={c.name}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-brand-black truncate">
                            {c.name}
                          </div>
                        </div>
                        <div className="hidden sm:block w-24 h-1 bg-brand-gray/30 flex-shrink-0">
                          <div
                            className="h-full bg-brand-black"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono-numeric font-bold text-brand-black w-14 text-right">
                          {formatPercent(c.averageSpreadPct)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-brand-black/50 mt-1 text-right">
                  Widest spreads
                </div>
                {tightest && widest && tightest.name !== widest.name && (
                  <div className="mt-2 text-xs text-brand-black/60">
                    <span className="text-brand-black font-medium">{tightest.name}</span>{" "}
                    is the most efficient channel today (
                    {formatPercent(tightest.averageSpreadPct)} avg spread).
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
  isText?: boolean;
}

const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  hint,
  valueClassName,
  isText,
}) => (
  <div className="bg-white px-3 py-3">
    <div className="text-xs text-brand-black/50 uppercase tracking-wide">
      {label}
    </div>
    <div className="mt-1 flex items-baseline gap-2">
      <span
        className={`${
          isText ? "font-body" : "font-mono font-mono-numeric"
        } font-bold text-lg text-brand-black ${valueClassName || ""}`}
      >
        {value}
      </span>
      {hint && (
        <span className="text-[10px] uppercase tracking-wide text-brand-black/40">
          {hint}
        </span>
      )}
    </div>
  </div>
);
