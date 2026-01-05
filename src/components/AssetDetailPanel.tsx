import React, { useState, useEffect, useRef } from "react";
import { Asset, SizeVariant, PricePoint } from "../types";
import { SizeSelector } from "./SizeSelector";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface AssetDetailPanelProps {
  asset: Asset | undefined;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
  isLoading?: boolean;
  onCompare?: (asset: Asset) => void;
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
  onCompare,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeScrollSection, setActiveScrollSection] = useState<string>("");
  const [activeMobileTab, setActiveMobileTab] = useState<string>("whatsapp");
  const [sortBy, setSortBy] = useState<'price' | 'quantity' | 'newest'>('price');
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Section navigation items
  const sections = [
    { id: 'price-history', label: 'Price History' },
    { id: 'market-summary', label: 'Market Summary' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'international', label: 'International' },
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
      // Reset mobile tab to default when asset changes
      setActiveMobileTab("whatsapp");
      // Reset filters when asset changes
      setFilterLocation(null);
      setSortBy('price');
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
              {onCompare && asset && (
                <button
                  onClick={() => onCompare(asset)}
                  className="px-2.5 py-1.5 rounded-none border border-brand-gray/30 text-xs whitespace-nowrap transition-colors leading-tight text-brand-black hover:bg-brand-gray/10 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span className="hidden sm:inline">Compare</span>
                </button>
              )}
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
          size={selectedSize}
        />
      </CollapsibleSection>
      </div>

      {/* Market Channels Comparison Summary - Collapsible */}
      <div ref={(el) => (sectionRefs.current['market-summary'] = el)}>
        <CollapsibleSection
        title="Market Comparison Summary"
        subtitle="Best prices, ranges, and channel statistics"
        defaultOpen={true}
      >
        <div className="space-y-3">
          {/* Unified Price Comparison Bars - more compact */}
          <div className="space-y-2.5">
            <p className="text-[10px] text-brand-black/60 uppercase tracking-wide font-semibold leading-tight">Price Comparison</p>
            {(() => {
              // Calculate all prices for scaling
              const whatsappBest = whatsappPrices.buy.length > 0 ? whatsappPrices.buy[0].price : 0;
              const whatsappMin = whatsappBest;
              const whatsappMax = whatsappPrices.buy.length > 0 ? Math.max(...whatsappPrices.buy.map(p => p.price)) : 0;
              const whatsappAvg = whatsappPrices.buy.length > 0 
                ? Math.round(whatsappPrices.buy.reduce((sum, p) => sum + p.price, 0) / whatsappPrices.buy.length) 
                : 0;
              
              const marketplaceBest = marketplacePrices.length > 0 ? marketplacePrices[0].price : 0;
              const marketplaceMin = marketplaceBest;
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
              const internationalMin = internationalBest;
              const internationalMax = internationalAll.length > 0 ? Math.max(...internationalAll) : 0;
              const internationalAvg = internationalAll.length > 0 
                ? Math.round(internationalAll.reduce((sum, p) => sum + p, 0) / internationalAll.length) 
                : 0;
              
              const maxPrice = Math.max(whatsappMax, marketplaceMax, internationalMax, anchor?.retailIndia || 0);
              const minPrice = Math.min(
                whatsappMin || Infinity,
                marketplaceMin || Infinity,
                internationalMin || Infinity,
                anchor?.retailIndia || Infinity
              );
              
              const priceRange = maxPrice - minPrice;
              
              const getPosition = (price: number) => priceRange > 0 ? ((price - minPrice) / priceRange) * 100 : 0;
              const getWidth = (min: number, max: number) => priceRange > 0 ? ((max - min) / priceRange) * 100 : 0;
              
              return (
                <div className="space-y-3">
                  {/* WhatsApp */}
                  {whatsappBest > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-green-600"></div>
                          <span className="text-[10px] font-semibold text-brand-black leading-tight">WhatsApp & Reseller</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <div className="text-right">
                            <span className="text-brand-black/60">Best: </span>
                            <span className="font-mono-numeric font-semibold text-green-600">₹{whatsappBest.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-black/60">Range: </span>
                            <span className="font-mono-numeric text-brand-black">₹{whatsappMin.toLocaleString('en-IN')} - ₹{whatsappMax.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-black/60">Avg: </span>
                            <span className="font-mono-numeric text-brand-black">₹{whatsappAvg.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-brand-gray/10 h-6 relative border border-brand-gray/20" style={{ borderRadius: '0px' }}>
                        {/* Full Range Bar */}
                        <div 
                          className="absolute top-0 h-full bg-green-600/20"
                          style={{ 
                            left: `${getPosition(whatsappMin)}%`,
                            width: `${getWidth(whatsappMin, whatsappMax)}%`,
                            borderRadius: '0px'
                          }}
                        />
                        {/* Best Price Marker (left edge) */}
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-green-600"
                          style={{ left: `${getPosition(whatsappBest)}%` }}
                        />
                        {/* Average Marker */}
                        {whatsappAvg > 0 && (
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-green-600/60"
                            style={{ left: `${getPosition(whatsappAvg)}%` }}
                            title={`Average: ₹${whatsappAvg.toLocaleString('en-IN')}`}
                          />
                        )}
                        {/* Labels */}
                        <div 
                          className="absolute left-0 top-0 h-full flex items-center pl-1"
                          style={{ left: `${getPosition(whatsappBest)}%`, transform: 'translateX(-50%)' }}
                        >
                          <span className="text-[9px] font-mono-numeric font-bold text-green-600 bg-white px-0.5">₹{whatsappBest.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Marketplace */}
                  {marketplaceBest > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-blue-600"></div>
                          <span className="text-[10px] font-semibold text-brand-black leading-tight">Indian Marketplaces</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <div className="text-right">
                            <span className="text-brand-black/60">Best: </span>
                            <span className="font-mono-numeric font-semibold text-blue-600">₹{marketplaceBest.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-black/60">Range: </span>
                            <span className="font-mono-numeric text-brand-black">₹{marketplaceMin.toLocaleString('en-IN')} - ₹{marketplaceMax.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-black/60">Avg: </span>
                            <span className="font-mono-numeric text-brand-black">₹{marketplaceAvg.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-brand-gray/10 h-6 relative border border-brand-gray/20" style={{ borderRadius: '0px' }}>
                        {/* Full Range Bar */}
                        <div 
                          className="absolute top-0 h-full bg-blue-600/20"
                          style={{ 
                            left: `${getPosition(marketplaceMin)}%`,
                            width: `${getWidth(marketplaceMin, marketplaceMax)}%`,
                            borderRadius: '0px'
                          }}
                        />
                        {/* Best Price Marker (left edge) */}
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-blue-600"
                          style={{ left: `${getPosition(marketplaceBest)}%` }}
                        />
                        {/* Average Marker */}
                        {marketplaceAvg > 0 && (
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-blue-600/60"
                            style={{ left: `${getPosition(marketplaceAvg)}%` }}
                            title={`Average: ₹${marketplaceAvg.toLocaleString('en-IN')}`}
                          />
                        )}
                        {/* Labels */}
                        <div 
                          className="absolute left-0 top-0 h-full flex items-center pl-1"
                          style={{ left: `${getPosition(marketplaceBest)}%`, transform: 'translateX(-50%)' }}
                        >
                          <span className="text-[9px] font-mono-numeric font-bold text-blue-600 bg-white px-0.5">₹{marketplaceBest.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* International */}
                  {internationalBest > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-purple-600"></div>
                          <span className="text-[10px] font-semibold text-brand-black leading-tight">International Platforms</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <div className="text-right">
                            <span className="text-brand-black/60">Best: </span>
                            <span className="font-mono-numeric font-semibold text-purple-600">₹{internationalBest.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-black/60">Range: </span>
                            <span className="font-mono-numeric text-brand-black">₹{internationalMin.toLocaleString('en-IN')} - ₹{internationalMax.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-black/60">Avg: </span>
                            <span className="font-mono-numeric text-brand-black">₹{internationalAvg.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-brand-gray/10 h-6 relative border border-brand-gray/20" style={{ borderRadius: '0px' }}>
                        {/* Full Range Bar */}
                        <div 
                          className="absolute top-0 h-full bg-purple-600/20"
                          style={{ 
                            left: `${getPosition(internationalMin)}%`,
                            width: `${getWidth(internationalMin, internationalMax)}%`,
                            borderRadius: '0px'
                          }}
                        />
                        {/* Best Price Marker (left edge) */}
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-purple-600"
                          style={{ left: `${getPosition(internationalBest)}%` }}
                        />
                        {/* Average Marker */}
                        {internationalAvg > 0 && (
                          <div 
                            className="absolute top-0 h-full w-0.5 bg-purple-600/60"
                            style={{ left: `${getPosition(internationalAvg)}%` }}
                            title={`Average: ₹${internationalAvg.toLocaleString('en-IN')}`}
                          />
                        )}
                        {/* Labels */}
                        <div 
                          className="absolute left-0 top-0 h-full flex items-center pl-1"
                          style={{ left: `${getPosition(internationalBest)}%`, transform: 'translateX(-50%)' }}
                        >
                          <span className="text-[9px] font-mono-numeric font-bold text-purple-600 bg-white px-0.5">₹{internationalBest.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Retail Reference Line - more compact */}
                  {anchor?.retailIndia && (
                    <div className="pt-2 border-t border-brand-gray/20 mt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-brand-black/60 uppercase tracking-wide leading-tight">Retail (India) Reference</span>
                        <span className="text-[10px] font-mono-numeric font-semibold text-brand-black leading-tight">₹{anchor.retailIndia.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-brand-gray/10 h-1.5 relative border border-brand-gray/20" style={{ borderRadius: '0px' }}>
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-brand-black"
                          style={{ left: `${getPosition(anchor.retailIndia)}%` }}
                        />
                        <div 
                          className="absolute left-0 top-0 h-full flex items-center"
                          style={{ left: `${getPosition(anchor.retailIndia)}%`, transform: 'translateX(-50%)' }}
                        >
                          <span className="text-[9px] font-mono-numeric font-semibold text-brand-black bg-white px-0.5">Retail</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Quick Access Preview Cards */}
          {(() => {
            const whatsappTotal = whatsappPrices.buy.length + whatsappPrices.sell.length;
            const hasWhatsapp = whatsappTotal > 0;
            const hasMarketplace = marketplacePrices.length > 0;
            const hasInternational = internationalPrices.length > 0;
            const availableChannels = [hasWhatsapp, hasMarketplace, hasInternational].filter(Boolean).length;
            
            if (availableChannels === 0) return null;
            
            return (
              <div className="pt-3 border-t border-brand-gray/20">
                <p className="text-[10px] text-brand-black/60 uppercase tracking-wide font-semibold mb-2 leading-tight">Quick Access to Listings</p>
                <div className={`grid grid-cols-1 ${availableChannels === 1 ? 'md:grid-cols-1' : availableChannels === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-2`}>
                  {/* WhatsApp Preview */}
                  {hasWhatsapp && (
                    <div 
                      className={`border border-brand-gray/20 bg-brand-white p-2.5 hover:border-green-600/50 hover:shadow-md transition-all group ${
                        isScrolling ? 'cursor-wait opacity-60' : 'cursor-pointer'
                      }`}
                      style={{ borderRadius: '0px' }}
                      onClick={() => {
                        if (isScrolling) return;
                        setIsScrolling(true);
                        const element = sectionRefs.current['whatsapp'];
                        if (element) {
                          // Scroll with offset for sticky nav
                          const yOffset = -80;
                          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                          // Auto-expand if collapsed
                          setTimeout(() => {
                            const button = element.querySelector('button[aria-expanded]') as HTMLButtonElement;
                            if (button && button.getAttribute('aria-expanded') === 'false') {
                              button.click();
                            }
                            setIsScrolling(false);
                          }, 600);
                        } else {
                          setIsScrolling(false);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-1.5 h-1.5 bg-green-600"></div>
                        <h4 className="text-[10px] font-semibold text-brand-black uppercase tracking-wide leading-tight">WhatsApp & Reseller</h4>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-brand-black/60 leading-tight">Best Price</span>
                          <span className="text-sm font-mono-numeric font-bold text-green-600 leading-tight">
                            {whatsappPrices.buy.length > 0 
                              ? `₹${whatsappPrices.buy[0].price.toLocaleString('en-IN')}`
                              : whatsappPrices.sell.length > 0
                              ? `₹${whatsappPrices.sell[0].price.toLocaleString('en-IN')}`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-brand-black/60 leading-tight">
                          <span>
                            {whatsappTotal} {whatsappTotal === 1 ? 'listing' : 'listings'}
                            {whatsappPrices.buy.length > 0 && whatsappPrices.sell.length > 0 && (
                              <span className="text-brand-black/40"> ({whatsappPrices.buy.length} sellers, {whatsappPrices.sell.length} buyers)</span>
                            )}
                          </span>
                          <span className="group-hover:text-green-600 transition-colors">
                            View all →
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Marketplace Preview */}
                  {hasMarketplace && (
                    <div 
                      className={`border border-brand-gray/20 bg-brand-white p-2.5 hover:border-blue-600/50 hover:shadow-md transition-all group ${
                        isScrolling ? 'cursor-wait opacity-60' : 'cursor-pointer'
                      }`}
                      style={{ borderRadius: '0px' }}
                      onClick={() => {
                        if (isScrolling) return;
                        setIsScrolling(true);
                        const element = sectionRefs.current['marketplace'];
                        if (element) {
                          const yOffset = -80;
                          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                          setTimeout(() => {
                            const button = element.querySelector('button[aria-expanded]') as HTMLButtonElement;
                            if (button && button.getAttribute('aria-expanded') === 'false') {
                              button.click();
                            }
                            setIsScrolling(false);
                          }, 600);
                        } else {
                          setIsScrolling(false);
                        }
                      }}
                    >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-600"></div>
                    <h4 className="text-[10px] font-semibold text-brand-black uppercase tracking-wide leading-tight">Indian Marketplaces</h4>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] text-brand-black/60 leading-tight">Cheapest</span>
                      <span className="text-sm font-mono-numeric font-bold text-blue-600 leading-tight">
                        ₹{marketplacePrices[0].price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-brand-black/60 leading-tight">
                      <span>{marketplacePrices.length} listings</span>
                      <span className="group-hover:text-blue-600 transition-colors">
                        View all →
                      </span>
                    </div>
                  </div>
                </div>
              )}

                  {/* International Preview */}
                  {hasInternational && (
                    <div 
                      className={`border border-brand-gray/20 bg-brand-white p-2.5 hover:border-purple-600/50 hover:shadow-md transition-all group ${
                        isScrolling ? 'cursor-wait opacity-60' : 'cursor-pointer'
                      }`}
                      style={{ borderRadius: '0px' }}
                      onClick={() => {
                        if (isScrolling) return;
                        setIsScrolling(true);
                        const element = sectionRefs.current['international'];
                        if (element) {
                          const yOffset = -80;
                          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                          setTimeout(() => {
                            const button = element.querySelector('button[aria-expanded]') as HTMLButtonElement;
                            if (button && button.getAttribute('aria-expanded') === 'false') {
                              button.click();
                            }
                            setIsScrolling(false);
                          }, 600);
                        } else {
                          setIsScrolling(false);
                        }
                      }}
                    >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 bg-purple-600"></div>
                    <h4 className="text-[10px] font-semibold text-brand-black uppercase tracking-wide leading-tight">International</h4>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] text-brand-black/60 leading-tight">Best Landed</span>
                      <span className="text-sm font-mono-numeric font-bold text-purple-600 leading-tight">
                        ₹{Math.min(...internationalPrices.map(p => p.price + (p.reshippingCost || 0))).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-brand-black/60 leading-tight">
                      <span>{internationalPrices.length} listings</span>
                      <span className="group-hover:text-purple-600 transition-colors">
                        View all →
                      </span>
                    </div>
                  </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </CollapsibleSection>
      </div>

      {/* Market Channels - Channel-Based Structure */}
      <div className="space-y-3">
        {/* Mobile: Tab Navigation */}
        <div className="md:hidden border-b border-brand-gray/20 pb-2 mb-3">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveMobileTab('whatsapp')}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeMobileTab === 'whatsapp'
                  ? 'border-brand-black text-brand-black'
                  : 'border-transparent text-brand-black/60'
              }`}
            >
              <span>WhatsApp</span>
              {(whatsappPrices.buy.length + whatsappPrices.sell.length) > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                  activeMobileTab === 'whatsapp'
                    ? 'bg-brand-black text-white'
                    : 'bg-brand-gray/20 text-brand-black/70'
                }`}>
                  {whatsappPrices.buy.length + whatsappPrices.sell.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveMobileTab('marketplace')}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeMobileTab === 'marketplace'
                  ? 'border-brand-black text-brand-black'
                  : 'border-transparent text-brand-black/60'
              }`}
            >
              <span>Marketplace</span>
              {marketplacePrices.length > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                  activeMobileTab === 'marketplace'
                    ? 'bg-brand-black text-white'
                    : 'bg-brand-gray/20 text-brand-black/70'
                }`}>
                  {marketplacePrices.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveMobileTab('international')}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeMobileTab === 'international'
                  ? 'border-brand-black text-brand-black'
                  : 'border-transparent text-brand-black/60'
              }`}
            >
              <span>International</span>
              {internationalPrices.length > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                  activeMobileTab === 'international'
                    ? 'bg-brand-black text-white'
                    : 'bg-brand-gray/20 text-brand-black/70'
                }`}>
                  {internationalPrices.length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Full-width stacked sections on desktop, tabbed on mobile */}
        <div className="space-y-3">
        
          {/* WhatsApp Groups & Reseller Networks */}
          <div 
            ref={(el) => (sectionRefs.current['whatsapp'] = el)}
            className={`${activeMobileTab !== 'whatsapp' ? 'hidden md:block' : ''}`}
            data-section="whatsapp"
          >
            <CollapsibleSection
            title="WhatsApp & Reseller Networks"
            subtitle="Mixed B2B/B2C transactions • Fast liquidity"
            defaultOpen={true}
            listingCount={whatsappPrices.buy.length + whatsappPrices.sell.length}
            bestPrice={
              whatsappPrices.buy.length > 0 
                ? whatsappPrices.buy[0].price 
                : whatsappPrices.sell.length > 0 
                ? whatsappPrices.sell[0].price 
                : undefined
            }
            priceLabel="Best"
          >
            <div className="space-y-3">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pb-3 border-b border-brand-gray/20">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5 block">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price' | 'quantity' | 'newest')}
                    className="w-full text-xs border border-brand-gray/30 bg-brand-white px-3 py-2 text-brand-black focus:outline-none focus:border-brand-black"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="price">Price: Low to High</option>
                    <option value="quantity">Quantity: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
                {whatsappPrices.buy.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5 block">Location:</label>
                    <select
                      value={filterLocation || ''}
                      onChange={(e) => setFilterLocation(e.target.value || null)}
                      className="w-full text-xs border border-brand-gray/30 bg-brand-white px-3 py-2 text-brand-black focus:outline-none focus:border-brand-black"
                      style={{ borderRadius: '0px' }}
                    >
                      <option value="">All Locations</option>
                      {Array.from(new Set(whatsappPrices.buy.map((p: PricePoint) => p.sellerLocation).filter((loc): loc is string => Boolean(loc)))).map((loc: string) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Buy From (Sellers) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-brand-black/70 uppercase tracking-wide font-semibold">
                    Buy From (Sellers)
                  </p>
                  {whatsappPrices.buy.length > 0 && (
                    <span className="text-xs text-brand-black/50">
                      {whatsappPrices.buy.length} {whatsappPrices.buy.length === 1 ? 'seller' : 'sellers'}
                    </span>
                  )}
                </div>
                {whatsappPrices.buy.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {whatsappPrices.buy.map((point: PricePoint, idx: number) => {
                      const minPrice = Math.min(...whatsappPrices.buy.map((p: PricePoint) => p.price));
                      const maxPrice = Math.max(...whatsappPrices.buy.map((p: PricePoint) => p.price));
                      const priceRange = maxPrice - minPrice;
                      const pricePercent = priceRange > 0 ? ((point.price - minPrice) / priceRange) * 100 : 0;
                      
                      return (
                        <div key={idx} className="p-5 bg-brand-white border border-brand-gray/20 hover:border-green-600/50 hover:shadow-md transition-all group" style={{ borderRadius: '0px' }}>
                          <div className="flex flex-col h-full">
                            {/* Price - Most Prominent */}
                            <div className="flex items-baseline justify-between gap-2 mb-3">
                              <p className="text-2xl font-bold text-green-600">
                                ₹{point.price.toLocaleString('en-IN')}
                              </p>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-green-600 text-white">
                                  Best
                                </span>
                              )}
                            </div>
                            
                            {/* Visual Price Comparison Bar */}
                            {whatsappPrices.buy.length > 1 && (
                              <div className="mb-3">
                                <div 
                                  className="h-1.5 bg-brand-gray/20 relative overflow-hidden cursor-help"
                                  title={`Price comparison: Longer bar = better deal. This listing is ${pricePercent.toFixed(0)}% above the lowest price.`}
                                >
                                  <div 
                                    className="h-full bg-green-600/40 absolute left-0"
                                    style={{ width: `${100 - pricePercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Seller Info */}
                            <p className="text-sm font-semibold text-brand-black truncate mb-2">
                              {point.sellerName || point.source || 'Seller'}
                            </p>
                            
                            {/* Metadata - Simplified */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-brand-black/60 mb-4">
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                {point.listingCount} {point.listingCount === 1 ? 'pair' : 'pairs'}
                              </span>
                              {point.lastSeen && (
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {formatLastSeen(point.lastSeen)}
                                </span>
                              )}
                              {point.sellerLocation && (
                                <span className="truncate flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {point.sellerLocation}
                                </span>
                              )}
                            </div>
                            
                            {/* Action Button */}
                            {point.sellerContact && (
                              <div className="mt-auto">
                                <a
                                  href={`https://wa.me/${point.sellerContact.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-full py-2.5 bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
                                  style={{ borderRadius: '0px' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                  Contact
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No sellers available"
                    description="No WhatsApp sellers found for this size"
                  />
                )}
              </div>

              {/* Sell To (Buyers) */}
              {whatsappPrices.sell.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-brand-black/70 uppercase tracking-wide font-semibold">
                      Sell To (Buyers)
                    </p>
                    <span className="text-xs text-brand-black/50">
                      {whatsappPrices.sell.length} {whatsappPrices.sell.length === 1 ? 'buyer' : 'buyers'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {whatsappPrices.sell.map((point: PricePoint, idx: number) => {
                      const maxPrice = Math.max(...whatsappPrices.sell.map((p: PricePoint) => p.price));
                      const minPrice = Math.min(...whatsappPrices.sell.map((p: PricePoint) => p.price));
                      const priceRange = maxPrice - minPrice;
                      const pricePercent = priceRange > 0 ? ((point.price - minPrice) / priceRange) * 100 : 0;
                      
                      return (
                        <div key={idx} className="p-5 bg-brand-white border border-brand-gray/20 hover:border-blue-600/50 hover:shadow-md transition-all group" style={{ borderRadius: '0px' }}>
                          <div className="flex flex-col h-full">
                            {/* Price - Most Prominent */}
                            <div className="flex items-baseline justify-between gap-2 mb-3">
                              <p className="text-2xl font-bold text-blue-600">
                                ₹{point.price.toLocaleString('en-IN')}
                              </p>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-blue-600 text-white">
                                  Highest
                                </span>
                              )}
                            </div>
                            
                            {/* Visual Price Comparison Bar */}
                            {whatsappPrices.sell.length > 1 && (
                              <div className="mb-3">
                                <div 
                                  className="h-1.5 bg-brand-gray/20 relative overflow-hidden cursor-help"
                                  title={`Price comparison: Longer bar = higher offer. This listing is ${pricePercent.toFixed(0)}% above the lowest offer.`}
                                >
                                  <div 
                                    className="h-full bg-blue-600/40 absolute left-0"
                                    style={{ width: `${pricePercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Buyer Info */}
                            <p className="text-sm font-semibold text-brand-black truncate mb-2">
                              {point.sellerName || point.source || 'Buyer'}
                            </p>
                            
                            {/* Metadata - Simplified */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-brand-black/60 mb-4">
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                {point.listingCount} {point.listingCount === 1 ? 'pair' : 'pairs'}
                              </span>
                              {point.lastSeen && (
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {formatLastSeen(point.lastSeen)}
                                </span>
                              )}
                              {point.sellerLocation && (
                                <span className="truncate flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {point.sellerLocation}
                                </span>
                              )}
                            </div>
                            
                            {/* Action Button */}
                            {point.sellerContact && (
                              <div className="mt-auto">
                                <a
                                  href={`https://wa.me/${point.sellerContact.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-full py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                                  style={{ borderRadius: '0px' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                  Contact
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
          </div>

          {/* Indian Marketplaces */}
          <div 
            ref={(el) => (sectionRefs.current['marketplace'] = el)}
            className={`${activeMobileTab !== 'marketplace' ? 'hidden md:block' : ''}`}
            data-section="marketplace"
          >
            <CollapsibleSection
            title="Indian Marketplaces"
            subtitle="All marketplace listings • Transparent pricing"
            defaultOpen={true}
            listingCount={marketplacePrices.length}
            bestPrice={marketplacePrices.length > 0 ? marketplacePrices[0].price : undefined}
            priceLabel="Cheapest"
          >
            <div className="space-y-3">
              {/* Controls */}
              <div className="pb-3 border-b border-brand-gray/20">
                <label className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5 block">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'price' | 'quantity' | 'newest')}
                  className="w-full text-xs border border-brand-gray/30 bg-brand-white px-3 py-2 text-brand-black focus:outline-none focus:border-brand-black"
                  style={{ borderRadius: '0px' }}
                >
                  <option value="price">Price: Low to High</option>
                  <option value="quantity">Quantity: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {/* Listings */}
              {marketplacePrices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {marketplacePrices.map((point: PricePoint, idx: number) => {
                    const minPrice = Math.min(...marketplacePrices.map((p: PricePoint) => p.price));
                    const maxPrice = Math.max(...marketplacePrices.map((p: PricePoint) => p.price));
                    const priceRange = maxPrice - minPrice;
                    const pricePercent = priceRange > 0 ? ((point.price - minPrice) / priceRange) * 100 : 0;
                    
                    return (
                      <div key={idx} className="p-5 bg-brand-white border border-brand-gray/20 hover:border-blue-600/50 hover:shadow-md transition-all group" style={{ borderRadius: '0px' }}>
                        <div className="flex flex-col h-full">
                          {/* Price - Most Prominent */}
                          <div className="flex items-baseline justify-between gap-2 mb-3">
                            <p className="text-2xl font-bold text-blue-600">
                              ₹{point.price.toLocaleString('en-IN')}
                            </p>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-blue-600 text-white">
                                Cheapest
                              </span>
                            )}
                          </div>
                          
                          {/* Visual Price Comparison Bar */}
                          {marketplacePrices.length > 1 && (
                            <div className="mb-3">
                              <div 
                                className="h-1.5 bg-brand-gray/20 relative overflow-hidden cursor-help"
                                title={`Price comparison: Longer bar = better deal. This listing is ${pricePercent.toFixed(0)}% above the cheapest price.`}
                              >
                                <div 
                                  className="h-full bg-blue-600/40 absolute left-0"
                                  style={{ width: `${100 - pricePercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Marketplace Info */}
                          <p className="text-sm font-semibold text-brand-black truncate mb-2">
                            {point.marketplaceName || point.source || 'Marketplace'}
                          </p>
                          
                          {/* Metadata - Simplified */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-brand-black/60 mb-4">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              {point.listingCount} {point.listingCount === 1 ? 'listing' : 'listings'}
                            </span>
                            {point.lastSeen && (
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatLastSeen(point.lastSeen)}
                              </span>
                            )}
                          </div>
                          
                          {/* Action Button */}
                          {point.url && (
                            <div className="mt-auto">
                              <a
                                href={point.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-full py-2.5 border border-brand-gray/30 hover:border-brand-black hover:bg-brand-black hover:text-white transition-all text-sm font-medium"
                                style={{ borderRadius: '0px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View Listing
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No marketplace listings"
                  description="No listings found on Indian marketplaces"
                />
              )}
            </div>
          </CollapsibleSection>
          </div>

          {/* International Platforms */}
          <div 
            ref={(el) => (sectionRefs.current['international'] = el)}
            className={`${activeMobileTab !== 'international' ? 'hidden md:block' : ''}`}
            data-section="international"
          >
            <CollapsibleSection
            title="International Platforms"
            subtitle="StockX, Goat, eBay • Authentication included"
            defaultOpen={true}
            listingCount={internationalPrices.length}
            bestPrice={internationalPrices.length > 0 
              ? Math.min(...internationalPrices.map(p => p.price + (p.reshippingCost || 0)))
              : undefined}
            priceLabel="Best Landed"
          >
            <div className="space-y-3">
              {/* Controls */}
              <div className="pb-3 border-b border-brand-gray/20">
                <label className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5 block">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'price' | 'quantity' | 'newest')}
                  className="w-full text-xs border border-brand-gray/30 bg-brand-white px-3 py-2 text-brand-black focus:outline-none focus:border-brand-black"
                  style={{ borderRadius: '0px' }}
                >
                  <option value="price">Total Landed: Low to High</option>
                  <option value="quantity">Quantity: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {/* Platform Listings */}
              {internationalPrices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {internationalPrices.map((point: PricePoint, idx: number) => {
                    const reshippingCost = point.reshippingCost || 0;
                    const platformPrice = point.price;
                    const totalLanded = platformPrice + reshippingCost;
                    const allTotals = internationalPrices.map(p => p.price + (p.reshippingCost || 0));
                    const minTotal = Math.min(...allTotals);
                    const maxTotal = Math.max(...allTotals);
                    const totalRange = maxTotal - minTotal;
                    const totalPercent = totalRange > 0 ? ((totalLanded - minTotal) / totalRange) * 100 : 0;
                    const isCheapest = idx === 0 || totalLanded === minTotal;
                    
                    return (
                      <div key={idx} className="p-5 bg-brand-white border border-brand-gray/20 hover:border-purple-600/50 hover:shadow-md transition-all group" style={{ borderRadius: '0px' }}>
                        <div className="flex flex-col h-full">
                          {/* Price - Most Prominent */}
                          <div className="flex items-baseline justify-between gap-2 mb-3">
                            <p className="text-2xl font-bold text-purple-600">
                              ₹{totalLanded.toLocaleString('en-IN')}
                            </p>
                            {isCheapest && (
                              <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-purple-600 text-white">
                                Best
                              </span>
                            )}
                          </div>
                          
                          {/* Visual Price Comparison Bar */}
                          {internationalPrices.length > 1 && (
                            <div className="mb-3">
                              <div 
                                className="h-1.5 bg-brand-gray/20 relative overflow-hidden cursor-help"
                                title={`Price comparison: Longer bar = better deal. This listing is ${totalPercent.toFixed(0)}% above the best landed price.`}
                              >
                                <div 
                                  className="h-full bg-purple-600/40 absolute left-0"
                                  style={{ width: `${100 - totalPercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Price Breakdown - Inline */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2 text-xs text-brand-black/60">
                            <span>Platform: ₹{platformPrice.toLocaleString('en-IN')}</span>
                            {reshippingCost > 0 && (
                              <>
                                <span>+</span>
                                <span>Shipping: ₹{reshippingCost.toLocaleString('en-IN')}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Platform Info */}
                          <p className="text-sm font-semibold text-brand-black truncate mb-2">
                            {point.marketplaceName || point.source || 'International Platform'}
                          </p>
                          
                          {/* Metadata - Simplified */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-brand-black/60 mb-4">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              {point.listingCount} {point.listingCount === 1 ? 'listing' : 'listings'}
                            </span>
                            {point.lastSeen && (
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatLastSeen(point.lastSeen)}
                              </span>
                            )}
                          </div>
                          
                          {/* Action Button */}
                          {point.url && (
                            <div className="mt-auto">
                              <a
                                href={point.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-full py-2.5 border border-brand-gray/30 hover:border-brand-black hover:bg-brand-black hover:text-white transition-all text-sm font-medium"
                                style={{ borderRadius: '0px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View Listing
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No international listings"
                  description="No listings found on international platforms"
                />
              )}
            </div>
          </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Performance Metrics - Collapsible */}
      <div ref={(el) => (sectionRefs.current['performance'] = el)}>
        <CollapsibleSection
        title="Performance Metrics"
        subtitle="Historical performance and volatility data"
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div>
            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">30d Change</p>
            <p
              className={`text-2xl font-semibold ${
                currentData.change30d?.startsWith("-")
                  ? "text-red-600"
                  : currentData.change30d?.startsWith("+")
                  ? "text-green-600"
                  : "text-brand-black"
              }`}
            >
              {currentData.change30d || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">90d Change</p>
            <p
              className={`text-2xl font-semibold ${
                currentData.change90d?.startsWith("-")
                  ? "text-red-600"
                  : currentData.change90d?.startsWith("+")
                  ? "text-green-600"
                  : "text-brand-black"
              }`}
            >
              {currentData.change90d || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">Volatility</p>
            <p className="text-2xl font-semibold text-brand-black capitalize">{asset.volatility || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">Last Updated</p>
            <p className="text-sm font-medium text-brand-black">
              {currentData.lastUpdated 
                ? new Date(currentData.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : "—"}
            </p>
          </div>
        </div>
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
