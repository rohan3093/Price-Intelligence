# Channel-Based Model Testing Guide

## Overview

The app now uses a **channel-based pricing model** instead of the old B2B/End Customer split. This better reflects the real market structure where:

- **WhatsApp Groups** have mixed B2B/B2C transactions (both buy and sell opportunities)
- **Indian Marketplaces** (CrepdogCrew, Mainstreet, etc.) show top 5 cheapest listings
- **International Platforms** (StockX, Goat) show import costs and global prices

## Testing Checklist

### 1. Asset Detail Panel (Market View)

**Location**: Main Market page → Select any asset

**What to Test**:
- [ ] **WhatsApp & Reseller Networks** section shows:
  - Individual seller listings (like HYPESCAN)
  - Each listing displays:
    - Seller name/profile icon
    - Location (e.g., Delhi, Mumbai)
    - Quantity (Qty: X)
    - Price (₹X,XXX)
    - WhatsApp button (if contact number provided)
  - All sellers listed (scrollable if many)
  - Summary stats: Total Sellers, Total Quantity
  
- [ ] **Indian Marketplaces** section shows:
  - Top 5 cheapest listings (#1, #2, #3, #4, #5)
  - Marketplace names (CrepdogCrew, Mainstreet, etc.)
  - Listing counts for each
  - "View →" links if URLs are provided
  - Summary stats (Cheapest price, Total listings)

- [ ] **International Platforms** section shows:
  - Import Cost (Landed to India) - green prices
  - Global Price (Before Shipping) - black prices
  - Fair Value Range at the bottom

**Expected Behavior**:
- All three channels display in a 3-column grid on desktop
- Each channel has clear headers and descriptions
- Prices are properly formatted with ₹ symbol
- Empty states show "No listings available" messages

---

### 2. Analyst Dashboard - Daily Price Updates

**Location**: Admin → Daily Price Updates tab

#### 2.1 WhatsApp Groups & Reseller Networks

**What to Test**:
- [ ] **Buy From Section (Sellers)**:
  - Enter seller name (e.g., "Mayankk_01")
  - Enter location (e.g., "Delhi")
  - Enter price (e.g., ₹22,000)
  - Enter quantity (e.g., 1)
  - Enter WhatsApp number (e.g., "+91 98765 43210")
  - Enter group/source (optional, e.g., "Mumbai Resellers")
  - Click "Add Seller"
  - Verify it appears in the seller list (sorted by price, lowest first)
  - Verify seller name, location, quantity, and price are displayed
  - Verify WhatsApp button appears (if contact number provided)

- [ ] **Sell To Section (Buyers)**:
  - Enter buyer name (e.g., "Bulk_Buyer_01")
  - Enter location (e.g., "Mumbai")
  - Enter price (e.g., ₹28,000)
  - Enter quantity (e.g., 2)
  - Enter WhatsApp number (e.g., "+91 98765 43210")
  - Enter group/source (optional)
  - Click "Add Buyer"
  - Verify it appears in the buyer list (sorted by price, highest first)
  - Verify buyer name, location, quantity, and price are displayed

- [ ] **Remove Functionality**:
  - Click "Remove" on any seller or buyer listing
  - Verify it's removed from the list
  - Verify the asset updates correctly

- [ ] **WhatsApp Button**:
  - Click WhatsApp button on a listing
  - Verify it opens WhatsApp with the contact number
  - Verify the link format is correct (wa.me/[number])

**Expected Behavior**:
- Buy and sell prices are tracked separately
- Both are combined when saving to the asset
- Transaction type is preserved (buy/sell)

#### 2.2 Indian Marketplaces

**What to Test**:
- [ ] **Add Marketplace Listing**:
  - Enter price (e.g., ₹26,000)
  - Enter listing count (e.g., 5)
  - Select marketplace from dropdown:
    - CrepdogCrew
    - Mainstreet Marketplace
    - Culture Circle
    - Hypefly
    - Dawntown
    - 10 Hills Studio
    - Find your Kicks
    - Instagram Seller
    - Facebook Marketplace
    - Other
  - Click "Add Listing"
  - Verify it appears in the list (sorted by price, lowest first)
  - Verify marketplace name is displayed

- [ ] **Top 5 Display**:
  - Add 7+ listings with different prices
  - Verify only top 5 cheapest are shown
  - Verify message: "Showing top 5 cheapest. X more listings available."

- [ ] **Remove Functionality**:
  - Click "Remove" on any listing
  - Verify it's removed
  - Verify top 5 updates if needed

**Expected Behavior**:
- Listings are automatically sorted by price (cheapest first)
- Only top 5 are displayed in the form
- All listings are saved to the asset
- Marketplace names are preserved

#### 2.3 International Platforms

**What to Test**:
- [ ] **Add International Listing**:
  - Enter price (e.g., ₹30,000)
  - Enter listing count (e.g., 3)
  - Select source: StockX, Goat, or eBay
  - Click "Add"
  - Verify it appears in the list

- [ ] **Remove Functionality**:
  - Click "Remove" on any listing
  - Verify it's removed

**Expected Behavior**:
- International prices are tracked separately
- Source is preserved

---

### 3. Market View - Results Panel

**Location**: Main Market page → Left column (asset list)

**What to Test**:
- [ ] Asset list shows correct buy prices
- [ ] Prices are extracted from WhatsApp channel (lowest buy price)
- [ ] Fallback to legacy structure if new structure doesn't exist
- [ ] Prices display correctly with ₹ symbol

**Expected Behavior**:
- Best available price is calculated from WhatsApp buy prices
- Falls back to legacy B2B prices if new structure not available
- Displays "—" if no prices available

---

### 4. Watchlist View

**Location**: Watchlist page

**What to Test**:
- [ ] Best Price is calculated from WhatsApp buy prices
- [ ] Falls back to legacy structure if needed
- [ ] Prices display correctly in watchlist cards

**Expected Behavior**:
- Uses lowest WhatsApp buy price
- Falls back gracefully to legacy data
- Shows "—" if no price data

---

### 5. Price History Chart

**Location**: Asset Detail Panel → Below Size Selector

**What to Test**:
- [ ] Chart displays price trends over time
- [ ] Shows B2B (WhatsApp), End Customer (Marketplace), and StockX/Goat (International) lines
- [ ] Works with both new and legacy data structures
- [ ] Chart styling matches professional aesthetic (border-radius: 0px)

**Expected Behavior**:
- Chart maps new channels to old labels for display:
  - WhatsApp → B2B (Resellers)
  - Marketplace → End Customer
  - International → StockX/Goat
- Handles missing data gracefully

---

### 6. Data Persistence

**What to Test**:
- [ ] **Add prices in Analyst Dashboard**:
  - Add WhatsApp buy/sell prices
  - Add marketplace listings
  - Add international prices
  - Save asset

- [ ] **Verify in Market View**:
  - Navigate to Market page
  - Select the same asset
  - Verify all prices appear correctly
  - Verify channel structure is preserved

- [ ] **Refresh Page**:
  - Refresh the browser
  - Verify data persists (Firebase or localStorage)
  - Verify all channels display correctly

**Expected Behavior**:
- Data saves to Firebase (if configured) or localStorage
- Channel structure is preserved
- All price points are saved with correct metadata

---

## Test Scenarios

### Scenario 1: Complete WhatsApp Seller Listings (HYPESCAN Style)

1. Go to Admin → Daily Price Updates
2. Select an asset and size
3. In WhatsApp section, add sellers:
   - **Seller 1**: Name: "Mayankk_01", Location: "Delhi", Price: ₹17,500, Qty: 1, WhatsApp: "+91 98765 43210"
   - **Seller 2**: Name: "moonlight_kiqs", Location: "Delhi", Price: ₹17,900, Qty: 1, WhatsApp: "+91 98765 43211"
   - **Seller 3**: Name: "KICKSSCAPE", Location: "Delhi", Price: ₹18,000, Qty: 1, WhatsApp: "+91 98765 43212"
   - **Seller 4**: Name: "Sneakpeakes", Location: "Jalandhar", Price: ₹21,000, Qty: 1, WhatsApp: "+91 98765 43213"
   - **Seller 5**: Name: "Kicksbydyeagram", Location: "Bangalore", Price: ₹22,000, Qty: 1, WhatsApp: "+91 98765 43214"
4. Save
5. Go to Market page → Select same asset
6. **Verify**:
   - WhatsApp section shows all 5 sellers in a list
   - Each seller shows: name, location, quantity, price
   - Sellers are sorted by price (lowest first: ₹17,500, ₹17,900, ₹18,000, ₹21,000, ₹22,000)
   - Each listing has a green "WhatsApp" button
   - Summary shows: "Total Sellers: 5" and "Total Quantity: 5 pairs"
   - Clicking WhatsApp button opens WhatsApp with correct number

### Scenario 2: Multiple Marketplace Listings

1. Go to Admin → Daily Price Updates
2. Select an asset and size
3. In Indian Marketplaces section:
   - Add: ₹26,000, 5 listings, CrepdogCrew
   - Add: ₹27,500, 8 listings, Mainstreet Marketplace
   - Add: ₹28,000, 3 listings, Culture Circle
   - Add: ₹29,000, 6 listings, Hypefly
   - Add: ₹30,000, 4 listings, Dawntown
   - Add: ₹31,000, 2 listings, 10 Hills Studio
   - Add: ₹32,000, 1 listing, Find your Kicks
4. Save
5. Go to Market page → Select same asset
6. **Verify**:
   - Marketplace section shows top 5 (#1: ₹26,000, #2: ₹27,500, etc.)
   - Each shows marketplace name
   - Message: "Showing top 5 cheapest. 2 more listings available."
   - Summary shows: Cheapest: ₹26,000, Total: 29 listings

### Scenario 3: Mixed Channel Data

1. Add data to all three channels for the same asset/size
2. **Verify**:
   - All three channels display in Asset Detail Panel
   - Each channel shows correct data
   - No data conflicts or display issues
   - Price history chart includes all channels

### Scenario 4: Legacy Data Compatibility

1. If you have existing assets with legacy structure (b2b, endCustomer, stockxGoat)
2. **Verify**:
   - Asset Detail Panel displays legacy data correctly
   - Data is mapped to new channels for display
   - No errors in console
   - Can add new channel-based data alongside legacy data

---

## Common Issues & Solutions

### Issue: Prices not showing in Asset Detail Panel

**Check**:
- [ ] Asset has sizes configured
- [ ] Size is selected
- [ ] Price points were saved correctly
- [ ] Check browser console for errors

**Solution**: Verify data in Analyst Dashboard → Asset Management → Check size variant has price points

### Issue: Marketplace names not displaying

**Check**:
- [ ] Marketplace was selected from dropdown (not typed manually)
- [ ] `marketplaceName` field is populated
- [ ] Check browser console for data structure

**Solution**: Use the dropdown selector, don't type marketplace names manually

### Issue: Buy/Sell prices not separating in WhatsApp

**Check**:
- [ ] Transaction type is set correctly (buy vs sell)
- [ ] Prices are added to correct section (Buy From vs Sell To)
- [ ] Check data structure in Firebase/localStorage

**Solution**: Ensure you're using the correct form section (Buy From for buy, Sell To for sell)

### Issue: Top 5 not updating

**Check**:
- [ ] Listings are sorted by price
- [ ] More than 5 listings exist
- [ ] Price values are numbers, not strings

**Solution**: Verify prices are entered as numbers (₹ symbol is for display only)

---

## Data Structure Reference

### New Channel-Based Structure

```typescript
pricePoints: {
  whatsapp: [
    {
      price: 22000,
      listingCount: 3,
      channel: 'whatsapp',
      transactionType: 'buy', // or 'sell' or 'both'
      source: 'whatsapp-group-mumbai',
      size: 'UK 9',
      lastSeen: '2024-01-15T10:30:00Z'
    }
  ],
  marketplace: [
    {
      price: 26000,
      listingCount: 5,
      channel: 'marketplace',
      source: 'crepdogcrew',
      marketplaceName: 'CrepdogCrew',
      size: 'UK 9',
      lastSeen: '2024-01-15T10:30:00Z',
      url: 'https://...' // optional
    }
  ],
  international: [
    {
      price: 30000,
      listingCount: 2,
      channel: 'international',
      source: 'stockx',
      size: 'UK 9',
      lastSeen: '2024-01-15T10:30:00Z'
    }
  ]
}
```

### Legacy Structure (Still Supported)

```typescript
legacyPricePoints: {
  b2b: [...],
  endCustomer: [...],
  stockxGoat: [...]
}
```

---

## Quick Test Commands

### Check Data in Browser Console

```javascript
// In browser console, after selecting an asset:
// Check current asset data
const asset = /* get from React DevTools or localStorage */;

// Check price points structure
console.log(asset.sizes[0].pricePoints);
console.log(asset.sizes[0].legacyPricePoints);

// Check specific channel
console.log(asset.sizes[0].pricePoints?.whatsapp);
console.log(asset.sizes[0].pricePoints?.marketplace);
console.log(asset.sizes[0].pricePoints?.international);
```

### Verify Firebase Data

1. Go to Firebase Console → Firestore Database
2. Navigate to `assets` collection
3. Open an asset document
4. Check `sizes` array
5. Verify `pricePoints` structure matches new format

---

## Success Criteria

✅ **All tests pass if**:
- [ ] WhatsApp section shows buy/sell prices separately
- [ ] Marketplace section shows top 5 cheapest with names
- [ ] International section shows import and global prices
- [ ] Spread and liquidity calculations work
- [ ] Data persists across page refreshes
- [ ] Legacy data displays correctly
- [ ] No console errors
- [ ] All prices format correctly with ₹ symbol
- [ ] Empty states display properly
- [ ] Remove functionality works for all channels

---

## Next Steps After Testing

1. **If all tests pass**: The channel-based model is working correctly!
2. **If issues found**: 
   - Check browser console for errors
   - Verify data structure in Firebase/localStorage
   - Check that all imports are correct
   - Verify TypeScript compilation (no errors)

3. **For Production**:
   - Migrate existing legacy data to new structure (optional)
   - Train analysts on new data entry format
   - Update documentation for end users

---

## Questions or Issues?

If you encounter any issues during testing:
1. Check browser console for errors
2. Verify data structure matches expected format
3. Check that all required fields are populated
4. Verify Firebase/localStorage is working correctly

The channel-based model is designed to be backward compatible, so existing data should continue to work while new data uses the improved structure.

