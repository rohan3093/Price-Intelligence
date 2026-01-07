import React, { useState, useEffect, useRef, useMemo } from "react";
import { Asset, SizeVariant, PricePoint } from "../types";
import { SizeSelector } from "./SizeSelector";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface AssetDetailPanelProps {
  asset: Asset | undefined;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
  isLoading?: boolean;
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  listingCount?: number;
  bestPrice?: number;
  priceLabel?: string;
  onViewAll?: () => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  defaultOpen = true,
  children,
  className = "",
  listingCount,
  bestPrice,
  priceLabel = "Best",
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
    <div className={`w-full border border-brand-gray/30 rounded-none bg-brand-white ${className}`} style={{ borderRadius: '0px' }}>
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
        className="w-full p-2.5 flex items-center justify-between hover:bg-brand-gray/5 transition-colors min-h-[36px]"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide leading-tight">
              {title}
            </h3>
            {/* Listing Count Badge */}
            {listingCount !== undefined && listingCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-brand-black text-white leading-tight">
                {listingCount} {listingCount === 1 ? 'listing' : 'listings'}
              </span>
            )}
            {/* Best Price Indicator */}
            {bestPrice !== undefined && bestPrice > 0 && (
              <span className="text-[10px] font-mono-numeric font-semibold text-green-600 leading-tight">
                {priceLabel}: ₹{bestPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] text-brand-black/50 mt-0.5 leading-tight">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View All Button (if provided) */}
          {onViewAll && listingCount !== undefined && listingCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewAll();
              }}
              className="px-2 py-0.5 text-[10px] font-medium text-brand-black/70 hover:text-brand-black border border-brand-gray/30 hover:border-brand-black transition-colors leading-tight"
              style={{ borderRadius: '0px' }}
            >
              View All
            </button>
          )}
          <svg
            className={`w-5 h-5 text-brand-black/60 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-brand-gray/20">
          {children}
        </div>
      )}
    </div>
  );
};

// Loading Skeleton Components
const MetricSkeleton: React.FC = () => (
  <div className="space-y-2">
    <div className="h-3 w-24 bg-brand-gray/20 animate-pulse"></div>
    <div className="h-6 w-32 bg-brand-gray/30 animate-pulse"></div>
  </div>
);

const CardSkeleton: React.FC = () => (
  <div className="p-4 bg-brand-white border border-brand-gray/20" style={{ borderRadius: '0px' }}>
    <div className="space-y-3">
      <div className="h-4 w-32 bg-brand-gray/20 animate-pulse"></div>
      <div className="h-3 w-24 bg-brand-gray/20 animate-pulse"></div>
      <div className="pt-3 border-t border-brand-gray/20">
        <div className="h-5 w-28 bg-brand-gray/30 animate-pulse"></div>
      </div>
    </div>
  </div>
);

const ImageSkeleton: React.FC = () => (
  <div className="aspect-square w-full max-w-xs bg-brand-gray/10 border border-brand-gray/20 animate-pulse" style={{ borderRadius: '0px' }}>
    <div className="w-full h-full bg-brand-gray/20"></div>
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
  <div className="py-12 px-4 text-center">
    {icon && <div className="mb-4 flex justify-center">{icon}</div>}
    <p className="text-sm font-semibold text-brand-black/70 mb-1">{title}</p>
    {description && (
      <p className="text-xs text-brand-black/50">{description}</p>
    )}
  </div>
);

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({
  asset,
  watchlisted = false,
  onToggleWatchlist,
  isLoading = false,
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
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Section navigation items
  const sections = [
    { id: 'price-history', label: 'Price History' },
    { id: 'listings', label: 'Listings' },
    { id: 'market-summary', label: 'Market Summary' },
    { id: 'arbitrage', label: 'Arbitrage' },
    { id: 'performance', label: 'Performance' },
    { id: 'insight', label: 'Insight' },
  ];

  // Scroll spy to highlight active section
  useEffect(() => {
    const handleScroll = () => {
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
    };

    // Listen to both window and container scroll
    const container = document.querySelector('.overflow-y-auto');
    window.addEventListener('scroll', handleScroll, true);
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    handleScroll(); // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [asset]);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      // Use offset for better positioning (account for sticky nav on desktop, mobile nav on mobile)
      const yOffset = window.innerWidth >= 768 ? -80 : -20;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
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
            <svg className="w-16 h-16 text-brand-gray/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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

  // Helper functions to extract prices from channel-based structure
  const getWhatsAppPrices = () => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('whatsapp' in sizeVariant.pricePoints ? sizeVariant.pricePoints.whatsapp : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.b2b || [];
    } else if (asset.pricePoints) {
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
    if (sortBy === 'price') {
      buyPrices = buyPrices.sort((a: PricePoint, b: PricePoint) => a.price - b.price);
      sellPrices = sellPrices.sort((a: PricePoint, b: PricePoint) => b.price - a.price);
    } else if (sortBy === 'quantity') {
      buyPrices = buyPrices.sort((a: PricePoint, b: PricePoint) => b.listingCount - a.listingCount);
      sellPrices = sellPrices.sort((a: PricePoint, b: PricePoint) => b.listingCount - a.listingCount);
    } else if (sortBy === 'newest') {
      buyPrices = buyPrices.sort((a: PricePoint, b: PricePoint) => {
        const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
        const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      sellPrices = sellPrices.sort((a: PricePoint, b: PricePoint) => {
        const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
        const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
    }
    
    return {
      buy: buyPrices,
      sell: sellPrices,
      all: pricePoints
    };
  };

  const getMarketplacePrices = () => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('marketplace' in sizeVariant.pricePoints ? sizeVariant.pricePoints.marketplace : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.endCustomer || [];
    } else if (asset.pricePoints) {
      pricePoints = ('marketplace' in asset.pricePoints ? asset.pricePoints.marketplace : asset.pricePoints.endCustomer || []) as PricePoint[];
    }
    
    // Apply sorting
    if (sortBy === 'price') {
      pricePoints = pricePoints.sort((a: PricePoint, b: PricePoint) => a.price - b.price);
    } else if (sortBy === 'quantity') {
      pricePoints = pricePoints.sort((a: PricePoint, b: PricePoint) => b.listingCount - a.listingCount);
    } else if (sortBy === 'newest') {
      pricePoints = pricePoints.sort((a: PricePoint, b: PricePoint) => {
        const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
        const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
    }
    
    return pricePoints;
  };

  const getInternationalPrices = () => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('international' in sizeVariant.pricePoints ? sizeVariant.pricePoints.international : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.stockxGoat || [];
    } else if (asset.pricePoints) {
      pricePoints = ('international' in asset.pricePoints ? asset.pricePoints.international : asset.pricePoints.stockxGoat || []) as PricePoint[];
    }
    
    // Apply sorting
    if (sortBy === 'price') {
      pricePoints = pricePoints.sort((a: PricePoint, b: PricePoint) => 
        (a.price + (a.reshippingCost || 0)) - (b.price + (b.reshippingCost || 0))
      );
    } else if (sortBy === 'quantity') {
      pricePoints = pricePoints.sort((a: PricePoint, b: PricePoint) => b.listingCount - a.listingCount);
    } else if (sortBy === 'newest') {
      pricePoints = pricePoints.sort((a: PricePoint, b: PricePoint) => {
        const aDate = a.lastSeen ? (typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen) : new Date(0);
        const bDate = b.lastSeen ? (typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
    }
    
    return pricePoints;
  };

  const whatsappPrices = getWhatsAppPrices();
  const marketplacePrices = getMarketplacePrices();
  const internationalPrices = getInternationalPrices();

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

    // Buy pools
    whatsappPrices.buy.forEach((p) =>
      buyPool.push({
        channel: 'WhatsApp',
        source: p.sellerName || p.source || 'WhatsApp',
        price: p.price,
        allIn: p.price,
        count: p.listingCount,
      })
    );
    marketplacePrices.forEach((p) =>
      buyPool.push({
        channel: 'Marketplace',
        source: p.marketplaceName || p.source || 'Marketplace',
        price: p.price,
        allIn: p.price,
        count: p.listingCount,
      })
    );
    internationalPrices.forEach((p) => {
      const landed = p.price + (p.reshippingCost ?? INTL_RESHIPPING_FALLBACK);
      buyPool.push({
        channel: 'International',
        source: p.marketplaceName || p.source || 'International',
        price: p.price,
        allIn: landed,
        count: p.listingCount,
      });
    });

    // Sell pools
    whatsappPrices.sell.forEach((p) =>
      sellPool.push({
        channel: 'WhatsApp',
        source: p.sellerName || p.source || 'WhatsApp',
        price: p.price,
        allIn: p.price,
        net: p.price, // no fee
        count: p.listingCount,
      })
    );
    marketplacePrices.forEach((p) =>
      sellPool.push({
        channel: 'Marketplace',
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

  // Calculate best available price (lowest price across all channels)
  // For international prices, use total landed cost (platform price + reshipping cost)
  const calculateBestPrice = () => {
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
  };

  const bestPrice = calculateBestPrice();

  const anchor = asset.priceAnchors;
  // Use retail India as the anchor for spread calculation (most relevant for Indian market)
  const anchorTarget = anchor?.retailIndia;
  const spread =
    bestPrice && anchorTarget
      ? ((bestPrice - anchorTarget) / anchorTarget) * 100
      : undefined;

  return (
    <section className="p-3 md:p-4 space-y-3 text-brand-black bg-brand-white relative">
      {/* Sticky Section Navigation - Desktop Only - more compact */}
      <div className="hidden md:block sticky top-0 z-10 bg-brand-white border-b border-brand-gray/20 mb-3 -mx-3 md:-mx-4 px-3 md:px-4 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-brand-black/60 uppercase tracking-wide flex-shrink-0">Jump to:</span>
          {sections.map((section) => {
            // Skip sections that don't exist
            if (section.id === 'insight' && !currentData.insight) return null;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-all whitespace-nowrap leading-tight ${
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

      {/* Mobile: Floating Jump to Button */}
      <div className="md:hidden fixed bottom-20 right-4 z-30 mobile-nav-container">
        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          className="w-12 h-12 bg-brand-black text-white flex items-center justify-center shadow-lg hover:bg-brand-black/90 transition-colors"
          style={{ borderRadius: '0px' }}
          aria-label="Jump to section"
          aria-expanded={showMobileNav}
        >
          {showMobileNav ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {sections.map((section) => {
                  if (section.id === 'insight' && !currentData.insight) return null;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        scrollToSection(section.id);
                        setShowMobileNav(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium uppercase tracking-wide transition-all ${
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

      {/* Hero Section with Recommendation Badge - more compact */}
      {currentData.insight?.recommendation && (
        <div className="mb-2">
          <div className={`p-2.5 border-l-4 ${
            currentData.insight.recommendation === "buy"
              ? "bg-green-500/5 border-green-600"
              : currentData.insight.recommendation === "sell"
              ? "bg-red-500/5 border-red-600"
              : "bg-brand-gray/5 border-brand-gray/30"
          }`} style={{ borderRadius: '0px' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wide leading-tight ${
                    currentData.insight.recommendation === "buy"
                      ? "bg-green-600 text-white"
                      : currentData.insight.recommendation === "sell"
                      ? "bg-red-600 text-white"
                      : "bg-brand-gray/20 text-brand-black"
                  }`}
                >
                  {currentData.insight.recommendation}
                </span>
                <div>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">Confidence</p>
                  <p className="text-xs font-mono-numeric font-semibold text-brand-black leading-tight">{currentData.insight.confidence}%</p>
                </div>
                {spread !== undefined && (
                  <div>
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">vs Retail</p>
                    <p
                      className={`text-xs font-mono-numeric font-semibold leading-tight ${
                        spread > 0 ? "text-red-600" : spread < 0 ? "text-green-600" : "text-brand-black"
                      }`}
                    >
                      {spread > 0 ? "+" : ""}
                      {spread.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
              {currentData.insight.reasoning && (
                <p className="text-[10px] text-brand-black/70 italic flex-1 min-w-0 leading-tight">
                  {currentData.insight.reasoning}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Section - more compact */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 border-b border-brand-gray/30 pb-3">
        {/* Large Image - smaller */}
        <div className="md:col-span-2">
          <div className="aspect-square w-full bg-brand-gray/5 border border-brand-gray/20 flex items-center justify-center" style={{ borderRadius: '0px' }}>
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
                    placeholder.className = 'image-placeholder text-[10px] text-brand-black/40 text-center px-2';
                    placeholder.textContent = 'No image';
                    parent.appendChild(placeholder);
                  }
                }}
              />
            ) : (
              <div className="text-[10px] text-brand-black/40 text-center px-2">No image</div>
            )}
          </div>
        </div>
        
        {/* Asset Info & Metrics - more compact */}
        <div className="md:col-span-3 space-y-2">
          {/* Asset Title & Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-heading font-normal text-brand-black mb-1 leading-tight">
                {asset.name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-brand-black/70 mb-2">
                <span className="font-medium">{asset.brand}</span>
                <span>·</span>
                <span>SKU {asset.sku}</span>
                {selectedSize && (
                  <>
                    <span>·</span>
                    <span className="font-semibold text-brand-black px-1.5 py-0.5 bg-brand-gray/10 text-[10px]">{selectedSize}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-1.5 flex-shrink-0">
              <button
                onClick={onToggleWatchlist}
                className={`px-2.5 py-1.5 rounded-none border text-xs whitespace-nowrap transition-colors leading-tight flex items-center justify-center gap-1.5 ${
                  watchlisted
                    ? "border-brand-black bg-brand-black text-brand-white hover:bg-brand-black/90"
                    : "border-brand-gray/30 text-brand-black hover:bg-brand-gray/10"
                }`}
              >
                <span className="text-sm">{watchlisted ? "★" : "☆"}</span>
                <span className="hidden sm:inline">{watchlisted ? "Watch" : "Add"}</span>
              </button>
            </div>
          </div>

          {/* Unified Metrics Card - more compact */}
          <div className="bg-brand-white border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
            {/* Price Section - Most Prominent */}
            <div className="mb-3 pb-3 border-b border-brand-gray/20">
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
              
              {/* Visual Price Comparison Bar - more compact */}
              {bestPrice && anchor?.retailIndia && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-brand-black/60 mb-0.5 leading-tight">
                    <span>Best Price</span>
                    <span>Retail Price</span>
                  </div>
                  <div 
                    className="relative h-2 bg-brand-gray/20 cursor-help" 
                    style={{ borderRadius: '0px' }}
                    title={`Best price is ${((bestPrice / anchor.retailIndia) * 100).toFixed(1)}% of retail price. ${bestPrice < anchor.retailIndia ? 'Below retail' : 'Above retail'}.`}
                  >
                    <div 
                      className={`absolute h-full ${
                        bestPrice < anchor.retailIndia ? "bg-green-600" : "bg-red-600"
                      }`}
                      style={{ 
                        width: `${Math.min((bestPrice / anchor.retailIndia) * 100, 100)}%`,
                        borderRadius: '0px'
                      }}
                    />
                    <div 
                      className="absolute right-0 h-full w-0.5 bg-brand-black"
                      title="Retail (India) reference line"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Metrics Grid - more compact */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1 leading-tight">Liquidity</p>
                <p className="text-sm font-mono-numeric font-bold text-brand-black leading-tight">{currentData.liquidity || "—"}</p>
              </div>
              {anchor?.retailGlobal && (
                <div>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1 leading-tight">Retail (Global)</p>
                  <p className="text-sm font-mono-numeric font-bold text-brand-black leading-tight">
                    ₹{anchor.retailGlobal.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1 leading-tight">Last Updated</p>
                <p className="text-xs font-mono-numeric font-semibold text-brand-black leading-tight">
                  {currentData.lastUpdated 
                    ? new Date(currentData.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Selector - Integrated - more compact */}
      {asset.sizes && asset.sizes.length > 0 && (
        <div className="border-b border-brand-gray/30 pb-3">
          <SizeSelector
            asset={asset}
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
          />
        </div>
      )}

      {/* Price History Chart - Collapsible */}
      <div ref={(el) => (sectionRefs.current['price-history'] = el)}>
        <CollapsibleSection
          title="Price History"
          subtitle="Historical price trends and data points"
          defaultOpen={true}
        >
        <PriceHistoryChart
          pricePoints={sizeVariant?.pricePoints || sizeVariant?.legacyPricePoints || asset.pricePoints}
          historical30d={anchor?.historical30d}
          historical90d={anchor?.historical90d}
          bestAvailablePrice={currentData.bestAvailablePrice}
          retailPrice={anchor?.retailIndia}
          size={selectedSize}
        />
      </CollapsibleSection>
      </div>

      {/* Unified Listings View - Collapsible, terminal-style */}
      {unifiedListings.length > 0 && (
        <div ref={(el) => (sectionRefs.current['listings'] = el)}>
          <CollapsibleSection
            title="All Listings (Across Channels)"
            subtitle="Unified view of WhatsApp, marketplace, and international listings for this size"
            defaultOpen={true}
          >
            {/* Enhanced Filters */}
            <div className="space-y-2 mb-3">
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
            </div>

            <div className="overflow-x-auto -mx-2 md:mx-0">
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
                
                return (
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
                    return (
                      <tr
                        key={idx}
                        className="border-b border-brand-gray/10 hover:bg-brand-gray/5 transition-colors"
                      >
                        <td className="px-2 py-1.5 text-brand-black/80">
                          {row.channel}
                        </td>
                        <td className="px-2 py-1.5 text-brand-black/80">
                          {row.side}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric text-brand-black">
                          {priceDisplay}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric text-brand-black/80">
                          {landedDisplay}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono-numeric text-brand-black/80">
                          {row.listingCount}
                        </td>
                        <td className="px-2 py-1.5 text-brand-black/80 truncate max-w-[120px]">
                          {row.sourceLabel}
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
          </CollapsibleSection>
        </div>
      )}

      {/* Arbitrage Opportunities - per asset/size */}
      <div ref={(el) => (sectionRefs.current['arbitrage'] = el)}>
        <CollapsibleSection
          title="Arbitrage Opportunities"
          subtitle="Cross-channel ideas for this asset/size using current listings"
          defaultOpen={true}
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[10px]">
              <label className="text-brand-black/60 uppercase tracking-wide">Min Net %</label>
              <input
                type="number"
                value={(minArbNetPct * 100).toFixed(1)}
                onChange={(e) => setMinArbNetPct(Math.max(0, Number(e.target.value) / 100))}
                className="w-16 border border-brand-gray/30 px-1.5 py-1 text-[10px] text-brand-black focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '0px' }}
                step="0.5"
              />
              <label className="text-brand-black/60 uppercase tracking-wide">Min Net ₹</label>
              <input
                type="number"
                value={minArbNetRs}
                onChange={(e) => setMinArbNetRs(Math.max(0, Number(e.target.value)))}
                className="w-20 border border-brand-gray/30 px-1.5 py-1 text-[10px] text-brand-black focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '0px' }}
                step="500"
              />
            </div>
            <div className="text-[10px] text-brand-black/50 font-mono-numeric">
              {arbitrageOpps.length} idea{arbitrageOpps.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 md:mx-0">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-gray/30 bg-brand-gray/5">
                  <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Buy</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Sell</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Net ₹</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Net %</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Liquidity</th>
                </tr>
              </thead>
              <tbody>
                {arbitrageOpps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-brand-black/50">
                      No opportunities match the filters.
                    </td>
                  </tr>
                ) : (
                  arbitrageOpps.map((opp, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-brand-gray/10 hover:bg-brand-gray/5 transition-colors"
                    >
                      <td className="px-2 py-1.5">
                        <div className="text-brand-black font-semibold">
                          {opp.buy.channel}
                        </div>
                        <div className="text-[10px] text-brand-black/60 truncate max-w-[160px]">
                          {opp.buy.source}
                        </div>
                        <div className="text-[10px] text-brand-black/80 font-mono-numeric">
                          Buy: ₹{opp.buy.price.toLocaleString("en-IN")}
                          {opp.buy.allIn !== opp.buy.price && (
                            <span className="text-brand-black/60"> → All-in ₹{opp.buy.allIn.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="text-brand-black font-semibold">
                          {opp.sell.channel}
                        </div>
                        <div className="text-[10px] text-brand-black/60 truncate max-w-[160px]">
                          {opp.sell.source}
                        </div>
                        <div className="text-[10px] text-brand-black/80 font-mono-numeric">
                          Sell: ₹{opp.sell.price.toLocaleString("en-IN")}
                          {opp.sell.net && opp.sell.net !== opp.sell.price && (
                            <span className="text-brand-black/60"> → Net ₹{opp.sell.net.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono-numeric font-semibold text-green-700">
                        ₹{opp.netProfit.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono-numeric font-semibold">
                        {(opp.netPct * 100).toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-center text-[10px] text-brand-black/70">
                        <div>Buy: {opp.buy.count ?? 1}</div>
                        <div>Sell: {opp.sell.count ?? 1}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </div>

      {/* Market Channels Comparison Summary - Enhanced Bloomberg Terminal Style */}
      <div ref={(el) => (sectionRefs.current['market-summary'] = el)}>
        <CollapsibleSection
        title="Market Comparison Summary"
        subtitle="Unified market view, arbitrage opportunities, and liquidity assessment"
        defaultOpen={false}
      >
        {(() => {
          // Calculate all prices for unified view
          const whatsappBest = whatsappPrices.buy.length > 0 ? whatsappPrices.buy[0].price : 0;
          const whatsappMax = whatsappPrices.buy.length > 0 ? Math.max(...whatsappPrices.buy.map(p => p.price)) : 0;
          const whatsappAvg = whatsappPrices.buy.length > 0 
            ? Math.round(whatsappPrices.buy.reduce((sum, p) => sum + p.price, 0) / whatsappPrices.buy.length) 
            : 0;
          
          const marketplaceBest = marketplacePrices.length > 0 ? marketplacePrices[0].price : 0;
          const marketplaceMax = marketplacePrices.length > 0 ? marketplacePrices[marketplacePrices.length - 1].price : 0;
          const marketplaceAvg = marketplacePrices.length > 0 
            ? Math.round(marketplacePrices.reduce((sum, p) => sum + p.price, 0) / marketplacePrices.length) 
            : 0;
          
          const internationalBest = internationalPrices.length > 0 
            ? Math.min(...internationalPrices.map(p => p.price + (p.reshippingCost || 0))) 
            : 0;
          const internationalAll = internationalPrices.length > 0 
            ? internationalPrices.map(p => p.price + (p.reshippingCost || 0)) 
            : [];
          const internationalMax = internationalAll.length > 0 ? Math.max(...internationalAll) : 0;
          const internationalAvg = internationalAll.length > 0 
            ? Math.round(internationalAll.reduce((sum, p) => sum + p, 0) / internationalAll.length) 
            : 0;
          
          // Unified market range
          const allPrices = [
            whatsappBest, whatsappMax,
            marketplaceBest, marketplaceMax,
            internationalBest, internationalMax,
            anchor?.retailIndia || 0
          ].filter(p => p > 0);
          
          const marketMin = allPrices.length > 0 ? Math.min(...allPrices) : 0;
          const marketMax = allPrices.length > 0 ? Math.max(...allPrices) : 0;
          const marketRange = marketMax - marketMin;
          
          // Best arbitrage opportunity
          const bestArb = arbitrageOpps.length > 0 ? arbitrageOpps[0] : null;
          
          // Liquidity calculations
          const totalListings = {
            whatsapp: whatsappPrices.buy.length + whatsappPrices.sell.length,
            marketplace: marketplacePrices.length,
            international: internationalPrices.length,
          };
          const totalListingsCount = totalListings.whatsapp + totalListings.marketplace + totalListings.international;
          
          // Market depth at best price
          const bestPriceListings = {
            whatsapp: whatsappBest > 0 ? whatsappPrices.buy.filter(p => p.price === whatsappBest).reduce((sum, p) => sum + (p.listingCount || 1), 0) : 0,
            marketplace: marketplaceBest > 0 ? marketplacePrices.filter(p => p.price === marketplaceBest).reduce((sum, p) => sum + (p.listingCount || 1), 0) : 0,
            international: internationalBest > 0 ? internationalPrices.filter(p => (p.price + (p.reshippingCost || 0)) === internationalBest).reduce((sum, p) => sum + (p.listingCount || 1), 0) : 0,
          };
          const totalBestPriceListings = bestPriceListings.whatsapp + bestPriceListings.marketplace + bestPriceListings.international;
          
          // Liquidity assessment
          const getLiquidityScore = () => {
            if (totalListingsCount === 0) return { level: 'None', label: 'No Data', color: 'text-brand-black/40' };
            if (totalListingsCount >= 20) return { level: 'High', label: 'Fast', color: 'text-green-600' };
            if (totalListingsCount >= 10) return { level: 'Medium', label: 'Moderate', color: 'text-yellow-600' };
            return { level: 'Low', label: 'Slow', color: 'text-red-600' };
          };
          
          const liquidity = getLiquidityScore();
          
          // Best channel to sell (most listings)
          const bestSellChannel = totalListings.marketplace >= totalListings.whatsapp && totalListings.marketplace >= totalListings.international
            ? { name: 'Marketplace', count: totalListings.marketplace }
            : totalListings.whatsapp >= totalListings.international
            ? { name: 'WhatsApp', count: totalListings.whatsapp }
            : { name: 'International', count: totalListings.international };
          
          const getPosition = (price: number) => marketRange > 0 ? ((price - marketMin) / marketRange) * 100 : 0;
          
          return (
            <div className="space-y-4">
              {/* 1. Best Arbitrage Opportunity - Prominent */}
              {bestArb && (
                <div className={`border-l-4 p-4 ${
                  bestArb.netPct >= 0.1 
                    ? 'bg-green-500/5 border-green-600' 
                    : bestArb.netPct >= 0.05
                    ? 'bg-yellow-500/5 border-yellow-600'
                    : 'bg-brand-gray/5 border-brand-gray/30'
                }`} style={{ borderRadius: '0px' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wide ${
                          bestArb.netPct >= 0.1 ? 'text-green-700' : bestArb.netPct >= 0.05 ? 'text-yellow-700' : 'text-brand-black/70'
                        }`}>
                          Best Arbitrage Opportunity
                        </span>
                        {bestArb.netPct >= 0.1 && (
                          <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-green-600 text-white">
                            High Profit
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">Buy from:</span>
                          <span className="text-sm font-mono-numeric font-semibold text-brand-black">
                            {bestArb.buy.channel} @ ₹{bestArb.buy.allIn.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">Sell to:</span>
                          <span className="text-sm font-mono-numeric font-semibold text-brand-black">
                            {bestArb.sell.channel} @ ₹{(bestArb.sell.net || bestArb.sell.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-brand-gray/20">
                          <div className="flex items-baseline gap-3">
                            <div>
                              <span className="text-[10px] text-brand-black/60 uppercase tracking-wide block mb-0.5">Net Profit</span>
                              <span className={`text-xl font-mono-numeric font-bold ${bestArb.netPct >= 0.1 ? 'text-green-600' : bestArb.netPct >= 0.05 ? 'text-yellow-600' : 'text-brand-black'}`}>
                                ₹{bestArb.netProfit.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-brand-black/60 uppercase tracking-wide block mb-0.5">Return %</span>
                              <span className={`text-xl font-mono-numeric font-bold ${bestArb.netPct >= 0.1 ? 'text-green-600' : bestArb.netPct >= 0.05 ? 'text-yellow-600' : 'text-brand-black'}`}>
                                {(bestArb.netPct * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => scrollToSection('arbitrage')}
                      className="px-3 py-1.5 text-xs font-medium border border-brand-black hover:bg-brand-black hover:text-white transition-colors whitespace-nowrap"
                      style={{ borderRadius: '0px' }}
                    >
                      View All →
                    </button>
                  </div>
                </div>
              )}
              
              {/* 2. Unified Market Price View */}
              <div className="border border-brand-gray/30 p-4" style={{ borderRadius: '0px' }}>
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-brand-black mb-3">Unified Market Price View</h4>
                {marketRange > 0 ? (
                  <div className="space-y-4">
                    {/* Single unified bar */}
                    <div className="w-full bg-brand-gray/10 h-8 relative border border-brand-gray/20" style={{ borderRadius: '0px' }}>
                      {/* Channel segments */}
                      {whatsappBest > 0 && (
                        <>
                          <div 
                            className="absolute top-0 h-full bg-green-600/30"
                            style={{ 
                              left: `${getPosition(whatsappBest)}%`,
                              width: `${getPosition(whatsappMax) - getPosition(whatsappBest)}%`,
                            }}
                            title={`WhatsApp: ₹${whatsappBest.toLocaleString('en-IN')} - ₹${whatsappMax.toLocaleString('en-IN')}`}
                          />
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-green-600"
                            style={{ left: `${getPosition(whatsappBest)}%` }}
                            title={`WhatsApp Best: ₹${whatsappBest.toLocaleString('en-IN')}`}
                          />
                        </>
                      )}
                      {marketplaceBest > 0 && (
                        <>
                          <div 
                            className="absolute top-0 h-full bg-blue-600/30"
                            style={{ 
                              left: `${getPosition(marketplaceBest)}%`,
                              width: `${getPosition(marketplaceMax) - getPosition(marketplaceBest)}%`,
                            }}
                            title={`Marketplace: ₹${marketplaceBest.toLocaleString('en-IN')} - ₹${marketplaceMax.toLocaleString('en-IN')}`}
                          />
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-blue-600"
                            style={{ left: `${getPosition(marketplaceBest)}%` }}
                            title={`Marketplace Best: ₹${marketplaceBest.toLocaleString('en-IN')}`}
                          />
                        </>
                      )}
                      {internationalBest > 0 && (
                        <>
                          <div 
                            className="absolute top-0 h-full bg-purple-600/30"
                            style={{ 
                              left: `${getPosition(internationalBest)}%`,
                              width: `${getPosition(internationalMax) - getPosition(internationalBest)}%`,
                            }}
                            title={`International: ₹${internationalBest.toLocaleString('en-IN')} - ₹${internationalMax.toLocaleString('en-IN')}`}
                          />
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-purple-600"
                            style={{ left: `${getPosition(internationalBest)}%` }}
                            title={`International Best: ₹${internationalBest.toLocaleString('en-IN')}`}
                          />
                        </>
                      )}
                      {/* Retail reference */}
                      {anchor?.retailIndia && (
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-brand-black/40"
                          style={{ left: `${getPosition(anchor.retailIndia)}%` }}
                          title={`Retail (India): ₹${anchor.retailIndia.toLocaleString('en-IN')}`}
                        />
                      )}
                      {/* Price labels at bottom */}
                      <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[9px] font-mono-numeric text-brand-black/60">
                        <span>₹{marketMin.toLocaleString('en-IN')}</span>
                        {anchor?.retailIndia && (
                          <span className="text-brand-black/40">Retail: ₹{anchor.retailIndia.toLocaleString('en-IN')}</span>
                        )}
                        <span>₹{marketMax.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    
                    {/* Channel legend */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {whatsappBest > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-600"></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-semibold text-brand-black uppercase tracking-wide">WhatsApp</div>
                            <div className="text-xs font-mono-numeric font-bold text-green-600">₹{whatsappBest.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}
                      {marketplaceBest > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-600"></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-semibold text-brand-black uppercase tracking-wide">Marketplace</div>
                            <div className="text-xs font-mono-numeric font-bold text-blue-600">₹{marketplaceBest.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}
                      {internationalBest > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-600"></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-semibold text-brand-black uppercase tracking-wide">International</div>
                            <div className="text-xs font-mono-numeric font-bold text-purple-600">₹{internationalBest.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-brand-black/50">No price data available</div>
                )}
              </div>
              
              {/* 3. Liquidity Assessment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
                  <div className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Liquidity Score</div>
                  <div className={`text-2xl font-bold ${liquidity.color} mb-1`}>{liquidity.level}</div>
                  <div className="text-xs text-brand-black/70">{liquidity.label} to sell</div>
                </div>
                <div className="border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
                  <div className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Market Depth</div>
                  <div className="text-2xl font-mono-numeric font-bold text-brand-black mb-1">
                    {totalBestPriceListings}
                  </div>
                  <div className="text-xs text-brand-black/70">listings at best price</div>
                </div>
                <div className="border border-brand-gray/30 p-3" style={{ borderRadius: '0px' }}>
                  <div className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Best Channel to Sell</div>
                  <div className="text-lg font-semibold text-brand-black mb-1">{bestSellChannel.name}</div>
                  <div className="text-xs text-brand-black/70">{bestSellChannel.count} listings</div>
                </div>
              </div>
              
              {/* 4. Compact Channel Comparison Table */}
              <div className="border border-brand-gray/30" style={{ borderRadius: '0px' }}>
                <div className="bg-brand-gray/5 border-b border-brand-gray/20 px-3 py-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide text-brand-black">Channel Comparison</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-brand-gray/20 bg-brand-gray/5">
                        <th className="text-left px-3 py-2 font-semibold text-brand-black/70 uppercase tracking-wide">Channel</th>
                        <th className="text-right px-3 py-2 font-semibold text-brand-black/70 uppercase tracking-wide">Best Price</th>
                        <th className="text-right px-3 py-2 font-semibold text-brand-black/70 uppercase tracking-wide">Avg Price</th>
                        <th className="text-right px-3 py-2 font-semibold text-brand-black/70 uppercase tracking-wide">Listings</th>
                        <th className="text-right px-3 py-2 font-semibold text-brand-black/70 uppercase tracking-wide">At Best</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whatsappBest > 0 && (
                        <tr className="border-b border-brand-gray/10 hover:bg-brand-gray/5">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-green-600"></div>
                              <span className="font-semibold text-brand-black">WhatsApp</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric font-bold text-green-600">
                            ₹{whatsappBest.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black">
                            ₹{whatsappAvg.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black">
                            {totalListings.whatsapp}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black/70">
                            {bestPriceListings.whatsapp}
                          </td>
                        </tr>
                      )}
                      {marketplaceBest > 0 && (
                        <tr className="border-b border-brand-gray/10 hover:bg-brand-gray/5">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-blue-600"></div>
                              <span className="font-semibold text-brand-black">Marketplace</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric font-bold text-blue-600">
                            ₹{marketplaceBest.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black">
                            ₹{marketplaceAvg.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black">
                            {totalListings.marketplace}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black/70">
                            {bestPriceListings.marketplace}
                          </td>
                        </tr>
                      )}
                      {internationalBest > 0 && (
                        <tr className="border-b border-brand-gray/10 hover:bg-brand-gray/5">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-purple-600"></div>
                              <span className="font-semibold text-brand-black">International</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric font-bold text-purple-600">
                            ₹{internationalBest.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black">
                            ₹{internationalAvg.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black">
                            {totalListings.international}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numeric text-brand-black/70">
                            {bestPriceListings.international}
                          </td>
                        </tr>
                      )}
                      {whatsappBest === 0 && marketplaceBest === 0 && internationalBest === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-brand-black/50">
                            No market data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </CollapsibleSection>
      </div>


      {/* Performance Metrics - Enhanced */}
      <div ref={(el) => (sectionRefs.current['performance'] = el)}>
        <CollapsibleSection
        title="Performance Metrics"
        subtitle="Price trends, volatility, and market efficiency"
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="border border-brand-gray/20 p-3" style={{ borderRadius: '0px' }}>
                  <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="text-sm font-medium text-brand-black">
                    {currentData.lastUpdated 
                      ? new Date(currentData.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : "—"}
                  </p>
                  {currentData.dataPoints && (
                    <p className="text-[9px] text-brand-black/50 mt-0.5">
                      {currentData.dataPoints} data points
                    </p>
                  )}
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

      {/* Market Insight / Recommendation - Collapsible */}
      {currentData.insight && (
        <div ref={(el) => (sectionRefs.current['insight'] = el)}>
          <CollapsibleSection
          title="Market Insight"
          subtitle={`${currentData.insight.recommendation.toUpperCase()} recommendation with ${currentData.insight.confidence}% confidence`}
          defaultOpen={true}
        >
          <div className={`border-l-4 rounded-none p-5 mt-4 ${
            currentData.insight.recommendation === 'buy' 
              ? 'border-green-600 bg-green-500/5' 
              : currentData.insight.recommendation === 'sell'
              ? 'border-red-600 bg-red-500/5'
              : 'border-brand-gray/30 bg-brand-gray/5'
          }`}>
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
          </div>
        </CollapsibleSection>
        </div>
      )}
    </section>
  );
};

export default AssetDetailPanel;
