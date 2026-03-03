# Portfolio Features Implementation

## Date: 2026-01-28

## Overview
Implemented two critical portfolio features:
1. **Partial Sales** - Ability to sell part of a position while keeping the rest in inventory
2. **Firestore Sync** - Cloud-based portfolio storage synced across devices per user

---

## 1. Partial Sales ✅

### What Changed
- Modified the "Mark as Sold" flow to allow selling a **portion** of your position
- Example: If you hold 5 pairs of Jordan 1s, you can now sell 2 and keep 3 in your active inventory

### UI Flow
1. Click **"Mark as Sold"** on any active position
2. New modal shows:
   - **Available Quantity** (e.g., 5)
   - **Quantity to Sell** (input field with validation, e.g., enter 2)
   - **Selling Price per Unit** (₹)
   - **Estimated Realized P&L** (auto-calculated: `(sellPrice - buyPrice) × soldQty`)
   - Helpful hint: "Partial sale: 3 will remain in portfolio"
3. Click **Confirm Sale**
4. Result:
   - Active position quantity reduces from 5 to 3
   - A new **sold position record** is created for the 2 units sold
   - Realized P&L card updates with the profit/loss from this sale

### Technical Implementation
- `markAsSold(assetId, soldQuantity, soldPrice)` function in `PortfolioView.tsx`
- Logic:
  - If `soldQuantity >= position.quantity` → Full sale (mark entire position as sold)
  - If `soldQuantity < position.quantity` → Partial sale:
    1. Reduce active position: `quantity = quantity - soldQuantity`
    2. Create new sold record: `{ quantity: soldQuantity, sold: true, soldPrice, soldDate }`

### Data Model
No changes needed to `PortfolioPosition` type - existing fields support partial sales.

---

## 2. Firestore Sync ✅

### What Changed
- Portfolio data now **syncs to Firestore** when user is signed in
- Pattern mirrors existing Watchlist implementation
- Works across devices: Add position on desktop → see it on mobile

### Storage Strategy
| User State | Portfolio Storage |
|------------|-------------------|
| **Signed in** | Firestore (`users/{userId}/portfolio` field) + localStorage cache |
| **Signed out** | localStorage only (device-specific) |

### Firestore Structure
```javascript
// Firestore document: users/{userId}
{
  portfolio: [
    {
      assetId: 123,
      size: "US 10",
      quantity: 3,
      acquisitionPrice: 15000,
      notes: "Bought from Drop X",
      sold: false,
      createdAt: "2026-01-28T...",
      updatedAt: "2026-01-28T..."
    },
    {
      assetId: 456,
      quantity: 2,
      acquisitionPrice: 12000,
      sold: true,
      soldPrice: 18000,
      soldDate: "2026-01-28T...",
      ...
    }
  ],
  portfolioUpdatedAt: "2026-01-28T...",
  // ... other user fields (watchlist, profile, etc.)
}
```

### New API File: `src/utils/portfolioApi.ts`
Functions:
- `loadUserPortfolio(userId)` - Load from Firestore
- `saveUserPortfolio(userId, positions)` - Save to Firestore
- `subscribeToUserPortfolio(userId, onUpdate)` - Real-time listener (not yet used)
- `upsertPortfolioPosition(userId, assetId, updates)` - Add/update single position
- `markPositionAsSold(userId, assetId, soldQuantity, soldPrice)` - Server-side partial sale helper

### App.tsx Integration
- Portfolio state now lives in `App.tsx` (like Watchlist)
- `[portfolioPositions, setPortfolioPositions]` state
- Load on auth change: `useEffect(() => loadUserPortfolio()...)` 
- Auto-save on change: `useEffect(() => saveUserPortfolio()...)` (only if signed in)
- localStorage fallback: Always saves to localStorage for offline/cache

### PortfolioView Props Changed
```typescript
// OLD (local state only)
<PortfolioView assets={assets} />

// NEW (receives portfolio from App)
<PortfolioView 
  assets={assets}
  currentUser={currentUser}
  positions={portfolioPositions}
  onPositionsChange={setPortfolioPositions}
/>
```

### Migration Path
- Existing localStorage portfolio data is **preserved**
- On first sign-in, user can manually re-add positions (or we could add a one-time migration)
- Future: Add "Import from localStorage" button if `currentUser && portfolioPositions.length === 0 && storage.loadPortfolio().length > 0`

---

## Testing Checklist

### Partial Sales
- [ ] Sell full position (qty = qty) → position moves to "Sold Positions" table
- [ ] Sell partial position (qty < qty) → active qty reduces, new sold record created
- [ ] Realized P&L card updates correctly
- [ ] Per-unit P&L shows in modal
- [ ] Validation: Cannot sell 0 or negative quantity
- [ ] Validation: Cannot sell more than available quantity

