# Order Book - Visual Example

## Real Example: Jordan 1 Chicago, UK 9

### What Users See:

```
┌──────────────────────────────────────────────────────────────────┐
│                       MARKET STATISTICS                          │
├──────────────────────────────────────────────────────────────────┤
│   Best Bid          │      Spread          │    Best Ask         │
│    ₹46,000          │  ₹500 (1.1%) ✓       │    ₹46,500          │
│   🟢 Tight          │                      │                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         ORDER BOOK                               │
├──────────────────────────────────────────────────────────────────┤
│  PRICE        QTY    DEPTH                                       │
├──────────────────────────────────────────────────────────────────┤
│                   SELL SIDE (ASKS)                               │
│                                                                  │
│  ₹48,500       2    ███                      🔴 Marketplace      │
│  ₹48,000       3    ████                     🟣 International    │
│  ₹47,500       5    ██████                   🟢 WhatsApp         │
│  ₹47,000       4    █████                    🔵 Marketplace      │
│  ₹46,800       3    ████                     🟢 WhatsApp         │
│  ₹46,500       6    ███████                  🟢 WhatsApp         │
├──────────────────────────────────────────────────────────────────┤
│         🟡 SPREAD: ₹500 (1.1%) - Tight Market                    │
├──────────────────────────────────────────────────────────────────┤
│                   BUY SIDE (BIDS)                                │
│                                                                  │
│  ₹46,000       8    █████████                🟢 WhatsApp (WTB)   │
│  ₹45,800       5    ██████                   🟢 WhatsApp (WTB)   │
│  ₹45,500       4    █████                    🟢 WhatsApp (WTB)   │
│  ₹45,000       3    ████                     🟢 WhatsApp (WTB)   │
│  ₹44,500       2    ███                      🟢 WhatsApp (WTB)   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    MARKET INSIGHTS                               │
├──────────────────────────────────────────────────────────────────┤
│  Bid Levels: 5      │  Ask Levels: 6                             │
│  Total Bid Qty: 22  │  Total Ask Qty: 23                         │
│                                                                  │
│  MARKET PRESSURE:                                                │
│  🟢 BUY ████████████████████████████████░░░░░ SELL 🔴            │
│  (Balanced market - 49% buy / 51% sell)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## What This Tells A Trader

### Quick Assessment (5 seconds)
- **Spread:** 1.1% = Very liquid, tradeable market
- **Depth:** 22 bids vs 23 asks = Balanced
- **Best execution:** Can buy at ₹46,500 or sell at ₹46,000

### Strategic Insights (30 seconds)
1. **Support level:** Strong bid at ₹46,000 (8 units)
2. **Resistance level:** Sellers clustered at ₹47,000-48,000
3. **Arbitrage:** WhatsApp WTS at ₹46,500 vs Marketplace at ₹47,000 = ₹500 opportunity
4. **Market sentiment:** Slightly more sell pressure but balanced overall

### Trading Decisions
- **If buying:** Bid at ₹46,200 to jump the queue (between best bid and best ask)
- **If selling:** List at ₹46,700 for quick sale (below most asks)
- **If arbitraging:** Buy from WhatsApp WTS at ₹46,500, flip to marketplace at ₹47,000+

---

## Comparison: Illiquid Asset

### Example: Off-White Presto, UK 11

```
┌──────────────────────────────────────────────────────────────────┐
│   Best Bid          │      Spread          │    Best Ask         │
│    ₹32,000          │  ₹8,000 (22%) ⚠️      │    ₹40,000          │
│   🔴 Wide           │                      │                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PRICE        QTY    DEPTH                                       │
├──────────────────────────────────────────────────────────────────┤
│                   SELL SIDE (ASKS)                               │
│                                                                  │
│  ₹45,000       1    ██                       🔵 Marketplace      │
│  ₹42,000       1    ██                       🟣 International    │
│  ₹40,000       2    ████                     🔵 Marketplace      │
├──────────────────────────────────────────────────────────────────┤
│         🔴 SPREAD: ₹8,000 (22%) - Wide Market                    │
├──────────────────────────────────────────────────────────────────┤
│                   BUY SIDE (BIDS)                                │
│                                                                  │
│  ₹32,000       1    ██                       🟢 WhatsApp (WTB)   │
│  ₹30,000       1    ██                       🟢 WhatsApp (WTB)   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MARKET PRESSURE:                                                │
│  🟢 BUY ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ SELL 🔴     │
│  (Strong sell pressure - 33% buy / 67% sell)                     │
└──────────────────────────────────────────────────────────────────┘
```

### What This Reveals
- **22% spread** = Illiquid market, hard to trade
- **Thin depth:** Only 2 bids, 4 asks total
- **Price disagreement:** Huge gap between buyers and sellers
- **More sellers than buyers** = Potential downward pressure
- **Strategy:** Don't rush to trade. Wait for spread to tighten or offer ₹35k (middle of spread)

---

## Side-by-Side Comparison

| Metric | Jordan 1 Chicago (Liquid) | Off-White Presto (Illiquid) |
|--------|---------------------------|----------------------------|
| Spread | 1.1% 🟢 | 22% 🔴 |
| Bid Levels | 5 | 2 |
| Ask Levels | 6 | 3 |
| Total Quantity | 45 units | 6 units |
| Market Pressure | Balanced | 67% sell pressure |
| Tradability | ✅ Easy to enter/exit | ⚠️ Hard to trade, wide slippage |

---

## Real User Scenarios

### Scenario 1: Professional Reseller
**Goal:** Buy 5 units for quick flip

**Without Order Book:**
- Scrolls through 23 individual listings
- Manually compares prices
- Doesn't know if ₹47k is good or bad
- Misses WhatsApp opportunities

**With Order Book:**
- Sees 6 units available at ₹46,500 (WhatsApp)
- Spread is tight (1.1%) = liquid market
- Knows can flip to marketplace at ₹47,000+ quickly
- Makes offer at ₹46,200 to get filled fast

**Time saved:** 5 minutes → 30 seconds

---

### Scenario 2: First-Time Buyer
**Goal:** Understand if price is fair

**Without Order Book:**
- Confused by different prices
- Doesn't know what "good price" means
- Might overpay at ₹48,000

**With Order Book:**
- Sees market consensus: ₹46,000-47,000
- Understands ₹48,000 is outlier
- Knows ₹46,500 is best available ask
- Makes informed decision

**Outcome:** Saves ₹1,500 by buying smarter

---

### Scenario 3: Arbitrage Trader
**Goal:** Find cross-channel opportunities

**Without Order Book:**
- Manually compares channels
- Misses short-lived opportunities
- Can't assess if spread is worth fees

**With Order Book:**
- Instantly sees WhatsApp at ₹46,500 vs Marketplace at ₹47,000
- Knows depth (6 units available)
- Calculates: ₹500 profit - ₹50 fees = ₹450 net per unit
- Executes before spread closes

**Profit:** 6 units × ₹450 = ₹2,700 in one trade

---

## Technical Implementation Notes

### Data Sources
This example assumes you have:
- ✅ WhatsApp WTB/WTS quotes (from groups/channels)
- ✅ Marketplace listings (CrepdogCrew, Mainstreet, etc.)
- ✅ International prices (StockX/Goat with reshipping)

### Aggregation Logic
```
1. Collect all buy quotes (WhatsApp WTB)
2. Collect all sell listings (WhatsApp WTS + Marketplaces + International)
3. Group by price level (e.g., all ₹46,500 listings become one level)
4. Sum quantities at each level
5. Sort: Sell side ascending, Buy side descending
6. Calculate spread: Best Ask - Best Bid
7. Calculate market pressure: Total Buy Qty / Total Qty
```

### Update Frequency
- **Real-time:** If scraping continuously
- **Batch:** If updating daily/hourly (show "Last updated: 2h ago")
- **Manual:** If analyst-curated (show "Updated: Jan 23, 2026")

---

## Mobile View (Compact)

```
┌────────────────────────────┐
│ Best Bid    Spread  Ask    │
│ ₹46,000    1.1%   ₹46,500  │
├────────────────────────────┤
│     SELL SIDE              │
│ ₹48,500  2  ███            │
│ ₹48,000  3  ████           │
│ ₹47,500  5  ██████         │
│ ₹47,000  4  █████          │
│ ₹46,500  6  ███████        │
├────────────────────────────┤
│ SPREAD ₹500 (1.1%)         │
├────────────────────────────┤
│     BUY SIDE               │
│ ₹46,000  8  █████████      │
│ ₹45,800  5  ██████         │
│ ₹45,500  4  █████          │
└────────────────────────────┘
```

Simplified for small screens but retains key information.

---

## Next: Multi-Asset Order Book Comparison

Once single-asset order book is live, you can build:

**Market Monitor Grid:**
```
Asset              | Spread  | Best Bid | Best Ask | Depth
─────────────────────────────────────────────────────────
Jordan 1 Chicago   | 1.1% 🟢 | ₹46,000  | ₹46,500  | High
Dunk Low Panda     | 5.2% 🟡 | ₹12,500  | ₹13,200  | Med
Off-White Presto   | 22% 🔴  | ₹32,000  | ₹40,000  | Low
```

Users can scan entire market for tight spreads = liquid opportunities.

