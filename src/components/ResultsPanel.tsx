import React, { useEffect, useRef } from "react";
import { Asset, PricePoint } from "../types";

interface ResultsPanelProps {
  assets: Asset[];
  selectedId: number | null;
  setSelectedId: (id: number) => void;
  isLoading?: boolean;
  searchQuery?: string;
  watchlistIds?: number[];
  onToggleWatchlist?: (assetId: number) => void;
}

/**
 * Highlights matching text in a string
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-brand-yellow/30 text-brand-black font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * Calculate best available price for an asset
 */
function calculateBestPrice(asset: Asset): number | undefined {
  // Use pre-calculated value if available
  if (asset.bestAvailablePrice) {
    return asset.bestAvailablePrice;
  }

  // Try to get from default size
  const defaultSize = asset.defaultSize || asset.size;
  const sizeVariant = asset.sizes?.find(s => s.size === defaultSize);
  
  if (sizeVariant?.bestAvailablePrice) {
    return sizeVariant.bestAvailablePrice;
  }

  // Calculate from price points
  const allPrices: number[] = [];
  
  // Get price points from size variant or asset level
  const pricePoints = sizeVariant?.pricePoints || sizeVariant?.legacyPricePoints || asset.pricePoints;
  
  if (pricePoints) {
    // WhatsApp prices
    const whatsapp = ('whatsapp' in pricePoints ? pricePoints.whatsapp : pricePoints.b2b || []) as PricePoint[];
    if (whatsapp.length > 0) {
      allPrices.push(...whatsapp.map(p => p.price));
    }
    
    // Marketplace prices
    const marketplace = ('marketplace' in pricePoints ? pricePoints.marketplace : pricePoints.endCustomer || []) as PricePoint[];
    if (marketplace.length > 0) {
      allPrices.push(...marketplace.map(p => p.price));
    }
    
    // International prices (with reshipping)
    const international = ('international' in pricePoints ? pricePoints.international : pricePoints.stockxGoat || []) as PricePoint[];
    if (international.length > 0) {
      allPrices.push(...international.map(p => p.price + (p.reshippingCost || 0)));
    }
  }

  return allPrices.length > 0 ? Math.min(...allPrices) : undefined;
}

/**
 * Check if asset is a "best deal" (price is significantly below retail)
 */
function isBestDeal(asset: Asset): boolean {
  const bestPrice = calculateBestPrice(asset);
  const retailPrice = asset.priceAnchors?.retailIndia;
  
  if (!bestPrice || !retailPrice) return false;
  
  // Consider it a "best deal" if price is at least 10% below retail
  const discount = ((retailPrice - bestPrice) / retailPrice) * 100;
  return discount >= 10;
}

/**
 * Formats size range from asset sizes array
 * Returns format like "UK 6 - UK 10" or single size if only one exists
 */
