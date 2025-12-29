# Production Backend Migration Guide

## Current Status

The app currently uses **localStorage** for data persistence. This works great for MVP validation, but has limitations:
- Data is local to each device/browser
- Analyst changes aren't shared across users
- Data can be lost if browser cache is cleared

## Why Google Apps Script Didn't Work

Google Apps Script web apps have a known CORS limitation where CORS headers set in the script are not properly returned in responses. This makes it incompatible with browser-based fetch requests.

## Production Backend Options

### Option 1: Firebase (Recommended for Quick Setup)

**Pros:**
- Free tier available
- Real-time updates
- Easy authentication
- Good documentation
- CORS properly supported

**Setup:**
1. Create Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Install Firebase SDK: `npm install firebase`
4. Replace `assetsApi.ts` with Firebase calls
5. Set up Firebase security rules

**Estimated Setup Time:** 1-2 hours

### Option 2: Supabase (Recommended for PostgreSQL)

**Pros:**
- Free tier available
- PostgreSQL database
- Built-in authentication
- REST API auto-generated
- CORS properly supported

**Setup:**
1. Create Supabase project at https://supabase.com
2. Create `assets` table
3. Install Supabase client: `npm install @supabase/supabase-js`
4. Replace `assetsApi.ts` with Supabase calls

**Estimated Setup Time:** 1-2 hours

### Option 3: Node.js + Express Backend

**Pros:**
- Full control
- Can use any database (PostgreSQL, MongoDB, etc.)
- Custom authentication
- Can deploy to Vercel, Railway, Render, etc.

**Setup:**
1. Create Express API
2. Set up database (PostgreSQL recommended)
3. Deploy to hosting service
4. Update `assetsApi.ts` to call your API

**Estimated Setup Time:** 4-6 hours

### Option 4: Vercel Serverless Functions + Database

**Pros:**
- Serverless (no server management)
- Can use Vercel Postgres or external database
- Easy deployment
- Good for Next.js apps (though you're using Vite)

**Setup:**
1. Create Vercel project
2. Set up database
3. Create serverless API functions
4. Update `assetsApi.ts`

**Estimated Setup Time:** 2-3 hours

## Recommended Path Forward

For your MVP validation period:
- ✅ **Keep using localStorage** - it works perfectly for testing
- ✅ Focus on user feedback and feature validation
- ✅ Analytics are already tracking usage

For production (before VC pitch):
- 🎯 **Migrate to Firebase or Supabase** - easiest and fastest
- 🎯 Set up proper authentication
- 🎯 Enable real-time updates (nice-to-have)
- 🎯 Set up backup/export functionality

## Migration Checklist

When ready to migrate:

- [ ] Choose backend (Firebase/Supabase recommended)
- [ ] Set up project and database
- [ ] Create data schema matching current Asset structure
- [ ] Update `src/utils/assetsApi.ts` with new backend calls
- [ ] Test create, read, update, delete operations
- [ ] Migrate existing localStorage data (if any)
- [ ] Set up authentication (if needed)
- [ ] Deploy and test
- [ ] Update documentation

## Quick Start: Firebase Example

```typescript
// src/utils/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  // Your config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const assetsCollection = collection(db, 'assets');

export async function fetchAllAssets() {
  const snapshot = await getDocs(assetsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createAsset(asset: Omit<Asset, "id">) {
  const docRef = await addDoc(assetsCollection, asset);
  return { id: docRef.id, ...asset };
}

// ... etc
```

## Quick Start: Supabase Example

```typescript
// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function fetchAllAssets() {
  const { data, error } = await supabase.from('assets').select('*');
  return data || [];
}

export async function createAsset(asset: Omit<Asset, "id">) {
  const { data, error } = await supabase.from('assets').insert(asset).select().single();
  return data;
}

// ... etc
```

---

**Recommendation**: Use **Firebase** or **Supabase** for production. Both are free to start, have excellent documentation, and will scale with your needs.

