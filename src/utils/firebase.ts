/**
 * Firebase initialization and configuration
 * 
 * This file initializes Firebase and exports Firestore collections.
 * Make sure to set all VITE_FIREBASE_* environment variables in your .env file.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, CollectionReference } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { Asset } from '../types';
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

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

// Export Firestore instance and Auth
export { db, auth };

// Export collections
export const assetsCollection = db 
  ? (collection(db, 'assets') as CollectionReference<Asset>)
  : null;

export const b2bListingsCollection = db
  ? (collection(db, 'b2b_listings') as CollectionReference<B2BListing>)
  : null;

