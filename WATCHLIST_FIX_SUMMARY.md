# Watchlist Persistence Fix - Summary

## Problem
Watchlist items were disappearing on every page refresh, even though data existed in Firestore.

## Root Cause
**Race condition between user profile save and watchlist load:**

1. On page load, `onAuthStateChanged` callback fires
2. `saveUserProfileFromAuth(user)` starts writing to Firestore (async)
3. Watchlist load starts **at the same time**
4. `getDoc()` or even `getDocFromServer()` sees the pending write operation
5. Returns local state with only profile fields (displayName, email, emailRemindersEnabled, updatedAt)
6. Missing fields: watchlist, dropReminders, fcmTokens
7. Watchlist appears empty!

### Technical Details
- Firestore document snapshot had `hasPendingWrites: true`
- This meant there was an in-progress write operation
- The read operation returned the local cache with incomplete data
- Even `getDocFromServer()` couldn't bypass this because the write was pending locally

## Solution
Made the `onAuthStateChanged` callback **async** and **await** the profile save before updating user state:

```typescript
const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
  if (user) {
    // IMPORTANT: Save user profile FIRST and WAIT for it to complete
    // This prevents race condition where watchlist read happens during profile write
    try {
      await saveUserProfileFromAuth(user);
    } catch (error) {
      console.warn("Failed to save user profile:", error);
    }
    
    // Track analytics...
  }
  
  // Update user state AFTER profile is saved (or if no user)
  // This ensures watchlist load happens AFTER profile write completes
  setCurrentUser(user);
  setAuthInitialized(true);
  setIsAnalystAuthenticated(!!user);
});
```

### Why This Works
1. Profile save completes first (with `merge: true` preserving all fields)
2. **Then** `currentUser` state is updated
3. Watchlist load effect triggers **after** profile write is done
4. Firestore read gets the complete document with all fields
5. Watchlist persists! 🎉

## Additional Improvements

### 1. Use `getDocFromServer()` instead of `getDoc()`
Changed watchlist loading to use `getDocFromServer()` which bypasses local cache:

```typescript
// Before: const docSnap = await getDoc(docRef);
// After:  const docSnap = await getDocFromServer(docRef);
```

This ensures we always get fresh data from the server, not stale cache.

### 2. Auth Initialization Flag
Added `authInitialized` state to prevent watchlist loading before Firebase auth completes its initial check:

```typescript
const [authInitialized, setAuthInitialized] = useState(false);

// Only load watchlist after auth has initialized
useEffect(() => {
  if (!authInitialized) return;
  // ... load watchlist
}, [currentUser, authInitialized]);
```

### 3. Manual Saves Only
Removed automatic save effect that ran on every `watchlistIds` change. Now saves only happen:
- When user adds an item to watchlist
- When user removes an item from watchlist
- On sign-out (to ensure data is persisted)

This prevents accidental overwrites from empty initial state.

## Files Changed

### `src/App.tsx`
- Made `onAuthStateChanged` callback async
- Wait for profile save before setting `currentUser`
- Added `authInitialized` state
- Removed debug banner and event logging
- Manual saves only (in `handleToggleWatchlist` and `onRemoveFromWatchlist`)

### `src/utils/watchlistApi.ts`
- Changed `getDoc()` to `getDocFromServer()`
- Cleaned up debug logging
- Simplified function signatures

## Testing
1. ✅ Watchlist loads on page refresh
2. ✅ Watchlist persists across refreshes
3. ✅ Adding items saves immediately
4. ✅ Removing items saves immediately
5. ✅ Sign-out preserves data
6. ✅ Sign-in loads user's watchlist

## Lessons Learned
1. **Firestore pending writes** can affect read operations, even with `getDocFromServer()`
2. **Race conditions** in async Firebase operations need careful sequencing
3. **Firefox console.log filtering** can hide debug output - UI-based debugging was essential
4. **`merge: true`** in `setDoc()` preserves other fields, but pending writes still affect reads
5. **Await critical operations** before triggering dependent state changes

## Date Fixed
January 22, 2026

