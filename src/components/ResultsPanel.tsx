import React, { useEffect, useRef, useCallback, useMemo } from "react";
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

// Loading skeleton for asset card - more compact with shimmer
const AssetCardSkeleton: React.FC = () => (
  <div className="border border-brand-gray/20 p-3 flex gap-3 bg-white" style={{ borderRadius: '8px' }}>
    <div className="h-12 w-12 bg-brand-gray/10 flex-shrink-0 relative overflow-hidden" style={{ borderRadius: '6px' }}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
    <div className="flex-1 space-y-2">
      <div className="h-4 w-3/4 bg-brand-gray/10 relative overflow-hidden" style={{ borderRadius: '4px' }}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
      <div className="h-3 w-1/2 bg-brand-gray/10 relative overflow-hidden" style={{ borderRadius: '4px' }}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
    </div>
    <div className="h-5 w-20 bg-brand-gray/10 relative overflow-hidden" style={{ borderRadius: '4px' }}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
  </div>
);

// Empty state component
const EmptyState: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => (
  <div className="text-center py-16 px-4">
    <svg className="w-12 h-12 mx-auto mb-4 text-brand-gray/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p className="text-sm font-semibold text-brand-black mb-2">
      {searchQuery ? "No assets found" : "No assets available"}
    </p>
    <p className="text-xs text-brand-black/60 max-w-xs mx-auto">
      {searchQuery 
        ? `Try searching for something else or clear your search`
        : "Assets will appear here once they're added"}
    </p>
  </div>
);

// Individual asset row component for virtualized list
interface AssetRowProps {
  asset: Asset;
  isSelected: boolean;
  isWatchlisted: boolean;
  searchQuery: string;
  onSelect: (id: number) => void;
  onToggleWatchlist?: (id: number) => void;
  style: React.CSSProperties;
}

const AssetRow: React.FC<AssetRowProps> = React.memo(({
  asset,
  isSelected,
  isWatchlisted,
  searchQuery,
  onSelect,
  onToggleWatchlist,
  style,
}) => {
            const sizeRange = formatSizeRange(asset);
            const bestPrice = calculateBestPrice(asset);
            
            return (
    <div style={style}>
              <div
        onClick={() => onSelect(asset.id)}
                role="option"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
            onSelect(asset.id);
                  }
                }}
        className={`border cursor-pointer transition-all duration-200 flex items-center gap-3 p-3 active:scale-[0.98] focus:outline-none focus:ring-2 ${
                  isSelected 
                    ? "border-brand-black bg-brand-black text-brand-white shadow-sm" 
                    : "border-brand-gray/20 bg-white hover:border-brand-gray/40 hover:shadow-sm"
                }`}
                style={{ borderRadius: '8px' }}
              >
                {/* Asset image */}
                <div className="h-12 w-12 bg-white flex items-center justify-center flex-shrink-0 border border-brand-gray/20" style={{ borderRadius: '6px' }}>
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
                
                {/* Asset info */}
                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold truncate text-sm leading-tight ${
                        isSelected ? "text-brand-white" : "text-brand-black"
                      }`}>
                        {searchQuery ? highlightText(asset.name, searchQuery) : asset.name}
                      </p>
                      {isBestDeal(asset) && (
                        <span className={`px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide leading-none ${
                          isSelected 
                            ? "bg-green-500 text-white" 
                            : "bg-green-500/10 text-green-700 border border-green-500/30"
                        }`}>
                          DEAL
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-tight mt-1 ${
                      isSelected ? "text-brand-white/80" : "text-brand-gray-dark"
                    }`}>
                      {searchQuery ? highlightText(asset.brand, searchQuery) : asset.brand} · {sizeRange}
                    </p>
                  </div>
                  
                  {/* Metrics row */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Price metrics group */}
                    <div className="flex items-center gap-3 pr-3 border-r border-brand-gray">
                      {/* Best Price */}
                      {bestPrice !== undefined && (
                        <div className="text-right cursor-help" title={`Best available price across all channels: ₹${bestPrice.toLocaleString("en-IN")}`}>
                          <p className={`text-sm font-mono-numeric font-semibold leading-tight ${
                            isSelected ? "text-brand-white" : "text-brand-black"
                          }`}>
                            ₹{bestPrice.toLocaleString("en-IN")}
                          </p>
                          <p className={`text-xs leading-tight mt-0.5 ${
                            isSelected ? "text-brand-white/70" : "text-brand-gray-medium"
                          }`}>
                            Best
                          </p>
                        </div>
                      )}
                      
                      {/* 30d Change */}
                      {asset.change30d && (
                        <div 
                          className={`text-right min-w-[50px] cursor-help ${
                            isSelected ? "text-brand-white" : ""
                          }`}
                          title={`30-day price change: ${asset.change30d}`}
                        >
                          <p
                            className={`text-sm font-mono-numeric font-semibold leading-tight ${
                              asset.change30d.startsWith("-")
                                ? "text-red-600"
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
                    </div>
                    
                    {/* Watchlist star button */}
                    {onToggleWatchlist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(asset.id);
                        }}
                className={`w-9 h-9 flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none ${
                          isSelected
                            ? isWatchlisted
                              ? "border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:bg-yellow-400/10"
                              : "border-brand-white/30 text-brand-white/50 hover:border-brand-white/50 hover:text-brand-white/70 hover:bg-brand-white/10"
                            : isWatchlisted
                            ? "border-brand-gray/30 text-yellow-500 hover:border-yellow-500 hover:bg-yellow-500/10"
                            : "border-brand-gray/30 text-brand-gray-dark hover:border-brand-black hover:text-brand-black hover:bg-brand-gray/10"
                        }`}
                        style={{ borderRadius: '6px' }}
                        title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                        aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <span className="text-base leading-none">{isWatchlisted ? "★" : "☆"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
    </div>
            );
});

AssetRow.displayName = 'AssetRow';

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
  
  // Calculate selected index for scrolling
  const selectedIndex = useMemo(() => 
    assets.findIndex(a => a.id === selectedId),
    [assets, selectedId]
  );

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
  }, [selectedIndex]);

  // Memoized keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
  }, [assets, selectedId, setSelectedId, isLoading]);

  // Keyboard navigation
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Memoized watchlist check
  const watchlistSet = useMemo(() => new Set(watchlistIds), [watchlistIds]);

  return (
    <section className="border border-brand-gray/20 p-4 bg-white flex-1 flex flex-col min-h-0 shadow-sm" style={{ borderRadius: '12px' }}>
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-brand-gray/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-brand-black uppercase tracking-wider">
            Assets
          </h2>
          {!isLoading && searchQuery && (
            <span className="text-xs text-brand-black/60 font-medium">
              {assets.length} found
            </span>
          )}
        </div>
        {!isLoading && (
          <span className="text-sm text-brand-black font-mono-numeric font-bold">
            {assets.length}
          </span>
        )}
      </div>
      <div 
        ref={containerRef}
        tabIndex={0}
        role="listbox"
        aria-label="Asset list"
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar focus:outline-none focus:ring-2 focus:ring-brand-black focus:ring-inset"
      >
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <AssetCardSkeleton key={i} />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          // Optimized list with memoized rows
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.id} ref={selectedId === asset.id ? selectedRef : null}>
                <AssetRow
                  asset={asset}
                  isSelected={selectedId === asset.id}
                  isWatchlisted={watchlistSet.has(asset.id)}
                  searchQuery={searchQuery}
                  onSelect={setSelectedId}
                  onToggleWatchlist={onToggleWatchlist}
                  style={{}}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

