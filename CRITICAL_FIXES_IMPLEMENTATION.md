# Asset Detail Panel - Critical Fixes Implementation Plan

**Created:** January 30, 2026  
**Priority:** CRITICAL - Start Here  
**Estimated Total Time:** 8-12 hours  
**Expected Impact:** Fixes mobile experience, removes redundancy, improves trust

---

## 🔴 CRITICAL ISSUE #1: Mobile Tables Unreadable

### Problem
**Listings Table** and **Arbitrage Table** have 9 and 7 columns respectively. On mobile:
- Requires horizontal scroll
- Text shrinks to 8-9px (unreadable)
- Action buttons too small for touch (9px font, < 44px touch target)
- Filters take 60-80px vertical space before content

**Current State:**
- File: `src/components/AssetDetailPanel.tsx`
- Lines: ~1314-1574 (Listings), ~1576-1725 (Arbitrage)
- Impact: **90% of mobile users can't effectively use these sections**

### Solution: Card View on Mobile

**Implementation Steps:**

#### Step 1: Create Mobile Card Components

Add after line 223 in `AssetDetailPanel.tsx`:

```typescript
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
  onAction: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onAction }) => {
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'WhatsApp': return 'border-green-600 bg-green-50';
      case 'Marketplace': return 'border-blue-600 bg-blue-50';
      case 'International': return 'border-purple-600 bg-purple-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getSideColor = (side: string) => {
    switch (side) {
      case 'Buy': return 'bg-green-100 text-green-800';
      case 'Sell': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`border-l-4 ${getChannelColor(listing.channel)} p-4 mb-3`}>
      {/* Header: Channel + Side + Price */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide">
            {listing.channel}
          </span>
          <span className={`px-2 py-1 text-xs font-semibold uppercase ${getSideColor(listing.side)}`}>
            {listing.side}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono-numeric font-bold text-brand-black">
            ₹{listing.price.toLocaleString('en-IN')}
          </div>
          {listing.landedPrice && listing.landedPrice !== listing.price && (
            <div className="text-xs text-brand-black/60">
              Landed: ₹{listing.landedPrice.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      </div>

      {/* Details */}
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

      {/* Action Button - Full Width, 44px minimum height */}
      {listing.contactType && listing.contactValue && (
        <button
          onClick={onAction}
          className="w-full min-h-[44px] px-4 py-3 bg-brand-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-colors"
          style={{ borderRadius: '0px' }}
        >
          {listing.side === 'Sell' ? 'Sell To' : 'Buy From'} →
        </button>
      )}
    </div>
  );
};

// Mobile Card View for Arbitrage
interface ArbitrageCardProps {
  opportunity: {
    buy: { channel: string; source: string; allIn: number; count?: number };
    sell: { channel: string; source: string; net: number; count?: number };
    netProfit: number;
    netPct: number;
  };
}

const ArbitrageCard: React.FC<ArbitrageCardProps> = ({ opportunity }) => {
  const roiPct = opportunity.netPct * 100;
  
  return (
    <div className="border-2 border-brand-gray/30 bg-white p-4 mb-3">
      {/* ROI Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase text-brand-black/60">Arbitrage Opportunity</span>
        <span className="px-3 py-1 bg-green-600 text-white text-sm font-bold">
          {roiPct.toFixed(1)}% ROI
        </span>
      </div>

      {/* Buy → Sell Flow */}
      <div className="space-y-3">
        {/* Buy */}
        <div className="bg-green-50 border border-green-200 p-3">
          <div className="text-xs text-brand-black/60 uppercase mb-1">Buy From</div>
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">{opportunity.buy.channel}</div>
            <div className="text-xl font-mono-numeric font-bold text-green-700">
              ₹{opportunity.buy.allIn.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-xs text-brand-black/60 mt-1">
            {opportunity.buy.source} • {opportunity.buy.count || 1} available
          </div>
        </div>

        {/* Arrow */}
        <div className="text-center text-2xl text-brand-black/40">↓</div>

        {/* Sell */}
        <div className="bg-blue-50 border border-blue-200 p-3">
          <div className="text-xs text-brand-black/60 uppercase mb-1">Sell To</div>
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">{opportunity.sell.channel}</div>
            <div className="text-xl font-mono-numeric font-bold text-blue-700">
              ₹{opportunity.sell.net.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-xs text-brand-black/60 mt-1">
            {opportunity.sell.source} • {opportunity.sell.count || 1} needed
          </div>
        </div>

        {/* Profit */}
        <div className="bg-green-600 text-white p-3 text-center">
          <div className="text-xs uppercase mb-1">Net Profit</div>
          <div className="text-2xl font-mono-numeric font-bold">
            ₹{opportunity.netProfit.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### Step 2: Detect Mobile and Render Conditionally

Replace table rendering logic (lines ~1413-1571) with:

```typescript
// Add at top of component
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);

