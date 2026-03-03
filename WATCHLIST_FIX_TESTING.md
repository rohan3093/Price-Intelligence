# Watchlist Fix - Testing Guide

## Quick Test: Verify the Fix Works

### Test 1: Simulate Missing Assets

1. **Add items to your watchlist**:
   - Sign in to your account
   - Browse the market and add 3-5 items to your watchlist
   - Note the asset IDs (you can see them in the browser console)

2. **Check your watchlist in Firestore**:
   - Go to Firebase Console → Firestore Database
   - Navigate to `users/{your-user-id}`
   - Verify the `watchlist` field contains your asset IDs

3. **Simulate asset deletion**:
   - Go to Firestore Database → `assets` collection
   - Delete one or two of the assets that are in your watchlist
   - (OR) You can manually edit your watchlist in Firestore to add a fake ID like `99999`

4. **Reload the app**:
   - Refresh your browser
   - Navigate to the Watchlist view
   - **Expected Result**: 
     - You should see a yellow notification banner
     - It should say "X item(s) were removed from your watchlist because those assets no longer exist"
     - Your watchlist should only show the valid assets

5. **Verify cleanup happened**:
   - Go back to Firestore Console
   - Check the `users/{your-user-id}` document
   - The `watchlist` field should now only contain valid asset IDs

### Test 2: Verify No False Positives

1. **Add items to watchlist**
2. **Don't delete any assets**
3. **Reload the app**
4. **Expected Result**: 
   - No notification banner should appear
   - All watchlist items should still be visible

### Test 3: Test Notification Dismiss

1. **Trigger a cleanup** (follow Test 1)
2. **Click the X button** on the notification
3. **Expected Result**: 
   - Notification disappears immediately
   - Watchlist still shows correct items

### Test 4: Test Auto-Hide

1. **Trigger a cleanup** (follow Test 1)
2. **Wait 10 seconds** without clicking anything
3. **Expected Result**: 
   - Notification automatically disappears after 10 seconds

## Console Debugging

You can monitor the cleanup process in the browser console:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages like:
   ```
   Cleaned 2 invalid asset(s) from watchlist
   Removed 2 invalid asset(s) from watchlist
   ```

## Manual Verification in Firestore

### Before Fix (Old Behavior):
```json
// User's watchlist might contain:
{
  "watchlist": [123, 456, 789, 999],
  "updatedAt": "2026-01-20T10:00:00Z"
}

// But only assets 123 and 789 exist in assets collection
// Assets 456 and 999 were deleted
// Result: User sees only 2 items but watchlist has 4 IDs
```

### After Fix (New Behavior):
```json
// After cleanup runs:
{
  "watchlist": [123, 789],  // Invalid IDs removed!
  "updatedAt": "2026-01-22T15:30:00Z"
}

// Now watchlist matches reality
// User sees 2 items, watchlist has 2 IDs
```

## What to Look For

### ✅ Signs the Fix is Working:

1. **Notification appears** when invalid items are cleaned
2. **Console logs** show cleanup messages
3. **Firestore watchlist** only contains valid IDs after cleanup
4. **Watchlist count** matches displayed items
5. **No empty spaces** in the watchlist display

### ❌ Signs of Issues:

1. **No notification** appears when you know items were deleted
2. **Console errors** related to watchlist
3. **Firestore watchlist** still contains invalid IDs after reload
4. **Watchlist count** doesn't match displayed items
5. **Notification doesn't auto-hide** after 10 seconds

## Troubleshooting

### Issue: Cleanup doesn't run

**Possible causes**:
- Assets haven't finished loading yet
- User not signed in
- Watchlist is empty

**Solution**: 
- Wait for assets to load completely
- Make sure you're signed in
- Add items to watchlist first

### Issue: Notification doesn't appear

**Possible causes**:
- No invalid IDs to clean
- Component props not passed correctly

**Solution**:
- Manually add an invalid ID to test (e.g., 99999)
- Check browser console for errors
- Verify `cleanupInfo` prop is passed to WatchlistView

### Issue: Performance concerns

**Note**: The cleanup only runs when:
- User is signed in
- Assets are loaded
- Watchlist has items

It does NOT run:
- On every page load if no cleanup needed
- When user is signed out
- When watchlist is empty

## Advanced: Testing at Scale

If you want to test with many items:

```javascript
// Run this in browser console (while signed in):
const userId = "your-user-id";
const fakeIds = Array.from({length: 10}, (_, i) => 99900 + i);
const validIds = [123, 456, 789]; // Replace with real IDs

// Mix valid and invalid IDs
const mixedWatchlist = [...validIds, ...fakeIds];

// This should trigger a cleanup on next load
console.log("Test watchlist with", fakeIds.length, "invalid IDs");
```

## Questions?

If the fix isn't working as expected:

1. Check browser console for errors
2. Verify Firebase connection is working
3. Confirm you're using the latest code
4. Check Firestore rules allow read/write to user documents
5. Review the watchlist document structure in Firestore

## Next Steps After Testing

Once you've verified the fix works:

1. ✅ Test with your production data
2. ✅ Monitor console logs for a few days
3. ✅ Check if user complaints decrease
4. ✅ Consider adding analytics tracking for cleanup events
5. ✅ Document the cleanup behavior for your team

