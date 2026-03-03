import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Asset, SizeVariant, PricePoint, MarketChannel, PortfolioPosition, TradeListing } from "../types";
import { SizeSelector } from "./SizeSelector";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { OrderBook } from "./OrderBook";
import { ConnectionRequestModal } from "./ConnectionRequestModal";
import { createConnectionRequest, getAssetListings, createTradeListing } from "../utils/connectionsApi";
import { User } from "firebase/auth";

interface AssetDetailPanelProps {
  asset: Asset | undefined;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
  isLoading?: boolean;
  currentUser?: User | null;
  portfolioPositions?: PortfolioPosition[]; // For sell auto-fill
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  infoTooltip?: string; // Optional tooltip for additional context
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  listingCount?: number;
  bestPrice?: number;
  onViewAll?: () => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  infoTooltip,
  defaultOpen = true,
  children,
  className = "",
  listingCount,
  bestPrice,
  onViewAll,
}) => {
  // Create a unique key for localStorage based on section title
  const storageKey = `collapsible_${title.replace(/\s+/g, '_').toLowerCase()}`;
  
  // Load initial state from localStorage or use default
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'true' : defaultOpen;
  });

  // Save to localStorage when state changes
  const toggleSection = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem(storageKey, String(newState));
  };

  return (
    <div className={`w-full border border-brand-gray/20 bg-brand-white ${className}`} style={{ borderRadius: '0px' }}>
      <button
        onClick={toggleSection}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSection();
          }
        }}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${title}`}
        className="w-full p-3 flex items-center justify-between hover:bg-brand-gray/5 transition-all duration-200 min-h-[44px]"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide leading-tight">
              {title}
            </h3>
            {/* Info tooltip icon */}
            {infoTooltip && (
              <div className="group relative">
                <svg 
                  className="w-4 h-4 text-brand-gray-dark hover:text-brand-black transition-colors cursor-help" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {/* Tooltip */}
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-brand-black text-white text-xs leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-dropdown" style={{ borderRadius: '0px' }}>
                  {infoTooltip}
                  <div className="absolute left-2 top-full border-4 border-transparent border-t-brand-black"></div>
                </div>
              </div>
            )}
            {/* Listing Count Badge */}
            {listingCount !== undefined && listingCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-gray/20 text-brand-black/70 leading-tight">
                {listingCount}
              </span>
            )}
            {/* Best Price Indicator */}
            {bestPrice !== undefined && bestPrice > 0 && (
              <span className="text-xs font-mono-numeric font-medium text-green-600 leading-tight">
                ₹{bestPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-brand-black/60 mt-0.5 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View All Button (if provided) */}
          {onViewAll && listingCount !== undefined && listingCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewAll();
              }}
              className="px-2 py-1 text-xs font-medium text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10 transition-all duration-200 leading-tight"
              style={{ borderRadius: '0px' }}
            >
              View All
            </button>
          )}
          <svg
            className={`w-4 h-4 text-brand-black/40 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-2 border-t border-brand-gray/20 bg-brand-background/30">
          {children}
        </div>
      )}
    </div>
  );
};

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
  <div className="p-4 bg-brand-white border border-brand-gray/20 shadow-sm" style={{ borderRadius: '0px' }}>
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
  <div className="aspect-square w-full max-w-xs bg-brand-gray/10 border border-brand-gray/20 relative overflow-hidden" style={{ borderRadius: '0px' }}>
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
    <div className={`border-l-4 ${getChannelColor(listing.channel)} p-4 mb-3`} style={{ borderRadius: '0px' }}>
      {/* Header: Channel + Side + Price */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-black">
            {listing.channel}
          </span>
          <span className={`px-2 py-1 text-xs font-semibold uppercase border ${getSideColor(listing.side)}`} style={{ borderRadius: '0px' }}>
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
          style={{ borderRadius: '0px' }}
        >
          {listing.side === 'Sell' ? 'Sell To' : 'Buy From'} →
        </button>
      )}
    </div>
  );
};

// Mobile Card View for Arbitrage Opportunities
interface ArbitrageCardProps {
  opportunity: {
    buy: { 
      channel: string; 
      source: string; 
      allIn: number; 
      price: number;
      count?: number;
    };
    sell: { 
      channel: string; 
      source: string; 
      net?: number;
      price: number;
      count?: number;
    };
    netProfit: number;
    netPct: number;
  };
}