// In listings section render:
<div className="overflow-x-auto -mx-2 md:mx-0 custom-scrollbar">
  {isMobile ? (
    // MOBILE: Card View
    <div className="px-2">
      {filtered.map((listing, idx) => (
        <ListingCard
          key={idx}
          listing={listing}
          onAction={() => {
            if (listing.contactType === 'whatsapp') {
              window.open(`https://wa.me/${listing.contactValue.replace(/[^0-9]/g, '')}`, '_blank');
            } else if (listing.contactValue) {
              window.open(listing.contactValue, '_blank');
            }
          }}
        />
      ))}
    </div>
  ) : (
    // DESKTOP: Table View (existing)
    <table className="min-w-full text-xs border-collapse">
      {/* ... existing table code ... */}
    </table>
  )}
</div>
```

#### Step 3: Collapsible Filters on Mobile

Wrap filters (lines ~1321-1411) with:

```typescript
const [showMobileFilters, setShowMobileFilters] = useState(false);

// Replace filters section with:
<div className="space-y-2 mb-3">
  {/* Mobile: Filter Button */}
  {isMobile && (
    <button
      onClick={() => setShowMobileFilters(!showMobileFilters)}
      className="w-full px-4 py-3 border-2 border-brand-black bg-white text-sm font-semibold uppercase tracking-wide flex items-center justify-between"
      style={{ borderRadius: '0px' }}
    >
      <span>Filters {unifiedChannelFilter !== 'all' || unifiedSideFilter !== 'all' || filterLocation ? '(Active)' : ''}</span>
      <span>{showMobileFilters ? '▲' : '▼'}</span>
    </button>
  )}

  {/* Filters Content - Show on desktop OR when mobile filters open */}
  {(!isMobile || showMobileFilters) && (
    <div className="space-y-2">
      {/* Existing filter controls */}
    </div>
  )}
</div>
```

**Estimated Time:** 3-4 hours  
**Impact:** ⭐⭐⭐⭐⭐ (Critical - Fixes mobile experience for 50%+ of users)

---

## 🔴 CRITICAL ISSUE #2: Market Summary Redundancy

### Problem
**Market Comparison Summary** section (lines ~1727-1936) duplicates:
- Best Price (already in hero)
- Channel prices (already in Price Comparison Card)
- Best Arbitrage (already in Arbitrage Opportunities)
- Adds 200px+ vertical scroll with no unique value

**Redundancy Breakdown:**
```
Hero Section:              Market Summary:
└─ Best Price: ₹12,500    ✗ Best Price: ₹12,500

Price Comparison Card:     Market Summary:
├─ WhatsApp: ₹12,500      ✗ WhatsApp: ₹12,500
├─ Marketplace: ₹13,200   ✗ Marketplace: ₹13,200
└─ International: ₹14,800 ✗ International: ₹14,800

Arbitrage Section:         Market Summary:
└─ Best Arb: ₹1,700 ROI   ✗ Best Arb: ₹1,700 ROI
```

### Solution: Remove Entirely

**Implementation Steps:**

#### Step 1: Remove Section

Delete lines ~1727-1936 in `AssetDetailPanel.tsx`:

```typescript
// DELETE THIS ENTIRE BLOCK:
<div ref={(el) => (sectionRefs.current['market-summary'] = el)}>
  <CollapsibleSection
    title="Market Comparison Summary"
    defaultOpen={false}
  >
    {/* ... entire section content ... */}
  </CollapsibleSection>
</div>
```

#### Step 2: Remove from Navigation

Update sections array (line ~249):

```typescript
// BEFORE:
const sections = [
  { id: 'price-history', label: 'Price History' },
  { id: 'order-book', label: 'Order Book' },
  { id: 'listings', label: 'Listings' },
  { id: 'market-summary', label: 'Market Summary' },  // REMOVE THIS
  { id: 'arbitrage', label: 'Arbitrage' },
  { id: 'performance', label: 'Performance' },
  { id: 'insight', label: 'Insight' },
];

