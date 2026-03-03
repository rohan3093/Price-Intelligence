import React, { useMemo, useState } from "react";
import { Asset } from "../types";

interface MarketOverviewProps {
  assets: Asset[];
}

interface TopMover {
  asset: Asset;
  changePercent: number;
  currentPrice: number;
  previousPrice?: number;
}

interface MarketHealthMetrics {
  healthIndex: number; // 0-100
  averageChange30d: number;
  averageChange90d: number;
  assetsWithPositiveChange: number;
  assetsWithNegativeChange: number;
  averageLiquidity: number;
  volatilityDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  totalListings: number;
}

/**
 * Parse change string to number (e.g., "+5.2%" -> 5.2, "-3.1%" -> -3.1)
 */
function parseChangePercent(changeStr: string | undefined): number | null {
  if (!changeStr) return null;
  const match = changeStr.match(/[+-]?[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Get best available price for an asset
 */
function getAssetBestPrice(asset: Asset): number | undefined {
  if (asset.bestAvailablePrice !== undefined) return asset.bestAvailablePrice;
  
  const defaultSize = asset.defaultSize || asset.size;
  const sizeVariant = asset.sizes?.find((s) => s.size === defaultSize) ?? asset.sizes?.[0];
  
  if (sizeVariant?.bestAvailablePrice !== undefined) {
    return sizeVariant.bestAvailablePrice;
  }
  
  return undefined;
}

/**
 * Calculate market health index based on multiple factors
 */
function calculateMarketHealth(assets: Asset[]): MarketHealthMetrics {
  if (assets.length === 0) {
    return {
      healthIndex: 50,
      averageChange30d: 0,
      averageChange90d: 0,
      assetsWithPositiveChange: 0,
      assetsWithNegativeChange: 0,
      averageLiquidity: 0,
      volatilityDistribution: { low: 0, medium: 0, high: 0 },
      totalListings: 0,
    };
  }

  // Calculate price changes
  const changes30d: number[] = [];
  const changes90d: number[] = [];
  let positiveChanges = 0;
  let negativeChanges = 0;

  assets.forEach((asset) => {
    const change30d = parseChangePercent(asset.change30d);
    const change90d = parseChangePercent(asset.change90d);
    
    if (change30d !== null) {
      changes30d.push(change30d);
      if (change30d > 0) positiveChanges++;
      else if (change30d < 0) negativeChanges++;
    }
    
    if (change90d !== null) {
      changes90d.push(change90d);
    }
  });

  const averageChange30d = changes30d.length > 0
    ? changes30d.reduce((sum, c) => sum + c, 0) / changes30d.length
    : 0;
  
  const averageChange90d = changes90d.length > 0
    ? changes90d.reduce((sum, c) => sum + c, 0) / changes90d.length
    : 0;

  // Calculate liquidity metrics
  let totalListings = 0;
  let assetsWithListings = 0;

  assets.forEach((asset) => {
    const snapshot = asset.listingsSnapshot;
    if (snapshot) {
      const total = (snapshot.b2bCount || 0) + (snapshot.consumerCount || 0) + (snapshot.intlCount || 0);
      if (total > 0) {
        totalListings += total;
        assetsWithListings++;
      }
    }
  });

  const averageLiquidity = assetsWithListings > 0 ? totalListings / assetsWithListings : 0;

  // Calculate volatility distribution
  const volatilityDistribution = {
    low: assets.filter((a) => a.volatility === "low").length,
    medium: assets.filter((a) => a.volatility === "medium").length,
    high: assets.filter((a) => a.volatility === "high").length,
  };

  // Calculate health index (0-100)
  // Factors:
  // 1. Average price change (40% weight) - positive changes boost health
  // 2. Ratio of positive to negative changes (30% weight)
  // 3. Liquidity (20% weight) - more listings = healthier market
  // 4. Volatility (10% weight) - lower volatility = healthier

  const changeScore = Math.max(0, Math.min(100, 50 + (averageChange30d * 2))); // -25% to +25% maps to 0-100
  
  const ratioScore = assets.length > 0
    ? (positiveChanges / assets.length) * 100
    : 50;
  
  const liquidityScore = Math.min(100, (averageLiquidity / 10) * 100); // Normalize to 10 listings = 100
  
  const volatilityScore = assets.length > 0
    ? ((volatilityDistribution.low * 1.0 + volatilityDistribution.medium * 0.7 + volatilityDistribution.high * 0.4) / assets.length) * 100
    : 50;

  const healthIndex = 
    changeScore * 0.4 +
    ratioScore * 0.3 +
    liquidityScore * 0.2 +
    volatilityScore * 0.1;

  return {
    healthIndex: Math.round(healthIndex),
    averageChange30d: Math.round(averageChange30d * 10) / 10,
    averageChange90d: Math.round(averageChange90d * 10) / 10,
    assetsWithPositiveChange: positiveChanges,
    assetsWithNegativeChange: negativeChanges,
    averageLiquidity: Math.round(averageLiquidity * 10) / 10,
    volatilityDistribution,
    totalListings,
  };
}

/**
 * Get top movers (gainers and losers)
 */
function getTopMovers(assets: Asset[], count: number = 10): { gainers: TopMover[]; losers: TopMover[] } {
  const movers: TopMover[] = [];

  assets.forEach((asset) => {
    const change30d = parseChangePercent(asset.change30d);
    const currentPrice = getAssetBestPrice(asset);

    if (change30d !== null && currentPrice !== undefined) {
      // Estimate previous price from current price and change
      const previousPrice = currentPrice / (1 + change30d / 100);

      movers.push({
        asset,
        changePercent: change30d,
        currentPrice,
        previousPrice,
      });
    }
  });

  // Sort by change percent
  movers.sort((a, b) => b.changePercent - a.changePercent);

  const gainers = movers.filter((m) => m.changePercent > 0).slice(0, count);
  const losers = movers
    .filter((m) => m.changePercent < 0)
    .reverse()
    .slice(0, count);

  return { gainers, losers };
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ assets }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed to save space
  const marketHealth = useMemo(() => calculateMarketHealth(assets), [assets]);
  const topMovers = useMemo(() => getTopMovers(assets, 5), [assets]); // Reduced from 10 to 5

  const getHealthColor = (index: number): string => {
    if (index >= 70) return "text-green-600";
    if (index >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthLabel = (index: number): string => {
    if (index >= 70) return "Healthy";
    if (index >= 50) return "Moderate";
    return "Weak";
  };

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined) return "N/A";
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <section className="px-3 py-2 md:px-4 md:py-3 border-b border-brand-gray/20 bg-gradient-to-br from-white to-brand-background">
      {/* Compact Header - Collapsed by Default */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-semibold text-brand-black leading-tight uppercase tracking-wide">
              Market Overview
            </h2>
            <span className="px-1.5 py-0.5 bg-brand-black text-white text-[10px] font-bold" style={{ borderRadius: '4px' }}>
              LIVE
            </span>
          </div>
          {/* Quick Health Indicator - Always Visible */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-black/50">Health:</span>
            <span className={`font-bold ${getHealthColor(marketHealth.healthIndex)}`}>
              {marketHealth.healthIndex}
            </span>
            <span className="text-brand-black/40">•</span>
            <span className={`font-semibold ${
              marketHealth.averageChange30d >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {formatPercent(marketHealth.averageChange30d)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-black border border-brand-gray/30 hover:border-brand-black hover:bg-brand-background/50 transition-all"
          style={{ borderRadius: '6px' }}
          aria-label={isExpanded ? "Collapse overview" : "Expand overview"}
        >
          <span className="hidden sm:inline">{isExpanded ? "Hide" : "Show"}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-3">
          {/* Quick Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-2">
        <div className="border border-brand-gray/20 bg-white p-3 hover:border-brand-black hover:shadow-md shadow-sm transition-all" style={{ borderRadius: '8px' }}>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 font-semibold">
            Market Health
          </p>
          <div className="flex items-baseline gap-2">
            <div className={`text-2xl font-bold ${getHealthColor(marketHealth.healthIndex)}`}>
              {marketHealth.healthIndex}
            </div>
            <span className={`text-sm font-semibold ${getHealthColor(marketHealth.healthIndex)}`}>
              {getHealthLabel(marketHealth.healthIndex)}
            </span>
          </div>
        </div>

        <div className="border border-brand-gray/20 bg-white p-3 hover:border-brand-black hover:shadow-md shadow-sm transition-all" style={{ borderRadius: '8px' }}>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 font-semibold">
            30d Average
          </p>
          <div className={`text-2xl font-bold font-mono-numeric ${
            marketHealth.averageChange30d >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {formatPercent(marketHealth.averageChange30d)}
          </div>
        </div>

        <div className="border border-brand-gray/20 bg-white p-3 hover:border-brand-black hover:shadow-md shadow-sm transition-all" style={{ borderRadius: '8px' }}>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 font-semibold">
            Market Sentiment
          </p>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <span className="text-green-600">{marketHealth.assetsWithPositiveChange}↑</span>
            <span className="text-brand-black/40">/</span>
            <span className="text-red-600">{marketHealth.assetsWithNegativeChange}↓</span>
          </div>
        </div>

        <div className="border border-brand-gray/20 bg-white p-3 hover:border-brand-black hover:shadow-md shadow-sm transition-all" style={{ borderRadius: '8px' }}>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 font-semibold">
            Total Assets
          </p>
          <div className="text-2xl font-bold text-brand-black">
            {assets.length}
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-3 md:space-y-4 pt-2 border-t border-brand-gray/20">

          {/* Health Metrics Grid - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <div className="border border-brand-gray/20 p-2 bg-white shadow-sm" style={{ borderRadius: '8px' }}>
              <p className="text-[9px] text-brand-black/60 uppercase tracking-wide mb-0.5">
                30d Avg
              </p>
              <p
                className={`text-sm font-semibold ${
                  marketHealth.averageChange30d >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPercent(marketHealth.averageChange30d)}
              </p>
            </div>

            <div className="border border-brand-gray/20 p-2 bg-white shadow-sm" style={{ borderRadius: '8px' }}>
              <p className="text-[9px] text-brand-black/60 uppercase tracking-wide mb-0.5">
                90d Avg
              </p>
              <p
                className={`text-sm font-semibold ${
                  marketHealth.averageChange90d >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPercent(marketHealth.averageChange90d)}
              </p>
            </div>

            <div className="border border-brand-gray/20 p-2 bg-white shadow-sm" style={{ borderRadius: '8px' }}>
              <p className="text-[9px] text-brand-black/60 uppercase tracking-wide mb-0.5">
                Listings
              </p>
              <p className="text-sm font-semibold text-brand-black">
                {marketHealth.averageLiquidity.toFixed(1)}
              </p>
            </div>

            <div className="border border-brand-gray/20 p-2 bg-white shadow-sm" style={{ borderRadius: '8px' }}>
              <p className="text-[9px] text-brand-black/60 uppercase tracking-wide mb-0.5">
                Volatility
              </p>
              <div className="flex gap-1">
                <span className="text-[9px] text-green-600 font-medium">
                  {marketHealth.volatilityDistribution.low}L
                </span>
                <span className="text-[9px] text-yellow-600 font-medium">
                  {marketHealth.volatilityDistribution.medium}M
                </span>
                <span className="text-[9px] text-red-600 font-medium">
                  {marketHealth.volatilityDistribution.high}H
                </span>
              </div>
            </div>
          </div>

          {/* Top Movers - Compact */}
          <div className="grid md:grid-cols-2 gap-3 md:gap-4">
            {/* Top Gainers - Compact */}
            <div className="border border-brand-gray/20 bg-white shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="border-b border-brand-gray/20 p-2 bg-white" style={{ borderRadius: '8px 8px 0 0' }}>
                <h3 className="text-xs font-medium text-brand-black flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  Top Gainers
                </h3>
              </div>
              <div className="divide-y divide-brand-gray/10">
                {topMovers.gainers.length === 0 ? (
                  <div className="p-3 text-center text-[10px] text-brand-black/60">
                    No data
                  </div>
                ) : (
                  topMovers.gainers.map((mover) => (
                    <div
                      key={mover.asset.id}
                      className="p-2 hover:bg-brand-gray/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {mover.asset.image && (
                            <img
                              src={mover.asset.image}
                              alt={mover.asset.name}
                              className="w-8 h-8 object-cover border border-brand-gray/20 flex-shrink-0"
                              style={{ borderRadius: "6px" }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-brand-black truncate">
                              {mover.asset.name}
                            </p>
                            <p className="text-[9px] text-brand-black/60">
                              {formatPrice(mover.currentPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`text-xs font-bold ${
                              mover.changePercent >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatPercent(mover.changePercent)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Losers - Compact */}
            <div className="border border-brand-gray/20 bg-white shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="border-b border-brand-gray/20 p-2 bg-white" style={{ borderRadius: '8px 8px 0 0' }}>
                <h3 className="text-xs font-medium text-brand-black flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                  Top Losers
                </h3>
              </div>
              <div className="divide-y divide-brand-gray/10">
                {topMovers.losers.length === 0 ? (
                  <div className="p-3 text-center text-[10px] text-brand-black/60">
                    No data
                  </div>
                ) : (
                  topMovers.losers.map((mover) => (
                    <div
                      key={mover.asset.id}
                      className="p-2 hover:bg-brand-gray/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {mover.asset.image && (
                            <img
                              src={mover.asset.image}
                              alt={mover.asset.name}
                              className="w-8 h-8 object-cover border border-brand-gray/20 flex-shrink-0"
                              style={{ borderRadius: "6px" }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-brand-black truncate">
                              {mover.asset.name}
                            </p>
                            <p className="text-[9px] text-brand-black/60">
                              {formatPrice(mover.currentPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`text-xs font-bold ${
                              mover.changePercent >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatPercent(mover.changePercent)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </section>
  );
};

