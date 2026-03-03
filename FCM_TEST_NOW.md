# Test FCM Notification Right Now

Your function is working! Now let's set up a reminder that will trigger immediately.

## Quick Setup (5 minutes)

### Step 1: Set Drop Time to Near Future

1. Go to **Firebase Console** → **Firestore Database**
2. Navigate to `drops/{yourTestDropId}` (the drop you created)
3. Edit these fields:
   - **releaseDate**: Set to today's date (e.g., `2026-01-14`)
   - **releaseTime**: Set to **5 minutes from now**
     - Example: If it's 2:00 PM, set to `2:05 PM IST`
     - Format: `H:MM AM/PM IST` (e.g., `2:05 PM IST`)

### Step 2: Set Reminder to 1 Minute Before

1. Go to **Firestore** → `users/{yourUserId}`
2. Find the `dropReminders` array
3. Find the reminder for your test drop (look for `dropId` matching your drop)
4. Edit that reminder object:
   - Set `reminderMinutes` to `1` (instead of 60)
   - This means: remind 1 minute before release

### Step 3: Calculate Reminder Time

The function sends notifications when:
- **Reminder time** = Release time - reminderMinutes
- **Reminder time** is within the **next 1 minute**

So if:
- Release time = 2:05 PM
- Reminder minutes = 1
- Reminder time = 2:04 PM

The function will send at 2:04 PM (within 1 minute of 2:04 PM).

### Step 4: Trigger Function at Right Time

1. Wait until it's **1 minute before your reminder time**
   - Example: If reminder time is 2:04 PM, trigger at 2:03 PM or 2:04 PM
2. Open the function URL:
   ```
   https://asia-south1-intelligence-exchange-8281f.cloudfunctions.net/manualSendDropReminders
   ```
3. You should see:
   ```json
   {
     "success": true,
     "notificationsSent": 1,
     "results": [...]
   }
   ```

## Even Faster Test (2 minutes)

Want to test **right now**? Set it up so reminder time is **in the next 30 seconds**:

1. **Drop releaseTime**: Set to **2 minutes from now**
   - Example: If it's 2:00 PM, set to `2:02 PM IST`
2. **Reminder reminderMinutes**: Set to `1`
3. **Reminder time** = 2:02 PM - 1 minute = **2:01 PM**
4. **Trigger function now** (at 2:00 PM or 2:01 PM)
5. Should get `notificationsSent: 1`!

## Example Timeline

Current time: **2:00 PM**

1. Set drop `releaseTime` = `2:02 PM IST`
2. Set reminder `reminderMinutes` = `1`
3. Reminder will fire at: **2:01 PM** (2:02 PM - 1 minute)
4. Trigger function at: **2:00 PM or 2:01 PM**
5. Function checks: "Is 2:01 PM within the next minute?" → **YES!**
6. Sends notification → `notificationsSent: 1` ✅

## After You See `notificationsSent: 1`

1. **Check browser** - notification should appear
2. **Check browser console** (F12) - look for:
   - `Foreground message received: {...}`
   - Any errors
3. **Check Firebase Console Logs** - should show:
   - `Sent reminder for Test to user {userId}`

## Troubleshooting

**Still getting `notificationsSent: 0`?**
- Double-check reminder time calculation
- Make sure drop `releaseTime` format is correct: `H:MM AM/PM IST`
- Make sure reminder `reminderMinutes` is `1`
- Try triggering function at different times

**Notification not appearing?**
- Check `Notification.permission` in browser console (should be `"granted"`)
- Check browser console for errors
- Verify FCM token exists in Firestore `users/{userId}/fcmTokens`