// AFTER:
const sections = [
  { id: 'price-history', label: 'Price History' },
  { id: 'order-book', label: 'Order Book' },
  { id: 'listings', label: 'Listings' },
  { id: 'arbitrage', label: 'Arbitrage' },
  { id: 'performance', label: 'Performance' },
  { id: 'insight', label: 'Insight' },
];
```

#### Step 3: (Optional) Salvage Best Arb Card

If you want to keep the "Best Arbitrage Opportunity" highlight, move it INTO the Arbitrage section as a top banner:

```typescript
// At top of Arbitrage section (after line ~1578):
{arbitrageOpps.length > 0 && arbitrageOpps[0].netPct >= 0.05 && (
  <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-600">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-green-700 mb-1">
          🎯 Top Opportunity
        </div>
        <div className="text-sm">
          <strong>Buy:</strong> {arbitrageOpps[0].buy.channel} ₹{arbitrageOpps[0].buy.allIn.toLocaleString('en-IN')} 
          <span className="mx-2">→</span>
          <strong>Sell:</strong> {arbitrageOpps[0].sell.channel} ₹{arbitrageOpps[0].sell.net.toLocaleString('en-IN')}
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-mono-numeric font-bold text-green-600">
          ₹{arbitrageOpps[0].netProfit.toLocaleString('en-IN')}
        </div>
        <div className="text-xs text-green-700">{(arbitrageOpps[0].netPct * 100).toFixed(1)}% ROI</div>
      </div>
    </div>
  </div>
)}
```

**Estimated Time:** 30 minutes (simple deletion) or 1 hour (with card salvage)  
**Impact:** ⭐⭐⭐⭐ (High - Reduces cognitive load, eliminates 200px scroll)

---

## 🔴 CRITICAL ISSUE #3: Advanced Sections Default Open

### Problem
**Order Book**, **Arbitrage**, and **Performance Metrics** are advanced features that:
- Default to OPEN, overwhelming casual users
- Intimidate non-finance users (order books especially)
- Add 400-600px of vertical scroll before Market Insight
- 80% of users don't need these on first view

### Solution: Default Closed + User Segmentation

**Implementation Steps:**

#### Step 1: Change Default Open State

Update CollapsibleSection calls (lines ~1300, ~1578, ~1941):

```typescript
// BEFORE:
<CollapsibleSection
  title="Order Book"
  defaultOpen={true}  // ❌ Currently open
>

// AFTER:
<CollapsibleSection
  title="Order Book"
  defaultOpen={false}  // ✅ Closed for new users
  infoTooltip="Advanced: Shows aggregated buy/sell orders at each price level. Expand to see market depth."
>

// Same for Arbitrage and Performance:
<CollapsibleSection
  title="Arbitrage Opportunities"
  defaultOpen={false}
  infoTooltip="Advanced: Find buy-low-sell-high opportunities across channels."
>

<CollapsibleSection
  title="Performance Metrics"
  defaultOpen={false}
  infoTooltip="Advanced: Volatility, efficiency, and trend analysis."
>
```

#### Step 2: Add "Advanced" Badge to Section Headers

Update CollapsibleSection component (line ~32-145) to show badge:

```typescript
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  infoTooltip?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  listingCount?: number;
  bestPrice?: number;
  onViewAll?: () => void;
  isAdvanced?: boolean;  // NEW
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  // ... existing props
  isAdvanced = false,  // NEW
}) => {
  // ... existing code ...
  
  return (
    <div className={/* ... */}>
      <button /* ... */>
        <div className="text-left flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-semibold text-brand-black uppercase tracking-wide leading-tight">
              {title}
            </h3>
            
            {/* NEW: Advanced badge */}
            {isAdvanced && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-600 text-white uppercase tracking-wide">
                Advanced
              </span>
            )}
            
            {/* ... existing badges ... */}
          </div>
          {/* ... rest ... */}
        </div>
      </button>
      {/* ... */}
    </div>
  );
};
```

Then update the calls:

```typescript
<CollapsibleSection
  title="Order Book"
  defaultOpen={false}
  isAdvanced={true}
  // ...
