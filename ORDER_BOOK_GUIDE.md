# Order Book Visualization - Implementation Guide

## What We Built

A Bloomberg Terminal-style order book that transforms your listing data into an exchange-like depth visualization. This makes the resale market **legible** and **comparable** — exactly what your thesis requires.

---

## How It Works

### Data Processing

The order book aggregates your existing listing data into **price levels**:

**BUY SIDE (Bids):**
- WhatsApp WTB (Want To Buy) quotes

**SELL SIDE (Asks):**
- WhatsApp WTS (Want To Sell) quotes
- Indian marketplace listings
- International platform listings (with landed cost)

**Aggregation Logic:**
- Groups all listings at the same price into one level
- Sums quantities at each level
- Tracks source channels (WhatsApp/Marketplace/International)

---

## Visual Components

### 1. Market Statistics (Top)
- **Best Bid:** Highest buy price available
- **Spread:** Gap between best bid and best ask (in ₹ and %)
- **Best Ask:** Lowest sell price available
- **Color-coded:** Green (tight <3%), Yellow (moderate 3-8%), Red (wide >8%)

### 2. Order Book Table

```
┌─────────────────────────────────────┐
│ Price    │  Qty  │  Depth Bar       │
├─────────────────────────────────────┤
│ SELL SIDE (Asks - highest to lowest)
│ ₹48,000  │   3   │ ████             │ ← Red background
│ ₹47,500  │   7   │ ███████          │
│ ₹47,000  │   5   │ █████            │
├─────────────────────────────────────┤
│      SPREAD: ₹500 (1.1%)            │ ← Yellow highlight
├─────────────────────────────────────┤
│ BUY SIDE (Bids - highest to lowest) │
│ ₹46,500  │   6   │ ██████           │ ← Green background
│ ₹46,000  │   8   │ ████████         │
└─────────────────────────────────────┘
```

### 3. Depth Bars
- Horizontal bars show relative quantity at each price level
- Longer bar = more liquidity at that price
- Red tint for sell side, green tint for buy side
- Hover to see sources (e.g., "WhatsApp (3), Marketplace (2)")

### 4. Cumulative Quantity
- Shows total quantity from best price to current level
- Helps traders understand "How much can I buy up to ₹47k?"

### 5. Market Insights (Bottom)
- **Market Structure:** Bid/ask level counts, total quantities
- **Market Pressure:** Visual bar showing buy vs sell imbalance
- **Interpretation:** "More buy interest (potential upward pressure)"

---

## What This Reveals (Without Transaction Data)

### 1. Market Efficiency
- **Tight spread (1-3%):** Liquid, efficient market
- **Wide spread (>8%):** Illiquid, inefficient market
- Users can compare: "Jordan 1 Chicago has 1.1% spread, but Dunk Low Panda has 12% spread"

### 2. Liquidity Concentration
- Where is inventory clustered?
- "Most sellers want ₹47k-48k, but buyers only willing to pay ₹46k"
- Reveals support/resistance levels

### 3. Market Imbalance
- More buy quantity than sell = potential upward pressure
- More sell quantity than buy = potential downward pressure
- Indicates market sentiment without transaction data

### 4. Price Discovery
- Where will the market clear?
- If 10 buyers at ₹46k and 5 sellers at ₹47k, market likely settles near ₹46.5k

### 5. Cross-Channel Comparison
- Color-coded by channel (green=WhatsApp, blue=Marketplace, purple=International)
- Reveals which channels have tightest pricing
- "WhatsApp consistently 5% cheaper than marketplaces"

---

## User Experience

### Navigation
- Order book is now in the **section navigation** ("Jump to: Order Book")
- **Default open** to show immediately when viewing an asset
- Appears right after Price History, before detailed listings

### Interaction
- **Hover** over price levels to see sources
- **Scroll** through depth if more than 10 levels
- **Compare** across sizes using size selector

### Mobile-Friendly
- Compact grid layout works on small screens
- Touch-friendly hover states
- Responsive depth bars

---

## Technical Details

### Component Location
`src/components/OrderBook.tsx`

