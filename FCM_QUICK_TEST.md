# Quick FCM Test Guide

## Your Function URL

Based on your Firebase project path, your function URL is:

```
https://asia-south1-intelligence-exchange-8281f.cloudfunctions.net/manualSendDropReminders
```

## How to Test

### Option 1: Open in Browser (Easiest)

1. Copy this URL:
   ```
   https://asia-south1-intelligence-exchange-8281f.cloudfunctions.net/manualSendDropReminders
   ```

2. Paste it into your browser's address bar and press Enter

3. You should see JSON output like:
   ```json
   {
     "success": true,
     "notificationsSent": 1,
     "results": [...]
   }
   ```

### Option 2: Find URL in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **intelligence-exchange-8281f**
3. Click **Functions** in left sidebar
4. Click on **manualSendDropReminders**
5. Look for:
   - **Trigger** tab - shows the URL
   - Or look at the function details - URL is usually displayed at the top

## What to Check After Running

### 1. Browser Response
- If you see `"success": true` and `"notificationsSent": 1` or higher → ✅ Function is working!
- If you see `"notificationsSent": 0` → No reminders were due (see troubleshooting below)
- If you see an error → Check the error message

### 2. Firebase Console Logs
1. Go back to **Functions** → **manualSendDropReminders**
2. Click **Logs** tab
3. Refresh the page
4. Look for the most recent entry - should show:
   ```
   Sent reminder for {dropName} to user {userId}
   Sent X drop reminder notifications
   ```

### 3. Check Your Browser
- If notification permission is granted, you should see a notification appear
- Check browser console (F12) for any errors

## Troubleshooting

### If `notificationsSent: 0`

This means no reminders were due in the next minute. To test:

1. **Set up a test reminder:**
   - Go to Firestore → `users/{yourUserId}`
   - Find `dropReminders` array
   - Edit your test drop reminder:
     - Set `reminderMinutes` to `1` (1 minute before)
   
2. **Set drop time to near future:**
   - Go to Firestore → `drops/{yourDropId}`
   - Set `releaseDate` to today
   - Set `releaseTime` to **2-3 minutes from now**
   - Example: If it's 2:00 PM, set to 2:02 PM or 2:03 PM

3. **Trigger function again:**
   - Open the URL again
   - Should now show `notificationsSent: 1`

### If You See Errors

**"Function not found" or 404:**
- Function may not be deployed
- Run: `firebase deploy --only functions:manualSendDropReminders`

**"Permission denied":**
- Check Firestore security rules allow function to read drops and users

**"Invalid token" errors:**
- FCM token may be expired
- Try removing and re-adding the reminder in the app

## Quick Status Check

Run this in your browser console (on your app):

```javascript
// Check notification permission
console.log('Permission:', Notification.permission);

// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
});
```

## Next Steps

Once you see `notificationsSent: 1` in the response:
1. ✅ Function is working
2. Check if notification appears on your device
3. If no notification appears, check browser console for errors
4. Verify service worker is registered