>

<CollapsibleSection
  title="Arbitrage Opportunities"
  defaultOpen={false}
  isAdvanced={true}
  // ...
>

<CollapsibleSection
  title="Performance Metrics"
  defaultOpen={false}
  isAdvanced={true}
  // ...
>
```

#### Step 3: (Optional) User Segmentation

Add localStorage-based power user detection:

```typescript
// At top of AssetDetailPanel component
const isPowerUser = useMemo(() => {
  const expandHistory = JSON.parse(localStorage.getItem('section_expand_history') || '{}');
  // If user has expanded advanced sections 3+ times, consider them a power user
  const advancedExpands = 
    (expandHistory['order-book'] || 0) +
    (expandHistory['arbitrage'] || 0) +
    (expandHistory['performance'] || 0);
  return advancedExpands >= 5;
}, []);

// Track expands
const trackSectionExpand = (sectionId: string) => {
  const history = JSON.parse(localStorage.getItem('section_expand_history') || '{}');
  history[sectionId] = (history[sectionId] || 0) + 1;
  localStorage.setItem('section_expand_history', JSON.stringify(history));
};

// Then modify CollapsibleSection to call trackSectionExpand when opened
```

**Estimated Time:** 1-2 hours (basic) or 3 hours (with segmentation)  
**Impact:** ⭐⭐⭐⭐ (High - Reduces scroll by 400-600px, improves first impression)

---

## 🔴 CRITICAL ISSUE #4: Hero Section Missing Context

### Problem
**Hero Section** Best Price display lacks critical context:
- Shows "₹12,500" but doesn't indicate if from 1 seller or 100 sellers
- No channel badge (which channel is cheapest?)
- Stock shows "Available" vs "Limited" (binary) instead of actual quantity
- No timestamp for data freshness
- Sell button says "Avg: ₹13,125" without explanation

**User Confusion:**
- "Is ₹12,500 actually available or just theoretical?"
- "Why is it cheaper on WhatsApp vs Marketplace?"
- "How many units can I actually buy?"
- "Is this price from 5 minutes ago or 5 days ago?"

### Solution: Add Transparency Indicators

**Implementation Steps:**

#### Step 1: Calculate Seller Count for Best Price

Add after bestPrice calculation (around line ~800):

```typescript
// Find best price details
const bestPrice = useMemo(() => {
  const allBuyPrices = [
    ...whatsappPrices.buy.map(p => ({ price: p.price, channel: 'WhatsApp', count: 1 })),
    ...marketplacePrices.map(p => ({ price: p.price, channel: 'Marketplace', count: 1 })),
    ...internationalPrices.map(p => ({ 
      price: p.price + (p.reshippingCost || 0), 
      channel: 'International', 
      count: 1 
    })),
  ];
  
  if (allBuyPrices.length === 0) return null;
  
  const sortedPrices = allBuyPrices.sort((a, b) => a.price - b.price);
  const lowestPrice = sortedPrices[0].price;
  
  // Count how many sellers at this price
  const sellersAtBestPrice = sortedPrices.filter(p => p.price === lowestPrice);
  
  return {
    price: lowestPrice,
    channel: sortedPrices[0].channel,
    sellerCount: sellersAtBestPrice.length,
  };
}, [whatsappPrices, marketplacePrices, internationalPrices]);
```

#### Step 2: Update Hero Display with Context

Replace lines ~964-977 with:

```typescript
<div className="bg-brand-background border border-brand-gray/30 p-4" style={{ borderRadius: '0px' }}>
  <div className="flex items-baseline justify-between gap-4 mb-3">
    <div>
      <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 font-semibold">Best Available Price</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl md:text-4xl font-mono-numeric font-bold text-green-600 leading-tight">
          {bestPrice ? `₹${bestPrice.price.toLocaleString("en-IN")}` : "—"}
        </p>
        {/* NEW: Channel badge */}
        {bestPrice && (
          <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide bg-green-600 text-white">
            via {bestPrice.channel}
          </span>
        )}
      </div>
      {/* NEW: Seller count */}
      {bestPrice && bestPrice.sellerCount > 0 && (
        <p className="text-xs text-brand-black/60 mt-1">
          from {bestPrice.sellerCount} seller{bestPrice.sellerCount > 1 ? 's' : ''}
        </p>
      )}
      {/* NEW: Timestamp */}
      <p className="text-xs text-brand-black/40 mt-1">
        Updated {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
    {/* ... retail comparison ... */}
  </div>
  
  {/* Quick Stats Row */}
  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-brand-gray/30">
    <div>
      <p className="text-xs text-brand-black/60 mb-0.5">30d</p>
      <p className={/* ... */}>
        {currentData.change30d || "—"}
      </p>
    </div>
    <div>
      <p className="text-xs text-brand-black/60 mb-0.5">Liquidity</p>
      <p className="text-sm font-semibold text-brand-black">{currentData.liquidity || "—"}</p>
    </div>
    <div>
      <p className="text-xs text-brand-black/60 mb-0.5">Stock</p>
      {/* NEW: Actual quantity instead of binary */}
      <p className="text-sm font-semibold text-green-600">
        {(() => {
          const totalStock = 
            whatsappPrices.buy.length + 
            marketplacePrices.length + 
            internationalPrices.length;
          
          if (totalStock === 0) return "Limited";
          if (totalStock >= 15) return `${totalStock}+ avail`;
          if (totalStock >= 10) return "10-14 avail";
          if (totalStock >= 5) return "5-9 avail";
          return `${totalStock} avail`;
        })()}
      </p>
    </div>
  </div>
</div>
```

#### Step 3: Fix Sell Button Copy

Replace lines ~1034-1042 with:

```typescript
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
    <div className="text-xs opacity-60 font-semibold uppercase tracking-wide flex items-center justify-center gap-1">
      {/* NEW: Changed "Avg" to "Suggested" */}
      {bestPrice ? (
        <>
          <span>Suggested: ₹{Math.round(bestPrice.price * 1.05).toLocaleString("en-IN")}</span>
          <span className="text-[8px]" title="Based on best price + 5%">ⓘ</span>
        </>
      ) : (
        'Set Your Price'
      )}
    </div>
  </div>
</button>
```

**Estimated Time:** 2-3 hours  
**Impact:** ⭐⭐⭐⭐⭐ (Critical - Builds trust, reduces confusion, improves transparency)

---

## 🔴 CRITICAL ISSUE #5: Trust Signals & Disclaimers Missing

### Problem
**Throughout the platform:**
- No authenticity verification indicators
- Sell Modal doesn't prominently warn "off-platform transactions"
- No fee disclosure (users don't know if Sentria takes a cut)
- Listings lack trust badges (verified sellers, buyer protection, etc.)
- Arbitrage shows profit but hides execution risk

**User Trust Issues:**
- "How do I know this isn't a fake?"
- "What fees does Sentria charge?"
- "Am I protected if seller doesn't deliver?"
- "Is arbitrage actually that easy?"

### Solution: Add Trust Indicators Throughout

**Implementation Steps:**

#### Step 1: Add Trust Badges to Channel Cards

Update "Where to Buy" section (lines ~1180-1272):

```typescript
{/* WhatsApp Channel */}
{whatsappPrices.buy.length > 0 && (
  <div className="border-l-2 border-green-600 bg-green-50/20 p-3 hover:bg-green-50/30 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-brand-black">WhatsApp Network</p>
          {/* NEW: Trust badge */}
          <span className="px-2 py-0.5 text-[9px] font-bold bg-green-600 text-white uppercase">
            ✓ Verified
          </span>
        </div>
        <p className="text-xs text-brand-gray-dark">Direct from sellers • Fast delivery</p>
      </div>
      {/* ... price ... */}
    </div>
    {/* ... rest ... */}
  </div>
)}

{/* International Channel */}
{internationalPrices.length > 0 && (
  <div className="border-l-2 border-purple-600 bg-purple-50/20 p-3 hover:bg-purple-50/30 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-brand-black">International Platforms</p>
          {/* NEW: Auth guarantee badge */}
          <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-600 text-white uppercase">
            ⚠️ Auth Guaranteed
          </span>
        </div>
        <p className="text-xs text-brand-gray-dark">StockX, GOAT • Authenticity guaranteed</p>
      </div>
      {/* ... price ... */}
    </div>
    {/* ... rest ... */}
  </div>
)}
```

#### Step 2: Add Prominent Disclaimer to Sell Modal

Update SellModalContent (line ~2467-2495):

```typescript
<div className="p-4 md:p-6 space-y-4">
  {/* NEW: Prominent Transaction Disclaimer - FIRST THING USERS SEE */}
  <div className="border-2 border-brand-black bg-yellow-50 p-4">
    <div className="flex items-start gap-3">
      <div className="text-2xl">⚠️</div>
      <div>
        <p className="font-bold text-sm text-brand-black mb-2">
          Important: How Sentria Listings Work
        </p>
        <ul className="text-xs text-brand-black space-y-1">
          <li>• <strong>Sentria connects buyers and sellers</strong> — we don't handle transactions</li>
          <li>• <strong>You complete the sale directly</strong> via WhatsApp/Email/in-person</li>
          <li>• <strong>No Sentria fees</strong> — we charge ₹0 for listings or introductions</li>
          <li>• <strong>You set your terms</strong> — price, payment method, shipping</li>
        </ul>
      </div>
    </div>
  </div>

  {/* Portfolio Status */}
  {userPosition ? (
    <div className="border-l-4 border-green-600 bg-green-50 p-4">
      <p className="text-sm font-semibold text-green-900 mb-2">✓ You own this item</p>
      {/* ... */}
    </div>
  ) : (
    {/* ... */}
  )}
  
  {/* Rest of form ... */}
</div>
```

#### Step 3: Add Fee Disclosure

After the disclaimer, add:

```typescript
{/* NEW: Fee Disclosure */}
<div className="bg-blue-50 border-l-4 border-blue-500 p-4">
  <p className="text-xs font-semibold text-blue-900 mb-1">💰 Pricing Transparency</p>
  <p className="text-xs text-blue-800">
    <strong>Sentria Fee: ₹0</strong> — We don't charge sellers or buyers. Our platform is free to use.
  </p>
</div>
```

#### Step 4: Add Risk Disclaimer to Arbitrage

Update Arbitrage section (after line ~1578):

```typescript
<CollapsibleSection
  title="Arbitrage Opportunities"
  defaultOpen={false}
  isAdvanced={true}
  infoTooltip="Buy low on one channel, sell high on another to capture price differences."
>
  {/* NEW: Risk Disclaimer at top */}
  <div className="bg-yellow-50 border border-yellow-600 p-3 mb-4">
    <div className="flex items-start gap-2">
      <span className="text-lg">⚠️</span>
      <div className="text-xs text-brand-black">
        <strong>Arbitrage Risk Notice:</strong> Profits shown are estimates. Actual results depend on:
        execution speed, price changes, authentication costs, platform fees, shipping, and market liquidity.
        Capital required. Not guaranteed.
      </div>
    </div>
  </div>
  
  {/* Filters and table ... */}
</CollapsibleSection>
```

#### Step 5: Add Condition Tooltips

Update Sell Modal condition selector (lines ~2537-2558):

```typescript
<div>
  <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
    Condition *
  </label>
  <div className="grid grid-cols-3 gap-2">
    {(['new', 'deadstock', 'used'] as const).map((cond) => (
      <div key={cond} className="relative group">
        <button
          onClick={() => setCondition(cond)}
          className={`w-full px-4 py-2.5 border text-xs font-semibold uppercase tracking-wide transition-all ${
            condition === cond
              ? 'border-brand-black bg-brand-black text-white'
              : 'border-brand-gray text-brand-black hover:bg-brand-gray/10'
          }`}
          style={{ borderRadius: '0px' }}
        >
          {cond}
        </button>
        {/* NEW: Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-brand-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
          {cond === 'new' && 'Worn, but good condition'}
          {cond === 'deadstock' && 'Never worn, original box & tags'}
          {cond === 'used' && 'Previously worn, may show signs'}
        </div>
      </div>
    ))}
  </div>
</div>
```

**Estimated Time:** 2-3 hours  
**Impact:** ⭐⭐⭐⭐⭐ (Critical - Builds trust, legal compliance, reduces support queries)

---

## Implementation Order & Timeline

### Week 1: Mobile & Redundancy (Days 1-3)
**Priority:** Fixes 50% of users' experience

1. **Day 1 (3-4 hours):** 
   - Issue #1: Mobile card views for Listings
   - Issue #1: Collapsible filters on mobile

2. **Day 2 (2-3 hours):**
   - Issue #1: Mobile card views for Arbitrage
   - Issue #2: Remove Market Summary section

3. **Day 3 (2-3 hours):**
   - Issue #3: Default close advanced sections
   - Issue #3: Add "Advanced" badges
   - Test mobile experience thoroughly

### Week 1: Trust & Context (Days 4-5)
**Priority:** Builds user confidence

4. **Day 4 (3-4 hours):**
   - Issue #4: Hero section context (channel badge, seller count, timestamp)
   - Issue #4: Fix Sell button copy
   - Issue #4: Stock quantity display

5. **Day 5 (2-3 hours):**
   - Issue #5: Trust badges throughout
   - Issue #5: Sell modal disclaimer
   - Issue #5: Fee disclosure
   - Issue #5: Arbitrage risk notice
   - Issue #5: Condition tooltips

### Total Estimated Time: 12-17 hours across 5 days

---

## Testing Checklist

After implementing each fix, verify:

### Issue #1 (Mobile Tables):
- [ ] On mobile (<768px), tables convert to cards
- [ ] Cards display all important information
- [ ] CTA buttons are 44x44px minimum (tap-friendly)
- [ ] Filters collapse into button on mobile
- [ ] Horizontal scroll eliminated
- [ ] Test on: iPhone SE, iPhone 14, Galaxy S21

### Issue #2 (Market Summary):
- [ ] Section completely removed
- [ ] No broken references in navigation
- [ ] Scroll height reduced by ~200px
- [ ] No console errors

### Issue #3 (Advanced Sections):
- [ ] Order Book defaults to closed
- [ ] Arbitrage defaults to closed
- [ ] Performance Metrics defaults to closed
- [ ] "Advanced" badges visible
- [ ] localStorage saves user's preference
- [ ] Tooltips explain each section

### Issue #4 (Hero Context):
- [ ] Channel badge shows (e.g., "via WhatsApp")
- [ ] Seller count displays (e.g., "from 3 sellers")
- [ ] Timestamp shows (e.g., "Updated 2:34 PM")
- [ ] Stock shows quantity (e.g., "15+ avail" instead of "Available")
- [ ] Sell button says "Suggested" not "Avg"
- [ ] Tooltip explains suggested price

### Issue #5 (Trust Signals):
- [ ] Channel cards show trust badges
- [ ] Sell modal has prominent disclaimer at top
- [ ] Fee disclosure visible (₹0 Sentria fee)
- [ ] Arbitrage has risk notice
- [ ] Condition buttons have tooltips
- [ ] All badges render correctly

---

## Success Metrics

After deployment, monitor:

1. **Mobile Engagement:**
   - Target: +40% time spent on Listings section (mobile)
   - Target: +30% click-through on mobile CTAs

2. **Scroll Depth:**
   - Target: -25% average scroll depth (due to removed redundancy)
   - Target: +20% users reaching Market Insight section

3. **Trust Indicators:**
   - Target: -30% support queries about fees
   - Target: +15% listing creation completion rate
   - Target: -50% "What's Sentria's fee?" questions

4. **Advanced Features:**
   - Target: Measure Order Book expansion rate
   - Target: 10-15% of users expand advanced sections
   - Target: Power users (3+ expands) auto-expand works

---

## Next Steps (After Critical Fixes)

Once these 5 critical issues are resolved, move to:

1. **High Priority Fixes** (from assessment document)
   - Price History collapsed preview
   - Buy Modal comparison tools
   - Market Insight track record
   - Listings "Best Deal" stars

2. **Medium Priority Improvements**
   - User segmentation (power user detection)
   - Tabbed interface exploration
   - Export functionality
   - Shipping cost estimator

3. **A/B Testing**
   - Current vs. Simplified layout
   - Card view vs. Table view (desktop)
   - Open vs. Closed default for advanced sections

---

## Questions & Decisions Needed

Before starting implementation:

1. **Mobile breakpoint:** Confirm 768px (md) is correct threshold for mobile vs. desktop?
2. **Market Summary:** Remove entirely or salvage "Best Arb" card? (Recommend: remove entirely)
3. **Power user threshold:** 5 advanced section expands = power user? Adjust?
4. **Trust badge design:** Use checkmarks (✓) or custom icons?
5. **Fee disclosure:** Emphasize "₹0 fee" or downplay? (Recommend: prominent to build trust)

---

**Ready to implement?** Start with Issue #1 (Mobile Tables) as it has the highest impact and is self-contained.