### Props
```typescript
interface OrderBookProps {
  whatsappBuyPrices: PricePoint[];  // WTB quotes
  whatsappSellPrices: PricePoint[]; // WTS quotes
  marketplacePrices: PricePoint[];  // Marketplace listings
  internationalPrices: PricePoint[]; // International listings
  selectedSize?: string;             // Current size selection
}
```

### Integration
- Integrated into `AssetDetailPanel.tsx`
- Uses existing price point data (no new data collection needed)
- Renders as collapsible section with tooltip

### Performance
- Memoized aggregation (recalculates only when data changes)
- Limited to top 10 levels per side for performance
- Efficient hover states with CSS

---

## What This Enables

### For Your Users (Traders/Resellers)
1. **Quick liquidity assessment:** "Is this a liquid market I can enter/exit?"
2. **Spread trading:** "I'll bid between best bid and best ask"
3. **Volume analysis:** "More sellers than buyers → price likely to drop"
4. **Cross-channel arbitrage:** "WhatsApp sellers at ₹46k, marketplace at ₹48k → 4% arb"

### For Your Thesis
- ✅ Makes market structure **visible** (not hidden in scattered listings)
- ✅ Enables **price discovery** (where should this trade?)
- ✅ Shows **market efficiency** (tight vs wide spreads)
- ✅ Creates **shared intelligence** (everyone sees same order book)
- ✅ Bloomberg-style presentation (professional, institutional feel)

---

## Next Steps / Enhancements

### Phase 1 (Current)
- ✅ Basic order book with depth visualization
- ✅ Spread calculation and color-coding
- ✅ Market pressure indicator
- ✅ Channel color-coding

### Phase 2 (Next 2 weeks)
- [ ] Spread history chart (how has spread evolved over time?)
- [ ] Depth chart visualization (alternative to table view)
- [ ] Price level alerts ("Notify me when ask drops below ₹46k")
- [ ] Snapshot comparison ("Order book now vs 24h ago")

### Phase 3 (Next month)
- [ ] Market maker identification ("This seller consistently provides depth")
- [ ] Spread percentile ("Tighter than 78% of market")
- [ ] Order flow imbalance indicator (more sophisticated than simple buy/sell ratio)
- [ ] Export order book data (CSV for analysis)

---

## Testing Checklist

- [ ] View order book for asset with both buy and sell quotes
- [ ] View order book for asset with only sell quotes (no bids)
- [ ] View order book for asset with no data (empty state)
- [ ] Change size and verify order book updates
- [ ] Hover over price levels to see sources
- [ ] Check spread color-coding (green/yellow/red)
- [ ] Verify cumulative quantities are correct
- [ ] Check market pressure bar calculation
- [ ] Test on mobile (responsive layout)
- [ ] Verify collapsible section works (open/close)

---

## Bloomberg Terminal Parallels

| Bloomberg Function | Your Feature |
|-------------------|--------------|
| DEPTH (Market Depth) | Order Book visualization |
| BID/ASK spread | Spread calculation with color-coding |
| Size at each level | Quantity + cumulative columns |
| Order imbalance | Market pressure indicator |
| Multi-channel view | WhatsApp/Marketplace/International colors |

---

## Key Metrics This Enables

1. **Spread Width:** Absolute (₹) and relative (%)
2. **Market Depth:** Total quantity on each side
3. **Order Imbalance:** Buy quantity vs sell quantity
4. **Liquidity Concentration:** Where is most inventory?
5. **Cross-Channel Efficiency:** Which channel has best prices?

These metrics make your market **legible** without needing transaction data.

---

## User Testimonial Opportunities

With order book live, you can ask users:
- "How does seeing the order book change how you make trading decisions?"
- "What spread % do you consider 'tradeable'?"
- "Do you prefer order book view or listings table view?"
- "What additional order book features would help you?"

This feedback will guide Phase 2/3 development.

---

## Demo Script

**Before (old view):**
"Here are 23 individual listings for this asset... somewhere in here you can find the best prices..."

**After (order book):**
"The market for this asset has a 1.1% spread — very tight. There are 15 units bid at ₹46k-46.5k and 12 units offered at ₹47k-48k. This is a liquid, efficient market with slight buy pressure. WhatsApp has the tightest pricing."

**Impact:** User understands market structure in 5 seconds instead of 5 minutes.

