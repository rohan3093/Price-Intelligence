# Drops Feature - Quick Start Guide

## What You Need to Do

The drops feature is now implemented, but you need to set up the backend scraper. Here's what to do:

## Step 1: Install Functions Dependencies (If Not Already Done)

```bash
cd functions
npm install
```

This installs the packages needed for the scraper (Puppeteer, Firebase Functions, etc.).

**Check if already done**: If you see a `node_modules` folder in `functions/`, you can skip this step.

## Step 2: Build the Functions

```bash
# Still in the functions directory
npm run build
```

This compiles the TypeScript code to JavaScript. You should see a `lib/` folder created.

## Step 3: Deploy to Firebase

```bash
# Go back to project root
cd ..

# Deploy the functions
firebase deploy --only functions
```

This will:
- Upload your scraper function to Firebase
- Set up the scheduled job (runs daily at 2 AM IST)
- Create a manual trigger URL you can use for testing

**Note**: You need to be logged into Firebase CLI. If not:
```bash
firebase login
```

## Step 4: Test It (Optional)

After deployment, you can:

### Option A: Wait for Scheduled Run
- The scraper runs automatically at 2 AM IST daily
- Check the next day for new drops in Firestore

### Option B: Trigger Manually
After deployment, Firebase will give you a URL like:
```
https://asia-south1-YOUR-PROJECT.cloudfunctions.net/manualScrapeNikeSnkrs
```

Visit that URL in your browser or use curl to trigger a manual scrape.

## Step 5: Review Drops in Analyst Dashboard

1. **Start your app**: `npm run dev`
2. **Go to Analyst Dashboard** → **Drops** tab
3. **Review pending drops** (status: "Pending Review")
4. **Click "Verify"** on drops you want to publish
5. **Edit** any details if needed (price, retailers, etc.)

## Step 6: View on Public Drops Page

1. **Navigate to "Drops"** in the main navigation
2. **See all verified upcoming drops** with countdown timers
3. **Filter by brand** if needed

## Troubleshooting

### "npm install" fails
- Make sure you're in the `functions/` directory
- Check Node.js version (needs Node 18+)

### "firebase deploy" fails
- Make sure you're logged in: `firebase login`
- Check you're in the project root (not in `functions/`)
- Verify your Firebase project is set up correctly

### No drops appearing
- Check Firestore console for the `drops` collection
- Verify drops have `status: "upcoming"` (not "pending_review")
- Make sure drops are `verified: true`

### Scraper not working
- Check Firebase Functions logs: `firebase functions:log`
- Nike may have changed their website structure (scraper may need updates)

## What Happens Next?

Once deployed:
- ✅ Scraper runs daily at 2 AM IST
- ✅ New drops appear in Firestore with `status: "pending_review"`
- ✅ Analysts verify drops in the dashboard
- ✅ Verified drops appear on the public Drops page

## Need Help?

- Check `DROPS_SETUP.md` for detailed documentation
- Check Firebase Console → Functions for logs
- Check Firestore Console → `drops` collection for data

