# Watchlist Debug - Step by Step

## Step 1: Check Console Settings

Your console might be filtering out logs. Here's how to fix it:

1. **Open DevTools** (F12 or Right-click → Inspect)
2. **Go to Console tab**
3. **Check the filter dropdown** (usually says "All levels" or has icons)
4. Make sure these are ENABLED:
   - ☑️ Verbose
   - ☑️ Info
   - ☑️ Warnings
   - ☑️ Errors
5. **Check the filter text box** - make sure it's empty (no filters like "firebase" or anything)
6. **Look for "Preserve log"** checkbox - ENABLE it so logs don't clear on navigation

## Step 2: Check if App is Loading

1. In the Console, type this and press Enter:
   ```javascript
   console.log("TEST - Console is working!");
   ```
   
2. You should see: `TEST - Console is working!`
   
3. If you DON'T see it, your console has filters active

## Step 3: Check Service Worker Error

1. In DevTools, go to **Console** tab
2. Look at the very top - do you see any red errors?
3. Specifically look for: `VITE_FIREBASE_API_KEY is not defined`

If you see this error, the service worker fix didn't apply yet.

## Step 4: Force Service Worker Update

The old broken service worker might still be cached. Let's clear it:

1. In DevTools, go to **Application** tab (Chrome) or **Storage** tab (Firefox)
2. In the left sidebar, click **Service Workers**
3. You should see `firebase-messaging-sw.js`
4. Click **Unregister** next to it
5. Refresh the page (Cmd+R or F5)
6. The new service worker should load

## Step 5: Check if User is Signed In

In Console, run:
```javascript
// Check auth state
import { auth } from '/src/utils/firebase.ts';
console.log('Auth:', auth?.currentUser);
```

OR, simpler - just look at your app:
- Do you see your email in the header?
- If not, you're signed out - sign in first!

## Step 6: Manually Test Watchlist

In Console, run these commands one by one:

```javascript
// 1. Check if Firestore is connected
const { db } = await import('/src/utils/firebase.ts');
console.log('Firestore:', db ? 'Connected' : 'Not connected');

// 2. Check current user
const { auth } = await import('/src/utils/firebase.ts');
console.log('Current user:', auth?.currentUser?.uid || 'Not signed in');

// 3. Try to load watchlist
const { loadUserWatchlist } = await import('/src/utils/watchlistApi.ts');
const userId = auth?.currentUser?.uid;
if (userId) {
  const watchlist = await loadUserWatchlist(userId);
  console.log('Watchlist from Firestore:', watchlist);
} else {
  console.log('Cannot load watchlist: Not signed in');
}
```

## Step 7: Check Firestore Directly

Let's verify your watchlist exists in Firebase:

1. Go to **Firebase Console**: https://console.firebase.google.com
2. Select your project: `intelligence-exchange-8281f`
3. Click **Firestore Database** in the left menu
4. Look for collection: `users`
5. Find your user document (the ID should be your auth UID)
6. Check the `watchlist` field - does it have an array of numbers?

If the field is empty or doesn't exist, that's the problem!

## Step 8: Test Saving Watchlist

If you're signed in, try adding something to watchlist:

1. Go to the Market view
2. Click the star/heart icon on any asset to add to watchlist
3. In Console, you should see logs (if our debug logging is working)
4. Go to Firebase Console → Firestore → users → your document
5. Check if the `watchlist` field updated

## Quick Test Script

Copy and paste this entire block into Console and press Enter:

```javascript
(async function testWatchlist() {
  console.log('=== WATCHLIST DEBUG TEST ===');
  
  try {
    // Import modules
    const firebase = await import('/src/utils/firebase.ts');
    const watchlistApi = await import('/src/utils/watchlistApi.ts');
    
    // Check Firestore
    console.log('1. Firestore:', firebase.db ? '✅ Connected' : '❌ Not connected');
    
    // Check Auth
    const user = firebase.auth?.currentUser;
    console.log('2. Current User:', user ? `✅ ${user.email} (${user.uid})` : '❌ Not signed in');
    
    if (!user) {
      console.log('⚠️ Please sign in first!');
      return;
    }
    
    // Try loading watchlist
    console.log('3. Loading watchlist...');
    const watchlist = await watchlistApi.loadUserWatchlist(user.uid);
    console.log('4. Watchlist loaded:', watchlist);
    console.log('5. Watchlist length:', watchlist.length);
    
    if (watchlist.length === 0) {
      console.log('⚠️ Watchlist is empty. Try adding an item first.');
    } else {
      console.log('✅ Watchlist has', watchlist.length, 'items:', watchlist);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('=== TEST COMPLETE ===');
})();
```

## What to Look For

After running the test script, tell me:

1. **Firestore status**: Connected or Not connected?
2. **User status**: Signed in or Not signed in?
3. **Watchlist**: What does it show?
4. **Any errors**: Copy any red error messages

This will tell us exactly where the problem is!

