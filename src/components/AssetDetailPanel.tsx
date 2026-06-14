import React, { useState, useEffect, useMemo } from "react";
import { Asset, SizeVariant, PricePoint, PortfolioPosition, TradeListing, MarketChannel } from "../types";
import { TradingChart } from "./TradingChart";
import { OrderBook } from "./OrderBook";
import { ConnectionRequestModal } from "./ConnectionRequestModal";
import { ToastContainer } from "./Toast";
import { useToast } from "../hooks/useToast";
import { createConnectionRequest, getAssetListings, createTradeListing } from "../utils/connectionsApi";
import { User } from "firebase/auth";
import { getSellFee } from "../utils/arbitrageEngine";
import { computeMarkMetrics, filterValidQuotes, SHOW_VS_RETAIL_WHEN_NO_HISTORY } from "../utils/priceMetrics";

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
    <div ref={ref} className={`bg-terminal-surface border border-brand-gray/20 ${className}`}>
      {title && (
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-brand-gray/10">
          {/* Header: stack title + action vertically on mobile, side-by-side on sm+ */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="text-sm font-bold text-brand-black uppercase tracking-wide truncate">
                  {title}
                </h3>
              </div>
              {subtitle && (
                <p className="text-xs text-brand-black/60 mt-1">{subtitle}</p>
              )}
            </div>
            {headerAction && (
              <div className="min-w-0">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={noPadding ? "" : "p-3 sm:p-5"}>
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

// Loading Skeleton Components with shimmer effect
const CardSkeleton: React.FC = () => (
  <div className="p-4 bg-brand-white border border-brand-gray/20">
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

const HeaderSkeleton: React.FC = () => (
  <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] gap-x-4 gap-y-3 items-start p-4">
    <div className="w-[140px] h-[140px] bg-brand-gray/10 border border-brand-gray/20 relative overflow-hidden flex-shrink-0">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
    <div className="min-w-0 space-y-2 pt-0.5">
      <div className="h-6 w-56 bg-brand-gray/20 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
      <div className="h-3 w-36 bg-brand-gray/20 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
    </div>
    <div className="col-span-2 sm:col-span-1 sm:border-l sm:border-brand-gray/20 sm:pl-4 space-y-2">
      <div className="h-7 w-28 bg-brand-gray/30 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
      <div className="h-3 w-40 bg-brand-gray/20 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
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
  const getChannelAccent = (channel: string) => {
    switch (channel) {
      case 'Sentria':       return 'border-l-emerald-600';
      case 'WhatsApp':      return 'border-l-green-600';
      case 'Marketplace':   return 'border-l-blue-600';
      case 'International': return 'border-l-purple-600';
      default:              return 'border-l-brand-gray/40';
    }
  };

  const getChannelDot = (channel: string) => {
    switch (channel) {
      case 'Sentria':       return 'bg-up';
      case 'WhatsApp':      return 'bg-up';
      case 'Marketplace':   return 'bg-blue-600';
      case 'International': return 'bg-purple-600';
      default:              return 'bg-brand-gray';
    }
  };

  const getSideColor = (side: string) => {
    switch (side) {
      case 'Buy':  return 'bg-up/10 text-up';
      case 'Sell': return 'bg-down/10 text-down';
      default:     return ''; // No badge for generic "Listing"
    }
  };

  const handleAction = () => {
    if (listing.contactType === 'whatsapp' && listing.contactValue) {
      window.open(`https://wa.me/${listing.contactValue.replace(/[^0-9]/g, '')}`, '_blank');
    } else if (listing.contactValue) {
      window.open(listing.contactValue, '_blank');
    }
  };

  // Only show side badge when it conveys distinct info (Buy/Sell), not the generic "Listing" fallback
  const showSideBadge = listing.side === 'Buy' || listing.side === 'Sell';

  return (
    <div
      className={`bg-terminal-surface border border-brand-gray/20 border-l-4 ${getChannelAccent(listing.channel)} p-3 mb-2.5`}
    >
      {/* Header: Channel dot + label, optional side badge, price (right) */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-black">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getChannelDot(listing.channel)}`} />
            {listing.channel}
          </span>
          {showSideBadge && (
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase ${getSideColor(listing.side)}`}>
              {listing.side}
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg sm:text-xl font-mono-numeric font-bold text-brand-black leading-tight tabular-nums">
            ₹{listing.price.toLocaleString('en-IN')}
          </div>
          {listing.landedPrice && listing.landedPrice !== listing.price && (
            <div className="text-[10px] text-brand-black/60 mt-0.5">
              Landed ₹{listing.landedPrice.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      </div>

      {/* Compact metadata row — inline, no separate grid */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-black/60 mb-2.5">
        <span className="truncate min-w-0 max-w-full">
          <span className="text-brand-black/40">Source </span>
          <span className="text-brand-black/80 font-medium">{listing.sourceLabel}</span>
        </span>
        <span className="text-brand-black/20">·</span>
        <span>
          <span className="text-brand-black/40">Qty </span>
          <span className="text-brand-black/80 font-medium">{listing.listingCount}</span>
        </span>
        {listing.location && (
          <>
            <span className="text-brand-black/20">·</span>
            <span className="truncate min-w-0 max-w-[120px]">{listing.location}</span>
          </>
        )}
        {listing.lastSeen && (
          <>
            <span className="text-brand-black/20">·</span>
            <span className="whitespace-nowrap">{formatLastSeen(listing.lastSeen)}</span>
          </>
        )}
      </div>

      {/* Action — full-width primary for WhatsApp/Sentria contact flows;
          compact text-link for URL-based marketplace/international listings. */}
      {listing.contactType && listing.contactValue && (
        listing.contactType === 'link' ? (
          <a
            href={listing.contactValue}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-black underline underline-offset-2 hover:text-brand-black/70 transition-colors mt-1"
          >
            View listing →
          </a>
        ) : (
          <button
            onClick={handleAction}
            className="w-full min-h-[40px] px-4 py-2 bg-accent text-terminal-bg text-xs font-semibold uppercase tracking-wide hover:bg-accent/90 transition-colors active:scale-[0.98]"
          >
            {listing.side === 'Sell' ? 'Sell To' : 'Buy From'} →
          </button>
        )
      )}
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
  // Trade Calculator — user-driven assessment. Resting state is empty until the
  // user enters their own assumptions. No ranking, no recommendation.
  const [calcBuyChannel, setCalcBuyChannel] = useState<'' | MarketChannel>('');
  const [calcSellChannel, setCalcSellChannel] = useState<'' | MarketChannel>('');
  const [calcBuyPrice, setCalcBuyPrice] = useState<string>('');
  const [calcSellPrice, setCalcSellPrice] = useState<string>('');
  const [calcFeePct, setCalcFeePct] = useState<string>('');
  const [calcShipping, setCalcShipping] = useState<string>('');
  const [calcHoldingCost, setCalcHoldingCost] = useState<string>('');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionTarget, setConnectionTarget] = useState<{userId: string; email: string; name?: string} | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [buyModalExpandWhatsapp, setBuyModalExpandWhatsapp] = useState(false);
  const [buyModalExpandMarketplace, setBuyModalExpandMarketplace] = useState(false);
  const [buyModalExpandIntl, setBuyModalExpandIntl] = useState(false);
  const [tradeListings, setTradeListings] = useState<TradeListing[]>([]);
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);
  
  // Main tab system — 3 tabs: Overview (chart+analytics+insight), Listings (orderbook+listings), Arbitrage
  const [mainTab, setMainTab] = useState<'overview' | 'listings' | 'arbitrage'>('overview');
  const [listingsViewMode, setListingsViewMode] = useState<'channel' | 'orderbook' | 'individual'>('channel');

  // Toast notification system
  const { toasts, toast, removeToast } = useToast();

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
      toast.success('Connection request sent! The seller will be notified.');
    } else {
      toast.error('Failed to send request: ' + result.error);
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

    // Floor junk quotes (absolute + relative) before taking the minimum so a
    // single ₹1,718-on-a-₹15k-shoe artefact can't masquerade as the best price.
    const retail = asset.priceAnchors?.retailIndia;
    const reference = retail && retail >= 1000 ? retail : undefined;
    const validated = filterValidQuotes(allPrices, reference);
    return validated.length > 0 ? Math.min(...validated) : undefined;
  }, [currentData.bestAvailablePrice, whatsappPrices.buy, marketplacePrices, internationalPrices, asset.priceAnchors?.retailIndia]);

  // Exchange mark price + spread for the hero. Ask side = sellable listings
  // (WhatsApp WTS [transactionType 'buy'] + marketplace + international landed);
  // bid side = WhatsApp WTB [transactionType 'sell']. Floor-filtered upstream.
  const markMetrics = useMemo(() => {
    const askPrices: number[] = [
      ...whatsappPrices.buy.map((p) => p.price),
      ...marketplacePrices.map((p) => p.price),
      ...internationalPrices.map((p) => p.price + (p.reshippingCost || 0)),
    ];
    const bidPrices: number[] = whatsappPrices.sell.map((p) => p.price);
    return computeMarkMetrics(askPrices, bidPrices, asset.priceAnchors?.retailIndia);
  }, [whatsappPrices.buy, whatsappPrices.sell, marketplacePrices, internationalPrices, asset.priceAnchors?.retailIndia]);

  const anchor = asset.priceAnchors;

  return (
    <section className="p-3 md:p-6 text-brand-black bg-brand-background/30 relative overflow-x-hidden max-w-7xl mx-auto">
      {/* Intelligence-First Terminal Layout - Grid on Desktop */}
      
      {/* ─── HEADER: compact image · identity · summary ─── */}
      <Card className="mb-4" noPadding>
        {/*
          Two-row on mobile:  row1 = [image | identity]   row2 = [summary full-width]
          Single row on sm+:  [image | identity (flex-1) | summary]
        */}
        <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] gap-x-4 gap-y-3 items-start p-4">

          {/* Image — compact thumbnail ≤ 140 px, never a full-height hero */}
          <div className="w-[140px] h-[140px] bg-brand-gray/5 border border-brand-gray/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {asset.image ? (
              <img
                src={asset.image}
                alt={asset.name}
                className="w-full h-full object-contain p-2"
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

          {/* Identity: name + brand · SKU */}
          <div className="min-w-0 pt-0.5">
            <h1 className="text-lg sm:text-xl md:text-2xl font-heading font-normal text-brand-black leading-tight mb-1.5">
              {asset.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-brand-black/60">
              <span className="font-semibold">{asset.brand}</span>
              <span>·</span>
              <span>SKU {asset.sku}</span>
            </div>
          </div>

          {/* Summary — spans 2 cols on mobile, right column on sm+ */}
          <div className="col-span-2 sm:col-span-1 sm:border-l sm:border-brand-gray/20 sm:pl-4 relative">
            {/* Watch star — top-right corner of header */}
            <button
              onClick={onToggleWatchlist}
              type="button"
              className={`absolute top-0 right-0 flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all ${
                watchlisted ? 'text-brand-black' : 'text-brand-black/40 hover:text-brand-black'
              }`}
              title={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <span className="text-base leading-none">{watchlisted ? '★' : '☆'}</span>
            </button>

            {/* Mark price + 30d delta */}
            <div className="flex items-start gap-4 sm:flex-col sm:items-end sm:gap-1 pr-8">
              <div className="sm:text-right">
                <p className="text-[10px] text-brand-black/50 uppercase tracking-wider mb-0.5 flex items-center sm:justify-end gap-1 flex-wrap">
                  Mark Price
                  {markMetrics.markMode === 'bid-only' && (
                    <span className="text-[9px] normal-case tracking-normal text-brand-black/40">indicative · bid-only</span>
                  )}
                  {markMetrics.markMode === 'ask-median' && (
                    <span className="text-[9px] normal-case tracking-normal text-brand-black/40">ask median</span>
                  )}
                </p>
                <p className="text-xl sm:text-2xl font-mono-numeric font-bold text-brand-black leading-tight tabular-nums">
                  {markMetrics.markPrice !== undefined ? `₹${Math.round(markMetrics.markPrice).toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              {/* 30d / vs-retail delta */}
              {(() => {
                const raw = currentData.change30d;
                const hasRealChange = typeof raw === 'string' && raw.includes('%');
                if (hasRealChange) {
                  const chg = parseFloat(raw.replace(/[^0-9.\-+]/g, ''));
                  if (isFinite(chg)) {
                    const isUp = chg > 0;
                    return (
                      <div className="sm:text-right flex-shrink-0">
                        <p className="text-[10px] text-brand-black/50 uppercase tracking-wider mb-0.5">30d</p>
                        <p className={`text-base font-mono-numeric font-bold leading-tight tabular-nums ${isUp ? 'text-up' : chg < 0 ? 'text-down' : 'text-brand-black'}`}>
                          {isUp ? '+' : ''}{chg.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }
                }
                const retail = anchor?.retailIndia;
                if (SHOW_VS_RETAIL_WHEN_NO_HISTORY && retail && retail > 0 && markMetrics.markPrice !== undefined) {
                  const vs = ((markMetrics.markPrice - retail) / retail) * 100;
                  const isUp = vs > 0;
                  return (
                    <div className="sm:text-right flex-shrink-0">
                      <p className="text-[10px] text-brand-black/50 uppercase tracking-wider mb-0.5">vs retail</p>
                      <p className={`text-base font-mono-numeric font-bold leading-tight tabular-nums ${isUp ? 'text-up' : vs < 0 ? 'text-down' : 'text-brand-black'}`}>
                        {isUp ? '+' : ''}{vs.toFixed(1)}%
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="sm:text-right flex-shrink-0">
                    <p className="text-[10px] text-brand-black/50 uppercase tracking-wider mb-0.5">30d</p>
                    <p className="text-base font-mono-numeric font-bold leading-tight tabular-nums text-brand-black/30">—</p>
                  </div>
                );
              })()}
            </div>

            {/* Trade-readiness line: Liquidity · Stock · Spread/sellers-only · Sellers · Updated */}
            <div className="mt-1.5 flex flex-wrap sm:justify-end gap-x-3 gap-y-0.5 text-[11px] text-brand-black/50">
              {currentData.liquidity && currentData.liquidity !== "N/A" && (
                <span>Liquidity <span className="text-brand-black/80 font-semibold">{currentData.liquidity}</span></span>
              )}
              {anchor?.retailIndia && (
                <span>Retail <span className="font-mono-numeric text-brand-black/80 font-semibold tabular-nums">₹{anchor.retailIndia.toLocaleString("en-IN")}</span></span>
              )}
              {/* Stock availability */}
              <span>Stock <span className="text-brand-black/80 font-semibold">
                {(whatsappPrices.buy.length + marketplacePrices.length + internationalPrices.length) > 0 ? "Available" : "Limited"}
              </span></span>
              {/* Spread % when both sides exist; "sellers-only" / "buyers-only" when one side */}
              {markMetrics.bestBid !== undefined && markMetrics.bestAsk !== undefined && markMetrics.spreadPct !== undefined ? (
                <span>Spread <span className="font-mono-numeric text-brand-black/80 font-semibold tabular-nums">{(markMetrics.spreadPct * 100).toFixed(1)}%</span></span>
              ) : markMetrics.bestAsk === undefined && markMetrics.bestBid !== undefined ? (
                <span className="text-brand-black/60">buyers-only</span>
              ) : markMetrics.bestBid === undefined && markMetrics.bestAsk !== undefined ? (
                <span className="text-brand-black/60">sellers-only</span>
              ) : null}
              {/* Seller count */}
              {(() => {
                const s = new Set<string>();
                whatsappPrices.buy.forEach(p => { if (p.sellerContact) s.add(p.sellerContact); else if (p.sellerName) s.add(p.sellerName); });
                whatsappPrices.sell.forEach(p => { if (p.sellerContact) s.add(p.sellerContact); else if (p.sellerName) s.add(p.sellerName); });
                marketplacePrices.forEach(p => { if (p.url) s.add(p.url); else if (p.marketplaceName) s.add(p.marketplaceName); else if (p.source) s.add(p.source); });
                internationalPrices.forEach(p => { if (p.marketplaceName) s.add(p.marketplaceName); else if (p.source) s.add(p.source); });
                if (s.size === 0) return null;
                return <span><span className="text-brand-black/80 font-semibold">{s.size}</span> {s.size === 1 ? 'seller' : 'sellers'}</span>;
              })()}
              {/* Updated timestamp (derived from listing freshness, same as before) */}
              {currentData.lastUpdated && (
                <span>Updated <span className="text-brand-black/80">{formatLastSeen(currentData.lastUpdated)}</span></span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── SIZE GRID: full pane width ─── */}
      {asset.sizes && asset.sizes.length > 0 && (() => {
        const sorted = sortSizesNumerically(asset.sizes);
        const sizePriceMap = new Map<string, number | null>();
        sorted.forEach(sv => {
          const prices: number[] = [];
          if (sv.pricePoints) {
            (sv.pricePoints.whatsapp || []).filter((p: PricePoint) => !p.transactionType || p.transactionType === 'buy' || p.transactionType === 'both').forEach((p: PricePoint) => prices.push(p.price));
            (sv.pricePoints.marketplace || []).forEach((p: PricePoint) => prices.push(p.price));
            (sv.pricePoints.international || []).forEach((p: PricePoint) => prices.push(p.price + (p.reshippingCost || 0)));
          } else if (sv.legacyPricePoints) {
            (sv.legacyPricePoints.b2b || []).filter((p: PricePoint) => !p.transactionType || p.transactionType === 'buy' || p.transactionType === 'both').forEach((p: PricePoint) => prices.push(p.price));
            (sv.legacyPricePoints.endCustomer || []).forEach((p: PricePoint) => prices.push(p.price));
            (sv.legacyPricePoints.stockxGoat || []).forEach((p: PricePoint) => prices.push(p.price + (p.reshippingCost || 0)));
          }
          const validated = filterValidQuotes(prices, asset.priceAnchors?.retailIndia);
          sizePriceMap.set(sv.size, validated.length > 0 ? Math.min(...validated) : null);
        });
        return (
          <div className="mb-4 bg-terminal-surface border border-brand-gray/20 p-3">
            <label className="text-xs font-semibold uppercase text-brand-black/50 tracking-wide block mb-2">Size</label>
            <div className="flex flex-wrap gap-1.5">
              {sorted.map(sv => {
                const best = sizePriceMap.get(sv.size) ?? null;
                const isSelected = sv.size === selectedSize;
                const hasPrice = best !== null && best !== undefined;
                return (
                  <button
                    key={sv.size}
                    onClick={() => setSelectedSize(sv.size)}
                    className={`px-2.5 py-1.5 text-center transition-all min-w-[60px] ${
                      isSelected
                        ? 'bg-terminal-surface-raised text-terminal-text'
                        : 'bg-terminal-surface border border-brand-gray/30 text-brand-black hover:border-terminal-border-strong'
                    }`}
                  >
                    <span className="block text-xs font-semibold leading-tight">{sv.size}</span>
                    {hasPrice ? (
                      <span className={`block text-[10px] font-mono-numeric font-bold mt-0.5 leading-tight tabular-nums ${
                        isSelected ? 'text-white/80' : 'text-brand-black/60'
                      }`}>
                        {(() => {
                          const v = best!;
                          if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(v >= 1_00_00_00_000 ? 0 : 1)}Cr`;
                          if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(v >= 10_00_000 ? 0 : 1)}L`;
                          if (v >= 10_000) return `₹${Math.round(v / 1000)}k`;
                          if (v >= 1_000) return `₹${(v / 1000).toFixed(1)}k`;
                          return `₹${v.toLocaleString('en-IN')}`;
                        })()}
                      </span>
                    ) : (
                      <span className={`block text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-white/50' : 'text-brand-black/30'}`}>—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ─── ACTIONS: SOURCE + LIST — below size selection ─── */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => { setShowBuyModal(true); setBuyModalExpandWhatsapp(false); setBuyModalExpandMarketplace(false); setBuyModalExpandIntl(false); }}
          className="px-4 py-2.5 bg-accent text-terminal-bg text-center hover:bg-accent/80 transition-all duration-200 active:scale-95"
          title="See verified sources for this asset"
        >
          <span className="text-[10px] font-normal opacity-70 block leading-tight">
            Best Source Price{bestPrice !== undefined ? ` · ₹${bestPrice.toLocaleString('en-IN')}` : ''}
          </span>
          <span className="text-sm font-bold uppercase tracking-wide block leading-tight mt-0.5">Source</span>
        </button>
        <button
          onClick={() => setShowSellModal(true)}
          className="px-4 py-2.5 border-2 border-terminal-border-strong text-brand-black bg-transparent text-center hover:bg-brand-gray/10 transition-all duration-200 active:scale-95"
          title="Post a listing for this asset"
        >
          <span className="text-[10px] font-normal opacity-50 block leading-tight">Your Ask Price</span>
          <span className="text-sm font-bold uppercase tracking-wide block leading-tight mt-0.5">List</span>
        </button>
      </div>

      {/* ============================================ */}
      {/* MAIN TAB NAVIGATION — 3 Tabs */}
      {/* ============================================ */}
      <div className="mt-6 mb-4">
        <div className="flex items-center gap-1.5 sm:gap-2 pb-2">
          <button
            onClick={() => setMainTab('overview')}
            className={`flex-1 min-w-0 px-2 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'overview'
                ? 'bg-terminal-surface-raised text-terminal-text'
                : 'bg-terminal-surface text-brand-black border-2 border-brand-gray/30 hover:border-terminal-border-strong'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setMainTab('listings')}
            className={`flex-1 min-w-0 px-2 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'listings'
                ? 'bg-terminal-surface-raised text-terminal-text'
                : 'bg-terminal-surface text-brand-black border-2 border-brand-gray/30 hover:border-terminal-border-strong'
            }`}
          >
            Listings {unifiedListings.length > 0 && (
              <span className={`ml-1 sm:ml-1.5 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold ${mainTab === 'listings' ? 'bg-white/20' : 'bg-terminal-surface-raised'}`}>
                {unifiedListings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainTab('arbitrage')}
            className={`flex-1 min-w-0 px-2 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === 'arbitrage'
                ? 'bg-terminal-surface-raised text-terminal-text'
                : 'bg-terminal-surface text-brand-black border-2 border-brand-gray/30 hover:border-terminal-border-strong'
            }`}
          >
            Trade Calculator
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* TAB CONTENT */}
      {/* ============================================ */}

      {/* OVERVIEW TAB — Market Snapshot + Chart + Analytics */}
      {mainTab === 'overview' && (
        <div className="space-y-4">

          {/* ── Market Snapshot: channel prices · bid/ask · quick stats · transparency ── */}
          <Card noPadding>
            <div className="p-3 sm:p-4 space-y-3">

              {/* Per-channel best prices (P2P / Platform / International) */}
              {(() => {
                const channels: { label: string; price: number | undefined; count: number }[] = [];
                if (whatsappPrices.buy.length > 0) channels.push({ label: "WhatsApp", price: Math.min(...whatsappPrices.buy.map(p => p.price)), count: whatsappPrices.buy.length });
                if (marketplacePrices.length > 0) channels.push({ label: "Marketplace", price: Math.min(...marketplacePrices.map(p => p.price)), count: marketplacePrices.length });
                if (internationalPrices.length > 0) channels.push({ label: "International", price: Math.min(...internationalPrices.map(p => p.price + (p.reshippingCost || 0))), count: internationalPrices.length });
                if (channels.length === 0) return null;

                // Dispersion headline — computed from the same prices shown in the cards
                const pricesWithValue = channels.filter(ch => ch.price !== undefined).map(ch => ch.price as number);
                const dispMin = pricesWithValue.length > 0 ? Math.min(...pricesWithValue) : undefined;
                const dispMax = pricesWithValue.length > 0 ? Math.max(...pricesWithValue) : undefined;
                const dispPct = dispMin && dispMax && dispMin > 0 ? Math.round((dispMax - dispMin) / dispMin * 100) : 0;
                const dispN = pricesWithValue.length;

                const overallBest = bestPrice;
                return (
                  <div className="space-y-2">
                    {/* Headline */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-brand-black/40 font-semibold mb-0.5">Cross-channel pricing</p>
                        {dispN >= 2 && dispMin !== undefined && dispMax !== undefined ? (
                          <p className="text-xs text-brand-black/70">
                            <span className="font-mono-numeric font-semibold text-brand-black">₹{dispMin.toLocaleString("en-IN")}–₹{dispMax.toLocaleString("en-IN")}</span>
                            <span className="text-brand-black/50">, {dispPct}% spread across {dispN} channel{dispN !== 1 ? "s" : ""}</span>
                          </p>
                        ) : dispN === 1 && dispMin !== undefined ? (
                          <p className="text-xs text-brand-black/70">
                            Single channel — <span className="font-mono-numeric font-semibold text-brand-black">₹{dispMin.toLocaleString("en-IN")}</span>
                          </p>
                        ) : null}
                      </div>
                      {/* One-sided market notice — adjacent to the channel block */}
                      {(markMetrics.bestBid !== undefined) !== (markMetrics.bestAsk !== undefined) && (
                        <span className="text-[11px] text-brand-black/50 italic flex-shrink-0 mt-0.5">
                          {markMetrics.bestAsk === undefined ? "buyers-only" : "sellers-only"}
                        </span>
                      )}
                    </div>

                    {/* Channel cards */}
                    <div className={`grid gap-2 ${channels.length === 1 ? "grid-cols-1" : channels.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {channels.map((ch) => {
                        const isBest = overallBest !== undefined && ch.price === overallBest;
                        const fullLabel = ch.label === "WhatsApp" ? "P2P Channel" : ch.label === "Marketplace" ? "Platform" : ch.label;
                        const shortLabel = ch.label === "WhatsApp" ? "P2P" : ch.label === "Marketplace" ? "Platform" : ch.label === "International" ? "Intl" : ch.label;
                        const tooltip = ch.label === "Marketplace" ? "Best price across Indian resale platforms (e.g. Culture Circle, HypeFly). Shipped domestically." : ch.label === "International" ? "Best landed price from global platforms (e.g. StockX, GOAT). Includes platform fees." : "Best price across peer-to-peer trade groups. Direct seller-to-buyer.";
                        return (
                          <div key={ch.label} className={`px-2.5 py-2 text-center relative min-w-0 ${isBest ? "bg-up/10 border border-up/40" : "bg-terminal-surface border border-brand-gray/15"}`} title={tooltip}>
                            <p className="text-[9px] sm:text-[10px] text-brand-black/50 uppercase tracking-wider mb-0.5 leading-tight flex items-center justify-center gap-1">
                              <span className="sm:hidden">{shortLabel}</span>
                              <span className="hidden sm:inline">{fullLabel}</span>
                              <span className="hidden sm:inline cursor-help text-brand-black/30 hover:text-brand-black/60 transition-colors flex-shrink-0">ⓘ</span>
                            </p>
                            <p className={`text-sm font-mono-numeric font-bold leading-tight truncate ${isBest ? "text-up" : "text-brand-black"}`}>
                              {ch.price !== undefined ? `₹${ch.price.toLocaleString("en-IN")}` : "—"}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-brand-black/40 mt-0.5 leading-tight">{ch.count} listing{ch.count !== 1 ? "s" : ""}</p>
                          </div>
                        );
                      })}
                    </div>
                    {/* Affordance to open the channel-grouped Listings view */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setMainTab('listings'); setListingsViewMode('channel'); }}
                        className="text-[11px] text-brand-black/50 hover:text-brand-black transition-colors underline underline-offset-2"
                      >
                        View by channel →
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Bid / Ask / Spread — shown here only when BOTH sides exist */}
              {markMetrics.bestBid !== undefined && markMetrics.bestAsk !== undefined ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-terminal-surface border border-brand-gray/20 p-2">
                    <p className="text-[10px] text-brand-black/50 uppercase tracking-wider">Bid</p>
                    <p className="text-sm font-mono-numeric font-bold text-brand-black tabular-nums">₹{Math.round(markMetrics.bestBid).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="bg-terminal-surface border border-brand-gray/20 p-2">
                    <p className="text-[10px] text-brand-black/50 uppercase tracking-wider">Ask</p>
                    <p className="text-sm font-mono-numeric font-bold text-brand-black tabular-nums">₹{Math.round(markMetrics.bestAsk).toLocaleString("en-IN")}</p>
                  </div>
                  <div className={`border p-2 ${(markMetrics.spreadAbs ?? 0) < 0 ? 'bg-up/10 border-up/40' : 'border-brand-gray/20 bg-terminal-surface'}`}>
                    <p className="text-[10px] text-brand-black/50 uppercase tracking-wider">Spread</p>
                    {(markMetrics.spreadAbs ?? 0) < 0 ? (
                      <p className="text-sm font-mono-numeric font-bold text-up tabular-nums" title="Highest bid exceeds lowest ask across channels.">Crossed</p>
                    ) : (
                      <p className="text-sm font-mono-numeric font-bold text-brand-black tabular-nums">
                        ₹{Math.round(markMetrics.spreadAbs ?? 0).toLocaleString("en-IN")}
                        {markMetrics.spreadPct !== undefined && (
                          <span className="text-[10px] text-brand-black/50 ml-1">{(markMetrics.spreadPct * 100).toFixed(1)}%</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Price Chart */}
          <Card
            title="Price Chart"
            subtitle="Daily mark + per-channel price"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          >
            <TradingChart assetId={asset.id} size={selectedSize || undefined} />
          </Card>

          {/* Market Analytics */}
          <Card
            title="Market Analytics"
            subtitle="Price dynamics and market structure"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
           
          >
            {(() => {
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

              const getPriceStability = () => {
                if (priceRangePct === 0) return { level: 'N/A', label: 'No Data', color: 'text-brand-black/40' };
                if (priceRangePct <= 5) return { level: 'Tight', label: 'Very Stable', color: 'text-up' };
                if (priceRangePct <= 15) return { level: 'Moderate', label: 'Stable', color: 'text-yellow-600' };
                if (priceRangePct <= 50) return { level: 'Wide', label: 'Volatile', color: 'text-orange-600' };
                return { level: 'Very Wide', label: 'Highly Volatile', color: 'text-down' };
              };
              const priceStability = getPriceStability();

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

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="border border-brand-gray/20 p-3" title="Based on price fluctuation patterns across data points.">
                    <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">Volatility</p>
                    <p className={`text-lg font-semibold capitalize ${
                      asset.volatility === 'low' ? 'text-up' : asset.volatility === 'high' ? 'text-down' : 'text-yellow-600'
                    }`}>{asset.volatility ? `${asset.volatility[0].toUpperCase()}${asset.volatility.slice(1)}` : "—"}</p>
                    {asset.volatility && (
                      <p className="text-[9px] text-brand-black/40 mt-0.5 leading-tight">
                        {asset.volatility === 'low'
                          ? 'Prices clustering tightly'
                          : asset.volatility === 'high'
                          ? 'Wide price swings across channels'
                          : 'Moderate variation across channels'}
                      </p>
                    )}
                  </div>
                  <div className="border border-brand-gray/20 p-3" title={`Lowest price: ₹${marketMin.toLocaleString('en-IN')} — Highest price: ₹${marketMax.toLocaleString('en-IN')}`}>
                    <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">Price Range</p>
                    {marketMin > 0 ? (
                      <>
                        <p className="text-lg font-mono-numeric font-bold text-brand-black">
                          ₹{priceRangeWidth.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[9px] text-brand-black/40 mt-0.5 leading-tight">
                          {priceRangePct <= 5
                            ? `${priceRangePct.toFixed(0)}% spread · tight market`
                            : priceRangePct <= 20
                            ? `${priceRangePct.toFixed(0)}% spread · normal for resale`
                            : priceRangePct <= 60
                            ? `${priceRangePct.toFixed(0)}% spread · fragmented pricing`
                            : `${priceRangePct.toFixed(0)}% spread · highly fragmented`}
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-brand-black/30">—</p>
                    )}
                  </div>
                  <div className="border border-brand-gray/20 p-3" title="Measures how close best prices are to the average across channels.">
                    <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                      Efficiency
                      <span className="cursor-help text-brand-black/30 hover:text-brand-black/60 transition-colors">ⓘ</span>
                    </p>
                    {avgEfficiency > 0 ? (
                      <>
                        <p className={`text-lg font-mono-numeric font-bold ${
                          avgEfficiency <= 5 ? 'text-up' : 'text-brand-black'
                        }`}>{avgEfficiency.toFixed(1)}%</p>
                        <p className="text-[9px] text-brand-black/40 mt-0.5 leading-tight">
                          {avgEfficiency <= 5
                            ? 'Prices agree across channels'
                            : avgEfficiency <= 15
                            ? 'Some spread between best and avg'
                            : 'Best price well below channel avg'}
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-brand-black/30">—</p>
                    )}
                  </div>
                  <div className="border border-brand-gray/20 p-3" title={`Price stability: ${priceRangePct.toFixed(1)}% spread.`}>
                    <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                      Stability
                      <span className="cursor-help text-brand-black/30 hover:text-brand-black/60 transition-colors">ⓘ</span>
                    </p>
                    <p className={`text-lg font-semibold ${
                      priceRangePct <= 5
                        ? 'text-up'
                        : priceRangePct <= 15
                        ? 'text-yellow-600'
                        : 'text-brand-black'
                    }`}>{priceStability.level}</p>
                    <p className="text-[9px] text-brand-black/40 mt-0.5 leading-tight">
                      {priceRangePct <= 5
                        ? 'Consistent pricing across channels'
                        : priceRangePct <= 15
                        ? 'Some channel variation — normal'
                        : priceRangePct <= 50
                        ? 'Meaningful channel gaps — check listings'
                        : 'Large channel gaps — verify listings'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </Card>

        </div>
      )}

      {/* LISTINGS TAB — Combined Order Book + Individual Listings */}
      {mainTab === 'listings' && (
        <div className="space-y-4">
      {/* View Mode Toggle — By channel is default (sourcing-first) */}
      <div className="inline-flex items-center gap-1 bg-terminal-surface border border-brand-gray/30 p-1 w-full sm:w-fit">
        <button
          onClick={() => setListingsViewMode('channel')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
            listingsViewMode === 'channel'
              ? 'bg-terminal-surface-raised text-terminal-text'
              : 'text-brand-black/60 hover:text-brand-black'
          }`}
        >
          By channel
        </button>
        <button
          onClick={() => setListingsViewMode('orderbook')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
            listingsViewMode === 'orderbook'
              ? 'bg-terminal-surface-raised text-terminal-text'
              : 'text-brand-black/60 hover:text-brand-black'
          }`}
        >
          Order book
        </button>
        <button
          onClick={() => setListingsViewMode('individual')}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
            listingsViewMode === 'individual'
              ? 'bg-terminal-surface-raised text-terminal-text'
              : 'text-brand-black/60 hover:text-brand-black'
          }`}
        >
          <span className="sm:hidden">All</span>
          <span className="hidden sm:inline">All listings</span>
        </button>
      </div>

      {/* Channel-Grouped View — default, sourcing-first */}
      {listingsViewMode === 'channel' && (() => {
        const isStale = (lastSeen?: Date | string) => {
          if (!lastSeen) return false;
          const d = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
          return (Date.now() - d.getTime()) > 7 * 24 * 60 * 60 * 1000;
        };

        const channelSections = [
          {
            key: 'Sentria' as const,
            title: 'Sentria Network',
            profile: 'Platform-native listings · verified users',
            dotColor: 'bg-up',
            listings: unifiedListings
              .filter(l => l.channel === 'Sentria')
              .sort((a, b) => (a.landedPrice ?? a.price) - (b.landedPrice ?? b.price)),
            alwaysShow: false,
          },
          {
            key: 'WhatsApp' as const,
            title: 'WhatsApp & Reseller',
            profile: 'Local · direct · often negotiable',
            dotColor: 'bg-green-600',
            listings: unifiedListings
              .filter(l => l.channel === 'WhatsApp')
              .sort((a, b) => (a.landedPrice ?? a.price) - (b.landedPrice ?? b.price)),
            alwaysShow: true,
          },
          {
            key: 'Marketplace' as const,
            title: 'Indian Marketplaces',
            profile: 'Indian resale platforms · shipped domestically',
            dotColor: 'bg-blue-600',
            listings: unifiedListings
              .filter(l => l.channel === 'Marketplace')
              .sort((a, b) => (a.landedPrice ?? a.price) - (b.landedPrice ?? b.price)),
            alwaysShow: true,
          },
          {
            key: 'International' as const,
            title: 'International',
            profile: 'Global platforms · landed cost includes shipping & duties',
            dotColor: 'bg-purple-600',
            listings: unifiedListings
              .filter(l => l.channel === 'International')
              .sort((a, b) => (a.landedPrice ?? a.price) - (b.landedPrice ?? b.price)),
            alwaysShow: true,
          },
        ].filter(s => s.alwaysShow || s.listings.length > 0);

        const renderRowAction = (row: typeof unifiedListings[number]) => {
          if (row.contactType === 'sentria' && row.tradeListingUserId) {
            if (currentUser?.uid === row.tradeListingUserId) {
              return <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-brand-black/40 whitespace-nowrap">Your Listing</span>;
            }
            return (
              <button
                onClick={() => {
                  if (currentUser) {
                    setConnectionTarget({ userId: row.tradeListingUserId!, email: row.tradeListingUserEmail || '', name: row.sourceLabel });
                    setShowConnectionModal(true);
                  } else {
                    toast.warning('Please sign in to request introductions');
                  }
                }}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-up text-terminal-bg hover:bg-up/90 transition-colors whitespace-nowrap"
              >
                Request Intro
              </button>
            );
          }
          if (row.contactType && row.contactValue) {
            if (row.contactType === 'whatsapp') {
              return (
                <a
                  href={`https://wa.me/${row.contactValue.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-up text-terminal-bg hover:bg-up/90 transition-colors whitespace-nowrap"
                >
                  {row.side === 'Sell' ? 'Sell to' : 'Buy from'}
                </a>
              );
            }
            return (
              <a
                href={row.contactValue}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold border border-brand-gray/30 text-brand-black hover:bg-accent hover:text-terminal-bg hover:border-terminal-border-strong transition-colors whitespace-nowrap"
              >
                {row.side === 'Sell' ? 'Sell to' : 'Buy from'}
              </a>
            );
          }
          return <span className="text-xs text-brand-black/30">—</span>;
        };

        return (
          <div className="space-y-3">
            {channelSections.map(section => {
              const cheapest = section.listings.length > 0
                ? Math.min(...section.listings.map(l => l.landedPrice ?? l.price))
                : undefined;
              const hasAnyLocation = section.listings.some(l => l.location);
              const showSide = section.key === 'WhatsApp';
              const showLanded = section.key === 'International';

              return (
                <Card key={section.key} noPadding>
                  <div className="px-3 sm:px-5 py-3 border-b border-brand-gray/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${section.dotColor}`} />
                          <h3 className="text-sm font-bold text-brand-black uppercase tracking-wide">{section.title}</h3>
                        </div>
                        <p className="text-[11px] text-brand-black/50 mt-0.5 ml-4">{section.profile}</p>
                      </div>
                      {cheapest !== undefined && (
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-mono-numeric font-bold text-brand-black">₹{cheapest.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-brand-black/40">{section.listings.length} listing{section.listings.length !== 1 ? 's' : ''}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 sm:p-5">
                    {section.listings.length === 0 ? (
                      <p className="text-xs text-brand-black/40 py-4 text-center">No listings on this channel</p>
                    ) : isMobile ? (
                      <div>
                        {section.listings.map((row, idx) => (
                          <div key={idx} className={isStale(row.lastSeen) ? 'opacity-60' : ''}>
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
                        ))}
                      </div>
                    ) : (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-brand-gray/15">
                            <th className="text-left pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Price</th>
                            {showLanded && <th className="text-left pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Landed</th>}
                            {showSide && <th className="text-left pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Side</th>}
                            <th className="text-center pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Qty</th>
                            <th className="text-left pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Source</th>
                            {hasAnyLocation && <th className="text-left pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Location</th>}
                            <th className="text-right pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Last seen</th>
                            <th className="text-right pb-2 pt-0 px-2 text-[10px] font-semibold text-brand-black/40 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.listings.map((row, idx) => (
                            <tr
                              key={idx}
                              className={`border-b border-brand-gray/10 hover:bg-brand-background/50 transition-colors ${isStale(row.lastSeen) ? 'opacity-60' : ''}`}
                            >
                              <td className="px-2 py-2.5">
                                <span className="text-sm font-semibold text-brand-black font-mono-numeric">
                                  ₹{row.price.toLocaleString('en-IN')}
                                </span>
                              </td>
                              {showLanded && (
                                <td className="px-2 py-2.5">
                                  <span className="text-sm text-brand-black/70 font-mono-numeric">
                                    {row.landedPrice && row.landedPrice !== row.price
                                      ? `₹${row.landedPrice.toLocaleString('en-IN')}`
                                      : '—'}
                                  </span>
                                </td>
                              )}
                              {showSide && (
                                <td className="px-2 py-2.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                                    row.side === 'Buy' ? 'bg-up/10 text-up' :
                                    row.side === 'Sell' ? 'bg-down/10 text-down' :
                                    'bg-terminal-surface-raised text-terminal-text-dim'
                                  }`}>
                                    {row.side}
                                  </span>
                                </td>
                              )}
                              <td className="px-2 py-2.5 text-center">
                                <span className="text-sm text-brand-black font-mono-numeric">{row.listingCount}</span>
                              </td>
                              <td className="px-2 py-2.5">
                                <span className="text-sm text-brand-black">{row.sourceLabel}</span>
                              </td>
                              {hasAnyLocation && (
                                <td className="px-2 py-2.5">
                                  <span className="text-sm text-brand-black/70">{row.location || '—'}</span>
                                </td>
                              )}
                              <td className="px-2 py-2.5 text-right">
                                <span className={`text-xs ${isStale(row.lastSeen) ? 'text-orange-600 font-medium' : 'text-brand-black/50'}`}>
                                  {row.lastSeen ? formatLastSeen(row.lastSeen) : '—'}
                                  {isStale(row.lastSeen) && <span className="ml-1" title="This listing may be outdated">⚠</span>}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-right">
                                {renderRowAction(row)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Order Book View */}
      {listingsViewMode === 'orderbook' && (
        <Card
          title="Order Book"
          subtitle="Buy/sell orders aggregated at each price level"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          <OrderBook
            whatsappBuyPrices={whatsappPrices.buy}
            whatsappSellPrices={whatsappPrices.sell}
            marketplacePrices={marketplacePrices}
            internationalPrices={internationalPrices}
          />
        </Card>
      )}

      {/* All Listings (Flat Table) */}
      {listingsViewMode === 'individual' && (unifiedListings.length > 0 ? (
        <Card
          title="All Listings"
          subtitle={isMobile ? undefined : `${unifiedListings.length} listings across all channels`}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
         
        >
            {/* MOBILE: Compact toolbar. DESKTOP: Original spacious layout. */}
            {/* Mobile toolbar (hidden on sm+) */}
            <div className="sm:hidden mb-3">
              {/* Row: count + sort */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-medium text-brand-black/60">
                  {unifiedListings.length} {unifiedListings.length === 1 ? 'listing' : 'listings'}
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'price' | 'quantity' | 'newest')}
                  className="text-[11px] border border-brand-gray/30 bg-terminal-surface px-2 py-1 text-brand-black focus:outline-none focus:border-terminal-border-strong"
                  aria-label="Sort listings"
                >
                  <option value="price">Sort: Price ↑</option>
                  <option value="quantity">Sort: Qty ↓</option>
                  <option value="newest">Sort: Newest</option>
                </select>
              </div>

              {/* Channel chips (horizontal scroll) */}
              <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 pb-1.5 custom-scrollbar">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'Sentria', label: 'Sentria' },
                  { key: 'WhatsApp', label: 'WhatsApp' },
                  { key: 'Marketplace', label: 'Market' },
                  { key: 'International', label: 'Intl' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setUnifiedChannelFilter(
                        opt.key as 'all' | 'WhatsApp' | 'Marketplace' | 'International' | 'Sentria'
                      )
                    }
                    className={`flex-shrink-0 px-3 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap ${
                      unifiedChannelFilter === opt.key
                        ? 'bg-terminal-surface-raised text-terminal-text'
                        : 'bg-terminal-surface text-brand-black/70 border border-brand-gray/30'
                    }`}
                    style={{ borderRadius: '999px' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Side chips (only show when not 'all', as a tiny secondary filter row) */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] uppercase tracking-wider text-brand-black/40 font-medium flex-shrink-0">Side</span>
                <div className="flex gap-1 overflow-x-auto custom-scrollbar">
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
                      className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-medium transition-all whitespace-nowrap ${
                        unifiedSideFilter === opt.key
                          ? 'bg-terminal-surface-raised text-terminal-text'
                          : 'bg-transparent text-brand-black/60 border border-brand-gray/25'
                      }`}
                      style={{ borderRadius: '999px' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location dropdown only when relevant */}
              {unifiedListings.some(r => r.location) && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-brand-black/40 font-medium flex-shrink-0">Location</span>
                  <select
                    value={filterLocation || ''}
                    onChange={(e) => setFilterLocation(e.target.value || null)}
                    className="flex-1 min-w-0 text-[11px] border border-brand-gray/30 bg-terminal-surface px-2 py-1 text-brand-black focus:outline-none focus:border-terminal-border-strong"
                  >
                    <option value="">All locations</option>
                    {Array.from(new Set(unifiedListings.map(row => row.location).filter((loc): loc is string => Boolean(loc)))).map((loc: string) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Desktop filters (hidden on mobile) */}
            <div className="hidden sm:block space-y-4 mb-4">
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
                          ? 'bg-terminal-surface-raised text-terminal-text'
                          : 'bg-terminal-surface text-brand-black border border-brand-gray/30 hover:border-terminal-border-strong'
                      }`}
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
                          ? 'bg-terminal-surface-raised text-terminal-text'
                          : 'bg-terminal-surface text-brand-black border border-brand-gray/30 hover:border-terminal-border-strong'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              {/* Location Filter and Sort */}
              <div className="flex flex-wrap items-center gap-4">
                {unifiedListings.some(r => r.location) && (
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-sm text-brand-black/60 uppercase tracking-wider font-semibold whitespace-nowrap">Location:</label>
                  <select
                    value={filterLocation || ''}
                    onChange={(e) => setFilterLocation(e.target.value || null)}
                    className="flex-1 text-sm border border-brand-gray/30 bg-terminal-surface px-3 py-1.5 text-brand-black focus:outline-none focus:border-terminal-border-strong"
                  >
                    <option value="">All Locations</option>
                    {Array.from(new Set(unifiedListings.map(row => row.location).filter((loc): loc is string => Boolean(loc)))).map((loc: string) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-sm text-brand-black/60 uppercase tracking-wider font-semibold whitespace-nowrap">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price' | 'quantity' | 'newest')}
                    className="flex-1 text-sm border border-brand-gray/30 bg-terminal-surface px-3 py-1.5 text-brand-black focus:outline-none focus:border-terminal-border-strong"
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
                  <p className="text-[10px] text-brand-black/40 mt-1 mb-2">
                    Some listings may be outdated — verify with seller before acting.
                  </p>
                );
              }
              return null;
            })()}

            <div className="md:overflow-x-auto md:mx-0 md:custom-scrollbar">
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
                
                // Identify the 3 lowest-priced sell listings (lowest landed asks)
                // Track which specific listings are the lowest asks by their index in filtered array
                const lowestAskIndices = new Set<number>();
                const buyListingsWithIndex = filtered
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => row.side === 'Buy')
                  .sort((a, b) => {
                    const aPrice = a.row.landedPrice ?? a.row.price;
                    const bPrice = b.row.landedPrice ?? b.row.price;
                    return aPrice - bPrice;
                  })
                  .slice(0, 3); // Take only top 3
                
                buyListingsWithIndex.forEach(({ idx }) => lowestAskIndices.add(idx));
                
                const isLowestAsk = (row: typeof filtered[0], idx: number) => {
                  if (row.side !== 'Buy') return false;
                  return lowestAskIndices.has(idx);
                };

                const hasAnyLocation = filtered.some(r => r.location);
                const isRowStale = (lastSeen?: Date | string) => {
                  if (!lastSeen) return false;
                  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
                  return (Date.now() - date.getTime()) > 7 * 24 * 60 * 60 * 1000;
                };

                return isMobile ? (
                  // MOBILE: Card View
                  <div>
                    {filtered.length > 0 ? (
                      filtered.map((row, idx) => {
                        const isLowestAskRow = isLowestAsk(row, idx);
                        return (
                          <div key={idx} className="relative">
                            {isLowestAskRow && (
                              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-terminal-surface-raised text-terminal-text px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                <span>Lowest ask</span>
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
                        <button
                          type="button"
                          onClick={() => {
                            setUnifiedChannelFilter('all');
                            setUnifiedSideFilter('all');
                            setFilterLocation(null);
                          }}
                          className="text-xs mt-2 underline text-brand-black/70"
                        >
                          Reset filters
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // DESKTOP: Table View - Clean Minimal Design
              <>
              {/* Channel color legend */}
              <div className="flex items-center gap-3 mb-2 text-[10px] text-brand-black/50">
                <span className="font-semibold uppercase tracking-wider">Channels:</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-up inline-block"></span> Sentria</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-up inline-block"></span> WhatsApp</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span> Marketplace</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-600 inline-block"></span> International</span>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-brand-gray/20">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Channel</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Side</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Price</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Landed</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Qty</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Source</th>
                    {hasAnyLocation && <th className="text-left px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Location</th>}
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Last Seen</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-brand-black/60 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={hasAnyLocation ? 9 : 8} className="px-3 py-12 text-center">
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
                    
                    const isLowestAskRow = isLowestAsk(row, idx);
                    
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-brand-gray/10 hover:bg-brand-background/50 transition-colors ${isRowStale(row.lastSeen) ? 'opacity-60' : ''}`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              row.channel === 'Sentria' ? 'bg-up' :
                              row.channel === 'WhatsApp' ? 'bg-up' :
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
                            row.side === 'Buy' ? 'bg-up/10 text-up' :
                            row.side === 'Sell' ? 'bg-down/10 text-down' :
                            'bg-terminal-surface-raised text-terminal-text-dim'
                          }`}>
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
                            {isLowestAskRow && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-brand-black/50 border border-brand-gray/40 px-1 py-0.5" title="Lowest ask">Low</span>
                            )}
                            <span className="text-sm text-brand-black">{row.sourceLabel}</span>
                          </div>
                        </td>
                        {hasAnyLocation && (
                          <td className="px-3 py-2.5">
                            <span className="text-sm text-brand-black/70">
                              {row.location || '—'}
                            </span>
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-xs ${isRowStale(row.lastSeen) ? 'text-orange-600 font-medium' : 'text-brand-black/50'}`}>
                            {row.lastSeen ? formatLastSeen(row.lastSeen) : '—'}
                            {isRowStale(row.lastSeen) && <span className="ml-1" title="This listing may be outdated">⚠</span>}
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
                                    toast.warning('Please sign in to request introductions');
                                  }
                                }}
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-up text-terminal-bg hover:bg-up/90 transition-colors whitespace-nowrap"
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
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-up text-terminal-bg hover:bg-up/90 transition-colors whitespace-nowrap"
                              >
                                {row.side === 'Sell' ? 'Sell to' : 'Buy from'}
                              </a>
                            ) : (
                              <a
                                href={row.contactValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold border border-brand-gray/30 text-brand-black hover:bg-accent hover:text-terminal-bg hover:border-terminal-border-strong transition-colors whitespace-nowrap"
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
              </>
            );
            })()}
            </div>
        </Card>
      ) : (
        <Card title="All Listings" subtitle="No listings found for this asset">
          <div className="py-12 text-center text-brand-black/60">
            <svg className="w-12 h-12 mx-auto mb-3 text-brand-gray/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-brand-black/60">No Listings Available</p>
            <p className="text-xs text-brand-black/40 mt-1">Check back later or switch to order book view</p>
          </div>
        </Card>
      ))}
        </div>
      )}

      {/* TRADE CALCULATOR TAB — user-driven assessment. No ranking, no recommendation. */}
      {mainTab === 'arbitrage' && (() => {
        // Sentria supplies live prices; the user supplies the assumptions and judgement.
        const channelAskPrice = (ch: MarketChannel): number | undefined => {
          if (ch === 'whatsapp') {
            const v = whatsappPrices.buy.map((p) => p.price);
            return v.length ? Math.min(...v) : undefined;
          }
          if (ch === 'marketplace') {
            const v = marketplacePrices.map((p) => p.price);
            return v.length ? Math.min(...v) : undefined;
          }
          const v = internationalPrices.map((p) => p.price + (p.reshippingCost || 0));
          return v.length ? Math.min(...v) : undefined;
        };
        const channelSellRef = (ch: MarketChannel): number | undefined => {
          if (ch === 'whatsapp') {
            const v = whatsappPrices.sell.map((p) => p.price); // WTB bids
            return v.length ? Math.max(...v) : undefined;
          }
          if (ch === 'marketplace') {
            const v = marketplacePrices.map((p) => p.price);
            return v.length ? Math.min(...v) : undefined;
          }
          const v = internationalPrices.map((p) => p.price + (p.reshippingCost || 0));
          return v.length ? Math.min(...v) : undefined;
        };

        const channelOptions: { ch: MarketChannel; label: string }[] = [];
        if (whatsappPrices.buy.length || whatsappPrices.sell.length) channelOptions.push({ ch: 'whatsapp', label: 'WhatsApp (P2P)' });
        if (marketplacePrices.length) channelOptions.push({ ch: 'marketplace', label: 'Marketplace' });
        if (internationalPrices.length) channelOptions.push({ ch: 'international', label: 'International' });

        const onPickBuy = (value: string) => {
          const ch = (value || '') as '' | MarketChannel;
          setCalcBuyChannel(ch);
          const p = ch ? channelAskPrice(ch) : undefined;
          setCalcBuyPrice(p !== undefined ? String(Math.round(p)) : '');
        };
        const onPickSell = (value: string) => {
          const ch = (value || '') as '' | MarketChannel;
          setCalcSellChannel(ch);
          const p = ch ? channelSellRef(ch) : undefined;
          setCalcSellPrice(p !== undefined ? String(Math.round(p)) : '');
          if (ch === 'marketplace' && calcFeePct === '') setCalcFeePct((getSellFee(undefined) * 100).toString());
          if (ch === 'whatsapp') setCalcFeePct(calcFeePct === '' ? '0' : calcFeePct);
        };

        const num = (s: string) => { const n = parseFloat(s); return isFinite(n) ? n : 0; };
        const buyPriceNum = parseFloat(calcBuyPrice);
        const sellPriceNum = parseFloat(calcSellPrice);
        const hasResult = !!calcBuyChannel && !!calcSellChannel
          && isFinite(buyPriceNum) && buyPriceNum > 0
          && isFinite(sellPriceNum) && sellPriceNum > 0;

        const buyAllIn = num(calcBuyPrice) + num(calcShipping);
        const sellNet = num(calcSellPrice) * (1 - num(calcFeePct) / 100);
        const netResult = sellNet - buyAllIn - num(calcHoldingCost);
        const netPct = buyAllIn > 0 ? (netResult / buyAllIn) * 100 : 0;
        const netTone = netResult > 0 ? 'text-up' : netResult < 0 ? 'text-down' : 'text-brand-black';

        const resetCalc = () => {
          setCalcBuyChannel(''); setCalcSellChannel('');
          setCalcBuyPrice(''); setCalcSellPrice('');
          setCalcFeePct(''); setCalcShipping(''); setCalcHoldingCost('');
        };

        const inputCls = "w-full border border-brand-gray/30 px-2 py-1.5 text-sm text-brand-black font-mono-numeric tabular-nums focus:outline-none focus:border-terminal-border-strong bg-brand-white";
        const selectCls = "w-full border border-brand-gray/30 px-2 py-1.5 text-sm text-brand-black focus:outline-none focus:border-terminal-border-strong bg-brand-white";
        const labelCls = "block text-[10px] text-brand-black/60 uppercase tracking-wider font-semibold mb-1";

        return (
        <div className="space-y-4">
          <Card
            title="Trade Calculator"
            subtitle="Assess a trade on your own assumptions. Sentria supplies live prices and the arithmetic — the judgement is yours."
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            }
            headerAction={
              (calcBuyChannel || calcSellChannel) ? (
                <button
                  onClick={resetCalc}
                  className="text-[10px] uppercase tracking-wider font-semibold text-brand-black/50 hover:text-brand-black border border-brand-gray/30 px-2 py-1 hover:border-terminal-border-strong transition-colors"
                >
                  Reset
                </button>
              ) : undefined
            }
          >
            {channelOptions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-brand-black/60">No channel data for this size</p>
                <p className="text-xs text-brand-black/40 mt-1">Add quotes to assess a trade.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Inputs — all user-supplied */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Buy channel</label>
                    <select className={selectCls} value={calcBuyChannel} onChange={(e) => onPickBuy(e.target.value)}>
                      <option value="">Select…</option>
                      {channelOptions.map((o) => (
                        <option key={o.ch} value={o.ch}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Buy price (₹)</label>
                    <input type="number" className={inputCls} value={calcBuyPrice} placeholder="0"
                      onChange={(e) => setCalcBuyPrice(e.target.value)} step="100" inputMode="numeric" />
                  </div>
                  <div>
                    <label className={labelCls}>Sell channel</label>
                    <select className={selectCls} value={calcSellChannel} onChange={(e) => onPickSell(e.target.value)}>
                      <option value="">Select…</option>
                      {channelOptions.map((o) => (
                        <option key={o.ch} value={o.ch}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Sell price (₹)</label>
                    <input type="number" className={inputCls} value={calcSellPrice} placeholder="0"
                      onChange={(e) => setCalcSellPrice(e.target.value)} step="100" inputMode="numeric" />
                  </div>
                  <div>
                    <label className={labelCls}>Sell-side fee (%)</label>
                    <input type="number" className={inputCls} value={calcFeePct} placeholder="0"
                      onChange={(e) => setCalcFeePct(e.target.value)} step="0.5" inputMode="decimal" />
                  </div>
                  <div>
                    <label className={labelCls}>Shipping (₹)</label>
                    <input type="number" className={inputCls} value={calcShipping} placeholder="0"
                      onChange={(e) => setCalcShipping(e.target.value)} step="50" inputMode="numeric" />
                  </div>
                  <div>
                    <label className={labelCls}>Holding cost (₹)</label>
                    <input type="number" className={inputCls} value={calcHoldingCost} placeholder="0"
                      onChange={(e) => setCalcHoldingCost(e.target.value)} step="50" inputMode="numeric" />
                  </div>
                </div>

                {/* Output — pure arithmetic on the user's inputs, or empty resting state */}
                {hasResult ? (
                  <div className="border border-brand-gray/20 bg-brand-background/40">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-brand-gray/20 border-b border-brand-gray/20">
                      <div className="p-3">
                        <p className="text-[10px] text-brand-black/50 uppercase tracking-wider">Buy all-in</p>
                        <p className="text-sm font-mono-numeric font-bold text-brand-black tabular-nums">₹{Math.round(buyAllIn).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-brand-black/50 uppercase tracking-wider">Sell net</p>
                        <p className="text-sm font-mono-numeric font-bold text-brand-black tabular-nums">₹{Math.round(sellNet).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-brand-black/50 uppercase tracking-wider">Net</p>
                        <p className={`text-sm font-mono-numeric font-bold tabular-nums ${netTone}`}>
                          {netResult >= 0 ? '+' : '−'}₹{Math.abs(Math.round(netResult)).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-brand-black/50 uppercase tracking-wider">Return</p>
                        <p className={`text-sm font-mono-numeric font-bold tabular-nums ${netTone}`}>
                          {netPct >= 0 ? '+' : ''}{netPct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-brand-black/40 p-3 leading-relaxed">
                      Arithmetic on your inputs only: net = (sell price × (1 − fee%)) − buy price − shipping − holding cost.
                      Sentria does not rate, rank, or advise on this trade. Verify all prices and fees independently before acting.
                    </p>
                  </div>
                ) : (
                  <div className="border border-dashed border-brand-gray/30 bg-brand-background/30 p-6 text-center">
                    <p className="text-sm text-brand-black/60">Enter your assumptions to compute the net.</p>
                    <p className="text-[11px] text-brand-black/40 mt-1">
                      Pick a buy and sell channel — prefilled with live prices you can override — then add your fee, shipping and holding cost.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
        );
      })()}

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
          
          <div className="relative bg-brand-white border-2 border-terminal-border-strong w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-modal animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 bg-brand-white border-b-2 border-terminal-border-strong px-4 md:px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-bold uppercase tracking-wide text-brand-black">Source Options</h2>
                <p className="text-xs text-brand-black/60 mt-1">Size: {selectedSize}</p>
              </div>
              <button
                onClick={() => setShowBuyModal(false)}
                className="w-10 h-10 flex items-center justify-center border-2 border-brand-gray hover:border-terminal-border-strong hover:bg-brand-gray/10 transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Sentria Network - Priority */}
              {tradeListings.length > 0 && (
                <div className="border-2 border-up/40 bg-up/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-up animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-brand-black">Sentria Network</h3>
                    <span className="text-xs text-brand-black/60">({tradeListings.length} seller{tradeListings.length > 1 ? 's' : ''})</span>
                  </div>
                  <p className="text-xs text-brand-black/60 mb-4">Connect directly with verified sellers on Sentria</p>
                  
                  <div className="space-y-2">
                    {tradeListings.map((listing) => (
                      <div key={listing.id} className="bg-terminal-surface border border-brand-gray/30 p-3 hover:border-terminal-border-strong transition-colors">
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
                            <p className="text-xl font-mono-numeric font-bold text-up">
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
                                    toast.warning('Please sign in to request introductions');
                                  }
                                }}
                                className="mt-2 px-3 py-1.5 bg-up text-terminal-bg text-xs font-semibold uppercase tracking-wide hover:bg-up/90 transition-all whitespace-nowrap"
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
                    {(buyModalExpandWhatsapp ? whatsappPrices.buy : whatsappPrices.buy.slice(0, 3)).map((price, idx) => (
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
                                toast.info(`Contact ${price.sellerName || 'seller'} via ${price.source || 'WhatsApp group'}`);
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
                  {whatsappPrices.buy.length > 3 && (
                    <button
                      onClick={() => setBuyModalExpandWhatsapp(!buyModalExpandWhatsapp)}
                      className="mt-2 w-full py-2 text-xs font-semibold text-brand-black/70 hover:text-brand-black border border-brand-gray/20 hover:border-terminal-border-strong transition-colors bg-terminal-surface"
                    >
                      {buyModalExpandWhatsapp ? 'Show less' : `Show all ${whatsappPrices.buy.length} sellers`}
                    </button>
                  )}
                  <p className="text-xs text-brand-black/40 mt-3">Contact sellers via their WhatsApp groups</p>
                </div>
              )}

              {/* Indian Marketplaces */}
              {marketplacePrices.length > 0 && (
                <div className="border border-brand-gray/30 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-3">Indian Marketplaces</h3>
                  <p className="text-xs text-brand-black/60 mb-4">Available on resale platforms</p>
                  
                  <div className="space-y-2">
                    {(buyModalExpandMarketplace ? marketplacePrices : marketplacePrices.slice(0, 3)).map((price, idx) => (
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
                  {marketplacePrices.length > 3 && (
                    <button
                      onClick={() => setBuyModalExpandMarketplace(!buyModalExpandMarketplace)}
                      className="mt-2 w-full py-2 text-xs font-semibold text-brand-black/70 hover:text-brand-black border border-brand-gray/20 hover:border-terminal-border-strong transition-colors bg-terminal-surface"
                    >
                      {buyModalExpandMarketplace ? 'Show less' : `Show all ${marketplacePrices.length} listings`}
                    </button>
                  )}
                </div>
              )}

              {/* International */}
              {internationalPrices.length > 0 && (
                <div className="border border-brand-gray/30 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-black mb-3">International (StockX, GOAT)</h3>
                  <p className="text-xs text-brand-black/60 mb-4">Includes platform fees (processing + shipping)</p>
                  
                  <div className="space-y-2">
                    {(buyModalExpandIntl ? internationalPrices : internationalPrices.slice(0, 2)).map((price, idx) => {
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-brand-background border border-brand-gray/20 group relative">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-brand-black">
                              {price.source || 'International'}
                            </p>
                            {price.priceUsd != null && (
                              <p className="text-xs text-brand-black/60">
                                ${price.priceUsd} USD + fees
                              </p>
                            )}
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
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
                        </div>
                      );
                    })}
                  </div>
                  {internationalPrices.length > 2 && (
                    <button
                      onClick={() => setBuyModalExpandIntl(!buyModalExpandIntl)}
                      className="mt-2 w-full py-2 text-xs font-semibold text-brand-black/70 hover:text-brand-black border border-brand-gray/20 hover:border-terminal-border-strong transition-colors bg-terminal-surface"
                    >
                      {buyModalExpandIntl ? 'Show less' : `Show all ${internationalPrices.length} listings`}
                    </button>
                  )}
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
            loadTradeListings();
          }}
          toast={toast}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
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
  toast: { success: (msg: string) => void; error: (msg: string) => void; info: (msg: string) => void; warning: (msg: string) => void };
}

const SellModalContent: React.FC<SellModalContentProps> = ({
  asset,
  selectedSize,
  currentUser,
  portfolioPositions,
  bestPrice,
  onClose,
  onSuccess,
  toast,
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
      toast.warning('Please sign in to list items');
      return;
    }

    if (!askingPrice || parseFloat(askingPrice) <= 0) {
      toast.warning('Please enter a valid price');
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
        toast.success('Listing created! Buyers can now find your item.');
        onSuccess();
      } else {
        toast.error('Failed to create listing: ' + result.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 animate-fade-in backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-brand-white border-2 border-terminal-border-strong w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-modal animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-brand-white border-b-2 border-terminal-border-strong px-4 md:px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold uppercase tracking-wide text-brand-black">Post a Listing</h2>
            <p className="text-xs text-brand-black/60 mt-1">Size: {selectedSize}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border-2 border-brand-gray hover:border-terminal-border-strong hover:bg-brand-gray/10 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Portfolio Status */}
          {userPosition ? (
            <div className="border-l-4 border-up/40 bg-up/10 p-4">
              <p className="text-sm font-semibold text-up mb-2">✓ You own this item</p>
              <p className="text-xs text-up">
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
                className="w-full pl-8 pr-3 py-3 border border-brand-gray/30 text-sm focus:outline-none focus:border-terminal-border-strong"
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
              className="w-full px-3 py-3 border border-brand-gray/30 text-sm focus:outline-none focus:border-terminal-border-strong"
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Condition *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['new', 'used'] as const).map((cond) => (
                <button
                  key={cond}
                  onClick={() => setCondition(cond)}
                  className={`px-4 py-2.5 border text-xs font-semibold uppercase tracking-wide transition-all ${
                    condition === cond
                      ? 'border-terminal-border-strong bg-terminal-surface-raised text-terminal-text'
                      : 'border-brand-gray text-brand-black hover:bg-brand-gray/10'
                  }`}
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
              className="w-full px-3 py-3 border border-brand-gray/30 text-sm focus:outline-none focus:border-terminal-border-strong resize-none"
            />
            <p className="text-xs text-brand-black/60 mt-1">{description.length}/500 characters</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-brand-gray/30">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-brand-gray text-sm font-semibold uppercase tracking-wide text-brand-black hover:bg-brand-gray/10 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !askingPrice || parseFloat(askingPrice) <= 0}
              className="flex-1 px-6 py-3 bg-accent text-terminal-bg text-sm font-semibold uppercase tracking-wide hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
