/**
 * Firebase initialization and configuration
 * 
 * This file initializes Firebase and exports Firestore collections.
 * Make sure to set all VITE_FIREBASE_* environment variables in your .env file.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, CollectionReference } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getMessaging, Messaging } from 'firebase/messaging';
import { Asset, Drop } from '../types';
import { B2BListing } from '../components/B2BListings';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

// Initialize Firebase app
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Initialize FCM (only in browser, not in Node.js)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        messaging = getMessaging(app);
      } catch (error) {
        console.warn('FCM initialization failed (may need VAPID key):', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

// Export Firestore instance, Auth, and Messaging
export { db, auth, messaging };

// Export collections
export const assetsCollection = db 
  ? (collection(db, 'assets') as CollectionReference<Asset>)
  : null;

export const b2bListingsCollection = db
  ? (collection(db, 'b2b_listings') as CollectionReference<B2BListing>)
  : null;

export const dropsCollection = db
  ? (collection(db, 'drops') as CollectionReference<Drop>)
  : null;

