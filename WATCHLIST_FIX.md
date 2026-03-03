# Watchlist Persistence Fix

## Issue Description

Users reported that their watchlist items would save correctly but after a few days, the watchlist would appear empty or show fewer items than expected.

## Root Cause

The issue was a **referential integrity problem**:

1. The watchlist stores **asset IDs** (e.g., `[123, 456, 789]`) in Firestore under the user's profile
2. The watchlist display filters the assets array: `assets.filter(asset => watchlistIds.includes(asset.id))`
3. If an asset gets **deleted** from the database or its ID changes, the watchlist still contains the old ID
4. When displaying the watchlist, those IDs don't match any existing assets
5. Result: The watchlist appears empty or incomplete, even though the IDs are still saved

### Example Scenario

```
Day 1: User adds assets 123, 456, 789 to watchlist
       Watchlist saved: [123, 456, 789]
       Display shows: 3 items ✓

Day 3: Asset 456 gets deleted from database
       Watchlist still has: [123, 456, 789]
       Display shows: 2 items (123 and 789 exist, 456 is missing)

Day 5: Asset 789 gets deleted
       Watchlist still has: [123, 456, 789]
       Display shows: 1 item (only 123 exists)
       
User perception: "My watchlist disappeared!"
Reality: The watchlist IDs are saved, but those assets don't exist anymore
```

## Solution Implemented

### 1. Automatic Cleanup Function (`watchlistApi.ts`)

Added a `cleanupWatchlist()` function that:
- Validates all watchlist IDs against the current assets collection
- Removes any IDs that reference non-existent assets
- Returns cleanup statistics (how many items were removed)
- Automatically updates the user's Firestore document

```typescript
export const cleanupWatchlist = async (
  userId: string, 
  validAssets: Asset[]
): Promise<{ cleaned: boolean; removedCount: number; validIds: number[] }>
```

### 2. Automatic Cleanup on Load (`App.tsx`)

Added a `useEffect` hook that automatically runs cleanup when:
- User signs in
- Assets are loaded/refreshed
- User navigates to the watchlist view

The cleanup:
- Runs silently in the background
- Only updates if invalid IDs are found
- Logs cleanup actions to console for debugging

### 3. User Notification (`WatchlistView.tsx`)

Added a friendly notification banner that:
- Appears when items are cleaned up
- Shows how many items were removed and why
- Can be dismissed by the user
- Auto-hides after 10 seconds
- Uses a clear, non-alarming design

## Files Modified

1. **`src/utils/watchlistApi.ts`**
   - Added `cleanupWatchlist()` function
   - Added Asset type import

2. **`src/App.tsx`**
   - Added `cleanupWatchlist` import
   - Added `watchlistCleanupInfo` state
   - Added cleanup `useEffect` hook
   - Pass cleanup info to WatchlistView

3. **`src/components/WatchlistView.tsx`**
   - Added `cleanupInfo` prop
   - Added cleanup notification banner
   - Added auto-hide logic for notification

## Benefits

1. **Prevents confusion**: Users now understand why items disappeared
2. **Automatic maintenance**: No manual intervention needed
3. **Data consistency**: Watchlist always reflects valid assets
4. **User transparency**: Clear communication about what happened
5. **Performance**: Removes unnecessary ID checks for non-existent assets

## Testing Recommendations

1. **Test Cleanup on Sign-in**:
   - Add assets to watchlist
   - Delete those assets from Firestore
   - Sign out and sign back in
   - Verify notification appears and watchlist is cleaned

2. **Test Multiple Deletions**:
   - Add 5 assets to watchlist
   - Delete 3 of them
   - Reload the page
   - Verify notification shows "3 items were removed"

3. **Test No Cleanup Needed**:
   - Add assets to watchlist
   - Don't delete any assets
   - Reload the page
   - Verify no notification appears

4. **Test Notification Dismiss**:
   - Trigger a cleanup
   - Click the X button on notification
   - Verify notification disappears immediately

5. **Test Auto-hide**:
   - Trigger a cleanup
   - Wait 10 seconds
   - Verify notification disappears automatically

## Future Enhancements (Optional)

1. **Cascade Delete**: When an asset is deleted, automatically remove it from all users' watchlists
2. **Archive Instead of Delete**: Move deleted assets to an "archived" state instead of deleting
3. **Undo Function**: Allow users to restore items if they were removed by mistake
4. **Detailed History**: Show which specific items were removed in the notification
5. **Email Notification**: Send email when watchlist items are cleaned up

## Maintenance Notes

- The cleanup runs automatically, no scheduled tasks needed
- Cleanup is triggered only when needed (assets loaded + user signed in)
- No performance impact on app load time (runs asynchronously)
- All cleanup actions are logged to console for debugging

## Related Issues

This fix also prevents related issues:
- "My watchlist count doesn't match what I see"
- "Why do I have empty spaces in my watchlist?"
- "The watchlist shows 5 items but I only see 2"

