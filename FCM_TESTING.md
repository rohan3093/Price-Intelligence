# FCM Testing Guide

Step-by-step guide to verify Firebase Cloud Messaging is working correctly.

## Prerequisites

1. ✅ VAPID key added to `.env` file
2. ✅ Service worker updated with Firebase config
3. ✅ Cloud Functions deployed
4. ✅ User signed in to the app

## Step 1: Check FCM Token Registration

### In Browser Console

1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Sign in to your app
5. Navigate to **Drops** page
6. Look for these log messages:
   ```
   Service Worker registered: [ServiceWorkerRegistration]
   FCM token obtained: [token]...
   FCM token registered successfully
   ```

### In Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. Navigate to `users/{your-user-id}`
5. Check for `fcmTokens` field - should contain an array with your token
6. Example:
   ```json
   {
     "fcmTokens": ["cXyZ123...abc"],
     "dropReminders": [...]
   }
   ```

## Step 2: Test Reminder Creation

1. In your app, go to **Drops** page
2. Click **"Set Reminder"** on any upcoming drop
3. Check browser console for:
   ```
   FCM token registered successfully
   ```
4. Check Firestore `users/{userId}/dropReminders` - should see:
   ```json
   {
     "dropId": 123,
     "reminderMinutes": 60,
     "createdAt": "2024-..."
   }
   ```

## Step 3: Test Notification Permission

### Check Permission Status

In browser console, run:
```javascript
Notification.permission
```

Should return: `"granted"`

If it's `"default"` or `"denied"`:
- Clear browser cache
- Try again and allow notifications when prompted

## Step 4: Test Cloud Function

### Option A: Manual Trigger (Recommended for Testing)

1. Deploy functions:
   ```bash
   firebase deploy --only functions:manualSendDropReminders
   ```

2. Get function URL from Firebase Console:
   - Go to **Functions** tab
   - Find `manualSendDropReminders`
   - Copy the URL

3. Visit the URL in browser or use curl:
   ```bash
   curl https://asia-south1-YOUR-PROJECT.cloudfunctions.net/manualSendDropReminders
   ```

4. Check response - should show:
   ```json
   {
     "success": true,
     "notificationsSent": 1,
     "results": [...]
   }
   ```

### Option B: Check Scheduled Function Logs

1. Go to Firebase Console → **Functions**
2. Click on `sendDropReminders`
3. Go to **Logs** tab
4. Should see logs every minute:
   ```
   Checking for drop reminders to send...
   Sent X drop reminder notifications
   ```

## Step 5: Test Notification Delivery

### Foreground Test (App Open)

1. Keep your app open in browser
2. Set a reminder for a drop that's **very soon** (or manually trigger)
3. You should see a browser notification appear
4. Check console for:
   ```
   Foreground message received: {...}
   ```

### Background Test (Tab Inactive)

1. Set a reminder
2. Switch to another tab (keep browser open)
3. Wait for notification time
4. Notification should appear even though tab is inactive

### Closed Browser Test

1. Set a reminder
2. **Close the browser completely**
3. Wait for notification time
4. Notification should appear at OS level (system notification)

## Step 6: Debug Common Issues

### No FCM Token

**Check:**
```javascript
// In browser console
import { getFCMToken } from './src/utils/fcmService';
getFCMToken().then(token => console.log('Token:', token));
```

**If null:**
- Check VAPID key is set correctly
- Check notification permission is granted
- Check service worker is registered
- Check browser console for errors

### Token Not Saved to Firestore

**Check:**
1. Firestore rules allow write to `users/{userId}`
2. User is authenticated
3. Check browser console for errors

**Test manually:**
```javascript
// In browser console (after signing in)
import { registerFCMToken } from './src/utils/fcmService';
const userId = firebase.auth().currentUser?.uid;
if (userId) {
  registerFCMToken(userId).then(token => console.log('Registered:', token));
}
```

### Notifications Not Received

**Check Cloud Function:**
1. Go to Firebase Console → Functions → Logs
2. Look for errors
3. Check if function is running every minute

**Check Reminder Timing:**
- Reminder time must be within next 1 minute for scheduled function
- Use manual trigger for immediate testing

**Check FCM Token Validity:**
- Old tokens can become invalid
- Try removing and re-adding reminder
- Check Firestore for token errors in function logs

### Service Worker Not Working

**Check registration:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
});
```

**Check service worker file:**
- Verify `public/firebase-messaging-sw.js` exists
- Check Network tab - should load without 404
- Check service worker has correct Firebase config

## Step 7: Quick Test Script

Run this in browser console (after signing in):

```javascript
// Quick FCM test
(async () => {
  const { registerFCMToken, isFCMSupported } = await import('./src/utils/fcmService');
  
  console.log('FCM Supported:', isFCMSupported());
  
  const user = firebase.auth().currentUser;
  if (!user) {
    console.error('Not signed in');
    return;
  }
  
  console.log('Registering FCM token...');
  const token = await registerFCMToken(user.uid);
  console.log('Token:', token ? token.substring(0, 20) + '...' : 'Failed');
  
  // Check Firestore
  const db = firebase.firestore();
  const userDoc = await db.collection('users').doc(user.uid).get();
  console.log('FCM Tokens in Firestore:', userDoc.data()?.fcmTokens);
  console.log('Drop Reminders:', userDoc.data()?.dropReminders);
})();
```

## Step 8: Verify End-to-End

### Complete Test Flow

1. **Sign in** to app
2. **Go to Drops** page
3. **Set reminder** on a drop (click "Set Reminder")
4. **Check Firestore** - verify token and reminder saved
5. **Wait or trigger manually** - use manual trigger function
6. **Receive notification** - should appear even if browser closed

### Expected Behavior

✅ **Token Registration:**
- Token appears in Firestore `users/{userId}/fcmTokens`
- Console shows "FCM token registered successfully"

✅ **Reminder Storage:**
- Reminder appears in Firestore `users/{userId}/dropReminders`
- Contains `dropId`, `reminderMinutes`, `createdAt`

✅ **Notification Delivery:**
- Cloud Function logs show "Sent X notifications"
- Notification appears on device
- Works in foreground, background, and when closed

## Troubleshooting Checklist

- [ ] VAPID key set in `.env` file
- [ ] Service worker file exists in `public/` directory
- [ ] Service worker has correct Firebase config
- [ ] Notification permission granted
- [ ] User is signed in
- [ ] FCM token appears in Firestore
- [ ] Reminder appears in Firestore
- [ ] Cloud Function is deployed
- [ ] Cloud Function logs show activity
- [ ] No errors in browser console
- [ ] No errors in Cloud Function logs

## Next Steps After Testing

Once everything works:
1. Test with multiple devices (same user)
2. Test with multiple reminders
3. Test reminder removal
4. Monitor Cloud Function costs (runs every minute)
5. Consider adjusting schedule frequency if needed

