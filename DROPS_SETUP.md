# Drops Feature Setup Guide

## Overview

The drops feature allows you to:
- **Manually manage** drops through the Analyst Dashboard
- **Display upcoming drops** to users on the public Drops page

⚠️ **Note**: Automated scraping is currently **disabled**. Only manual drops are supported at this time.

## Architecture

- **Firestore**: `drops` collection stores all drop data
- **Client-side**: React components for viewing and managing drops
- **Firebase Cloud Functions**: Scraping functions are currently disabled

## Setup Instructions

### 1. Install Firebase Functions Dependencies

```bash
cd functions
npm install
```

This will install:
- `firebase-admin` - Firebase Admin SDK
- `firebase-functions` - Cloud Functions SDK

**Note**: Scraping functions are currently disabled, so you don't need to deploy functions for manual drops only.

### 2. Build Functions (Optional - Only if you plan to re-enable scraping)

```bash
cd functions
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` directory.

### 3. Deploy Functions (Optional - Only if you plan to re-enable scraping)

```bash
# From project root
firebase deploy --only functions
```

⚠️ **Scraping is currently disabled** - Functions are commented out in `functions/src/index.ts`

## How It Works

### Manual Management (Current)

1. **Analyst Dashboard** → **Drops** tab
2. **Review Queue**: See all `pending_review` drops
3. **Verify**: Click "Verify" to approve and set status to `upcoming`
4. **Edit**: Modify drop details, add retailers, set prices
5. **Add Manual**: Create drops manually for other retailers

### Public View

1. **Drops Page**: Shows all verified `upcoming` and `live` drops
2. **Filter**: By brand
3. **Countdown**: Time until release
4. **Retailer Links**: Direct links to purchase pages

## Data Flow

```
Cloud Function (Daily)
  ↓
Scrapes Nike SNKRS India
  ↓
Saves to Firestore (status: pending_review)
  ↓
Analyst Dashboard (Review Queue)
  ↓
Analyst Verifies/Edits
  ↓
Status: upcoming
  ↓
Public Drops Page (Visible to users)
```

## Firestore Structure

### Collection: `drops`

```typescript
{
  id: number;
  name: string;
  brand: string;
  image: string;
  releaseDate: string; // ISO date
  releaseTime?: string; // e.g., "4:31 AM IST"
  retailPrice?: number; // INR
  retailers: [
    {
      name: "nike-snkrs-india",
      displayName: "Nike SNKRS India",
      url: "https://...",
      partnershipStatus: "scraped"
    }
  ],
  status: "pending_review" | "upcoming" | "live" | "sold-out" | "cancelled" | "rejected",
  verified: boolean,
  source: {
    type: "nike-snkrs-scrape",
    url: "https://www.nike.com/in/launch/upcoming",
    scrapeId: "unique-id",
    confidence: 85
  },
  createdAt: string,
  updatedAt: string
}
```

## Firestore Indexes Required

The following indexes may be needed (Firebase will prompt you to create them):

1. **Collection**: `drops`
   - Fields: `releaseDate` (Ascending)
   - Query scope: Collection

2. **Collection**: `drops`
   - Fields: `status` (Ascending), `releaseDate` (Ascending)
   - Query scope: Collection

3. **Collection**: `drops`
   - Fields: `source.scrapeId` (Ascending)
   - Query scope: Collection

## Troubleshooting

### Scraper Not Working

1. **Check Function Logs**:
   ```bash
   firebase functions:log
   ```

2. **Test Locally**:
   ```bash
   cd functions
   npm run serve
   ```

3. **Check Puppeteer**: May need additional dependencies on some systems

### Drops Not Appearing

1. **Check Firestore**: Verify drops are being saved
2. **Check Status**: Drops must be `upcoming` or `live` to appear on public page
3. **Check Verification**: Scraped drops need analyst verification

### Manual Scrape Fails

1. **Check URL**: Ensure Nike SNKRS India URL is accessible
2. **Check Selectors**: Nike may have changed their HTML structure
3. **Check Rate Limiting**: Too many requests may trigger blocking

## Future Enhancements

- [ ] Add more scrapers (House of Heat, other retailers)
- [ ] Email notifications for new drops
- [ ] User reminders for specific drops
- [ ] Integration with retailer APIs (when partnerships are established)
- [ ] Price tracking for drops after release

## Notes

- **Scraping Ethics**: Always respect robots.txt and Terms of Service
- **Rate Limiting**: Don't scrape too frequently to avoid being blocked
- **Data Accuracy**: Manual verification is recommended for all scraped data
- **Partnerships**: Reach out to retailers for official API access when possible