function formatSizeRange(asset: Asset): string {
  if (!asset.sizes || asset.sizes.length === 0) {
    return asset.size || asset.sku || "";
  }

  const sizes = asset.sizes.map(s => s.size).filter(Boolean);
  
  if (sizes.length === 0) {
    return asset.size || asset.sku || "";
  }

  if (sizes.length === 1) {
    return sizes[0];
  }

  // Extract numeric part for sorting (handles formats like "UK 6", "US 9", etc.)
  const extractNumeric = (size: string): number => {
    const match = size.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Sort sizes by numeric value
  const sortedSizes = [...sizes].sort((a, b) => extractNumeric(a) - extractNumeric(b));
  
  const minSize = sortedSizes[0];
  const maxSize = sortedSizes[sortedSizes.length - 1];

  // If min and max are the same, return single size
  if (minSize === maxSize) {
    return minSize;
  }

  return `${minSize} - ${maxSize}`;
}

// Loading skeleton for asset card - more compact
const AssetCardSkeleton: React.FC = () => (
  <div className="border border-brand-gray/30 p-2 flex gap-2 animate-pulse" style={{ borderRadius: '0px' }}>
    <div className="h-10 w-10 bg-brand-gray/20 flex-shrink-0"></div>
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-3/4 bg-brand-gray/20"></div>
      <div className="h-2.5 w-1/2 bg-brand-gray/20"></div>
    </div>
    <div className="h-5 w-16 bg-brand-gray/20"></div>
  </div>
);

// Empty state component
const EmptyState: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => (
  <div className="text-center py-12 px-4">
    <svg className="w-16 h-16 text-brand-gray/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p className="text-sm font-semibold text-brand-black/70 mb-1">
      {searchQuery ? "No assets found" : "No assets available"}
    </p>
    <p className="text-xs text-brand-black/50">
      {searchQuery 
        ? `Try searching for something else or clear your search`
        : "Assets will appear here once they're added"}
    </p>
  </div>
);

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  assets,
  selectedId,
  setSelectedId,
  isLoading = false,
  searchQuery = "",
  watchlistIds = [],
  onToggleWatchlist,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      const container = containerRef.current;
      const selected = selectedRef.current;
      const containerRect = container.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();

      // Check if selected item is outside viewport
      if (selectedRect.top < containerRect.top || selectedRect.bottom > containerRect.bottom) {
        selected.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input/textarea or if no assets
      if (assets.length === 0 || isLoading) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const currentIndex = assets.findIndex(a => a.id === selectedId);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < assets.length - 1 ? currentIndex + 1 : 0;
        setSelectedId(assets[nextIndex].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : assets.length - 1;
        setSelectedId(assets[prevIndex].id);
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (assets.length > 0) {
          setSelectedId(assets[0].id);
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        if (assets.length > 0) {
          setSelectedId(assets[assets.length - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assets, selectedId, setSelectedId, isLoading]);

  return (
    <section className="border border-brand-gray/30 rounded-none p-3 bg-brand-white" style={{ borderRadius: '0px' }}>
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-brand-gray/20">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-brand-black uppercase tracking-wide">
            Assets
          </h2>
          {!isLoading && searchQuery && (
            <span className="text-[10px] text-brand-black/50 font-medium">
              {assets.length} found
            </span>
          )}
        </div>
        {!isLoading && (
          <span className="text-[10px] text-brand-black/60 font-mono-numeric">
            {assets.length}
          </span>
        )}
      </div>
      <div 
        ref={containerRef}
        className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto"
        tabIndex={0}
        role="listbox"
        aria-label="Asset list"
      >
        {isLoading ? (
          // Loading skeletons
          <>
            {[...Array(5)].map((_, i) => (
              <AssetCardSkeleton key={i} />
            ))}
          </>
        ) : assets.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          assets.map((asset) => {
            const isSelected = selectedId === asset.id;
            const sizeRange = formatSizeRange(asset);
            const isWatchlisted = watchlistIds.includes(asset.id);
            const bestPrice = calculateBestPrice(asset);
            
            return (
              <div
                key={asset.id}
                ref={isSelected ? selectedRef : null}
                onClick={() => setSelectedId(asset.id)}
                role="option"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(asset.id);
                  }
                }}
                className={`border cursor-pointer transition-all flex items-center gap-2 p-2 ${
                  isSelected 
                    ? "border-brand-black bg-brand-black text-brand-white" 
                    : "border-brand-gray/30 bg-brand-white hover:border-brand-gray/50 hover:bg-brand-gray/5"
                }`}
                style={{ borderRadius: '0px' }}
              >
                {/* Compact image */}
                <div className="h-10 w-10 bg-brand-white flex items-center justify-center flex-shrink-0 border border-brand-gray/20" style={{ borderRadius: '0px' }}>
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.image-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'image-placeholder text-[9px] text-brand-black/40 text-center';
                        placeholder.textContent = '—';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                </div>
                
                {/* Asset info - more compact */}
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-semibold truncate text-xs leading-tight ${
                        isSelected ? "text-brand-white" : "text-brand-black"
                      }`}>
                        {searchQuery ? highlightText(asset.name, searchQuery) : asset.name}
                      </p>
                      {isBestDeal(asset) && (
                        <span className={`px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none ${
                          isSelected 
                            ? "bg-green-500 text-white" 
                            : "bg-green-500/10 text-green-700 border border-green-500/30"
                        }`}>
                          DEAL
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] leading-tight mt-0.5 ${
                      isSelected ? "text-brand-white/70" : "text-brand-black/60"
                    }`}>
                      {searchQuery ? highlightText(asset.brand, searchQuery) : asset.brand} · {sizeRange}
                    </p>
                  </div>
                  
                  {/* Exchange-style metrics row */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Best Price - prominent */}
                    {bestPrice !== undefined && (
                      <div className="text-right">
                        <p className={`text-xs font-mono-numeric font-semibold leading-tight ${
                          isSelected ? "text-brand-white" : "text-brand-black"
                        }`}>
                          ₹{bestPrice.toLocaleString("en-IN")}
                        </p>
                        <p className={`text-[9px] leading-tight mt-0.5 ${
                          isSelected ? "text-brand-white/60" : "text-brand-black/50"
                        }`}>
                          Best
                        </p>
                      </div>
                    )}
                    
                    {/* 30d Change */}
                    {asset.change30d && (
                      <div className={`text-right min-w-[45px] ${
                        isSelected ? "text-brand-white" : ""
                      }`}>
                        <p
                          className={`text-xs font-mono-numeric font-semibold leading-tight ${
                            asset.change30d.startsWith("-")
                              ? "text-red-500"
                              : asset.change30d.startsWith("+")
                              ? "text-green-600"
                              : isSelected ? "text-brand-white" : "text-brand-black"
                          }`}
                        >
                          {asset.change30d}
                        </p>
                        <p className={`text-[9px] leading-tight mt-0.5 ${
                          isSelected ? "text-brand-white/60" : "text-brand-black/50"
                        }`}>
                          30d
                        </p>
                      </div>
                    )}
                    
                    {/* Liquidity indicator */}
                    {asset.liquidity && (
                      <div className="text-right hidden md:block min-w-[35px]">
                        <p className={`text-[10px] font-mono-numeric leading-tight ${
                          isSelected ? "text-brand-white/80" : "text-brand-black/70"
                        }`}>
                          {asset.liquidity}
                        </p>
                        <p className={`text-[9px] leading-tight mt-0.5 ${
                          isSelected ? "text-brand-white/60" : "text-brand-black/50"
                        }`}>
                          Liq
                        </p>
                      </div>
                    )}
                    
                    {/* Watchlist star button */}
                    {onToggleWatchlist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(asset.id);
                        }}
                        className={`w-7 h-7 flex items-center justify-center border transition-colors ${
                          isSelected
                            ? isWatchlisted
                              ? "border-yellow-300/40 text-yellow-300 hover:border-yellow-300/60 hover:bg-yellow-300/5"
                              : "border-brand-white/20 text-brand-white/40 hover:border-brand-white/40 hover:text-brand-white/60 hover:bg-brand-white/5"
                            : isWatchlisted
                            ? "border-brand-gray/30 text-yellow-500 hover:border-yellow-500/50 hover:bg-yellow-500/5"
                            : "border-brand-gray/30 text-brand-black/40 hover:border-brand-black/50 hover:text-brand-black/60 hover:bg-brand-gray/5"
                        }`}
                        style={{ borderRadius: '0px' }}
                        title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                        aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <span className="text-xs leading-none">{isWatchlisted ? "★" : "☆"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

