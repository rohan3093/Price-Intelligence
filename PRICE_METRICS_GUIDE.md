# Price Metrics Auto-Calculation Guide

## Overview

The platform now **automatically calculates** market analytics metrics (price changes, best available prices, confidence scores, etc.) whenever you update asset data. This ensures the Market Overview displays accurate top gainers/losers and other key metrics.

## What's Calculated Automatically

When you add or update listings for an asset, the system automatically calculates:

### Asset-Level Metrics
- **`bestAvailablePrice`**: Lowest price across all channels
- **`change30d`**: Price change % vs 30-day historical baseline (e.g., "+7.9%")
- **`change90d`**: Price change % vs 90-day historical baseline (e.g., "+14.4%")
- **`confidence`**: Data quality score (0-100) based on # of data points
- **`liquidity`**: Market liquidity level ("High", "Medium", "Low", "Very Low")
- **`volumeLabel`**: Trading volume indicator ("Very Active", "Active", "Moderate", "Limited", "Scarce")
- **`dataPoints`**: Total number of listings across all channels

### Size-Level Metrics
Each size variant gets the same metrics calculated independently:
- Best available price for that specific size
- Price ranges by channel (B2B/WhatsApp, Marketplace, International)
- Fair value range (aggregate of all channels)
- Confidence and liquidity scores

### Price Ranges
- **`b2bMarketPrice`**: Price range from WhatsApp channel
- **`endCustomerMarketPrice`**: Price range from Marketplace channel
- **`stockxGoatPrice`**: Price range from International channel
- **`fairRange`**: Overall fair value range (all channels combined)

## Where It Happens

### 1. Market Data Entry (Automatic)
When you update listings in the **Market Data** tab:
```
Add listing → System calculates metrics → Saves enriched asset to Firebase
```

The metrics are calculated **automatically** - you don't need to do anything special.

### 2. Portfolio Management (Automatic)
When you create or edit assets in the **Portfolio** tab:
```
Save asset → System calculates metrics → Saves enriched asset to Firebase
```

### 3. Bulk Backfill (Manual)
For **existing assets** that don't have these metrics yet:

1. Go to **Analyst Dashboard** → **Settings** tab
2. Click **"Calculate Metrics for All Assets"**
3. Confirm the operation
4. Wait for processing to complete (shows progress bar)

This will:
- Loop through all assets
- Calculate all missing metrics
- Update Firebase with enriched data

## How Price Changes Are Calculated

### With Historical Data
If you've set `priceAnchors.historical30d` or `historical90d`:
```javascript
{
  priceAnchors: {
    historical30d: { min: 24000, max: 30000 },
    historical90d: { min: 23000, max: 32000 }
  }
}
```

The system:
1. Takes the **midpoint** of the historical range (e.g., 27000 for 30d)
2. Compares it to the **current best available price**
3. Calculates the percentage change

### Without Historical Data
If no historical anchors are set, defaults to `+0.0%`

**To get accurate price changes:**
- Set historical price anchors in the Portfolio tab when creating/editing assets
- Use the "Price Anchors" section in the asset form

## Confidence Score Calculation

Confidence is based on the **number of data points** (listings):

| Data Points | Confidence |
|-------------|------------|
| 100+        | 85         |
| 50-99       | 75         |
| 30-49       | 70         |
| 20-29       | 65         |
| 10-19       | 60         |
| <10         | 50         |

## Liquidity Calculation

Based on **total number of listings** across all channels:

| Total Listings | Liquidity Level |
|----------------|-----------------|
| 100+           | High            |
| 50-99          | Medium          |
| 20-49          | Low             |
| <20            | Very Low        |

## Market Overview Display

The **Market Overview** component (on the home page) now shows:

### Top Gainers
- Assets with **positive** `change30d` values
- Sorted by highest percentage gain
- Shows top 5 by default

