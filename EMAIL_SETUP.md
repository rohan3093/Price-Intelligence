# Email Reminders Setup (SendGrid)

This project now supports email reminders for drops. Email is sent from the Cloud Functions `sendDropReminders` and `manualSendDropReminders`.

## Requirements

- A SendGrid account
- A verified Sender Identity (or domain)
- SendGrid API key

## 1. Create SendGrid API Key

1. Go to https://sendgrid.com/
2. Create an API key with `Mail Send` permission
3. Copy the key

## 2. Configure Firebase Functions Environment

Set the SendGrid config values:

```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY" sendgrid.from="you@yourdomain.com"
```

Then deploy functions:

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions:sendDropReminders,functions:manualSendDropReminders
```

## 3. Ensure User Email is Stored

When a user signs in, the app stores their email under:

```
users/{uid}
  email: "user@example.com"
  emailRemindersEnabled: true
```

If you need to override, you can set:
- `emailRemindersEnabled: false` to disable sending
- `notificationEmail: "alt@example.com"` to use a different address

## 4. Test Email Delivery

Trigger the manual function with force:

```
https://asia-south1-intelligence-exchange-8281f.cloudfunctions.net/manualSendDropReminders?force=true
```

In the JSON response, look for:

```json
{
  "emailEnabled": true,
  "emailSent": true
}
```

If `emailEnabled` is false:
- Missing SendGrid config
- User has no email saved
- `emailRemindersEnabled` is set to false

## Troubleshooting

### Email not sending
- Check Functions logs for `Error sending reminder email`
- Confirm SendGrid API key and sender are valid
- Make sure sender identity is verified in SendGrid

### Sending to the wrong address
- Set `notificationEmail` on the user document


