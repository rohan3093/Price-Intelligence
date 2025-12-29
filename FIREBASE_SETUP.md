# Firebase Setup Guide

This guide walks you through setting up Firebase Firestore for the Intelligence Exchange app.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: **"Intelligence Exchange"** (or your preferred name)
4. Click **Continue**
5. **Disable Google Analytics** (optional for MVP) or enable if you want it
6. Click **Create project**
7. Wait for project creation, then click **Continue**

## Step 2: Enable Firestore Database

1. In Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for MVP - allows read/write)
   - ⚠️ **Important**: This allows anyone to read/write. Restrict before production!
4. Select a **location** (choose closest to your users, e.g., `us-central` or `asia-south1`)
5. Click **"Enable"**
6. Wait for database creation (takes ~1 minute)

## Step 3: Get Firebase Configuration

1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon** `</>` (or "Add app" → Web)
5. Register your app:
   - **App nickname**: "Intelligence Exchange Web"
   - **Firebase Hosting**: Not set up (optional, skip for now)
6. Click **"Register app"**
7. **Copy the `firebaseConfig` object** - it looks like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

## Step 4: Configure Environment Variables

1. Open your `.env` file (create it if it doesn't exist)
2. Add your Firebase config values:
   ```bash
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```
3. Replace the placeholder values with your actual Firebase config

## Step 5: Set Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules** tab
2. For MVP/testing, use these open rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /assets/{document=**} {
         allow read, write: if true;
       }
       match /b2b_listings/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Click **"Publish"**
4. ⚠️ **Important**: These rules allow anyone to read/write. See `FIRESTORE_SECURITY_RULES.md` for production rules.

## Step 6: Test the Integration

1. **Restart your dev server** (required for env variables):
   ```bash
   npm run dev
   ```

2. **Open your app** in the browser

3. **Log in as analyst** (`rohan3093@gmail.com` / `Stupidchap1!`)

4. **Go to Analyst Dashboard** → **Asset Management**

5. **Create a new asset** - it should save to Firebase

6. **Check Firebase Console**:
   - Go to Firestore Database
   - You should see an `assets` collection
   - Your new asset should appear as a document

7. **Test on another device/browser**:
   - Open the app in a different browser
   - The asset should be visible (shared data!)

## Step 7: Migrate Existing Data (Optional)

If you have existing assets in localStorage:

1. Open browser console (F12)
2. Run:
   ```javascript
   import { syncLocalAssetsToFirebase } from './src/utils/assetsApi';
   syncLocalAssetsToFirebase();
   ```
3. Or add a "Sync to Firebase" button in the Analyst Dashboard (future enhancement)

## Troubleshooting

### Firebase not connecting

1. **Check environment variables**: Make sure all `VITE_FIREBASE_*` variables are set in `.env`
2. **Restart dev server**: Environment variables only load on startup
3. **Check browser console**: Look for Firebase initialization errors
4. **Verify Firebase config**: Make sure you copied the correct values from Firebase Console

### CORS errors

- Firebase properly supports CORS, so you shouldn't see CORS errors
- If you do, check that your Firebase config is correct

### Permission denied errors

- Check Firestore security rules
- Make sure rules allow read/write (for MVP, use the open rules above)
- Rules are published (click "Publish" after editing)

### Data not appearing

1. Check Firestore Console - is data being saved?
2. Check browser console for errors
3. Verify Firebase is initialized (check `isFirebaseConfigured()`)

## Production Security Rules

Before going to production, update Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Assets - read for all, write for authenticated users only
    match /assets/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // B2B Listings - read for all, write for authenticated users only
    match /b2b_listings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Then set up Firebase Authentication for analyst login.

## Next Steps

- ✅ Firebase is now your backend
- ✅ Analyst changes are shared across all users
- ✅ Data persists in the cloud
- ✅ Can view/edit data in Firebase Console
- 🔄 Consider adding Firebase Authentication for analyst login
- 🔄 Set up proper security rules before production

---

**Need help?** Check Firebase documentation: https://firebase.google.com/docs/firestore