### Firestore Sync
- [ ] Sign in → portfolio loads from Firestore
- [ ] Add position → saves to Firestore (check console for success)
- [ ] Sign out → portfolio clears (or switches to localStorage)
- [ ] Sign in on second device → portfolio loads correctly
- [ ] Mark as sold → Firestore updates with sold position
- [ ] Network failure → graceful error message, falls back to localStorage

### Edge Cases
- [ ] Sign in with empty portfolio → no errors
- [ ] Add position while offline → saves to localStorage, syncs when online (requires network check)
- [ ] Firestore write fails → user sees alert, data stays in localStorage
- [ ] Multiple rapid saves → Firestore handles batch writes correctly

---

## Security Considerations

### Firestore Rules (TODO)
Add to `firestore.rules`:
```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // Validate portfolio structure
  allow update: if request.auth != null 
    && request.auth.uid == userId
    && request.resource.data.portfolio is list
    && request.resource.data.portfolio.size() <= 500; // Max 500 positions
}
```

### Data Validation
- Client-side: TypeScript types ensure correct structure
- Server-side: Firestore rules validate:
  - User can only write to their own document
  - Portfolio is an array
  - Reasonable limits (e.g., max 500 positions)

---

## Future Enhancements

1. **Real-time Sync**
   - Use `subscribeToUserPortfolio()` to listen for changes
   - Show live updates if portfolio changes on another device
   
2. **Bulk Operations**
   - "Mark all as sold" for batch liquidation
   - Import/export CSV for accounting
   
3. **Per-Size Position Tracking**
   - Current limitation: Can only have one position per `assetId`
   - Future: Support multiple sizes as separate positions (e.g., Jordan 1 size 9 + size 10)
   - Requires changing `positionByAssetId` to `positionByAssetIdAndSize` map
   
4. **Portfolio Sharing**
   - Share portfolio with team members (for consignment shops)
   - Firestore structure: `portfolios/{portfolioId}/positions/...` with ACLs
   
5. **Tax Reports**
   - Generate realized P&L report for tax filing
   - Filter by date range, export to PDF/CSV
   
6. **Notes Field UI**
   - Add "Notes" input in position table or modal
   - Already in data model: `notes?: string`

---

## Files Changed

### New Files
- `src/utils/portfolioApi.ts` - Firestore sync API for portfolio

### Modified Files
- `src/components/PortfolioView.tsx` - Partial sales + lifted state to App
- `src/App.tsx` - Portfolio state management + Firestore integration
- `src/types/index.ts` - Extended `PortfolioPosition` with `sold`, `soldPrice`, `soldDate`

### Configuration Files (No changes needed)
- `firestore.rules` - TODO: Add portfolio security rules
- `firebase.json` - Already configured

---

## Performance Notes

- **Writes**: Every position change triggers one Firestore write to `users/{userId}`
  - Cost: ~$0.18 per 100k writes (Firestore pricing)
  - Optimization: Could batch multiple position changes into single write (future)
  
- **Reads**: Portfolio loads once per session (on sign-in)
  - Uses `getDocFromServer()` to bypass cache and ensure fresh data
  - Cost: ~$0.06 per 100k reads
  
- **localStorage**: Always maintains local cache for offline access and faster loads

---

## Known Limitations

1. **Conflict Resolution**: Last-write-wins (no merge conflict handling)
   - If you edit position on two devices simultaneously, second write overwrites first
   - Future: Add timestamps + merge logic or use Firestore transactions
   
2. **Per-Size Tracking**: Currently one position per asset (not per size)
   - Workaround: Manually note sizes in `notes` field or use `size` field
   - Proper fix: Implement size-aware position keys
   
3. **Offline Mode**: Writes fail silently when offline
   - Firestore SDK has offline support, but needs explicit enablement
   - Future: Enable `enablePersistence()` in firebase.ts

---

## Support & Debugging

### Check if Portfolio Synced
```javascript
// Browser console (when signed in):
const userId = firebase.auth().currentUser.uid;
firebase.firestore().doc(`users/${userId}`).get().then(doc => {
  console.log('Portfolio:', doc.data().portfolio);
});
```

### Force Reload from Firestore
Refresh the page while signed in - portfolio loads on mount.

### Clear Local Portfolio
```javascript
localStorage.removeItem('intelligence_exchange_portfolio');
```

---

## Deployment Checklist

- [ ] Update Firestore security rules (add portfolio validation)
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] Test on production Firebase project
- [ ] Monitor Firestore usage in Firebase Console
- [ ] Set up billing alerts for Firestore costs
- [ ] Document user-facing partial sales feature in Help/FAQ

