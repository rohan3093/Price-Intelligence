import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Asset } from "../types";

interface MarketOverviewProps {
  assets: Asset[];
  onSelectAsset?: (id: number) => void;
}

interface TopMover {
  asset: Asset;
  changePercent: number;
  currentPrice: number;
}

interface MarketHealthMetrics {
  healthIndex: number;
  averageChange30d: number;
  assetsWithPositiveChange: number;
  assetsWithNegativeChange: number;
  volatilityDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  totalListings: number;
}

function parseChangePercent(changeStr: string | undefined): number | null {
  if (!changeStr) return null;
  const match = changeStr.match(/[+-]?[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function getAssetBestPrice(asset: Asset): number | undefined {
  if (asset.bestAvailablePrice !== undefined) return asset.bestAvailablePrice;
  const defaultSize = asset.defaultSize || asset.size;
  const sizeVariant = asset.sizes?.find((s) => s.size === defaultSize) ?? asset.sizes?.[0];
  if (sizeVariant?.bestAvailablePrice !== undefined) return sizeVariant.bestAvailablePrice;
  return undefined;
}

function calculateMarketHealth(assets: Asset[]): MarketHealthMetrics {
  if (assets.length === 0) {
    return {
      healthIndex: 50, averageChange30d: 0, assetsWithPositiveChange: 0,
      assetsWithNegativeChange: 0, volatilityDistribution: { low: 0, medium: 0, high: 0 },
      totalListings: 0,
    };
  }

  const changes30d: number[] = [];
  let positiveChanges = 0;
  let negativeChanges = 0;

  assets.forEach((asset) => {
    const change30d = parseChangePercent(asset.change30d);
    if (change30d !== null) {
      changes30d.push(change30d);
      if (change30d > 0) positiveChanges++;
      else if (change30d < 0) negativeChanges++;
    }
  });

  const averageChange30d = changes30d.length > 0
    ? changes30d.reduce((sum, c) => sum + c, 0) / changes30d.length
    : 0;

  let totalListings = 0;
  let assetsWithListings = 0;
  assets.forEach((asset) => {
    const snapshot = asset.listingsSnapshot;
    if (snapshot) {
      const total = (snapshot.b2bCount || 0) + (snapshot.consumerCount || 0) + (snapshot.intlCount || 0);
      if (total > 0) { totalListings += total; assetsWithListings++; }
    }
  });

  const averageLiquidity = assetsWithListings > 0 ? totalListings / assetsWithListings : 0;

  const volatilityDistribution = {
    low: assets.filter((a) => a.volatility === "low").length,
    medium: assets.filter((a) => a.volatility === "medium").length,
    high: assets.filter((a) => a.volatility === "high").length,
  };

  const changeScore = Math.max(0, Math.min(100, 50 + (averageChange30d * 2)));
  const ratioScore = assets.length > 0 ? (positiveChanges / assets.length) * 100 : 50;
  const liquidityScore = Math.min(100, (averageLiquidity / 10) * 100);
  const volatilityScore = assets.length > 0
    ? ((volatilityDistribution.low * 1.0 + volatilityDistribution.medium * 0.7 + volatilityDistribution.high * 0.4) / assets.length) * 100
    : 50;

  const healthIndex = changeScore * 0.4 + ratioScore * 0.3 + liquidityScore * 0.2 + volatilityScore * 0.1;

  return {
    healthIndex: Math.round(healthIndex),
    averageChange30d: Math.round(averageChange30d * 10) / 10,
    assetsWithPositiveChange: positiveChanges,
    assetsWithNegativeChange: negativeChanges,
    volatilityDistribution,
    totalListings,
  };
}

function getTopMovers(assets: Asset[], count: number = 5): { gainers: TopMover[]; losers: TopMover[] } {
  const movers: TopMover[] = [];
  assets.forEach((asset) => {
    const change30d = parseChangePercent(asset.change30d);
    const currentPrice = getAssetBestPrice(asset);
    if (change30d !== null && currentPrice !== undefined) {
      movers.push({ asset, changePercent: change30d, currentPrice });
    }
  });
  movers.sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: movers.filter((m) => m.changePercent > 0).slice(0, count),
    losers: movers.filter((m) => m.changePercent < 0).reverse().slice(0, count),
  };
}

const TickerDivider: React.FC = () => (
  <span className="text-brand-black/15 mx-1 select-none flex-shrink-0">│</span>
);

export const MarketOverview: React.FC<MarketOverviewProps> = ({ assets, onSelectAsset }) => {
  const marketHealth = useMemo(() => calculateMarketHealth(assets), [assets]);
  const topMovers = useMemo(() => getTopMovers(assets, 5), [assets]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number>(0);
  const scrollPosRef = useRef(0);

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined) return "—";
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  // Build ticker items from market data
  const tickerItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    // Interleave gainers and losers for variety
    const maxLen = Math.max(topMovers.gainers.length, topMovers.losers.length);
    for (let i = 0; i < maxLen; i++) {
      if (topMovers.gainers[i]) {
        const g = topMovers.gainers[i];
        items.push(
          <button
            key={`g-${g.asset.id}`}
            className="flex items-center gap-2 flex-shrink-0 hover:bg-brand-gray/10 px-2 py-0.5 transition-colors cursor-pointer"
            style={{ borderRadius: '4px' }}
            onClick={() => onSelectAsset?.(g.asset.id)}
          >
            {g.asset.image && (
              <img src={g.asset.image} alt="" className="w-5 h-5 object-contain flex-shrink-0" style={{ borderRadius: '3px' }} />
            )}
            <span className="text-xs font-medium text-brand-black truncate max-w-[140px]">{g.asset.name}</span>
            <span className="text-xs font-mono-numeric text-brand-black/50">{formatPrice(g.currentPrice)}</span>
            <span className="text-xs font-bold font-mono-numeric text-green-600">{formatPercent(g.changePercent)}</span>
          </button>
        );
      }
      if (topMovers.losers[i]) {
        const l = topMovers.losers[i];
        items.push(
          <button
            key={`l-${l.asset.id}`}
            className="flex items-center gap-2 flex-shrink-0 hover:bg-brand-gray/10 px-2 py-0.5 transition-colors cursor-pointer"
            style={{ borderRadius: '4px' }}
            onClick={() => onSelectAsset?.(l.asset.id)}
          >
            {l.asset.image && (
              <img src={l.asset.image} alt="" className="w-5 h-5 object-contain flex-shrink-0" style={{ borderRadius: '3px' }} />
            )}
            <span className="text-xs font-medium text-brand-black truncate max-w-[140px]">{l.asset.name}</span>
            <span className="text-xs font-mono-numeric text-brand-black/50">{formatPrice(l.currentPrice)}</span>
            <span className="text-xs font-bold font-mono-numeric text-red-600">{formatPercent(l.changePercent)}</span>
          </button>
        );
      }
    }
    return items;
  }, [topMovers, onSelectAsset]);

  // Manual scroll animation for seamless looping
  const animate = useCallback(() => {
    if (!scrollRef.current || isPaused) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    const el = scrollRef.current;
    const halfWidth = el.scrollWidth / 2;

    scrollPosRef.current += 0.5; // pixels per frame (~30px/s at 60fps)
    if (scrollPosRef.current >= halfWidth) {
      scrollPosRef.current -= halfWidth;
    }
    el.scrollLeft = scrollPosRef.current;
    animationRef.current = requestAnimationFrame(animate);
  }, [isPaused]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate]);

  // Sync scrollPosRef with actual scrollLeft on resume
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => {
    if (scrollRef.current) scrollPosRef.current = scrollRef.current.scrollLeft;
    setIsPaused(false);
  };

  return (
    <section className="border-b border-brand-gray/20 bg-white overflow-hidden">
      <div
        className="flex items-center h-9"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Fixed left section: market stats */}
        <div className="flex items-center gap-2.5 px-3 flex-shrink-0 border-r border-brand-gray/20 h-full bg-gray-50/80 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-brand-black/40 uppercase tracking-wider">Sentria</span>
            <span className="px-1 py-0.5 bg-green-600 text-white text-[8px] font-bold leading-none" style={{ borderRadius: '3px' }}>
              LIVE
            </span>
          </div>

          <span className="text-brand-gray/30">│</span>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-brand-black/40">Health</span>
            <span className={`text-xs font-bold ${
              marketHealth.healthIndex >= 70 ? 'text-green-600' :
              marketHealth.healthIndex >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {marketHealth.healthIndex}
            </span>
          </div>

          <span className="text-brand-gray/30">│</span>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-brand-black/40">30d</span>
            <span className={`text-xs font-bold font-mono-numeric ${
              marketHealth.averageChange30d >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {marketHealth.averageChange30d >= 0 ? '↑' : '↓'}{formatPercent(marketHealth.averageChange30d)}
            </span>
          </div>

          <span className="text-brand-gray/30">│</span>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-green-600">{marketHealth.assetsWithPositiveChange}↑</span>
            <span className="text-brand-black/20">/</span>
            <span className="text-xs font-bold text-red-600">{marketHealth.assetsWithNegativeChange}↓</span>
          </div>

          <span className="text-brand-gray/30">│</span>

          <span className="text-[10px] text-brand-black/40">{assets.length} assets</span>
        </div>

        {/* Scrolling ticker strip */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-hidden flex items-center h-full bg-white no-scrollbar"
        >
          {/* Duplicate content for seamless loop */}
          <div className="flex items-center gap-1 whitespace-nowrap px-3 flex-shrink-0">
            {tickerItems.map((item, i) => (
              <React.Fragment key={`a-${i}`}>
                {item}
                {i < tickerItems.length - 1 && <TickerDivider />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap px-3 flex-shrink-0" aria-hidden>
            {tickerItems.map((item, i) => (
              <React.Fragment key={`b-${i}`}>
                {item}
                {i < tickerItems.length - 1 && <TickerDivider />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
