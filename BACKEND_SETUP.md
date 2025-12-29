# Backend Setup Guide - Google Apps Script + Google Sheets

This guide explains how to set up the shared backend for the Intelligence Exchange app so that analyst changes are visible to all users.

## Overview

The app uses **Google Apps Script** as a lightweight backend that stores asset data in a **Google Sheet**. This provides:
- ✅ Shared asset data across all users
- ✅ No server infrastructure needed
- ✅ Free (within Google's quotas)
- ✅ Easy to view/edit data directly in Google Sheets
- ✅ Automatic fallback to localStorage if API is unavailable

## Step-by-Step Setup

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Intelligence Exchange Assets" (or any name you prefer)
4. **Important**: Note the Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy the `SHEET_ID_HERE` part (you'll need it later)

   Sheet ID - 1s0gCYoiFBCwD3bXD9sFjf2-xgOasB5PrPIATZxpuyek

### 2. Open Apps Script Editor

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. A new tab opens with the Apps Script editor

### 3. Paste the Backend Code

1. Delete any default code in the editor
2. Open the file: `google-apps-script/AssetsAPI.gs` from this project
3. Copy the entire contents
4. Paste it into the Apps Script editor
5. Click **Save** (💾 icon) or press `Cmd+S` / `Ctrl+S`
6. Name the project: "Intelligence Exchange Assets API"

### 4. Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon (⚙️) next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "Assets API v1" (or any description)
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: 
     - For testing: **Anyone** (allows unauthenticated requests)
     - For production: **Anyone with Google account** (more secure)
5. Click **Deploy**
6. **Important**: Copy the **Web App URL** that appears
   - It looks like: `https://script.google.com/macros/s/AKfycby.../exec`
   - This is your API endpoint

### 5. Authorize the Script (First Time Only)

1. When you first run the script, Google will ask for authorization
2. Click **Review Permissions**
3. Choose your Google account
4. Click **Advanced** → **Go to [Project Name] (unsafe)**
5. Click **Allow**
6. The script is now authorized to read/write to your Google Sheet

### 6. Configure the Frontend

1. Create a `.env` file in the project root (if it doesn't exist):
   ```bash
   # .env
   VITE_ASSETS_API_BASE_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

2. Replace `YOUR_SCRIPT_ID` with the actual Web App URL from step 4

3. Restart your development server:
   ```bash
   npm run dev
   ```

### 7. Test the Setup

1. Open the app in your browser
2. Log in as an analyst (`rohan3093@gmail.com` / `Stupidchap1!`)
3. Go to **Analyst Dashboard** → **Asset Management**
4. Create a new asset or edit an existing one
5. Check your Google Sheet - you should see the data appear
6. Open the app in a different browser/device - the asset should be visible there too

## How It Works

### Data Flow

1. **App Load**: Frontend calls `fetchAllAssets()` → API returns all assets from Google Sheet
2. **Create Asset**: Analyst creates asset → Frontend calls `createAsset()` → API saves to Google Sheet → All users see it
3. **Update Asset**: Analyst edits asset → Frontend calls `updateAsset()` → API updates Google Sheet → All users see changes
4. **Delete Asset**: Analyst deletes asset → Frontend calls `deleteAsset()` → API removes from Google Sheet → All users see it removed

### Fallback Behavior

If the API is unavailable (network error, API not configured, etc.):
- The app automatically falls back to `localStorage`
- Users can still use the app, but changes are local to their device
- When the API is available again, you can sync local data using the sync function

### Sheet Structure

The script automatically creates a sheet with these columns:
- `id` - Unique asset ID
- `name` - Asset name
- `sku` - SKU code
- `brand` - Brand name
- `category` - Category (Sneakers, Watches, etc.)
- `image` - Image URL
- `sizes` - JSON array of size variants
- `priceAnchors` - JSON object with price anchors
- `listingsSnapshot` - JSON object with listing counts
- `volatility` - low/medium/high
- `defaultSize` - Default size string
- `lastUpdated` - ISO timestamp

## Troubleshooting

### API returns errors

1. **Check the Web App URL**: Make sure it's correct in `.env`
2. **Check permissions**: Ensure the script is deployed with "Anyone" or "Anyone with Google account" access
3. **Check authorization**: Make sure you authorized the script in step 5
4. **Check Apps Script logs**: Go to Apps Script editor → **Executions** tab to see error logs

### Data not syncing

1. **Check browser console**: Look for API errors
2. **Verify API is accessible**: Try opening the Web App URL directly in a browser (should return JSON)
3. **Check CORS**: The script includes CORS headers, but some browsers may block them
4. **Check sheet permissions**: Ensure the Google Sheet is accessible

### localStorage fallback not working

- The app should automatically fall back to localStorage if the API fails
- Check browser console for error messages
- Verify `storage.ts` is working correctly

## ⚠️ Known CORS Limitation

**Important**: Google Apps Script web apps have a known limitation where CORS headers set in the script are not properly returned in responses. This means direct fetch requests from browsers will fail with CORS errors.

**Current Solution**: The app uses **localStorage** as the primary data store. This works perfectly for MVP validation, but analyst changes are local to each device.

**For Production**: See `PRODUCTION_BACKEND.md` for migration options (Firebase, Supabase, etc.)

## Security Considerations

### Current Setup (MVP/Testing)
- **Anyone** can access the API (if deployed with "Anyone" access)
- No authentication on the API endpoint
- CORS limitations require proxy workaround
- Suitable for MVP validation, not production

### Production Recommendations
1. **Migrate to a proper backend** (Firebase, Supabase, etc.) - **RECOMMENDED**
2. **Change deployment access** to "Anyone with Google account"
3. **Add API key authentication** to the Apps Script
4. **Implement rate limiting** in Apps Script
5. **Add input validation** for asset data

## Next Steps

Once the backend is set up:
1. ✅ Analyst changes are now shared across all users
2. ✅ You can view/edit data directly in Google Sheets
3. ✅ Data persists even if users clear their browser cache
4. ✅ Multiple analysts can work simultaneously (with some limitations)

## Migration from localStorage

If you have existing assets in localStorage and want to migrate them to the API:

1. The app will automatically use localStorage as fallback
2. To sync local assets to API, you can add this to the browser console:
   ```javascript
   import { syncLocalAssetsToApi } from './utils/assetsApi';
   syncLocalAssetsToApi();
   ```

Or add a "Sync to API" button in the Analyst Dashboard (future enhancement).

---

**Last Updated**: 2024-01-XX

