# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up FCM for drop reminder notifications.

## Overview

FCM allows you to send push notifications to users even when the browser is closed. The system:
- Registers FCM tokens for each user device
- Stores reminders in Firestore
- Uses Cloud Functions to check and send notifications automatically
- Works across all user devices

## Prerequisites

1. Firebase project with Cloud Messaging enabled
2. VAPID key for web push
3. Service worker support

## Step 1: Get VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Cloud Messaging** tab
4. Scroll to **Web Push certificates**
5. Click **Generate key pair** (if you don't have one)
6. Copy the key pair

## Step 2: Add VAPID Key to Environment Variables

Add to your `.env` file:

```env
VITE_FIREBASE_VAPID_KEY=your-vapid-key-here
```

## Step 3: Update Service Worker

Update `public/firebase-messaging-sw.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  projectId: VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: "957550637988",
  appId: "1:957550637988:web:e6d26e43ff4f9169d5c731",
};
```

## Step 4: Register Service Worker

The service worker should be automatically registered. If not, add to your `main.tsx` or `App.tsx`:

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
```

## Step 5: Deploy Cloud Functions

Deploy the drop reminder Cloud Function:

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions:sendDropReminders,functions:manualSendDropReminders
```

## Step 6: Test

1. Sign in to your app
2. Go to Drops page
3. Click "Set Reminder" on a drop
4. Allow notifications when prompted
5. Check Firebase Console → Cloud Messaging → Users to see registered tokens

## How It Works

### User Flow

1. **User sets reminder**: Clicks "Set Reminder" on a drop
2. **FCM token registration**: App requests notification permission and gets FCM token
3. **Token storage**: Token is saved to Firestore under `users/{userId}/fcmTokens`
4. **Reminder storage**: Reminder is saved to `users/{userId}/dropReminders`

### Cloud Function Flow

1. **Scheduled check**: Cloud Function runs every minute
2. **Check reminders**: For each user, checks if any reminder time is within the next minute
3. **Send notifications**: Sends FCM notification to all user's registered devices
4. **Background delivery**: Service worker receives notification even if browser is closed

### Notification Delivery

- **Foreground**: App is open → `onForegroundMessage` handler shows notification
- **Background**: Browser is open but tab is inactive → Service worker shows notification
- **Closed**: Browser is closed → Service worker shows notification (OS-level)

## Troubleshooting

### "FCM is not supported"
- Make sure you're using HTTPS (or localhost for development)
- Check that service workers are enabled in browser

### "No FCM token available"
- Check that VAPID key is set correctly
- Verify notification permission is granted
- Check browser console for errors

### Notifications not received
- Verify Cloud Function is deployed: `firebase functions:list`
- Check Cloud Function logs: `firebase functions:log`
- Verify FCM tokens are stored in Firestore
- Test with manual trigger: Visit the `manualSendDropReminders` function URL

### Service Worker not registering
- Check browser console for errors
- Verify `firebase-messaging-sw.js` is in `public/` directory
- Make sure service workers are enabled in browser settings

## Manual Testing

You can manually trigger the reminder check by calling:

```
https://asia-south1-YOUR-PROJECT.cloudfunctions.net/manualSendDropReminders
```

This will check for reminders that should be sent in the next minute and send them immediately.

## Security

- FCM tokens are stored per-user in Firestore
- Only authenticated users can set reminders
- Cloud Functions check user permissions before sending
- Invalid tokens are automatically cleaned up

## Next Steps

- Add support for multiple reminder times (15 min, 1 hour, 1 day before)
- Add notification preferences (email, SMS, push)
- Add notification history/logs
- Add notification scheduling UI