const ArbitrageCard: React.FC<ArbitrageCardProps> = ({ opportunity }) => {
  const roiPct = opportunity.netPct * 100;
  
  return (
    <div className="border-2 border-brand-gray/30 bg-white p-4 mb-3" style={{ borderRadius: '0px' }}>
      {/* ROI Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase text-brand-black/60">Arbitrage Opportunity</span>
        <span className={`px-3 py-1 text-sm font-bold ${
          roiPct >= 10 ? 'bg-green-600' : roiPct >= 5 ? 'bg-yellow-500' : 'bg-brand-gray'
        } text-white`} style={{ borderRadius: '0px' }}>
          {roiPct.toFixed(1)}% ROI
        </span>
      </div>

      {/* Buy → Sell Flow */}
      <div className="space-y-3">
        {/* Buy Section */}
        <div className="bg-green-50 border border-green-200 p-3" style={{ borderRadius: '0px' }}>
          <div className="text-xs text-brand-black/60 uppercase mb-1 font-semibold">Buy From</div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-semibold text-brand-black">
              {opportunity.buy.channel === 'International' ? 'Intl' : opportunity.buy.channel}
            </div>
            <div className="text-xl font-mono-numeric font-bold text-green-700">
              ₹{opportunity.buy.allIn.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-xs text-brand-black/60 mt-1">
            {opportunity.buy.source} {opportunity.buy.count && `• ${opportunity.buy.count} available`}
          </div>
          {opportunity.buy.allIn !== opportunity.buy.price && (
            <div className="text-xs text-brand-black/50 mt-0.5">
              Base: ₹{opportunity.buy.price.toLocaleString('en-IN')}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="text-center text-2xl text-brand-black/40 font-bold">↓</div>

        {/* Sell Section */}
        <div className="bg-blue-50 border border-blue-200 p-3" style={{ borderRadius: '0px' }}>
          <div className="text-xs text-brand-black/60 uppercase mb-1 font-semibold">Sell To</div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-semibold text-brand-black">
              {opportunity.sell.channel === 'Marketplace' ? 'Marketplace' : opportunity.sell.channel}
            </div>
            <div className="text-xl font-mono-numeric font-bold text-blue-700">
              ₹{(opportunity.sell.net || opportunity.sell.price).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-xs text-brand-black/60 mt-1">
            {opportunity.sell.source} {opportunity.sell.count && `• ${opportunity.sell.count} needed`}
          </div>
          {opportunity.sell.net && opportunity.sell.net !== opportunity.sell.price && (
            <div className="text-xs text-brand-black/50 mt-0.5">
              Gross: ₹{opportunity.sell.price.toLocaleString('en-IN')}
            </div>
          )}
        </div>

        {/* Profit Summary */}
        <div className={`${
          roiPct >= 10 ? 'bg-green-600' : roiPct >= 5 ? 'bg-yellow-500' : 'bg-brand-gray'
        } text-white p-3 text-center`} style={{ borderRadius: '0px' }}>
          <div className="text-xs uppercase mb-1 font-semibold">Net Profit</div>
          <div className="text-2xl font-mono-numeric font-bold">
            ₹{opportunity.netProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-xs mt-1 opacity-90">
            Return on Investment: {roiPct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
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
  const [activeScrollSection, setActiveScrollSection] = useState<string>("");
  const [sortBy, setSortBy] = useState<'price' | 'quantity' | 'newest'>('price');
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [unifiedChannelFilter, setUnifiedChannelFilter] = useState<'all' | 'WhatsApp' | 'Marketplace' | 'International'>('all');
  const [unifiedSideFilter, setUnifiedSideFilter] = useState<'all' | 'Buy' | 'Sell' | 'Listing'>('all');
  const [minArbNetPct, setMinArbNetPct] = useState(0.03); // 3%
  const [minArbNetRs, setMinArbNetRs] = useState(0);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionTarget, setConnectionTarget] = useState<{userId: string; email: string; name?: string} | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [tradeListings, setTradeListings] = useState<TradeListing[]>([]);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Exchange-style expandable sections
  const [showAllListings, setShowAllListings] = useState(false);
  const [showAllArbitrage, setShowAllArbitrage] = useState(false);

  // Section navigation items
  const sections = [
    { id: 'price-history', label: 'Price History' },
    { id: 'order-book', label: 'Order Book' },
    { id: 'listings', label: 'Listings' },
    { id: 'arbitrage', label: 'Arbitrage' },
    { id: 'performance', label: 'Performance' },
    { id: 'insight', label: 'Insight' },
  ];

  // Memoized scroll handler with requestAnimationFrame throttling
  const handleScroll = useCallback(() => {
    let ticking = false;
    
    if (!ticking) {
      requestAnimationFrame(() => {
        // Find the scrollable container (detail panel or window)
        const container = document.querySelector('.overflow-y-auto') || window;
        const scrollTop = container === window 
          ? window.scrollY 
          : (container as HTMLElement).scrollTop;
        const scrollPosition = scrollTop + 250; // Offset for sticky nav
        
        for (const section of sections) {
          const element = sectionRefs.current[section.id];
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + scrollTop;
            const elementBottom = elementTop + rect.height;
            
            if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
              setActiveScrollSection(section.id);
              break;
            }
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  }, [sections]);

  // Scroll spy to highlight active section
  useEffect(() => {
    // Listen to both window and container scroll
    const container = document.querySelector('.overflow-y-auto');
    window.addEventListener('scroll', handleScroll, { passive: true });
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    handleScroll(); // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [asset, handleScroll]);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      // Use offset for better positioning (account for sticky nav on desktop, mobile nav on mobile)
      const yOffset = window.innerWidth >= 768 ? -80 : -20;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      // Enhanced smooth scroll with better behavior
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      // Fallback for better browser support
      setTimeout(() => {
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 0);
    }
  };

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
    channel: 'WhatsApp' | 'Marketplace' | 'International';
    side: 'Buy' | 'Sell' | 'Listing';
    price: number;
    landedPrice?: number; // For international (price + reshipping)
    listingCount: number;
    sourceLabel: string;
    location?: string;
    lastSeen?: Date | string;
    url?: string;
    contactType?: 'whatsapp' | 'link';
    contactValue?: string;
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

    // Sort primarily by landed / price ascending, then by channel for readability
    return rows.sort((a, b) => {
      const aPrice = a.landedPrice ?? a.price;
      const bPrice = b.landedPrice ?? b.price;
      if (aPrice !== bPrice) return aPrice - bPrice;
      if (a.channel !== b.channel) return a.channel.localeCompare(b.channel);
      if (a.side !== b.side) return a.side.localeCompare(b.side);
      return (b.listingCount || 0) - (a.listingCount || 0);
    });
  }, [whatsappPrices.buy, whatsappPrices.sell, marketplacePrices, internationalPrices]);

  // Arbitrage opportunities scoped to this asset + selected size
  const MARKETPLACE_FEE = 0.085; // default midpoint of 7-10%
  const INTL_RESHIPPING_FALLBACK = 10000; // ₹10k flat if missing

  type ArbSide = {
    channel: 'WhatsApp' | 'Marketplace' | 'International';
    source: string;
    price: number;
    allIn: number; // buy side all-in
    net?: number; // sell side net after fees
    count?: number;
  };

  const arbitrageOpps = useMemo(() => {
    if (!asset) return [];
    const opps: {
      buy: ArbSide;
      sell: ArbSide;
      netProfit: number;
      netPct: number;
    }[] = [];

    const buyPool: ArbSide[] = [];
    const sellPool: ArbSide[] = [];

    // Helper to convert MarketChannel to display format, with fallback based on array context
    const getChannelDisplay = (channel: MarketChannel | undefined, fallback: 'WhatsApp' | 'Marketplace' | 'International'): 'WhatsApp' | 'Marketplace' | 'International' => {
      if (channel) {
        switch (channel) {
          case 'whatsapp':
            return 'WhatsApp';
          case 'marketplace':
            return 'Marketplace';
          case 'international':
            return 'International';
        }
      }
      // Fallback to context-based channel if channel property not set
      return fallback;
    };

    // Buy pools - use the channel from PricePoint, with fallback based on array context
    whatsappPrices.buy.forEach((p) =>
      buyPool.push({
        channel: getChannelDisplay(p.channel, 'WhatsApp'),
        source: p.sellerName || p.source || 'WhatsApp',
        price: p.price,
        allIn: p.price,
        count: p.listingCount,
      })
    );
    marketplacePrices.forEach((p) =>
      buyPool.push({
        channel: getChannelDisplay(p.channel, 'Marketplace'),
        source: p.marketplaceName || p.source || 'Marketplace',
        price: p.price,
        allIn: p.price,
        count: p.listingCount,
      })
    );
    internationalPrices.forEach((p) => {
      const landed = p.price + (p.reshippingCost ?? INTL_RESHIPPING_FALLBACK);
      buyPool.push({
        channel: getChannelDisplay(p.channel, 'International'),
        source: p.marketplaceName || p.source || 'International',
        price: p.price,
        allIn: landed,
        count: p.listingCount,
      });
    });

    // Sell pools - use the channel from PricePoint, with fallback based on array context
    whatsappPrices.sell.forEach((p) =>
      sellPool.push({
        channel: getChannelDisplay(p.channel, 'WhatsApp'),
        source: p.sellerName || p.source || 'WhatsApp',
        price: p.price,
        allIn: p.price,
        net: p.price, // no fee
        count: p.listingCount,
      })
    );
    marketplacePrices.forEach((p) =>
      sellPool.push({
        channel: getChannelDisplay(p.channel, 'Marketplace'),
        source: p.marketplaceName || p.source || 'Marketplace',
        price: p.price,
        allIn: p.price,
        net: p.price * (1 - MARKETPLACE_FEE),
        count: p.listingCount,
      })
    );

    buyPool.forEach((buy) => {
      sellPool.forEach((sell) => {
        // avoid identical pair
        if (
          buy.channel === sell.channel &&
          buy.price === sell.price &&
          buy.source === sell.source
        ) {
          return;
        }
        const sellNet = sell.net ?? sell.price;
        const netProfit = sellNet - buy.allIn;
        const netPct = netProfit / buy.allIn;
        if (netProfit < minArbNetRs) return;
        if (netPct < minArbNetPct) return;
        opps.push({ buy, sell, netProfit, netPct });
      });
    });

    return opps
      .sort((a, b) => (b.netPct !== a.netPct ? b.netPct - a.netPct : b.netProfit - a.netProfit))
      .slice(0, 50);
  }, [asset, marketplacePrices, whatsappPrices.buy, whatsappPrices.sell, internationalPrices, minArbNetPct, minArbNetRs]);

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
    <section className="p-3 md:p-4 space-y-4 text-brand-black bg-brand-white relative overflow-x-hidden">
      {/* Sticky Section Navigation - Desktop Only - more compact */}
      <div className="hidden md:block sticky top-0 z-10 bg-brand-white border-b border-brand-gray/10 mb-3 -mx-3 md:-mx-4 px-3 md:px-4 py-1">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] text-brand-black/60 uppercase tracking-wide flex-shrink-0">Jump to:</span>
          {sections.map((section) => {
            // Skip sections that don't exist
            if (section.id === 'insight' && !currentData.insight) return null;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-all whitespace-nowrap leading-tight active:scale-95 ${
                  activeScrollSection === section.id
                    ? "bg-brand-black text-white"
                    : "bg-brand-gray/10 text-brand-black/70 hover:bg-brand-gray/20"
                }`}
                style={{ borderRadius: '0px' }}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Floating Jump to Button - Enhanced */}
      <div className="md:hidden fixed bottom-20 right-4 z-30 mobile-nav-container">
        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          className="w-14 h-14 bg-brand-black text-white flex items-center justify-center shadow-xl hover:bg-brand-black/90 hover:scale-105 active:scale-95 transition-all relative group"
          style={{ borderRadius: '0px' }}
          aria-label={showMobileNav ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={showMobileNav}
          title={showMobileNav ? "Close menu" : "Jump to section"}
        >
          {showMobileNav ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        
        {/* Mobile Navigation Menu */}
        {showMobileNav && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 z-[-1]"
              onClick={() => setShowMobileNav(false)}
            />
            {/* Menu */}
            <div className="absolute bottom-14 right-0 w-48 bg-brand-white border border-brand-gray/20 shadow-xl mb-2">
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {sections.map((section) => {
                  if (section.id === 'insight' && !currentData.insight) return null;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        scrollToSection(section.id);
                        setShowMobileNav(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium uppercase tracking-wide transition-all active:scale-95 ${
                        activeScrollSection === section.id
                          ? "bg-brand-black text-white"
                          : "bg-brand-white text-brand-black/70 hover:bg-brand-gray/10"
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* HERO SECTION - Enhanced with primary CTA */}
      <div className="border border-brand-gray/30 bg-brand-white shadow-card mb-4 md:-mx-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 p-4 md:p-6">
          {/* Large Image */}
          <div className="md:col-span-2">
            <div className="aspect-square w-full bg-brand-gray/5 border-2 border-brand-gray flex items-center justify-center" style={{ borderRadius: '0px' }}>
              {asset.image ? (
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
          <div className="md:col-span-3 space-y-4">
            {/* Asset Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2 leading-tight">
                {asset.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-brand-black/70">
                <span className="font-semibold text-base">{asset.brand}</span>
                <span>·</span>
                <span>SKU {asset.sku}</span>
              </div>
            </div>

            {/* Size Selector - MOVED TO TOP for better UX */}
            {asset.sizes && asset.sizes.length > 0 && (
              <div className="w-full">
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2 font-semibold">Select Size:</p>
                <SizeSelector
                  asset={asset}
                  selectedSize={selectedSize}
                  onSizeChange={setSelectedSize}
                />
              </div>
            )}

            {/* Quick Decision Card - Key Metrics at a Glance */}
            <div className="bg-brand-background border border-brand-gray/30 p-4" style={{ borderRadius: '0px' }}>
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 font-semibold">Best Price</p>
                  <p className="text-3xl md:text-4xl font-mono-numeric font-bold text-green-600 leading-tight">
                    {bestPrice ? `₹${bestPrice.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
                {bestPrice && anchor?.retailIndia && (
                  <div className="text-right">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">vs Retail</p>
                    <p className={`text-xl font-mono-numeric font-bold leading-tight ${
                      bestPrice < anchor.retailIndia ? "text-green-600" : "text-red-600"
                    }`}>
                      {bestPrice < anchor.retailIndia ? "-" : "+"}
                      {Math.abs(((bestPrice - anchor.retailIndia) / anchor.retailIndia) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
              
              {/* Quick Stats Row with Icons */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-brand-gray/30">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-brand-black/60 mb-1">
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
                  <div className="flex items-center justify-center gap-1 text-xs text-brand-black/60 mb-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Liquidity</span>
                  </div>
                  <p className="text-sm font-semibold text-brand-black">{currentData.liquidity || "—"}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-brand-black/60 mb-1">
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

            {/* Confidence & Liquidity Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Confidence Meter */}
              {currentData.confidence !== undefined && currentData.confidence > 0 && (
                <div className="border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase text-brand-black/70 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Confidence
                    </span>
                    <span className="text-sm font-bold">{currentData.confidence}%</span>
                  </div>
                  <div className="w-full bg-brand-gray/20 h-2 overflow-hidden" style={{ borderRadius: '0px' }}>
                    <div 
                      className="h-full bg-green-600 transition-all duration-300"
                      style={{ width: `${currentData.confidence}%` }}
                    />
                  </div>
                  <p className="text-xs text-brand-black/60 mt-2">
                    Market-derived from cross-venue consistency
                  </p>
                </div>
              )}

              {/* Liquidity Meter */}
              {(() => {
                // Parse liquidity to numeric if it's not already
                const liquidityStr = currentData.liquidity || "";
                const liquidityNum = typeof liquidityStr === 'number' ? liquidityStr : 
                  liquidityStr === "High" ? 80 :
                  liquidityStr === "Medium" ? 50 :
                  liquidityStr === "Low" ? 30 : 0;
                
                if (liquidityNum === 0) return null;
                
                return (
                  <div className="border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase text-brand-black/70 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Liquidity
                      </span>
                      <span className="text-sm font-bold">{liquidityStr}</span>
                    </div>
                    <div className="w-full bg-brand-gray/20 h-2 overflow-hidden" style={{ borderRadius: '0px' }}>
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${liquidityNum}%` }}
                      />
                    </div>
                    <p className="text-xs text-brand-black/60 mt-2">
                      How reliably this asset clears at market
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Transparency Indicators */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-brand-black/60">
              {/* Channel Breakdown */}
              {(() => {
                const activeChannels = [];
                if (whatsappPrices.buy.length > 0 || whatsappPrices.sell.length > 0) activeChannels.push('WhatsApp');
                if (marketplacePrices.length > 0) activeChannels.push('Marketplace');
                if (internationalPrices.length > 0) activeChannels.push('International');
                
                if (activeChannels.length === 0) return null;
                
                return (
                  <div className="flex items-center gap-1.5">
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
                  <div className="flex items-center gap-1.5">
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
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Updated {timeAgo}</span>
                  </div>
                );
              })()}
            </div>

            {/* Exchange-Like Buy/Sell CTAs - PROMINENT */}
            <div className="grid grid-cols-2 gap-3">
              {/* BUY NOW Button */}
              <button
                onClick={() => setShowBuyModal(true)}
                className="relative bg-green-600 hover:bg-green-700 text-white px-6 py-5 transition-all duration-200 active:scale-[0.98] group overflow-hidden"
                style={{ borderRadius: '0px' }}
              >
                <div className="relative z-10">
                  <div className="text-[10px] opacity-90 uppercase tracking-wider mb-1 font-semibold">Best Available</div>
                  <div className="text-2xl md:text-3xl font-mono-numeric font-bold leading-tight mb-1">
                    {bestPrice ? `₹${bestPrice.toLocaleString("en-IN")}` : "—"}
                  </div>
                  <div className="text-xs opacity-90 font-semibold uppercase tracking-wide">
                    BUY NOW →
                  </div>
                </div>
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* SELL Button */}
              <button
                onClick={() => setShowSellModal(true)}
                className="relative bg-white hover:bg-brand-gray-light border-2 border-brand-black text-brand-black px-6 py-5 transition-all duration-200 active:scale-[0.98] group"
                style={{ borderRadius: '0px' }}
              >
                <div className="relative z-10">
                  <div className="text-[10px] opacity-60 uppercase tracking-wider mb-1 font-semibold">
                    {tradeListings.length > 0 ? `${tradeListings.length} Seller${tradeListings.length > 1 ? 's' : ''}` : 'List Your Item'}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold leading-tight mb-1">
                    SELL
                  </div>
                  <div className="text-xs opacity-60 font-semibold uppercase tracking-wide">
                    {bestPrice ? `Avg: ₹${Math.round(bestPrice * 1.05).toLocaleString("en-IN")}` : 'Set Price'}
                  </div>
                </div>
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onToggleWatchlist}
                className={`flex-1 min-w-[100px] px-3 py-2 border text-xs font-semibold uppercase tracking-wide transition-all duration-200 active:scale-95 ${
                  watchlisted
                    ? "border-brand-gray bg-brand-black text-brand-white hover:bg-brand-black/90"
                    : "border-brand-gray text-brand-black hover:bg-brand-gray/10"
                }`}
                style={{ borderRadius: '0px' }}
              >
                <span className="mr-1">{watchlisted ? "★" : "☆"}</span>
                {watchlisted ? "Watching" : "Watch"}
              </button>
              <button
                onClick={() => scrollToSection('listings')}
                className="flex-1 min-w-[100px] px-3 py-2 border border-brand-gray text-xs font-semibold uppercase tracking-wide text-brand-black hover:bg-brand-gray/10 transition-all duration-200 active:scale-95"
                style={{ borderRadius: '0px' }}
              >
                View All Suppliers
              </button>
              <button
                onClick={() => alert('Price alerts coming soon!')}
                className="px-3 py-2 border border-brand-gray text-xs font-semibold text-brand-black hover:bg-brand-gray/10 transition-all duration-200 active:scale-95"
                style={{ borderRadius: '0px' }}
                title="Set price alert"
              >
                🔔 Alert
              </button>
            </div>
          </div>
        </div>

        {/* Price Comparison Bar - Visual context */}
        {bestPrice && anchor?.retailIndia && (
          <div className="px-4 md:px-6 pb-4">
            <div className="bg-brand-background border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
              <div className="flex items-center justify-between text-xs text-brand-black/60 mb-2">
                <span className="font-semibold">Best: ₹{bestPrice.toLocaleString("en-IN")}</span>
                <span className="font-semibold">Retail: ₹{anchor.retailIndia.toLocaleString("en-IN")}</span>
              </div>
              <div className="relative h-2 bg-brand-gray/20" style={{ borderRadius: '0px' }}>
                <div 
                  className={`absolute h-full ${
                    bestPrice < anchor.retailIndia ? "bg-green-600" : "bg-red-600"
                  }`}
                  style={{ 
                    width: `${Math.min((bestPrice / anchor.retailIndia) * 100, 100)}%`,
                    borderRadius: '0px'
                  }}
                />
              </div>
              <p className="text-xs text-center mt-2 font-medium">
                {bestPrice < anchor.retailIndia ? (
                  <span className="text-green-600">
                    ₹{(anchor.retailIndia - bestPrice).toLocaleString("en-IN")} below retail — Great deal!
                  </span>
                ) : bestPrice > anchor.retailIndia ? (
                  <span className="text-red-600">
                    ₹{(bestPrice - anchor.retailIndia).toLocaleString("en-IN")} above retail
                  </span>
                ) : (
                  <span className="text-brand-black/60">At retail price</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Platform Disclaimer */}
      <div className="mb-4 md:-mx-4 px-3 md:px-4 py-3 bg-blue-50/50 border-y border-blue-200/50">
        <div className="flex items-start gap-2.5 text-xs text-brand-black/70">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold text-brand-black">Information Aggregator:</span> Intelligence Exchange aggregates pricing data from multiple sources. We are not a marketplace and do not facilitate transactions. Always verify authenticity, seller reputation, and product condition before purchasing. Prices and availability change frequently.
          </div>
        </div>
      </div>

      {/* OLD Unified Metrics Card - REMOVED, now in hero */}
      <div className="hidden bg-brand-white border border-brand-gray/20 p-4 shadow-sm" style={{ borderRadius: '0px' }}>
            {/* Price Section - Most Prominent */}
            <div className="mb-4 pb-4 border-b border-brand-gray/20">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">Best Available Price</p>
                  <p className="text-2xl md:text-3xl font-mono-numeric font-bold text-green-600 leading-tight">
                    {bestPrice ? `₹${bestPrice.toLocaleString("en-IN")}` : "—"}
                  </p>
                </div>
                {bestPrice && anchor?.retailIndia && (
                  <div className="text-right">
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">Retail (India)</p>
                    <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
                      ₹{anchor.retailIndia.toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </div>
            </div>
      </div>

      {/* Price History Chart - Always Visible Card */}
      <div ref={(el) => (sectionRefs.current['price-history'] = el)} className="border border-brand-gray/30 bg-brand-white shadow-card mb-4" style={{ borderRadius: '0px' }}>
        <div className="p-4 border-b border-brand-gray/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Price History
              </h3>
              {(currentData.change30d && currentData.change30d !== "N/A" && 
                currentData.change90d && currentData.change90d !== "N/A") && (
                <p className="text-xs text-brand-black/60 mt-1">
                  30d: {currentData.change30d} • 90d: {currentData.change90d}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-4">
          <PriceHistoryChart
            pricePoints={sizeVariant?.pricePoints || sizeVariant?.legacyPricePoints || asset.pricePoints}
            historical30d={anchor?.historical30d}
            historical90d={anchor?.historical90d}
            bestAvailablePrice={currentData.bestAvailablePrice}
            retailPrice={anchor?.retailIndia}
            size={selectedSize}
          />
        </div>
      </div>

      {/* Price Comparison Card - Decision Support */}
      <div className="bg-brand-white border border-brand-gray/30 p-4 shadow-soft">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-black">Where to Buy: Price Comparison</h3>
            <p className="text-xs text-brand-black/60 mt-1">All-in costs including shipping & fees. Choose the best option for you.</p>
          </div>
          {currentUser && (
            <button
              onClick={() => {
                // For now, use a placeholder seller ID
                setConnectionTarget({ userId: 'marketplace', email: 'seller@marketplace.com', name: 'Marketplace Seller' });
                setShowConnectionModal(true);
              }}
              className="px-3 py-2 border border-brand-gray bg-brand-white text-xs font-semibold uppercase tracking-wide text-brand-black hover:bg-brand-black hover:text-white transition-all whitespace-nowrap"
              style={{ borderRadius: '0px' }}
            >
              Request Introduction
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {/* WhatsApp Channel */}
          {whatsappPrices.buy.length > 0 && (
            <div className="border-l-2 border-green-600 bg-green-50/20 p-3 hover:bg-green-50/30 transition-colors"
>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-brand-black">WhatsApp Network</p>
                  <p className="text-xs text-brand-gray-dark">Direct from sellers • Fast delivery</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-mono-numeric font-bold text-green-600">
                    ₹{whatsappPrices.buy[0].price.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-brand-gray-dark">All-in price</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-4">
                  <span className="text-brand-black/60">Delivery: <span className="font-semibold text-brand-black">2-3 days</span></span>
                  <span className="text-brand-black/60">Sellers: <span className="font-semibold text-brand-black">{whatsappPrices.buy.length}</span></span>
                </div>
                <button
                  onClick={() => scrollToSection('listings')}
                  className="px-2 py-1 bg-brand-black text-white text-xs font-medium hover:bg-brand-black/80 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  View Sellers →
                </button>
              </div>
            </div>
          )}

          {/* Marketplace Channel */}
          {marketplacePrices.length > 0 && (
            <div className="border-l-2 border-blue-600 bg-blue-50/20 p-3 hover:bg-blue-50/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-brand-black">Indian Marketplaces</p>
                  <p className="text-xs text-brand-gray-dark">Verified listings • Buyer protection</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-mono-numeric font-bold text-blue-600">
                    ₹{marketplacePrices[0].price.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-brand-gray-dark">Listed price</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-4">
                  <span className="text-brand-black/60">Delivery: <span className="font-semibold text-brand-black">5-7 days</span></span>
                  <span className="text-brand-black/60">Listings: <span className="font-semibold text-brand-black">{marketplacePrices.length}</span></span>
                </div>
                <button
                  onClick={() => scrollToSection('listings')}
                  className="px-2 py-1 bg-brand-black text-white text-xs font-medium hover:bg-brand-black/80 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  View Listings →
                </button>
              </div>
            </div>
          )}

          {/* International Channel */}
          {internationalPrices.length > 0 && (
            <div className="border-l-2 border-purple-600 bg-purple-50/20 p-3 hover:bg-purple-50/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-brand-black">International Platforms</p>
                  <p className="text-xs text-brand-gray-dark">StockX, GOAT • Authenticity guaranteed</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-mono-numeric font-bold text-purple-600">
                    ₹{(internationalPrices[0].price + (internationalPrices[0].reshippingCost || 0)).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-brand-gray-dark">Incl. shipping</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-4">
                  <span className="text-brand-black/60">Delivery: <span className="font-semibold text-brand-black">10-14 days</span></span>
                  <span className="text-brand-black/60">Listings: <span className="font-semibold text-brand-black">{internationalPrices.length}</span></span>
                </div>
                <button
                  onClick={() => scrollToSection('listings')}
                  className="px-2 py-1 bg-brand-black text-white text-xs font-medium hover:bg-brand-black/80 transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  View Listings →
                </button>
              </div>
            </div>
          )}

          {whatsappPrices.buy.length === 0 && marketplacePrices.length === 0 && internationalPrices.length === 0 && (
            <div className="text-center py-6 text-brand-black/50">
              <p className="text-sm">No listings available for this size</p>
              <p className="text-xs mt-1">Try selecting a different size</p>
            </div>
          )}
        </div>

        {/* Best Deal Indicator */}
        {bestPrice && (
          <div className="mt-4 pt-4 border-t border-brand-gray/30 text-center">
            <p className="text-xs text-brand-black/60 mb-1">Best Overall Deal</p>
            <p className="text-lg font-mono-numeric font-bold text-green-600">
              ₹{bestPrice.toLocaleString("en-IN")}
              {anchor?.retailIndia && bestPrice < anchor.retailIndia && (
                <span className="text-sm text-green-600/80 ml-2">
                  (Save ₹{(anchor.retailIndia - bestPrice).toLocaleString("en-IN")})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Order Book - Exchange-style depth visualization */}
      <div ref={(el) => (sectionRefs.current['order-book'] = el)}>
        <CollapsibleSection
          title="Order Book"
          infoTooltip="Shows aggregated buy (bid) and sell (ask) orders at each price level. Depth bars indicate quantity available. Tight spread = liquid market."
          defaultOpen={false}
        >
          <OrderBook
            whatsappBuyPrices={whatsappPrices.buy}
            whatsappSellPrices={whatsappPrices.sell}
            marketplacePrices={marketplacePrices}
            internationalPrices={internationalPrices}
        />
      </CollapsibleSection>
      </div>

      {/* Best 3 Deals Card - Always Visible */}
      {unifiedListings.length > 0 && (() => {
        const buyListings = unifiedListings.filter(listing => listing.side === 'Buy');
        const top3Deals = [...buyListings]
          .sort((a, b) => {
            const aPrice = a.landedPrice ?? a.price;
            const bPrice = b.landedPrice ?? b.price;
            return aPrice - bPrice;
          })
          .slice(0, 3);

        if (top3Deals.length === 0) return null;

        return (
          <div className="border border-brand-gray/30 bg-brand-white shadow-card mb-4" style={{ borderRadius: '0px' }}>
            <div className="p-4 border-b border-brand-gray/20">
              <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Best Deals Right Now
              </h3>
              <p className="text-xs text-brand-black/60 mt-1">Lowest prices across all channels</p>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3Deals.map((deal, idx) => {
                const channelColor = 
                  deal.channel === 'WhatsApp' ? 'border-green-600 bg-green-50' :
                  deal.channel === 'Marketplace' ? 'border-blue-600 bg-blue-50' :
                  'border-purple-600 bg-purple-50';
                
                return (
                  <div key={idx} className={`border-l-4 ${channelColor} p-3 relative`} style={{ borderRadius: '0px' }}>
                    {idx === 0 && (
                      <div className="absolute -top-2 -left-2 bg-yellow-400 text-brand-black px-2 py-0.5 text-xs font-bold">
                        #1 BEST
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs font-semibold uppercase text-brand-black/70">{deal.channel}</div>
                      <div className="text-2xl font-mono-numeric font-bold text-brand-black leading-tight">
                        ₹{(deal.landedPrice ?? deal.price).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-xs text-brand-black/60 mb-1 truncate">{deal.sourceLabel}</div>
                    <div className="text-xs text-brand-black/50">
                      {deal.listingCount} available{deal.location && ` • ${deal.location}`}
                    </div>
                    {deal.contactType && deal.contactValue && (
                      <button
                        onClick={() => {
                          if (!deal.contactValue) return;
                          if (deal.contactType === 'whatsapp') {
                            window.open(`https://wa.me/${deal.contactValue.replace(/[^0-9]/g, '')}`, '_blank');
                          } else {
                            window.open(deal.contactValue, '_blank');
                          }
                        }}
                        className="mt-3 w-full px-3 py-2 bg-brand-black text-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-all"
                        style={{ borderRadius: '0px' }}
                      >
                        {deal.contactType === 'whatsapp' ? 'Buy via WhatsApp' : 'Buy Now'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowAllListings(!showAllListings)}
                className="w-full px-4 py-3 border-2 border-brand-black text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-black hover:text-white transition-all flex items-center justify-center gap-2"
                style={{ borderRadius: '0px' }}
              >
                {showAllListings ? 'Hide All Listings' : `View All ${unifiedListings.length} Listings`}
                <svg className={`w-4 h-4 transition-transform ${showAllListings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Unified Listings View - Expandable, terminal-style */}
      {unifiedListings.length > 0 && showAllListings && (
        <div ref={(el) => (sectionRefs.current['listings'] = el)} className="border border-brand-gray/30 bg-brand-white shadow-card mb-4" style={{ borderRadius: '0px' }}>
          <div className="p-4 border-b border-brand-gray/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide">All Listings (Across Channels)</h3>
              <button
                onClick={() => setShowAllListings(false)}
                className="text-brand-black/60 hover:text-brand-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4">
            {/* Enhanced Filters */}
            <div className="space-y-2 mb-3">
              {/* Mobile: Collapsible Filter Button */}
              {isMobile && (
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="w-full px-4 py-3 border-2 border-brand-black bg-white text-sm font-semibold uppercase tracking-wide flex items-center justify-between hover:bg-brand-gray/5 transition-all min-h-[44px]"
                  style={{ borderRadius: '0px' }}
                >
                  <span>
                    Filters {(unifiedChannelFilter !== 'all' || unifiedSideFilter !== 'all' || filterLocation) ? 
                    '(Active)' : ''}
                  </span>
                  <span className="text-lg">{showMobileFilters ? '▲' : '▼'}</span>
                </button>
              )}

              {/* Filter Controls - Show on desktop OR when mobile filters open */}
              {(!isMobile || showMobileFilters) && (
                <>
              {/* Channel and Side Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">Channel:</span>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'WhatsApp', label: 'WhatsApp' },
                    { key: 'Marketplace', label: 'Marketplace' },
                    { key: 'International', label: 'International' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setUnifiedChannelFilter(
                          opt.key as 'all' | 'WhatsApp' | 'Marketplace' | 'International'
                        )
                      }
                      className={`px-2 py-1 border text-[10px] font-medium uppercase tracking-wide leading-tight transition-colors ${
                        unifiedChannelFilter === opt.key
                          ? 'border-brand-black bg-brand-black text-brand-white'
                          : 'border-brand-gray/30 bg-brand-white text-brand-black hover:border-brand-black hover:bg-brand-gray/5'
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">Side:</span>
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
                      className={`px-2 py-1 border text-[10px] font-medium uppercase tracking-wide leading-tight transition-colors ${
                        unifiedSideFilter === opt.key
                          ? 'border-brand-black bg-brand-black text-brand-white'
                          : 'border-brand-gray/30 bg-brand-white text-brand-black hover:border-brand-black hover:bg-brand-gray/5'
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Location Filter and Sort */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <label className="text-[10px] text-brand-black/60 uppercase tracking-wide whitespace-nowrap">Location:</label>
                  <select
                    value={filterLocation || ''}
                    onChange={(e) => setFilterLocation(e.target.value || null)}
                    className="flex-1 text-xs border border-brand-gray/30 bg-brand-white px-2 py-1 text-brand-black focus:outline-none focus:border-brand-black"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="">All Locations</option>
                    {Array.from(new Set(unifiedListings.map(row => row.location).filter((loc): loc is string => Boolean(loc)))).map((loc: string) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <label className="text-[10px] text-brand-black/60 uppercase tracking-wide whitespace-nowrap">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price' | 'quantity' | 'newest')}
                    className="flex-1 text-xs border border-brand-gray/30 bg-brand-white px-2 py-1 text-brand-black focus:outline-none focus:border-brand-black"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="price">Price: Low to High</option>
                    <option value="quantity">Quantity: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>
                </>
              )}
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
                  <div className="mb-3 flex items-start gap-2 text-xs text-brand-black/60 bg-orange-50/50 border border-orange-200/50 p-2.5" style={{ borderRadius: '0px' }}>
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
                
                // Helper functions for color coding - matching Market Comparison Summary colors
                const getChannelColor = (channel: string) => {
                  switch (channel) {
                    case 'WhatsApp':
                      return { border: 'border-l-green-600', bg: 'bg-green-50/30', text: 'text-green-700' };
                    case 'Marketplace':
                      return { border: 'border-l-blue-600', bg: 'bg-blue-50/30', text: 'text-blue-700' };
                    case 'International':
                      return { border: 'border-l-purple-600', bg: 'bg-purple-50/30', text: 'text-purple-700' };
                    default:
                      return { border: 'border-l-brand-gray/30', bg: '', text: 'text-brand-black/80' };
                  }
                };

                const getSideColor = (side: string) => {
                  switch (side) {
                    case 'Buy':
                      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
                    case 'Sell':
                      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
                    case 'Listing':
                      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
                    default:
                      return { bg: 'bg-brand-gray/10', text: 'text-brand-black/80', border: 'border-brand-gray/20' };
                  }
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
                  // DESKTOP: Table View
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-gray/30 bg-brand-gray/5">
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Channel</th>
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Side</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Price</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Landed</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Qty</th>
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Source</th>
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Location</th>
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Last Seen</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const priceDisplay = row.price ? `₹${row.price.toLocaleString('en-IN')}` : '—';
                    const landedDisplay =
                      row.landedPrice && row.landedPrice !== row.price
                        ? `₹${row.landedPrice.toLocaleString('en-IN')}`
                        : '—';
                    
                    const channelColors = getChannelColor(row.channel);
                    const sideColors = getSideColor(row.side);
                    const isEven = idx % 2 === 0;
                    const isBestDeal = isTopDeal(row, idx);
                    
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-brand-gray/10 border-l-4 ${channelColors.border} ${isEven ? 'bg-brand-white' : 'bg-brand-gray/5'} ${isBestDeal ? 'bg-yellow-50/50' : ''} hover:bg-brand-gray/10 transition-colors relative`}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              row.channel === 'WhatsApp' ? 'bg-green-600' :
                              row.channel === 'Marketplace' ? 'bg-blue-600' :
                              row.channel === 'International' ? 'bg-purple-600' :
                              'bg-brand-gray'
                            }`} />
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${channelColors.bg} ${channelColors.text}`}>
                              {row.channel}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border ${sideColors.bg} ${sideColors.text} ${sideColors.border}`}>
                            {row.side}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric text-brand-black font-semibold">
                          {priceDisplay}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric text-brand-black/80">
                          {landedDisplay}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric text-brand-black/80">
                          {row.listingCount}
                        </td>
                        <td className="px-2 py-1.5 text-brand-black/80 truncate max-w-[120px]">
                          <div className="flex items-center gap-1.5">
                            {isBestDeal && (
                              <span className="text-yellow-500 text-sm" title="Best Deal">⭐</span>
                            )}
                            <span>{row.sourceLabel}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-brand-black/60 truncate max-w-[100px]">
                          {row.location || '—'}
                        </td>
                        <td className="px-2 py-1.5 text-brand-black/60 whitespace-nowrap">
                          {row.lastSeen ? formatLastSeen(row.lastSeen) : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {row.contactType && row.contactValue ? (
                            row.contactType === 'whatsapp' ? (
                              <a
                                href={`https://wa.me/${row.contactValue.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-medium border border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-colors"
                                style={{ borderRadius: '0px' }}
                              >
                                {row.side === 'Sell' ? 'Sell to' : 'Buy from'}
                              </a>
                            ) : (
                              <a
                                href={row.contactValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-medium border border-brand-gray/40 text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-white transition-colors"
                                style={{ borderRadius: '0px' }}
                              >
                                {row.side === 'Sell' ? 'Sell to' : 'Buy from'}
                              </a>
                            )
                          ) : (
                            <span className="text-[10px] text-brand-black/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Arbitrage Opportunities Full Table - Expandable */}
      {showAllArbitrage && (
        <div ref={(el) => (sectionRefs.current['arbitrage'] = el)} className="border border-brand-gray/30 bg-brand-white shadow-card mb-4" style={{ borderRadius: '0px' }}>
          <div className="p-4 border-b border-brand-gray/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  All Arbitrage Opportunities
                </h3>
                <p className="text-xs text-brand-black/60 mt-1">Buy from one channel and sell to another to capture price differences</p>
              </div>
              <button
                onClick={() => setShowAllArbitrage(false)}
                className="text-brand-black/60 hover:text-brand-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4">
          {/* Filters Row */}
          <div className="space-y-2 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-brand-black/60 uppercase tracking-wide">Min ROI</label>
                <input
                  type="number"
                  value={(minArbNetPct * 100).toFixed(1)}
                  onChange={(e) => setMinArbNetPct(Math.max(0, Number(e.target.value) / 100))}
                  className="w-14 border border-brand-gray/30 px-1.5 py-1 text-[10px] text-brand-black font-mono-numeric focus:outline-none focus:border-brand-black bg-brand-white"
                  style={{ borderRadius: '0px' }}
                  step="0.5"
                />
                <span className="text-[10px] text-brand-black/40">%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-brand-black/60 uppercase tracking-wide">Min Profit</label>
                <input
                  type="number"
                  value={minArbNetRs}
                  onChange={(e) => setMinArbNetRs(Math.max(0, Number(e.target.value)))}
                  className="w-16 border border-brand-gray/30 px-1.5 py-1 text-[10px] text-brand-black font-mono-numeric focus:outline-none focus:border-brand-black bg-brand-white"
                  style={{ borderRadius: '0px' }}
                  step="500"
                />
                <span className="text-[10px] text-brand-black/40">₹</span>
              </div>
              <div className="flex-1" />
              <div className="text-[10px] text-brand-black/60 font-medium">
                {arbitrageOpps.length} {arbitrageOpps.length === 1 ? "opportunity" : "opportunities"}
              </div>
            </div>
          </div>

          {/* Fee Disclosure Disclaimer */}
          <div className="mb-3 flex items-start gap-2 text-xs text-brand-black/60 bg-yellow-50/50 border border-yellow-200/50 p-2.5" style={{ borderRadius: '0px' }}>
            <svg className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold text-brand-black">Fee Estimates:</span> Platform fees, shipping costs, and payment charges are estimated. Actual costs may vary. Always verify with the seller before completing transactions.
            </div>
          </div>

          {/* Opportunities Table */}
          {arbitrageOpps.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-brand-gray/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-brand-black/60 mb-1">No opportunities found</p>
              <p className="text-xs text-brand-black/40">Try lowering the minimum filters</p>
            </div>
          ) : isMobile ? (
            // MOBILE: Card View for Arbitrage
            <div className="px-2">
              {arbitrageOpps.map((opp, idx) => (
                <ArbitrageCard
                  key={idx}
                  opportunity={opp}
                />
              ))}
            </div>
          ) : (
            // DESKTOP: Table View
            <div className="overflow-x-auto -mx-2 md:mx-0 custom-scrollbar">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-gray/30 bg-brand-gray/5">
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Buy Channel</th>
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Buy Price</th>
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Sell Channel</th>
                    <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Sell Net</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Profit ₹</th>
                    <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">ROI %</th>
                    <th className="text-center px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Liquidity</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitrageOpps.map((opp, idx) => {
                    const roiPct = opp.netPct * 100;
                    const getChannelColor = (channel: string) => {
                      switch (channel) {
                        case 'WhatsApp':
                          return { border: 'border-l-green-600', bg: 'bg-green-50/30', text: 'text-green-700' };
                        case 'Marketplace':
                          return { border: 'border-l-blue-600', bg: 'bg-blue-50/30', text: 'text-blue-700' };
                        case 'International':
                          return { border: 'border-l-purple-600', bg: 'bg-purple-50/30', text: 'text-purple-700' };
                        default:
                          return { border: 'border-l-brand-gray/30', bg: '', text: 'text-brand-black/80' };
                      }
                    };
                    
                    const buyColors = getChannelColor(opp.buy.channel);
                    const sellColors = getChannelColor(opp.sell.channel);
                    const isEven = idx % 2 === 0;
                    
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-brand-gray/10 ${isEven ? 'bg-brand-white' : 'bg-brand-gray/5'} hover:bg-brand-gray/10 transition-colors`}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${buyColors.bg} ${buyColors.text}`}>
                              {opp.buy.channel === "International" ? "Intl" : opp.buy.channel === "Marketplace" ? "Marketplace" : "WhatsApp"}
                            </span>
                          </div>
                          <div className="text-[10px] text-brand-black/60 truncate max-w-[120px] mt-0.5">
                            {opp.buy.source}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="text-brand-black font-mono-numeric font-semibold">
                            ₹{opp.buy.allIn.toLocaleString("en-IN")}
                          </div>
                          {opp.buy.allIn !== opp.buy.price && (
                            <div className="text-[10px] text-brand-black/50 font-mono-numeric">
                              Base: ₹{opp.buy.price.toLocaleString("en-IN")}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sellColors.bg} ${sellColors.text}`}>
                              {opp.sell.channel === "Marketplace" ? "Marketplace" : "WhatsApp"}
                            </span>
                          </div>
                          <div className="text-[10px] text-brand-black/60 truncate max-w-[120px] mt-0.5">
                            {opp.sell.source}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="text-brand-black font-mono-numeric font-semibold">
                            ₹{(opp.sell.net || opp.sell.price).toLocaleString("en-IN")}
                          </div>
                          {opp.sell.net && opp.sell.net !== opp.sell.price && (
                            <div className="text-[10px] text-brand-black/50 font-mono-numeric">
                              Gross: ₹{opp.sell.price.toLocaleString("en-IN")}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric font-semibold text-green-700">
                          ₹{opp.netProfit.toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric font-semibold text-brand-black">
                          {roiPct.toFixed(1)}%
                        </td>
                        <td className="px-2 py-1.5 text-center text-[10px] text-brand-black/70">
                          <div>Buy: {opp.buy.count ?? 1}</div>
                          <div>Sell: {opp.sell.count ?? 1}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      )}
      {/* Performance Metrics - Enhanced */}
      <div ref={(el) => (sectionRefs.current['performance'] = el)}>
        <CollapsibleSection
        title="Performance Metrics"
        infoTooltip="30d/90d price changes, volatility measures, and market efficiency indicators"
        defaultOpen={false}
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
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">30d Change</p>
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
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">90d Change</p>
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
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Volatility</p>
                  <p className="text-2xl font-semibold text-brand-black capitalize">{asset.volatility || "—"}</p>
                  <p className="text-[9px] text-brand-black/50 mt-0.5">
                    {priceStability.label}
                  </p>
                </div>
              </div>
              
              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-brand-gray/20">
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Price Range</p>
                  <p className="text-lg font-mono-numeric font-bold text-brand-black">
                    ₹{priceRangeWidth.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[9px] text-brand-black/50 mt-0.5">
                    {priceRangePct.toFixed(1)}% spread • {priceStability.level} market
                  </p>
                </div>
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Market Efficiency</p>
                  <p className={`text-lg font-mono-numeric font-bold ${
                    avgEfficiency <= 5 ? 'text-green-600' : avgEfficiency <= 10 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {avgEfficiency > 0 ? avgEfficiency.toFixed(1) : '—'}%
                  </p>
                  <p className="text-[9px] text-brand-black/50 mt-0.5">
                    {avgEfficiency <= 5 ? 'Highly efficient' : avgEfficiency <= 10 ? 'Moderately efficient' : 'Inefficient'} pricing
                  </p>
                </div>
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Price Stability</p>
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
      </CollapsibleSection>
      </div>

      {/* Market Insight / Recommendation - Always Visible Card */}
      {currentData.insight && (
        <div ref={(el) => (sectionRefs.current['insight'] = el)} className="border border-brand-gray/30 bg-brand-white shadow-card mb-4" style={{ borderRadius: '0px' }}>
          <div className="p-4 border-b border-brand-gray/20">
            <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Market Insight
            </h3>
            <p className="text-xs text-brand-black/60 mt-1">
              {currentData.insight.recommendation.toUpperCase()} recommendation with {currentData.insight.confidence}% confidence
            </p>
          </div>
          <div className={`border-l-4 p-5 ${
            currentData.insight.recommendation === 'buy' 
              ? 'border-green-600 bg-green-500/5' 
              : currentData.insight.recommendation === 'sell'
              ? 'border-red-600 bg-red-500/5'
              : 'border-brand-gray/30 bg-brand-gray/5'
          }`} style={{ borderRadius: '0px' }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className={`text-base font-semibold ${
                    currentData.insight.recommendation === 'buy' 
                      ? 'text-green-700' 
                      : currentData.insight.recommendation === 'sell'
                      ? 'text-red-700'
                      : 'text-brand-black'
                  }`}>
                    {currentData.insight.recommendation.toUpperCase()}
                  </p>
                  {selectedSize && (
                    <span className="text-xs text-brand-black/60">({selectedSize})</span>
                  )}
                </div>
                <p className="text-sm text-brand-black leading-relaxed">{currentData.insight.reasoning}</p>
                {currentData.insight.expectedMovement && (
                  <p className="text-xs text-brand-black/70 italic mt-2">
                    {currentData.insight.expectedMovement}
                  </p>
                )}
              </div>
            </div>
            
            {/* Insight Metadata & Track Record */}
            <div className="mt-4 pt-4 border-t border-brand-gray/20">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-brand-black/60">
                {/* Confidence Level */}
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="font-medium">{currentData.insight.confidence}% confidence</span>
                  <span className={`text-[10px] px-1.5 py-0.5 font-semibold uppercase ${
                    currentData.insight.confidence >= 80 ? 'bg-green-100 text-green-700' :
                    currentData.insight.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-brand-gray text-brand-black/60'
                  }`} style={{ borderRadius: '0px' }}>
                    {currentData.insight.confidence >= 80 ? 'High' : currentData.insight.confidence >= 60 ? 'Medium' : 'Low'}
                  </span>
                </div>
                
                {/* Data Points */}
                {currentData.dataPoints && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span>{currentData.dataPoints} data points analyzed</span>
                  </div>
                )}
                
                {/* Last Updated */}
                {currentData.lastUpdated && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Generated {formatLastSeen(currentData.lastUpdated) || 'recently'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Disclaimer */}
              <div className="mt-3 flex items-start gap-2 text-xs text-brand-black/50">
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="leading-relaxed">
                  <span className="font-semibold text-brand-black/60">Note:</span> Market insights are algorithmic recommendations based on current data. Past performance does not guarantee future results. Always conduct your own research before making purchase decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 2 Arbitrage Opportunities Card - Always Visible */}
      {arbitrageOpps.length > 0 && (
        <div className="border border-brand-gray/30 bg-brand-white shadow-card mb-4" style={{ borderRadius: '0px' }}>
          <div className="p-4 border-b border-brand-gray/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Top Arbitrage Opportunities
                </h3>
                <p className="text-xs text-brand-black/60 mt-1">Buy low, sell high across channels</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {arbitrageOpps.slice(0, 2).map((opp, idx) => {
                const roiPct = opp.netPct * 100;
                return (
                  <div key={idx} className="border-2 border-yellow-400 bg-yellow-50/30 p-4" style={{ borderRadius: '0px' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-brand-black/60 uppercase mb-1">
                          <svg className="w-3.5 h-3.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          Opportunity #{idx + 1}
                        </div>
                        <div className="text-lg font-bold text-brand-black">
                          ₹{opp.netProfit.toLocaleString('en-IN')} profit
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-yellow-400 text-brand-black px-3 py-1.5 font-bold text-sm" style={{ borderRadius: '0px' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {roiPct.toFixed(1)}% ROI
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
                        <div className="text-xs text-brand-black/60 mb-1">Buy from</div>
                        <div className="font-semibold text-sm">{opp.buy.channel === 'International' ? 'Intl' : opp.buy.channel}</div>
                        <div className="text-xl font-mono-numeric font-bold text-green-700 mt-1">
                          ₹{opp.buy.allIn.toLocaleString('en-IN')}
                        </div>
                        {opp.buy.source && (
                          <div className="text-xs text-brand-black/50 mt-1 truncate">{opp.buy.source}</div>
                        )}
                      </div>
                      <div className="bg-white border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
                        <div className="text-xs text-brand-black/60 mb-1">Sell to</div>
                        <div className="font-semibold text-sm">{opp.sell.channel === 'Marketplace' ? 'Marketplace' : opp.sell.channel}</div>
                        <div className="text-xl font-mono-numeric font-bold text-blue-700 mt-1">
                          ₹{(opp.sell.net || opp.sell.price).toLocaleString('en-IN')}
                        </div>
                        {opp.sell.source && (
                          <div className="text-xs text-brand-black/50 mt-1 truncate">{opp.sell.source}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowAllArbitrage(!showAllArbitrage)}
              className="w-full px-4 py-3 border-2 border-brand-black text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-black hover:text-white transition-all flex items-center justify-center gap-2"
              style={{ borderRadius: '0px' }}
            >
              {showAllArbitrage ? 'Hide All Opportunities' : `View All ${arbitrageOpps.length} Opportunities`}
              <svg className={`w-4 h-4 transition-transform ${showAllArbitrage ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                style={{ borderRadius: '0px' }}
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
                              style={{ borderRadius: '0px' }}
                            >
                              Request Intro
                            </button>
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
          description: description.trim() || undefined,
          portfolioPositionId: userPosition ? `${asset.id}_${selectedSize}` : undefined
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
                style={{ borderRadius: '0px' }}
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
              style={{ borderRadius: '0px' }}
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
                  style={{ borderRadius: '0px' }}
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
              style={{ borderRadius: '0px' }}
            />
            <p className="text-xs text-brand-black/60 mt-1">{description.length}/500 characters</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-brand-gray/30">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-brand-gray text-sm font-semibold uppercase tracking-wide text-brand-black hover:bg-brand-gray/10 transition-all disabled:opacity-50"
              style={{ borderRadius: '0px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !askingPrice || parseFloat(askingPrice) <= 0}
              className="flex-1 px-6 py-3 bg-brand-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '0px' }}
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