### Top Losers
- Assets with **negative** `change30d` values
- Sorted by largest percentage loss
- Shows top 5 by default

### Requirements for Display
An asset will appear in top movers ONLY if it has:
1. ✓ `change30d` field populated (not null/undefined)
2. ✓ `bestAvailablePrice` field populated (not null/undefined)

Without both, the asset is filtered out.

## Troubleshooting

### Problem: Market Overview shows "No data"

**Causes:**
1. Assets don't have `change30d` or `bestAvailablePrice` fields
2. No historical price anchors set
3. No listings/price points entered

**Solutions:**
1. **Run backfill**: Go to Settings → Click "Calculate Metrics for All Assets"
2. **Set price anchors**: Edit assets → Add historical price data
3. **Add listings**: Go to Market Data tab → Add price points

### Problem: Price changes show "+0.0%"

**Cause:** No historical price anchors configured

**Solution:**
1. Go to Portfolio tab
2. Edit the asset
3. Scroll to "Price Anchors" section
4. Set `retailIndia`, `retailGlobal`, `historical30d`, `historical90d`
5. Save

Example:
```javascript
priceAnchors: {
  retailIndia: 18500,
  retailGlobal: 17000,
  historical30d: { min: 24000, max: 30000 },
  historical90d: { min: 23000, max: 32000 }
}
```

### Problem: Confidence scores are low

**Cause:** Not enough data points (listings)

**Solution:** Add more price points across different channels to increase confidence.

## Best Practices

### 1. Always Set Price Anchors
When adding new assets, set historical price ranges:
- Use actual market data from the past 30/90 days
- If unavailable, use retail prices as baseline
- More accurate anchors = more accurate change %

### 2. Regular Data Entry
- Update listings daily in Market Data tab
- System auto-calculates metrics on each update
- No manual intervention needed

### 3. Periodic Backfills
- Run backfill after bulk imports
- Run backfill if you update historical anchors
- Keeps all assets in sync

### 4. Monitor Data Quality
Check confidence scores:
- **85+ (Excellent)**: 100+ data points
- **70-84 (Good)**: 30-99 data points
- **<70 (Fair)**: Consider adding more listings

## Technical Details

### Utility Functions
Located in `src/utils/priceMetrics.ts`:

- `enrichAssetWithMetrics(asset)`: Main function that calculates all metrics
- `calculateBestAvailablePrice(pricePoints)`: Finds lowest price
- `calculatePriceChanges(currentPrice, priceAnchors)`: Calculates change %
- `calculateConfidence(dataPoints)`: Determines confidence score
- `backfillAllAssetMetrics(assets)`: Bulk process all assets

### Auto-Enrichment Points
1. **AnalystDashboard** → Market Data tab → `onUpdateAsset` handler
2. **AnalystDashboard** → Portfolio tab → `handleSaveAsset` function
3. **Manual backfill** → Settings tab → "Calculate Metrics" button

### Data Flow
```
User adds listings
    ↓
enrichAssetWithMetrics() called
    ↓
Calculates all metrics
    ↓
Updates asset object
    ↓
Saves to Firebase
    ↓
Market Overview updates automatically
```

## Migration from Old Data

If you have existing assets without these metrics:

1. **Go to Analyst Dashboard** → Settings tab
2. **Click "Calculate Metrics for All Assets"**
3. **Wait for completion** (progress bar shows status)
4. **Verify**: Check Market Overview for top gainers/losers

This one-time operation will populate all metrics for existing assets.

## Summary

✅ **Automatic**: Metrics calculate whenever you update asset data  
✅ **Comprehensive**: All fields needed for Market Overview  
✅ **Real-time**: Market Overview updates immediately  
✅ **Historical**: Supports 30d and 90d price change tracking  
✅ **Flexible**: Works with or without historical data  
✅ **Backfill**: One-click migration for existing assets  

No more manual calculation or dummy data - everything is computed from your real listing data!

