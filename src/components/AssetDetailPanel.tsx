import React, { useState, useEffect, useMemo } from "react";
import { Asset, SizeVariant, PricePoint, PortfolioPosition, TradeListing } from "../types";
import { TradingChart } from "./TradingChart";
import { Pill } from "./Pill";
import { OrderBook } from "./OrderBook";
import { ConnectionRequestModal } from "./ConnectionRequestModal";
import { createConnectionRequest, getAssetListings, createTradeListing } from "../utils/connectionsApi";
import { User } from "firebase/auth";
import {
  computeOpportunities,
  ArbitrageOpportunity,
  DEFAULT_CONFIG,
  channelLabel,
  strategyLabel,
  strategyIcon,
  riskColor,
  riskBgColor,
  confidenceColor,
  turnaroundColor,
  turnaroundLabel,
} from "../utils/arbitrageEngine";

interface AssetDetailPanelProps {
  asset: Asset | undefined;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
  isLoading?: boolean;
  currentUser?: User | null;
  portfolioPositions?: PortfolioPosition[]; // For sell auto-fill
}

// Card Component - Clean, always-visible sections
interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  title,
  subtitle,
  icon,
  headerAction,
  children,
  className = "",
  noPadding = false,
}, ref) => {
  return (
    <div ref={ref} className={`bg-white border border-brand-gray/20 shadow-sm ${className}`} style={{ borderRadius: '16px' }}>
      {title && (
        <div className="px-5 py-4 border-b border-brand-gray/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="text-sm font-bold text-brand-black uppercase tracking-wide">
                  {title}
                </h3>
              </div>
              {subtitle && (
                <p className="text-xs text-brand-black/60 mt-1">{subtitle}</p>
              )}
            </div>
            {headerAction}
          </div>
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

// Loading Skeleton Components with shimmer effect
const MetricSkeleton: React.FC = () => (
  <div className="space-y-2">
    <div className="h-3 w-24 bg-brand-gray/20 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
    <div className="h-6 w-32 bg-brand-gray/30 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
  </div>
);

const CardSkeleton: React.FC = () => (
  <div className="p-4 bg-brand-white border border-brand-gray/20 shadow-sm" style={{ borderRadius: '16px' }}>
    <div className="space-y-3">
      <div className="h-4 w-32 bg-brand-gray/20 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
      <div className="h-3 w-24 bg-brand-gray/20 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
      <div className="pt-3 border-t border-brand-gray/20">
        <div className="h-5 w-28 bg-brand-gray/30 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>
      </div>
    </div>
  </div>
);

const ImageSkeleton: React.FC = () => (
  <div className="aspect-square w-full max-w-xs bg-brand-gray/10 border border-brand-gray/20 relative overflow-hidden" style={{ borderRadius: '12px' }}>
    <div className="w-full h-full bg-brand-gray/20 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
  </div>
);

const HeaderSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-brand-gray/30 pb-6">
    <div className="md:col-span-1">
      <ImageSkeleton />
    </div>
    <div className="md:col-span-2 space-y-4">
      <div className="space-y-3">
        <div className="h-8 w-64 bg-brand-gray/20 animate-pulse"></div>
        <div className="h-4 w-48 bg-brand-gray/20 animate-pulse"></div>
      </div>
      <div className="pt-4 border-t border-brand-gray/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Empty State Component
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon }) => (
  <div className="py-16 px-4 text-center">
    {icon && <div className="mb-4 flex justify-center">{icon}</div>}
    <p className="text-base font-semibold text-brand-black mb-2">{title}</p>
    {description && (
      <p className="text-sm text-brand-black/60 max-w-md mx-auto">{description}</p>
    )}
  </div>
);

// Helper function to format last seen timestamps
const formatLastSeen = (lastSeen: Date | string | undefined): string => {
  if (!lastSeen) return '—';
  
  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Mobile Card View for Listings
interface ListingCardProps {
  listing: {
    channel: string;
    side: string;
    price: number;
    landedPrice?: number;
    listingCount: number;
    sourceLabel: string;
    location?: string;
    lastSeen?: Date | string;
    contactType?: string;
    contactValue?: string;
  };
}

const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'Sentria':
        return 'border-emerald-600 bg-emerald-50';
      case 'WhatsApp':
        return 'border-green-600 bg-green-50';
      case 'Marketplace':
        return 'border-blue-600 bg-blue-50';
      case 'International':
        return 'border-purple-600 bg-purple-50';
      default:
        return 'border-brand-gray/30 bg-white';
    }
  };

  const getSideColor = (side: string) => {
    switch (side) {
      case 'Buy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Sell':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Listing':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-brand-gray/10 text-brand-black/80 border-brand-gray/20';
    }
  };

  const handleAction = () => {
    if (listing.contactType === 'whatsapp' && listing.contactValue) {
      window.open(`https://wa.me/${listing.contactValue.replace(/[^0-9]/g, '')}`, '_blank');
    } else if (listing.contactValue) {
      window.open(listing.contactValue, '_blank');
    }
  };

  return (
    <div className={`border-l-4 ${getChannelColor(listing.channel)} p-4 mb-3`} style={{ borderRadius: '8px' }}>
      {/* Header: Channel + Side + Price */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-black">
            {listing.channel}
          </span>
          <span className={`px-2 py-1 text-xs font-semibold uppercase border ${getSideColor(listing.side)}`} style={{ borderRadius: '4px' }}>
            {listing.side}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono-numeric font-bold text-brand-black leading-tight">
            ₹{listing.price.toLocaleString('en-IN')}
          </div>
          {listing.landedPrice && listing.landedPrice !== listing.price && (
            <div className="text-xs text-brand-black/60 mt-1">
              Landed: ₹{listing.landedPrice.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs text-brand-black/70 mb-3">
        <div>
          <span className="font-semibold">Source:</span> {listing.sourceLabel}
        </div>
        <div>
          <span className="font-semibold">Qty:</span> {listing.listingCount}
        </div>
        {listing.location && (
          <div>
            <span className="font-semibold">Location:</span> {listing.location}
          </div>
        )}
        {listing.lastSeen && (
          <div>
            <span className="font-semibold">Updated:</span> {formatLastSeen(listing.lastSeen)}
          </div>
        )}
      </div>

      {/* Action Button - Full Width, 44px minimum height for touch */}
      {listing.contactType && listing.contactValue && (
        <button
          onClick={handleAction}
          className="w-full min-h-[44px] px-4 py-3 bg-brand-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-colors active:scale-[0.98]"
          style={{ borderRadius: '8px' }}
        >
          {listing.side === 'Sell' ? 'Sell To' : 'Buy From'} →
        </button>
      )}
    </div>
  );
};

// Mobile Card View for Arbitrage Opportunities (uses engine types)
const ArbCard: React.FC<{ opp: ArbitrageOpportunity }> = ({ opp }) => {
  const roiPct = opp.netPct * 100;

  return (
    <div className="border border-brand-gray/20 bg-white p-4" style={{ borderRadius: '12px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-gray/15">
        <div className="flex items-center gap-1.5">
          <span>{strategyIcon(opp.strategy)}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-black/60">{strategyLabel(opp.strategy)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBgColor(opp.risk)} ${riskColor(opp.risk)}`} style={{ borderRadius: '4px' }}>
            {opp.risk}
          </span>
          <span className={`text-xs font-bold font-mono-numeric ${confidenceColor(opp.confidence)}`}>
            {opp.confidence}%
          </span>
        </div>
      </div>

      {/* Time Horizon */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className={`text-[10px] font-semibold ${turnaroundColor(opp.turnaroundDays)}`}>
          {turnaroundLabel(opp.turnaroundDays)}
        </span>
      </div>

      {/* Buy → Sell Flow */}
      <div className="space-y-2 mb-3">
        {/* Buy */}
        <div className="flex items-baseline justify-between bg-brand-background/30 border border-brand-gray/15 p-2.5" style={{ borderRadius: '8px' }}>
          <div>
            <div className="text-[10px] text-brand-black/50 uppercase font-semibold tracking-wider mb-0.5">Buy from</div>
            <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.buy.channel)}</div>
            <div className="text-[10px] text-brand-black/50 truncate max-w-[140px]">{opp.buy.source}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold font-mono-numeric text-brand-black">₹{opp.buy.allIn.toLocaleString('en-IN')}</div>
            {opp.buyShippingCost > 0 && (
              <div className="text-[10px] text-brand-black/40 font-mono-numeric">+₹{opp.buyShippingCost.toLocaleString('en-IN')} ship</div>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <svg className="w-4 h-4 text-brand-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Sell */}
        <div className="flex items-baseline justify-between bg-brand-background/30 border border-brand-gray/15 p-2.5" style={{ borderRadius: '8px' }}>
          <div>
            <div className="text-[10px] text-brand-black/50 uppercase font-semibold tracking-wider mb-0.5">Sell to</div>
            <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.sell.channel)}</div>
            <div className="text-[10px] text-brand-black/50 truncate max-w-[140px]">{opp.sell.source}</div>
            {opp.sellReliability === "consignment" && (
              <span className="inline-block mt-0.5 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60" style={{ borderRadius: '3px' }}>
                Consignment
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-bold font-mono-numeric text-brand-black">₹{opp.sell.net.toLocaleString('en-IN')}</div>
            {opp.sellFeeAmount > 0 && (
              <div className="text-[10px] text-brand-black/40 font-mono-numeric">−{(opp.sellFeeRate * 100).toFixed(1)}% fee</div>
            )}
          </div>
        </div>
      </div>

      {/* Profit */}
      <div className="bg-brand-black text-white p-3 flex items-center justify-between" style={{ borderRadius: '8px' }}>
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider opacity-70">Net Profit</div>
          <div className="text-xl font-bold font-mono-numeric">₹{opp.netProfit.toLocaleString('en-IN')}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold font-mono-numeric">{roiPct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-brand-black/40">
        <span>{opp.scalable} pair{opp.scalable !== 1 ? 's' : ''} available</span>
        <span>Buy: {opp.buy.count} · Sell: {opp.sell.count}</span>
      </div>
    </div>
  );
};

// Helper function to sort sizes numerically
// Extracts numeric value from size strings like "UK 6", "UK 3.5", etc.
const sortSizesNumerically = (sizes: SizeVariant[]): SizeVariant[] => {
  return [...sizes].sort((a, b) => {
    // Extract numeric value from size string (e.g., "UK 6" -> 6, "UK 3.5" -> 3.5)
    const extractNumericValue = (sizeStr: string): number => {
      const match = sizeStr.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    };
    
    const numA = extractNumericValue(a.size);
    const numB = extractNumericValue(b.size);
    
    return numA - numB;
  });
};

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({
  asset,
  watchlisted = false,
  onToggleWatchlist,
  isLoading = false,
  currentUser = null,
  portfolioPositions = [],
}) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [sortBy, setSortBy] = useState<'price' | 'quantity' | 'newest'>('price');
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [unifiedChannelFilter, setUnifiedChannelFilter] = useState<'all' | 'WhatsApp' | 'Marketplace' | 'International' | 'Sentria'>('all');
  const [unifiedSideFilter, setUnifiedSideFilter] = useState<'all' | 'Buy' | 'Sell' | 'Listing'>('all');
  const [minArbNetPct, setMinArbNetPct] = useState(0.03); // 3%
  const [minArbNetRs, setMinArbNetRs] = useState(0);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionTarget, setConnectionTarget] = useState<{userId: string; email: string; name?: string} | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [tradeListings, setTradeListings] = useState<TradeListing[]>([]);
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);
  
  // Main tab system for asset detail sections
  const [mainTab, setMainTab] = useState<'chart' | 'orderbook' | 'listings' | 'arbitrage' | 'analytics' | 'insight'>('chart');

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile nav when clicking outside
  useEffect(() => {
    if (!showMobileNav) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-nav-container')) {
        setShowMobileNav(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileNav]);

  // Initialize selected size when asset changes
  useEffect(() => {
    if (asset) {
      if (asset.sizes && asset.sizes.length > 0) {
        setSelectedSize(asset.defaultSize || asset.sizes[0].size);
      } else {
        setSelectedSize(asset.size || "");
      }
      // Reset filters when asset changes
      setFilterLocation(null);
      setSortBy('price');
      setUnifiedChannelFilter('all');
      setUnifiedSideFilter('all');
    }
  }, [asset]);

  // Load trade listings when asset or size changes
  useEffect(() => {
    if (asset && selectedSize) {
      loadTradeListings();
    }
  }, [asset, selectedSize]);

  const loadTradeListings = async () => {
    if (!asset) return;
    
    const listings = await getAssetListings(asset.id, selectedSize);
    setTradeListings(listings);
  };

  // Handle connection request submission
  const handleConnectionRequest = async (data: {
    targetId: string;
    targetEmail: string;
    targetName?: string;
    proposedPrice?: number;
    quantity: number;
    message?: string;
  }) => {
    if (!currentUser || !asset) return;

    const result = await createConnectionRequest(
      currentUser.uid,
      currentUser.email || '',
      {
        targetId: data.targetId,
        targetEmail: data.targetEmail,
        targetName: data.targetName,
        assetId: asset.id,
        assetName: asset.name,
        assetSku: asset.sku,
        assetImage: asset.image,
        size: selectedSize,
        connectionType: 'buy',
        proposedPrice: data.proposedPrice,
        quantity: data.quantity,
        message: data.message,
      }
    );

    if (result.success) {
      // Success feedback - you could add a toast notification here
      alert('Connection request sent! The seller will be notified.');
    } else {
      alert('Failed to send request: ' + result.error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="p-6 md:p-8 space-y-6 text-brand-black bg-brand-white">
        <HeaderSkeleton />
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    );
  }

  // Empty state - no asset selected
  if (!asset) {
    return (
      <section className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <EmptyState
          title="No Asset Selected"
          description="Select an asset from the list to view detailed market data, pricing, and insights."
          icon={
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-gray/10 mb-4">
              <svg className="w-10 h-10 text-brand-gray/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          }
        />
      </section>
    );
  }

  // Get the selected size variant or use legacy fields
  const sizeVariant: SizeVariant | null = asset.sizes?.find(s => s.size === selectedSize) || null;
  
  // Use size-specific data if available, otherwise fall back to legacy/asset-level data
  const currentData = sizeVariant || {
    size: selectedSize || asset.size || "",
    b2bMarketPrice: asset.b2bMarketPrice || asset.b2bRange || "N/A",
    endCustomerMarketPrice: asset.endCustomerMarketPrice || asset.b2cRange || "N/A",
    stockxGoatPrice: asset.stockxGoatPrice || asset.globalRange || "N/A",
    fairRange: asset.fairRange || "N/A",
    confidence: asset.confidence || 0,
    change30d: asset.change30d || "N/A",
    change90d: asset.change90d || "N/A",
    liquidity: asset.liquidity || "N/A",
    volumeLabel: asset.volumeLabel || "N/A",
    pricePoints: asset.pricePoints,
    legacyPricePoints: undefined,
    insight: asset.insight,
    bestAvailablePrice: asset.bestAvailablePrice,
    lastUpdated: asset.lastUpdated,
    dataPoints: asset.dataPoints,
  };

  // Helper to format last seen timestamp
  const formatLastSeen = (lastSeen?: Date | string): string => {
    if (!lastSeen) return '';
    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Memoized helper functions to extract prices from channel-based structure
  const whatsappPrices = useMemo(() => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('whatsapp' in sizeVariant.pricePoints ? sizeVariant.pricePoints.whatsapp : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.b2b || [];
    } else if (asset?.pricePoints) {
      pricePoints = ('whatsapp' in asset.pricePoints ? asset.pricePoints.whatsapp : asset.pricePoints.b2b || []) as PricePoint[];
    }
    let buyPrices = pricePoints.filter((p: PricePoint) => !p.transactionType || p.transactionType === 'buy' || p.transactionType === 'both');
    let sellPrices = pricePoints.filter((p: PricePoint) => p.transactionType === 'sell' || p.transactionType === 'both');
    
    // Apply location filter
    if (filterLocation) {
      buyPrices = buyPrices.filter((p: PricePoint) => 
        p.sellerLocation?.toLowerCase().includes(filterLocation.toLowerCase())
      );
      sellPrices = sellPrices.filter((p: PricePoint) => 
        p.sellerLocation?.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }
    
    // Apply sorting
    const sortPrices = (prices: PricePoint[], ascending: boolean) => {
      return [...prices].sort((a, b) => {
        if (sortBy === 'price') {
          return ascending ? a.price - b.price : b.price - a.price;
        } else if (sortBy === 'quantity') {
          return b.listingCount - a.listingCount;
        } else if (sortBy === 'newest') {
          const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
          const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
          return bDate.getTime() - aDate.getTime();
        }
        return 0;
      });
    };
    
    return {
      buy: sortPrices(buyPrices, true),
      sell: sortPrices(sellPrices, false),
      all: pricePoints
    };
  }, [sizeVariant, asset, sortBy, filterLocation]);

  const marketplacePrices = useMemo(() => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('marketplace' in sizeVariant.pricePoints ? sizeVariant.pricePoints.marketplace : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.endCustomer || [];
    } else if (asset?.pricePoints) {
      pricePoints = ('marketplace' in asset.pricePoints ? asset.pricePoints.marketplace : asset.pricePoints.endCustomer || []) as PricePoint[];
    }
    
    // Apply sorting
    return [...pricePoints].sort((a, b) => {
      if (sortBy === 'price') {
        return a.price - b.price;
      } else if (sortBy === 'quantity') {
        return b.listingCount - a.listingCount;
      } else if (sortBy === 'newest') {
        const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
        const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      }
      return 0;
    });
  }, [sizeVariant, asset, sortBy]);

  const internationalPrices = useMemo(() => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('international' in sizeVariant.pricePoints ? sizeVariant.pricePoints.international : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.stockxGoat || [];
    } else if (asset?.pricePoints) {
      pricePoints = ('international' in asset.pricePoints ? asset.pricePoints.international : asset.pricePoints.stockxGoat || []) as PricePoint[];
    }
    
    // Apply sorting
    return [...pricePoints].sort((a, b) => {
      if (sortBy === 'price') {
        return (a.price + (a.reshippingCost || 0)) - (b.price + (b.reshippingCost || 0));
      } else if (sortBy === 'quantity') {
        return b.listingCount - a.listingCount;
      } else if (sortBy === 'newest') {
        const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
        const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      }
      return 0;
    });
  }, [sizeVariant, asset, sortBy]);

  // Build unified listings view across channels for the selected size
  type UnifiedListing = {
    channel: 'WhatsApp' | 'Marketplace' | 'International' | 'Sentria';
    side: 'Buy' | 'Sell' | 'Listing';
    price: number;
    landedPrice?: number;
    listingCount: number;
    sourceLabel: string;
    location?: string;
    lastSeen?: Date | string;
    url?: string;
    contactType?: 'whatsapp' | 'link' | 'sentria';
    contactValue?: string;
    tradeListingUserId?: string;
    tradeListingUserEmail?: string;
  };

  const unifiedListings: UnifiedListing[] = React.useMemo(() => {
    const rows: UnifiedListing[] = [];

    // WhatsApp - buy side (you buy from these sellers)
    whatsappPrices.buy.forEach((p) => {
      rows.push({
        channel: 'WhatsApp',
        side: 'Buy',
        price: p.price,
        listingCount: p.listingCount ?? 1,
        sourceLabel: p.sellerName || p.source || 'Seller',
        location: p.sellerLocation,
        lastSeen: p.lastSeen,
        contactType: p.sellerContact ? 'whatsapp' : undefined,
        contactValue: p.sellerContact,
      });
    });

    // WhatsApp - sell side (you sell to these buyers)
    whatsappPrices.sell.forEach((p) => {
      rows.push({
        channel: 'WhatsApp',
        side: 'Sell',
        price: p.price,
        listingCount: p.listingCount ?? 1,
        sourceLabel: p.sellerName || p.source || 'Buyer',
        location: p.sellerLocation,
        lastSeen: p.lastSeen,
        contactType: p.sellerContact ? 'whatsapp' : undefined,
        contactValue: p.sellerContact,
      });
    });

    // Indian marketplaces (treated as listings you can buy from)
    marketplacePrices.forEach((p) => {
      rows.push({
        channel: 'Marketplace',
        side: 'Listing',
        price: p.price,
        listingCount: p.listingCount ?? 1,
        sourceLabel: p.marketplaceName || p.source || 'Marketplace',
        location: p.sellerLocation,
        lastSeen: p.lastSeen,
        url: p.url,
        contactType: p.url ? 'link' : undefined,
        contactValue: p.url,
      });
    });

    // International platforms (landed cost)
    internationalPrices.forEach((p) => {
      const landed = p.price + (p.reshippingCost || 0);
      rows.push({
        channel: 'International',
        side: 'Listing',
        price: p.price,
        landedPrice: landed,
        listingCount: p.listingCount ?? 1,
        sourceLabel: p.marketplaceName || p.source || 'International',
        location: p.sellerLocation,
        lastSeen: p.lastSeen,
        url: p.url,
        contactType: p.url ? 'link' : undefined,
        contactValue: p.url,
      });
    });

    // Sentria Network trade listings (from Firestore)
    tradeListings.forEach((tl) => {
      rows.push({
        channel: 'Sentria',
        side: 'Listing',
        price: tl.askingPrice,
        listingCount: tl.quantity,
        sourceLabel: tl.userName || 'Sentria Seller',
        location: tl.location,
        lastSeen: tl.createdAt,
        contactType: 'sentria',
        contactValue: tl.userEmail,
        tradeListingUserId: tl.userId,
        tradeListingUserEmail: tl.userEmail,
      });
    });

    // Sort primarily by landed / price ascending, then by channel for readability
    return rows.sort((a, b) => {
      const aPrice = a.landedPrice ?? a.price;
      const bPrice = b.landedPrice ?? b.price;
      if (aPrice !== bPrice) return aPrice - bPrice;
      if (a.channel !== b.channel) return a.channel.localeCompare(b.channel);
      if (a.side !== b.side) return a.side.localeCompare(b.side);
      return (b.listingCount || 0) - (a.listingCount || 0);
    });
  }, [whatsappPrices.buy, whatsappPrices.sell, marketplacePrices, internationalPrices, tradeListings]);

  // Arbitrage opportunities — powered by shared engine
  const arbitrageOpps = useMemo((): ArbitrageOpportunity[] => {
    if (!asset || !sizeVariant) return [];
    return computeOpportunities(sizeVariant, {
      ...DEFAULT_CONFIG,
      minNetPct: minArbNetPct,
      minNetRs: minArbNetRs,
      limit: 50,
    }, {
      assetId: asset.id,
      assetName: asset.name,
      volatility: asset.volatility,
    });
  }, [asset, sizeVariant, minArbNetPct, minArbNetRs]);

  // Memoized calculation of best available price (lowest price across all channels)
  // For international prices, use total landed cost (platform price + reshipping cost)
  const bestPrice = useMemo(() => {
    // Use pre-calculated value if available
    if (currentData.bestAvailablePrice) {
      return currentData.bestAvailablePrice;
    }

    // Collect all prices from all channels
    const allPrices: number[] = [];

    // WhatsApp buy prices
    if (whatsappPrices.buy.length > 0) {
      allPrices.push(...whatsappPrices.buy.map(p => p.price));
    }

    // Indian marketplace prices
    if (marketplacePrices.length > 0) {
      allPrices.push(...marketplacePrices.map(p => p.price));
    }

    // International prices (use total landed cost)
    if (internationalPrices.length > 0) {
      allPrices.push(...internationalPrices.map(p => p.price + (p.reshippingCost || 0)));
    }

    // Return the minimum price if any prices exist
    return allPrices.length > 0 ? Math.min(...allPrices) : undefined;
  }, [currentData.bestAvailablePrice, whatsappPrices.buy, marketplacePrices, internationalPrices]);

  const anchor = asset.priceAnchors;

  return (
    <section className="p-3 md:p-6 text-brand-black bg-brand-background/30 relative overflow-x-hidden max-w-7xl mx-auto">
      {/* Intelligence-First Terminal Layout - Grid on Desktop */}
      
      {/* HERO SECTION - Image & Core Info */}
      <Card className="mb-4" noPadding>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 p-4 md:p-6">
          {/* Large Image - Full Height */}
          <div className="md:col-span-2">
            <div className="w-full h-full min-h-[280px] bg-brand-gray/5 border border-brand-gray/20 flex items-center justify-center" style={{ borderRadius: '12px' }}>
              {asset.image ? (
                <img
                  src={asset.image}
                  alt={asset.name}
                  className="w-full h-full object-contain p-4"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.image-placeholder')) {
                      const placeholder = document.createElement('div');
                      placeholder.className = 'image-placeholder text-xs text-brand-black/40 text-center px-2';
                      placeholder.textContent = 'No image';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
              ) : (
                <div className="text-xs text-brand-black/40 text-center px-2">No image</div>
              )}
            </div>
          </div>
          
          {/* Asset Info & Quick Decision */}
          <div className="md:col-span-3 flex flex-col justify-between space-y-3">
            {/* Asset Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
                {asset.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-brand-black/60">
                <span className="font-semibold">{asset.brand}</span>
                <span>·</span>
                <span>SKU {asset.sku}</span>
              </div>
            </div>

            {/* Size Selector - Modern Pill Style */}
            {asset.sizes && asset.sizes.length > 0 && (
              <div>
                <p className="text-sm font-semibold uppercase text-brand-black/60 mb-2 tracking-wide">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {sortSizesNumerically(asset.sizes).map((sizeVariant) => (
                    <Pill
                      key={sizeVariant.size}
                      label={sizeVariant.size}
                      active={selectedSize === sizeVariant.size}
                      onClick={() => setSelectedSize(sizeVariant.size)}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Decision Card - Key Metrics at a Glance */}
            <div className="bg-brand-background border border-brand-gray/30 p-3" style={{ borderRadius: '12px' }}>
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <div>
                  <p className="text-sm text-brand-black/50 uppercase tracking-wider mb-1">Best Price</p>
                  <p className="text-2xl md:text-3xl font-mono-numeric font-bold text-green-600 leading-tight">
                    {bestPrice ? `₹${bestPrice.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
                {bestPrice && anchor?.retailIndia && (
                  <div className="text-right">
                    <p className="text-sm text-brand-black/50 uppercase tracking-wider mb-1">vs Retail</p>
                    <p className={`text-lg font-mono-numeric font-bold leading-tight ${
                      bestPrice < anchor.retailIndia ? "text-green-600" : "text-red-600"
                    }`}>
                      {bestPrice < anchor.retailIndia ? "-" : "+"}
                      {Math.abs(((bestPrice - anchor.retailIndia) / anchor.retailIndia) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
              
              {/* Quick Stats Row with Icons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-brand-gray/30">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-brand-black/50 mb-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>30d</span>
                  </div>
                  <p className={`text-sm font-semibold ${
                    currentData.change30d?.startsWith("-") ? "text-red-600" : 
                    currentData.change30d?.startsWith("+") ? "text-green-600" : "text-brand-black"
                  }`}>
                    {currentData.change30d || "—"}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-brand-black/50 mb-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Liquidity</span>
                  </div>
                  <p className="text-sm font-semibold text-brand-black">{currentData.liquidity || "—"}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-brand-black/50 mb-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>Stock</span>
                  </div>
                  <p className="text-sm font-semibold text-green-600">
                    {(whatsappPrices.buy.length + marketplacePrices.length + internationalPrices.length) > 0 ? "Available" : "Limited"}
                  </p>
                </div>
              </div>
            </div>

            {/* Transparency Indicators - Compact */}
            <div className="pt-2 border-t border-brand-gray/20">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-black/70">
              {/* Channel Breakdown */}
              {(() => {
                const activeChannels = [];
                if (whatsappPrices.buy.length > 0 || whatsappPrices.sell.length > 0) activeChannels.push('WhatsApp');
                if (marketplacePrices.length > 0) activeChannels.push('Marketplace');
                if (internationalPrices.length > 0) activeChannels.push('International');
                
                if (activeChannels.length === 0) return null;
                
                return (
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">{activeChannels.length} {activeChannels.length === 1 ? 'channel' : 'channels'}</span>
                    <span className="text-brand-black/40">·</span>
                    <span>{activeChannels.join(', ')}</span>
                  </div>
                );
              })()}
              
              {/* Unique Seller Count */}
              {(() => {
                const uniqueSellers = new Set<string>();
                
                // Add WhatsApp sellers
                whatsappPrices.buy.forEach(p => {
                  if (p.sellerContact) uniqueSellers.add(p.sellerContact);
                  else if (p.sellerName) uniqueSellers.add(p.sellerName);
                });
                whatsappPrices.sell.forEach(p => {
                  if (p.sellerContact) uniqueSellers.add(p.sellerContact);
                  else if (p.sellerName) uniqueSellers.add(p.sellerName);
                });
                
                // Add Marketplace sellers (use URL or marketplace name)
                marketplacePrices.forEach(p => {
                  if (p.url) uniqueSellers.add(p.url);
                  else if (p.marketplaceName) uniqueSellers.add(p.marketplaceName);
                  else if (p.source) uniqueSellers.add(p.source);
                });
                
                // Add International sellers (use marketplace name or source)
                internationalPrices.forEach(p => {
                  if (p.marketplaceName) uniqueSellers.add(p.marketplaceName);
                  else if (p.source) uniqueSellers.add(p.source);
                });
                
                const sellerCount = uniqueSellers.size;
                if (sellerCount === 0) return null;
                
                return (
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-medium">{sellerCount} {sellerCount === 1 ? 'seller' : 'sellers'}</span>
                  </div>
                );
              })()}
              
              {/* Last Updated */}
              {(() => {
                const allDates: Date[] = [];
                
                // Collect all lastSeen dates
                whatsappPrices.buy.forEach(p => {
                  if (p.lastSeen) allDates.push(typeof p.lastSeen === 'string' ? new Date(p.lastSeen) : p.lastSeen);
                });
                whatsappPrices.sell.forEach(p => {
                  if (p.lastSeen) allDates.push(typeof p.lastSeen === 'string' ? new Date(p.lastSeen) : p.lastSeen);
                });
                marketplacePrices.forEach(p => {
                  if (p.lastSeen) allDates.push(typeof p.lastSeen === 'string' ? new Date(p.lastSeen) : p.lastSeen);
                });
                internationalPrices.forEach(p => {
                  if (p.lastSeen) allDates.push(typeof p.lastSeen === 'string' ? new Date(p.lastSeen) : p.lastSeen);
                });
                
                if (allDates.length === 0) return null;
                
                // Get most recent date
                const mostRecent = new Date(Math.max(...allDates.map(d => d.getTime())));
                const now = new Date();
                const diffMs = now.getTime() - mostRecent.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                let timeAgo = '';
                if (diffMins < 1) {
                  timeAgo = 'Just now';
                } else if (diffMins < 60) {
                  timeAgo = `${diffMins}m ago`;
                } else if (diffHours < 24) {
                  timeAgo = `${diffHours}h ago`;
                } else if (diffDays === 1) {
                  timeAgo = '1 day ago';
                } else {
                  timeAgo = `${diffDays} days ago`;
                }
                
                return (
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Updated {timeAgo}</span>
                  </div>
                );
              })()}
              </div>
            </div>

            {/* Clean Action Toolbar - Intelligence First */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-gray/20">
              <button
                onClick={() => setShowBuyModal(true)}
                className="flex-1 min-w-[120px] px-4 py-2.5 bg-brand-black text-white text-sm font-bold uppercase tracking-wide hover:bg-brand-black/90 transition-all duration-200 active:scale-95"
                style={{ borderRadius: '8px' }}
              >
                Buy
              </button>
              <button
                onClick={() => setShowSellModal(true)}
                className="flex-1 min-w-[120px] px-4 py-2.5 border-2 border-brand-black text-sm font-bold uppercase tracking-wide text-brand-black hover:bg-brand-gray/10 transition-all duration-200 active:scale-95"
                style={{ borderRadius: '8px' }}
              >
                Sell
              </button>
              <button
                onClick={onToggleWatchlist}
                className={`px-4 py-2.5 border-2 text-sm font-semibold uppercase tracking-wide transition-all duration-200 active:scale-95 ${
                  watchlisted
                    ? "border-yellow-600 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    : "border-brand-gray text-brand-black hover:bg-brand-gray/10"
                }`}
                style={{ borderRadius: '8px' }}
              >
                {watchlisted ? "★ Watching" : "☆ Watch"}
              </button>
              <button
                onClick={() => alert('Price alerts coming soon!')}
                className="px-4 py-2.5 border-2 border-brand-gray text-xs font-semibold text-brand-black hover:bg-brand-gray/10 transition-all duration-200 active:scale-95"
                style={{ borderRadius: '8px' }}
                title="Set price alert"
              >
                🔔
              </button>
            </div>
          </div>
        </div>

        {/* Price Comparison Bar - REMOVED - Redundant with hero data */}
      </Card>

      {/* Platform Disclaimer - Compact */}
      {/* ============================================ */}
      {/* MAIN TAB NAVIGATION */}
      {/* ============================================ */}
      <div className="mt-6 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
          <button
            onClick={() => setMainTab('chart')}
            className={`px-6 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'chart'
                ? 'bg-brand-black text-white'
                : 'bg-white text-brand-black border-2 border-brand-gray/30 hover:border-brand-black'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Market Data
          </button>
          <button
            onClick={() => setMainTab('orderbook')}
            className={`px-6 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'orderbook'
                ? 'bg-brand-black text-white'
                : 'bg-white text-brand-black border-2 border-brand-gray/30 hover:border-brand-black'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Order Book
          </button>
          <button
            onClick={() => setMainTab('listings')}
            className={`px-6 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'listings'
                ? 'bg-brand-black text-white'
                : 'bg-white text-brand-black border-2 border-brand-gray/30 hover:border-brand-black'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Listings {unifiedListings.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 bg-brand-black/10 text-xs font-bold" style={{ borderRadius: '6px' }}>
                {unifiedListings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainTab('arbitrage')}
            className={`px-6 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'arbitrage'
                ? 'bg-brand-black text-white'
                : 'bg-white text-brand-black border-2 border-brand-gray/30 hover:border-brand-black'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Arbitrage {arbitrageOpps.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 bg-brand-black/10 text-xs font-bold" style={{ borderRadius: '6px' }}>
                {arbitrageOpps.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainTab('analytics')}
            className={`px-6 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'analytics'
                ? 'bg-brand-black text-white'
                : 'bg-white text-brand-black border-2 border-brand-gray/30 hover:border-brand-black'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Analytics
          </button>
          {currentData.insight && (
            <button
              onClick={() => setMainTab('insight')}
              className={`px-6 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
                mainTab === 'insight'
                  ? 'bg-brand-black text-white'
                  : 'bg-white text-brand-black border-2 border-brand-gray/30 hover:border-brand-black'
              }`}
              style={{ borderRadius: '12px' }}
            >
              Insight
            </button>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* TAB CONTENT */}
      {/* ============================================ */}

      {/* CHART TAB */}
      {mainTab === 'chart' && (
        <div className="space-y-4">
          <Card
            title="Market Data"
            subtitle="Cross-venue view • Updated continuously"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            className="shadow-sm"
          >
            {/* Professional Trading Chart */}
            <TradingChart
              pricePoints={sizeVariant?.pricePoints || sizeVariant?.legacyPricePoints || asset.pricePoints}
            />
            {/* Performance Stats Below Chart */}
            {(currentData.change30d && currentData.change30d !== "N/A" && 
              currentData.change90d && currentData.change90d !== "N/A") && (
              <div className="mt-3 flex items-center justify-center gap-6 text-sm text-brand-black/70">
                <div>
                  30d: <span className={`font-semibold ${currentData.change30d.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                    {currentData.change30d}
                  </span>
                </div>
                <span className="text-brand-black/30">•</span>
                <div>
                  90d: <span className={`font-semibold ${currentData.change90d.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                    {currentData.change90d}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ORDER BOOK TAB */}
      {mainTab === 'orderbook' && (
        <div className="space-y-4">
          <Card
            title="Order Book"
            subtitle="Aggregated buy/sell orders at each price level"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            className="shadow-sm"
          >
            <OrderBook
              whatsappBuyPrices={whatsappPrices.buy}
              whatsappSellPrices={whatsappPrices.sell}
              marketplacePrices={marketplacePrices}
              internationalPrices={internationalPrices}
            />
          </Card>
        </div>
      )}

      {/* LISTINGS TAB */}
      {mainTab === 'listings' && (
        <div className="space-y-4">
      {unifiedListings.length > 0 ? (
        <Card
          title="All Listings (Across Channels)"
          subtitle={`${unifiedListings.length} listings found`}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          className="shadow-sm"
        >
            {/* Enhanced Filters - Cleaner Pill Style */}
            <div className="space-y-4 mb-4">
              {/* Channel and Side Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brand-black/60 uppercase tracking-wider font-semibold">Channel:</span>
                  <div className="flex gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'Sentria', label: 'Sentria' },
                    { key: 'WhatsApp', label: 'WhatsApp' },
                    { key: 'Marketplace', label: 'Marketplace' },
                    { key: 'International', label: 'International' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setUnifiedChannelFilter(
                          opt.key as 'all' | 'WhatsApp' | 'Marketplace' | 'International' | 'Sentria'
                        )
                      }
                      className={`px-4 py-1.5 text-xs font-medium transition-all ${
                        unifiedChannelFilter === opt.key
                          ? 'bg-brand-black text-white'
                          : 'bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black'
                      }`}
                      style={{ borderRadius: '20px' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brand-black/60 uppercase tracking-wider font-semibold">Side:</span>
                  <div className="flex gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'Buy', label: 'Buy' },
                    { key: 'Sell', label: 'Sell' },
                    { key: 'Listing', label: 'Listing' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setUnifiedSideFilter(
                          opt.key as 'all' | 'Buy' | 'Sell' | 'Listing'
                        )
                      }
                      className={`px-4 py-1.5 text-xs font-medium transition-all ${
                        unifiedSideFilter === opt.key
                          ? 'bg-brand-black text-white'
                          : 'bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black'
                      }`}
                      style={{ borderRadius: '20px' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  </div>
                </div>
              </div>
              
              {/* Location Filter and Sort */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-sm text-brand-black/60 uppercase tracking-wider font-semibold whitespace-nowrap">Location:</label>
                  <select
                    value={filterLocation || ''}
                    onChange={(e) => setFilterLocation(e.target.value || null)}
                    className="flex-1 text-sm border border-brand-gray/30 bg-white px-3 py-1.5 text-brand-black focus:outline-none focus:border-brand-black"
                    style={{ borderRadius: '8px' }}
                  >
                    <option value="">All Locations</option>
                    {Array.from(new Set(unifiedListings.map(row => row.location).filter((loc): loc is string => Boolean(loc)))).map((loc: string) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-sm text-brand-black/60 uppercase tracking-wider font-semibold whitespace-nowrap">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price' | 'quantity' | 'newest')}
                    className="flex-1 text-sm border border-brand-gray/30 bg-white px-3 py-1.5 text-brand-black focus:outline-none focus:border-brand-black"
                    style={{ borderRadius: '8px' }}
                  >
                    <option value="price">Price: Low to High</option>
                    <option value="quantity">Quantity: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Freshness Warning */}
            {(() => {
              const allDates: Date[] = [];
              unifiedListings.forEach(listing => {
                if (listing.lastSeen) {
                  allDates.push(typeof listing.lastSeen === 'string' ? new Date(listing.lastSeen) : listing.lastSeen);
                }
              });
              
              if (allDates.length === 0) return null;
              
              const oldestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
              const now = new Date();
              const daysSinceOldest = Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysSinceOldest > 7) {
                return (
                  <div className="mb-3 flex items-start gap-2 text-xs text-brand-black/60 bg-orange-50/50 border border-orange-200/50 p-2.5" style={{ borderRadius: '8px' }}>
                    <svg className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <span className="font-semibold text-brand-black">Data Freshness:</span> Some listings are over {daysSinceOldest} days old. Prices and availability may have changed. Contact sellers to confirm current status.
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="overflow-x-auto -mx-2 md:mx-0 custom-scrollbar">
              {(() => {
                let filtered = unifiedListings;
                
                // Apply channel filter
                if (unifiedChannelFilter !== 'all') {
                  filtered = filtered.filter((row) => row.channel === unifiedChannelFilter);
                }
                
                // Apply side filter
                if (unifiedSideFilter !== 'all') {
                  filtered = filtered.filter((row) => row.side === unifiedSideFilter);
                }
                
                // Apply location filter
                if (filterLocation) {
                  filtered = filtered.filter((row) => 
                    row.location?.toLowerCase().includes(filterLocation.toLowerCase())
                  );
                }
                
                // Apply sorting
                filtered = [...filtered].sort((a, b) => {
                  if (sortBy === 'price') {
                    const aPrice = a.landedPrice ?? a.price;
                    const bPrice = b.landedPrice ?? b.price;
                    return aPrice - bPrice;
                  } else if (sortBy === 'quantity') {
                    return b.listingCount - a.listingCount;
                  } else if (sortBy === 'newest') {
                    const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
                    const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
                    return bDate.getTime() - aDate.getTime();
                  }
                  return 0;
                });
                
                // Identify top 3 best deals (lowest landed prices for Buy listings)
                // Create a map to track which specific listings are top deals by their index in filtered array
                const topDealIndices = new Set<number>();
                const buyListingsWithIndex = filtered
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => row.side === 'Buy')
                  .sort((a, b) => {
                    const aPrice = a.row.landedPrice ?? a.row.price;
                    const bPrice = b.row.landedPrice ?? b.row.price;
                    return aPrice - bPrice;
                  })
                  .slice(0, 3); // Take only top 3
                
                buyListingsWithIndex.forEach(({ idx }) => topDealIndices.add(idx));
                
                const isTopDeal = (row: typeof filtered[0], idx: number) => {
                  if (row.side !== 'Buy') return false;
                  return topDealIndices.has(idx);
                };

                return isMobile ? (
                  // MOBILE: Card View
                  <div className="px-2">
                    {filtered.length > 0 ? (
                      filtered.map((row, idx) => {
                        const isBestDeal = isTopDeal(row, idx);
                        return (
                          <div key={idx} className="relative">
                            {isBestDeal && (
                              <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 bg-yellow-400 text-brand-black px-2 py-1 text-xs font-bold uppercase tracking-wide shadow-sm">
                                <span>⭐</span>
                                <span>Best Deal</span>
                              </div>
                            )}
                            <ListingCard
                              listing={{
                                channel: row.channel,
                                side: row.side,
                                price: row.price,
                                landedPrice: row.landedPrice,
                                listingCount: row.listingCount,
                                sourceLabel: row.sourceLabel,
                                location: row.location,
                                lastSeen: row.lastSeen,
                                contactType: row.contactType,
                                contactValue: row.contactValue,
                              }}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-brand-black/60">
                        <p className="text-sm">No listings match your filters</p>
                        <p className="text-xs mt-2">Try adjusting your filters</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // DESKTOP: Table View - Clean Minimal Design
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-brand-gray/20">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Channel</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Side</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Price</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Landed</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Qty</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Source</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Location</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Last Seen</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-12 text-center">
                        <p className="text-sm text-brand-black/60">No listings match your filters</p>
                        <p className="text-xs text-brand-black/40 mt-2">Try adjusting your filter criteria</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, idx) => {
                    const priceDisplay = row.price ? `₹${row.price.toLocaleString('en-IN')}` : '—';
                    const landedDisplay =
                      row.landedPrice && row.landedPrice !== row.price
                        ? `₹${row.landedPrice.toLocaleString('en-IN')}`
                        : '—';
                    
                    const isBestDeal = isTopDeal(row, idx);
                    
                    return (
                      <tr
                        key={idx}
                        className="border-b border-brand-gray/10 hover:bg-brand-background/50 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              row.channel === 'Sentria' ? 'bg-emerald-600' :
                              row.channel === 'WhatsApp' ? 'bg-green-600' :
                              row.channel === 'Marketplace' ? 'bg-blue-600' :
                              row.channel === 'International' ? 'bg-purple-600' :
                              'bg-brand-gray'
                            }`} />
                            <span className="text-sm font-medium text-brand-black">
                              {row.channel}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium ${
                            row.side === 'Buy' ? 'bg-green-50 text-green-700' :
                            row.side === 'Sell' ? 'bg-red-50 text-red-700' :
                            'bg-gray-50 text-gray-700'
                          }`} style={{ borderRadius: '6px' }}>
                            {row.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-sm font-semibold text-brand-black font-mono-numeric">
                            {priceDisplay}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-sm text-brand-black/70 font-mono-numeric">
                            {landedDisplay}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-sm text-brand-black font-mono-numeric">
                            {row.listingCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {isBestDeal && (
                              <span className="text-yellow-500 text-sm" title="Best Deal">⭐</span>
                            )}
                            <span className="text-sm text-brand-black">{row.sourceLabel}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm text-brand-black/70">
                            {row.location || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-xs text-brand-black/50">
                            {row.lastSeen ? formatLastSeen(row.lastSeen) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {row.contactType === 'sentria' && row.tradeListingUserId ? (
                            currentUser?.uid === row.tradeListingUserId ? (
                              <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-brand-black/40 whitespace-nowrap">
                                Your Listing
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (currentUser) {
                                    setConnectionTarget({
                                      userId: row.tradeListingUserId!,
                                      email: row.tradeListingUserEmail || '',
                                      name: row.sourceLabel,
                                    });
                                    setShowConnectionModal(true);
                                  } else {
                                    alert('Please sign in to request introductions');
                                  }
                                }}
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors whitespace-nowrap"
                                style={{ borderRadius: '6px' }}
                              >
                                Request Intro
                              </button>
                            )
                          ) : row.contactType && row.contactValue ? (
                            row.contactType === 'whatsapp' ? (
                              <a
                                href={`https://wa.me/${row.contactValue.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors whitespace-nowrap"
                                style={{ borderRadius: '6px' }}
                              >
                                {row.side === 'Sell' ? 'Sell to' : 'Buy from'}
                              </a>
                            ) : (
                              <a
                                href={row.contactValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold border border-brand-gray/30 text-brand-black hover:bg-brand-black hover:text-white hover:border-brand-black transition-colors whitespace-nowrap"
                                style={{ borderRadius: '6px' }}
                              >
                                {row.side === 'Sell' ? 'Sell to' : 'Buy from'}
                              </a>
                            )
                          ) : (
                            <span className="text-xs text-brand-black/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
                )
              })()}
            </div>
        </Card>
      ) : (
        <Card title="All Listings (Across Channels)" subtitle="No listings found for this asset" className="shadow-sm">
          <div className="py-12 text-center text-brand-black/60">
            <svg className="w-12 h-12 mx-auto mb-3 text-brand-gray/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-brand-black/60">No Listings Available</p>
            <p className="text-xs text-brand-black/40 mt-1">Check back later or adjust filters</p>
          </div>
        </Card>
      )}
        </div>
      )}

      {/* ARBITRAGE TAB */}
      {mainTab === 'arbitrage' && (
        <div className="space-y-4">
      {arbitrageOpps.length > 0 ? (
        <Card
          title="All Arbitrage Opportunities"
          subtitle="Buy from one channel and sell to another to capture price differences"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
          className="shadow-sm"
        >
          {/* Filters Row */}
          <div className="mb-4 pb-4 border-b border-brand-gray/20">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-brand-black/70 uppercase tracking-wider font-semibold whitespace-nowrap">Min ROI:</label>
                <input
                  type="number"
                  value={(minArbNetPct * 100).toFixed(1)}
                  onChange={(e) => setMinArbNetPct(Math.max(0, Number(e.target.value) / 100))}
                  className="w-20 border border-brand-gray/30 px-3 py-2 text-sm text-brand-black font-mono-numeric focus:outline-none focus:border-brand-black bg-brand-white"
                  style={{ borderRadius: '8px' }}
                  step="0.5"
                />
                <span className="text-xs text-brand-black/60">%</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-brand-black/70 uppercase tracking-wider font-semibold whitespace-nowrap">Min Profit:</label>
                <input
                  type="number"
                  value={minArbNetRs}
                  onChange={(e) => setMinArbNetRs(Math.max(0, Number(e.target.value)))}
                  className="w-24 border border-brand-gray/30 px-3 py-2 text-sm text-brand-black font-mono-numeric focus:outline-none focus:border-brand-black bg-brand-white"
                  style={{ borderRadius: '8px' }}
                  step="500"
                />
                <span className="text-xs text-brand-black/60">₹</span>
              </div>
              <div className="flex-1" />
              <div className="text-sm text-brand-black/60 font-medium">
                {arbitrageOpps.length} {arbitrageOpps.length === 1 ? "opportunity" : "opportunities"}
              </div>
            </div>
          </div>

          {/* Fee & Confidence Disclaimer */}
          <div className="mb-4 flex items-start gap-2 text-xs text-brand-black/70 bg-brand-background/50 border border-brand-gray/20 p-3" style={{ borderRadius: '8px' }}>
            <svg className="w-4 h-4 text-brand-black/50 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-semibold text-brand-black">Note:</span> Per-platform fees applied (varies by marketplace). Marketplace sells are consignment/source-on-order — payout timing varies. Confidence is penalised for marketplace sell-side and stale data. Always verify before executing.
            </div>
          </div>

          {/* Opportunities */}
          {isMobile ? (
            // MOBILE: Card View
            <div className="space-y-3">
              {arbitrageOpps.map((opp, idx) => (
                <ArbCard key={idx} opp={opp} />
              ))}
            </div>
          ) : (
            // DESKTOP: Table View
            <div className="border border-brand-gray/20 overflow-hidden" style={{ borderRadius: '12px' }}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-brand-background/50 border-b-2 border-brand-gray/20">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Strategy</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Buy From</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Buy Price</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Sell To</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Sell Net</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Profit</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Time Horizon</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Conf / Risk</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arbitrageOpps.map((opp, idx) => {
                      const roiPct = opp.netPct * 100;
                      const isEven = idx % 2 === 0;

                      return (
                        <tr
                          key={idx}
                          className={`border-b border-brand-gray/10 ${isEven ? 'bg-white' : 'bg-brand-gray/5'} hover:bg-brand-background/50 transition-colors`}
                        >
                          {/* Strategy */}
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-black/80">
                              <span>{strategyIcon(opp.strategy)}</span>
                              <span>{strategyLabel(opp.strategy)}</span>
                            </span>
                          </td>
                          {/* Buy From */}
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.buy.channel)}</div>
                            <div className="text-[10px] text-brand-black/50 truncate max-w-[120px]">{opp.buy.source}</div>
                          </td>
                          {/* Buy Price */}
                          <td className="px-3 py-2.5 text-right">
                            <div className="font-semibold font-mono-numeric text-brand-black">
                              ₹{opp.buy.allIn.toLocaleString("en-IN")}
                            </div>
                            {opp.buyShippingCost > 0 && (
                              <div className="text-[10px] text-brand-black/40 font-mono-numeric">
                                +₹{opp.buyShippingCost.toLocaleString("en-IN")} ship
                              </div>
                            )}
                          </td>
                          {/* Sell To */}
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.sell.channel)}</div>
                            <div className="text-[10px] text-brand-black/50 truncate max-w-[120px]">{opp.sell.source}</div>
                            {opp.sellReliability === "consignment" && (
                              <div className="mt-0.5">
                                <span className="inline-block px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60" style={{ borderRadius: '3px' }}>
                                  Consignment
                                </span>
                              </div>
                            )}
                          </td>
                          {/* Sell Net */}
                          <td className="px-3 py-2.5 text-right">
                            <div className="font-semibold font-mono-numeric text-brand-black">
                              ₹{opp.sell.net.toLocaleString("en-IN")}
                            </div>
                            {opp.sellFeeAmount > 0 && (
                              <div className="text-[10px] text-brand-black/40 font-mono-numeric">
                                −{(opp.sellFeeRate * 100).toFixed(1)}% fee
                              </div>
                            )}
                          </td>
                          {/* Profit */}
                          <td className="px-3 py-2.5 text-right">
                            <div className="font-bold font-mono-numeric text-brand-black">
                              ₹{opp.netProfit.toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-brand-black/50 font-mono-numeric">
                              {roiPct.toFixed(1)}% ROI
                            </div>
                          </td>
                          {/* Time Horizon */}
                          <td className="px-3 py-2.5 text-center">
                            <div className={`text-xs font-semibold ${turnaroundColor(opp.turnaroundDays)}`}>
                              {turnaroundLabel(opp.turnaroundDays)}
                            </div>
                          </td>
                          {/* Confidence + Risk */}
                          <td className="px-3 py-2.5 text-center">
                            <div className={`text-xs font-bold font-mono-numeric ${confidenceColor(opp.confidence)}`}>
                              {opp.confidence}
                            </div>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBgColor(opp.risk)} ${riskColor(opp.risk)}`} style={{ borderRadius: '3px' }}>
                              {opp.risk}
                            </span>
                          </td>
                          {/* Scale */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="text-xs font-mono-numeric text-brand-black/70">{opp.scalable}</div>
                            <div className="text-[10px] text-brand-black/40">pairs</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card title="All Arbitrage Opportunities" subtitle="No arbitrage opportunities found for this asset" className="shadow-sm">
          <div className="py-12 text-center text-brand-black/60">
            <svg className="w-12 h-12 mx-auto mb-3 text-brand-gray/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-sm font-semibold text-brand-black/60">No Arbitrage Opportunities</p>
            <p className="text-xs text-brand-black/40 mt-1">Market is efficient or data is limited</p>
          </div>
        </Card>
      )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {mainTab === 'analytics' && (
        <div className="space-y-4">
        <Card
          title="Performance Metrics"
          subtitle="30d/90d changes, volatility, and market efficiency"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          className="shadow-sm"
        >
        {(() => {
          // Calculate price range width
          const whatsappBest = whatsappPrices.buy.length > 0 ? whatsappPrices.buy[0].price : 0;
          const whatsappMax = whatsappPrices.buy.length > 0 ? Math.max(...whatsappPrices.buy.map(p => p.price)) : 0;
          const marketplaceBest = marketplacePrices.length > 0 ? marketplacePrices[0].price : 0;
          const marketplaceMax = marketplacePrices.length > 0 ? marketplacePrices[marketplacePrices.length - 1].price : 0;
          const internationalBest = internationalPrices.length > 0 
            ? Math.min(...internationalPrices.map(p => p.price + (p.reshippingCost || 0))) 
            : 0;
          const internationalAll = internationalPrices.length > 0 
            ? internationalPrices.map(p => p.price + (p.reshippingCost || 0)) 
            : [];
          const internationalMax = internationalAll.length > 0 ? Math.max(...internationalAll) : 0;
          
          const allPrices = [whatsappBest, whatsappMax, marketplaceBest, marketplaceMax, internationalBest, internationalMax].filter(p => p > 0);
          const marketMin = allPrices.length > 0 ? Math.min(...allPrices) : 0;
          const marketMax = allPrices.length > 0 ? Math.max(...allPrices) : 0;
          const priceRangeWidth = marketMax - marketMin;
          const priceRangePct = marketMin > 0 ? (priceRangeWidth / marketMin) * 100 : 0;
          
          // Price stability assessment
          const getPriceStability = () => {
            if (priceRangePct === 0) return { level: 'N/A', label: 'No Data', color: 'text-brand-black/40' };
            if (priceRangePct <= 5) return { level: 'Tight', label: 'Very Stable', color: 'text-green-600' };
            if (priceRangePct <= 15) return { level: 'Moderate', label: 'Stable', color: 'text-yellow-600' };
            return { level: 'Wide', label: 'Volatile', color: 'text-red-600' };
          };
          
          const priceStability = getPriceStability();
          
          // Market efficiency (how close best prices are to average)
          const whatsappAvg = whatsappPrices.buy.length > 0 
            ? whatsappPrices.buy.reduce((sum, p) => sum + p.price, 0) / whatsappPrices.buy.length 
            : 0;
          const marketplaceAvg = marketplacePrices.length > 0 
            ? marketplacePrices.reduce((sum, p) => sum + p.price, 0) / marketplacePrices.length 
            : 0;
          
          const whatsappEfficiency = whatsappBest > 0 && whatsappAvg > 0 
            ? ((whatsappAvg - whatsappBest) / whatsappAvg) * 100 
            : 0;
          const marketplaceEfficiency = marketplaceBest > 0 && marketplaceAvg > 0 
            ? ((marketplaceAvg - marketplaceBest) / marketplaceAvg) * 100 
            : 0;
          
          const avgEfficiency = (whatsappEfficiency + marketplaceEfficiency) / 2;
          
          // Parse change strings to numbers
          const parseChange = (changeStr: string | undefined): number | null => {
            if (!changeStr) return null;
            const match = changeStr.match(/[+-]?[\d.]+/);
            return match ? parseFloat(match[0]) : null;
          };
          
          const change30d = parseChange(currentData.change30d);
          const change90d = parseChange(currentData.change90d);
          
          return (
            <div className="space-y-4 pt-4">
              {/* Primary Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">30d Change</p>
                  <p
                    className={`text-2xl font-mono-numeric font-bold ${
                      change30d && change30d < 0
                        ? "text-red-600"
                        : change30d && change30d > 0
                        ? "text-green-600"
                        : "text-brand-black"
                    }`}
                  >
                    {currentData.change30d || "—"}
                  </p>
                  {change30d && (
                    <p className="text-[9px] text-brand-black/50 mt-0.5">
                      {change30d > 0 ? '↑' : change30d < 0 ? '↓' : '→'} {Math.abs(change30d).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">90d Change</p>
                  <p
                    className={`text-2xl font-mono-numeric font-bold ${
                      change90d && change90d < 0
                        ? "text-red-600"
                        : change90d && change90d > 0
                        ? "text-green-600"
                        : "text-brand-black"
                    }`}
                  >
                    {currentData.change90d || "—"}
                  </p>
                  {change90d && (
                    <p className="text-[9px] text-brand-black/50 mt-0.5">
                      {change90d > 0 ? '↑' : change90d < 0 ? '↓' : '→'} {Math.abs(change90d).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">Volatility</p>
                  <p className="text-2xl font-semibold text-brand-black capitalize">{asset.volatility || "—"}</p>
                  <p className="text-[9px] text-brand-black/50 mt-0.5">
                    {priceStability.label}
                  </p>
                </div>
              </div>
              
              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-brand-gray/20">
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">Price Range</p>
                  <p className="text-lg font-mono-numeric font-bold text-brand-black">
                    ₹{priceRangeWidth.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[9px] text-brand-black/50 mt-0.5">
                    {priceRangePct.toFixed(1)}% spread • {priceStability.level} market
                  </p>
                </div>
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">Market Efficiency</p>
                  <p className={`text-lg font-mono-numeric font-bold ${
                    avgEfficiency <= 5 ? 'text-green-600' : avgEfficiency <= 10 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {avgEfficiency > 0 ? avgEfficiency.toFixed(1) : '—'}%
                  </p>
                  <p className="text-[9px] text-brand-black/50 mt-0.5">
                    {avgEfficiency <= 5 ? 'Highly efficient' : avgEfficiency <= 10 ? 'Moderately efficient' : 'Inefficient'} pricing
                  </p>
                </div>
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '8px' }}>
                  <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">Price Stability</p>
                  <p className={`text-lg font-semibold ${priceStability.color}`}>
                    {priceStability.level}
                  </p>
                  <p className="text-[9px] text-brand-black/50 mt-0.5">
                    {priceRangePct > 0 ? `${priceRangePct.toFixed(1)}%` : '—'} price spread
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>
        </div>
      )}

      {/* INSIGHT TAB */}
      {mainTab === 'insight' && currentData.insight && (
        <div className="space-y-4">
          <Card
            className={`shadow-sm ${
              currentData.insight.recommendation === 'buy' 
                ? 'bg-gradient-to-br from-green-50/50 to-green-100/30 border-green-200' 
                : currentData.insight.recommendation === 'sell'
                ? 'bg-gradient-to-br from-red-50/50 to-red-100/30 border-red-200'
                : 'bg-gradient-to-br from-blue-50/50 to-blue-100/30 border-blue-200'
            }`}
          >
            {/* Signal Header with Recommendation Badge */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm font-bold text-brand-black/70 uppercase tracking-wide">Market Insight</span>
                  {selectedSize && (
                    <span className="text-xs text-brand-black/50">({selectedSize})</span>
                  )}
                </div>
              </div>
              <div className={`px-4 py-2 font-bold text-lg uppercase tracking-wide ${
                currentData.insight.recommendation === 'buy' 
                  ? 'bg-green-600 text-white' 
                  : currentData.insight.recommendation === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'
              }`} style={{ borderRadius: '8px' }}>
                {currentData.insight.recommendation.toUpperCase()}
              </div>
            </div>
            
            {/* Confidence Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-brand-black/70">Confidence</span>
                <span className="font-mono text-brand-black">{currentData.insight.confidence}%</span>
              </div>
              <div className="h-2 bg-brand-gray/20 overflow-hidden" style={{ borderRadius: '4px' }}>
                <div 
                  className={`h-full transition-all ${
                    currentData.insight.recommendation === 'buy' 
                      ? 'bg-green-600' 
                      : currentData.insight.recommendation === 'sell'
                      ? 'bg-red-600'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${currentData.insight.confidence}%` }}
                />
              </div>
            </div>

            {/* Reasoning */}
            <div className="mb-3">
              <p className="text-sm text-brand-black leading-relaxed">{currentData.insight.reasoning}</p>
              {currentData.insight.expectedMovement && (
                <p className="text-sm text-brand-black/70 italic mt-2">
                  <span className="font-semibold">Expected: </span>{currentData.insight.expectedMovement}
                </p>
              )}
            </div>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-brand-black/60 pt-3 border-t border-brand-gray/20">
              {currentData.dataPoints && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <span>{currentData.dataPoints} data points</span>
                </div>
              )}
              
              {currentData.lastUpdated && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Updated {formatLastSeen(currentData.lastUpdated) || 'recently'}</span>
                </div>
              )}
            </div>
            
            {/* Disclaimer */}
            <div className="mt-3 flex items-start gap-2 text-xs text-brand-black/50">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="leading-relaxed">
                Algorithmic recommendation based on current data. Not financial advice. Always conduct your own research.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Modals - Outside of tab system */}

      {/* Connection Request Modal */}
      {showConnectionModal && connectionTarget && asset && (
        <ConnectionRequestModal
          asset={asset}
          selectedSize={selectedSize}
          currentUser={currentUser}
          targetUserId={connectionTarget.userId}
          targetUserEmail={connectionTarget.email}
          targetUserName={connectionTarget.name}
          connectionType="buy"
          onClose={() => {
            setShowConnectionModal(false);
            setConnectionTarget(null);
          }}
          onSubmit={handleConnectionRequest}
        />
      )}

      {/* BUY MODAL - Shows all buying options */}
      {showBuyModal && asset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 animate-fade-in backdrop-blur-sm" onClick={() => setShowBuyModal(false)} />
          
          <div className="relative bg-brand-white border-2 border-brand-black w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-modal animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 bg-brand-white border-b-2 border-brand-black px-4 md:px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-bold uppercase tracking-wide text-brand-black">Buy: {asset.name}</h2>
                <p className="text-xs text-brand-black/60 mt-1">Size: {selectedSize}</p>
              </div>
              <button
                onClick={() => setShowBuyModal(false)}
                className="w-10 h-10 flex items-center justify-center border-2 border-brand-gray hover:border-brand-black hover:bg-brand-gray/10 transition-all active:scale-95"
                style={{ borderRadius: '8px' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Sentria Network - Priority */}
              {tradeListings.length > 0 && (
                <div className="border-2 border-green-600 bg-green-50/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-brand-black">Sentria Network</h3>
                    <span className="text-xs text-brand-black/60">({tradeListings.length} seller{tradeListings.length > 1 ? 's' : ''})</span>
                  </div>
                  <p className="text-xs text-brand-black/60 mb-4">Connect directly with verified sellers on Sentria</p>
                  
                  <div className="space-y-2">
                    {tradeListings.map((listing) => (
                      <div key={listing.id} className="bg-white border border-brand-gray/30 p-3 hover:border-brand-black transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-brand-black">{listing.userName || 'Anonymous Seller'}</p>
                            <p className="text-xs text-brand-black/60">
                              {listing.condition ? listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1) : 'New'} • 
                              {listing.quantity} available
                              {listing.location && ` • ${listing.location}`}
                            </p>
                            {listing.description && (
                              <p className="text-xs text-brand-black/80 mt-1 line-clamp-2">{listing.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-mono-numeric font-bold text-green-600">
                              ₹{listing.askingPrice.toLocaleString('en-IN')}
                            </p>
                            {currentUser?.uid === listing.userId ? (
                              <span className="mt-2 inline-block px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-black/40">
                                Your Listing
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (currentUser) {
                                    setConnectionTarget({ 
                                      userId: listing.userId, 
                                      email: listing.userEmail, 
                                      name: listing.userName 
                                    });
                                    setShowBuyModal(false);
                                    setShowConnectionModal(true);
                                  } else {
                                    alert('Please sign in to request introductions');
                                  }
                                }}
                                className="mt-2 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold uppercase tracking-wide hover:bg-green-700 transition-all whitespace-nowrap"
                                style={{ borderRadius: '4px' }}
                              >
                                Request Intro
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Network (from data) */}
              {whatsappPrices.buy.length > 0 && (
                <div className="border border-brand-gray/30 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-3">WhatsApp Resellers</h3>
                  <p className="text-xs text-brand-black/60 mb-4">Prices from reseller networks</p>
                  
                  <div className="space-y-2">
                    {whatsappPrices.buy.slice(0, 3).map((price, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-brand-background border border-brand-gray/20">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-brand-black">
                            {price.sellerName || `Seller ${idx + 1}`}
                          </p>
                          <p className="text-xs text-brand-black/60">
                            {price.sellerLocation || 'India'} • WhatsApp Group
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-mono-numeric font-bold text-brand-black">
                            ₹{price.price.toLocaleString('en-IN')}
                          </p>
                          {price.sellerContact ? (
                            <a
                              href={`https://wa.me/${price.sellerContact.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Contact →
                            </a>
                          ) : (
                            <button
                              onClick={() => {
                                alert(`Contact ${price.sellerName || 'seller'} via ${price.source || 'WhatsApp group'}`);
                              }}
                              className="text-xs text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-brand-black/40 mt-3">Contact sellers via their WhatsApp groups</p>
                </div>
              )}

              {/* Indian Marketplaces */}
              {marketplacePrices.length > 0 && (
                <div className="border border-brand-gray/30 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-3">Indian Marketplaces</h3>
                  <p className="text-xs text-brand-black/60 mb-4">Available on resale platforms</p>
                  
                  <div className="space-y-2">
                    {marketplacePrices.slice(0, 3).map((price, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-brand-background border border-brand-gray/20">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-brand-black">
                            {price.marketplaceName || price.source || 'Marketplace'}
                          </p>
                          <p className="text-xs text-brand-black/60">External platform</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-mono-numeric font-bold text-brand-black">
                            ₹{price.price.toLocaleString('en-IN')}
                          </p>
                          {price.url && (
                            <a 
                              href={price.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* International */}
              {internationalPrices.length > 0 && (
                <div className="border border-brand-gray/30 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-3">International (StockX, GOAT)</h3>
                  <p className="text-xs text-brand-black/60 mb-4">Includes reshipping costs</p>
                  
                  <div className="space-y-2">
                    {internationalPrices.slice(0, 2).map((price, idx) => {
                      const basePrice = price.price - (price.reshippingCost || 3000);
                      const totalLanded = price.price;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-brand-background border border-brand-gray/20 group relative">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-brand-black">
                              {price.source || 'International'}
                            </p>
                            <p className="text-xs text-brand-black/60">
                              + ₹{(price.reshippingCost || 3000).toLocaleString('en-IN')} shipping
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="text-lg font-mono-numeric font-bold text-brand-black">
                                ₹{totalLanded.toLocaleString('en-IN')}
                              </p>
                              {price.url && (
                                <a 
                                  href={price.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View →
                                </a>
                              )}
                            </div>
                            {/* Cost Breakdown Tooltip */}
                            <div className="relative group/tooltip">
                              <button className="w-5 h-5 flex items-center justify-center text-brand-black/40 hover:text-brand-black transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              {/* Tooltip content */}
                              <div className="hidden group-hover/tooltip:block absolute right-0 top-6 z-20 w-56 p-3 bg-brand-black text-white text-xs border border-brand-gray shadow-lg">
                                <div className="space-y-1.5">
                                  <div className="font-semibold uppercase tracking-wide text-white/70 text-[10px]">Landed Cost Breakdown</div>
                                  <div className="flex justify-between">
                                    <span>Base Price:</span>
                                    <span className="font-mono-numeric">₹{basePrice.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Reshipping:</span>
                                    <span className="font-mono-numeric">₹{(price.reshippingCost || 3000).toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="border-t border-white/20 pt-1.5 mt-1.5 flex justify-between font-bold">
                                    <span>Total Landed:</span>
                                    <span className="font-mono-numeric">₹{totalLanded.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="mt-2 text-[10px] text-white/60 border-t border-white/20 pt-2">
                                    <span className="text-yellow-400">⚠</span> Customs duties not included
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No options available */}
              {tradeListings.length === 0 && whatsappPrices.buy.length === 0 && marketplacePrices.length === 0 && internationalPrices.length === 0 && (
                <div className="text-center py-12 border border-brand-gray/30 bg-brand-background">
                  <p className="text-sm text-brand-black/60 mb-2">No sellers found for this size</p>
                  <p className="text-xs text-brand-black/40">Try a different size or check back later</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SELL MODAL - Auto-fill from portfolio */}
      {showSellModal && asset && (
        <SellModalContent
          asset={asset}
          selectedSize={selectedSize}
          currentUser={currentUser}
          portfolioPositions={portfolioPositions}
          bestPrice={bestPrice}
          onClose={() => setShowSellModal(false)}
          onSuccess={() => {
            setShowSellModal(false);
            loadTradeListings(); // Refresh listings
          }}
        />
      )}
    </section>
  );
};

// Sell Modal Component
interface SellModalContentProps {
  asset: Asset;
  selectedSize: string;
  currentUser: User | null;
  portfolioPositions: PortfolioPosition[];
  bestPrice?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const SellModalContent: React.FC<SellModalContentProps> = ({
  asset,
  selectedSize,
  currentUser,
  portfolioPositions,
  bestPrice,
  onClose,
  onSuccess
}) => {
  // Check if user owns this asset in their portfolio
  const userPosition = portfolioPositions.find(
    p => p.assetId === asset.id && p.size === selectedSize && !p.sold && p.quantity > 0
  );

  const [askingPrice, setAskingPrice] = useState<string>(
    bestPrice ? Math.round(bestPrice * 1.05).toString() : ""
  );
  const [quantity, setQuantity] = useState<number>(userPosition?.quantity || 1);
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentUser) {
      alert('Please sign in to list items');
      return;
    }

    if (!askingPrice || parseFloat(askingPrice) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createTradeListing(
        currentUser.uid,
        currentUser.email || "",
        {
          assetId: asset.id,
          assetName: asset.name,
          assetSku: asset.sku,
          assetImage: asset.image,
          size: selectedSize,
          askingPrice: parseFloat(askingPrice),
          quantity,
          condition,
          description: description.trim() || "",
          portfolioPositionId: userPosition ? `${asset.id}_${selectedSize}` : ""
        }
      );

      if (result.success) {
        alert('✅ Listing created! Buyers can now find your item.');
        onSuccess();
      } else {
        alert('❌ Failed to create listing: ' + result.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 animate-fade-in backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-brand-white border-2 border-brand-black w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-modal animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-brand-white border-b-2 border-brand-black px-4 md:px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold uppercase tracking-wide text-brand-black">Sell: {asset.name}</h2>
            <p className="text-xs text-brand-black/60 mt-1">Size: {selectedSize}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border-2 border-brand-gray hover:border-brand-black hover:bg-brand-gray/10 transition-all active:scale-95"
            style={{ borderRadius: '0px' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Portfolio Status */}
          {userPosition ? (
            <div className="border-l-4 border-green-600 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900 mb-2">✓ You own this item</p>
              <p className="text-xs text-green-800">
                Quantity in portfolio: {userPosition.quantity}
                {userPosition.acquisitionPrice && ` • Cost: ₹${userPosition.acquisitionPrice.toLocaleString('en-IN')}`}
              </p>
            </div>
          ) : (
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Not in your portfolio</p>
              <p className="text-xs text-blue-800">
                You can still list this item. Add it to your portfolio later for better tracking.
              </p>
            </div>
          )}

          {/* Important Notice */}
          <div className="border border-brand-gray/30 bg-brand-background p-4">
            <p className="text-xs font-semibold text-brand-black mb-2">How Listings Work:</p>
            <ul className="text-xs text-brand-black/70 space-y-1">
              <li>• Your listing will be visible to all users browsing this asset</li>
              <li>• Buyers can request introductions to connect with you</li>
              <li>• Transaction happens off-platform (WhatsApp/Email)</li>
              <li>• Sentria facilitates connections only - we don't handle payments</li>
            </ul>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Asking Price (per unit) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-black/60">₹</span>
              <input
                type="number"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="e.g., 12500"
                className="w-full pl-8 pr-3 py-3 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '8px' }}
              />
            </div>
            {bestPrice && (
              <p className="text-xs text-brand-black/60 mt-1">
                Market best: ₹{bestPrice.toLocaleString('en-IN')} • 
                Suggested: ₹{Math.round(bestPrice * 1.05).toLocaleString('en-IN')} (+5%)
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Quantity Available *
            </label>
            <input
              type="number"
              min="1"
              max={userPosition?.quantity || 99}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-3 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black"
              style={{ borderRadius: '8px' }}
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Condition *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['new', 'used'] as const).map((cond) => (
                <button
                  key={cond}
                  onClick={() => setCondition(cond)}
                  className={`px-4 py-2.5 border text-xs font-semibold uppercase tracking-wide transition-all ${
                    condition === cond
                      ? 'border-brand-black bg-brand-black text-white'
                      : 'border-brand-gray text-brand-black hover:bg-brand-gray/10'
                  }`}
                  style={{ borderRadius: '4px' }}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about condition, location, authenticity, shipping, etc..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-3 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black resize-none"
              style={{ borderRadius: '8px' }}
            />
            <p className="text-xs text-brand-black/60 mt-1">{description.length}/500 characters</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-brand-gray/30">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-brand-gray text-sm font-semibold uppercase tracking-wide text-brand-black hover:bg-brand-gray/10 transition-all disabled:opacity-50"
              style={{ borderRadius: '8px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !askingPrice || parseFloat(askingPrice) <= 0}
              className="flex-1 px-6 py-3 bg-brand-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '8px' }}
            >
              {isSubmitting ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailPanel;
