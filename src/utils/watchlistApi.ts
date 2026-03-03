/**
 * Watchlist API - User-specific watchlist stored in Firestore
 * 
 * When user is signed in: Watchlist is stored in Firestore under their user ID
 * When user is signed out: Falls back to localStorage (device-specific)
 * 
 * Includes automatic cleanup of invalid asset IDs (assets that no longer exist)
 */

import { doc, setDoc, onSnapshot, Unsubscribe, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { Asset } from '../types';

// Firestore path: users/{userId} - store watchlist as a field in the user document
const getUserDocRef = (userId: string) => {
  if (!db) {
    return null;
  }
  return doc(db, 'users', userId);
};

/**
 * Load watchlist for a user from Firestore
 * Uses getDocFromServer to ensure fresh data from server (not cache)
 */
export const loadUserWatchlist = async (userId: string): Promise<number[]> => {
  const docRef = getUserDocRef(userId);
  if (!docRef) {
    console.error('No Firestore docRef available');
    return [];
  }

  try {
    // Use getDocFromServer to bypass cache and get fresh data from server
    // This is important to avoid race conditions with pending writes
    const docSnap = await getDocFromServer(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const watchlist = data.watchlist || data.assetIds || [];
      return Array.isArray(watchlist) ? watchlist : [];
    }
    return [];
  } catch (error) {
    console.error('Error loading watchlist from Firestore:', error);
    return [];
  }
};

/**
 * Save watchlist for a user to Firestore
 */
export const saveUserWatchlist = async (userId: string, assetIds: number[]): Promise<boolean> => {
  const docRef = getUserDocRef(userId);
  if (!docRef) {
    console.error('Cannot save watchlist: No Firestore docRef available');
    return false;
  }

  try {
    // Use merge: true to update only the watchlist field without overwriting other fields
    await setDoc(docRef, {
      watchlist: assetIds,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return true;
  } catch (error: any) {
    console.error('Error saving watchlist to Firestore:', error);
    alert(`Watchlist save failed: ${error?.message || 'Unknown error'}`);
    return false;
  }
};

/**
 * Subscribe to real-time watchlist updates for a user
 * Returns an unsubscribe function
 */
export const subscribeToUserWatchlist = (
  userId: string,
  onUpdate: (assetIds: number[]) => void
): Unsubscribe | null => {
  const docRef = getUserDocRef(userId);
  if (!docRef) {
    return null;
  }

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate(data.watchlist || data.assetIds || []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.error('Error subscribing to watchlist:', error);
    }
  );
};

/**
 * Add an asset to user's watchlist
 */
export const addToWatchlist = async (userId: string, assetId: number): Promise<boolean> => {
  const currentWatchlist = await loadUserWatchlist(userId);
  if (currentWatchlist.includes(assetId)) {
    return true; // Already in watchlist
  }
  return saveUserWatchlist(userId, [...currentWatchlist, assetId]);
};

/**
 * Remove an asset from user's watchlist
 */
export const removeFromWatchlist = async (userId: string, assetId: number): Promise<boolean> => {
  const currentWatchlist = await loadUserWatchlist(userId);
  return saveUserWatchlist(userId, currentWatchlist.filter(id => id !== assetId));
};

/**
 * Check if an asset is in user's watchlist
 */
export const isInWatchlist = async (userId: string, assetId: number): Promise<boolean> => {
  const currentWatchlist = await loadUserWatchlist(userId);
  return currentWatchlist.includes(assetId);
};

/**
 * Clean up watchlist by removing asset IDs that no longer exist in the assets collection
 * This prevents the watchlist from showing as empty when assets are deleted
 * @param userId - The user ID
 * @param validAssets - Array of currently available assets
 * @returns Object with { cleaned: boolean, removedCount: number, validIds: number[] }
 */
export const cleanupWatchlist = async (
  userId: string, 
  validAssets: Asset[]
): Promise<{ cleaned: boolean; removedCount: number; validIds: number[] }> => {
  try {
    const currentWatchlist = await loadUserWatchlist(userId);
    
    if (currentWatchlist.length === 0) {
      return { cleaned: false, removedCount: 0, validIds: [] };
    }
    
    // Create a Set of valid asset IDs for O(1) lookup
    const validAssetIds = new Set(validAssets.map(asset => asset.id));
    
    // Filter watchlist to only include assets that still exist
    const validWatchlistIds = currentWatchlist.filter(id => validAssetIds.has(id));
    
    const removedCount = currentWatchlist.length - validWatchlistIds.length;
    
    // Only update if there were invalid IDs removed
    if (removedCount > 0) {
      await saveUserWatchlist(userId, validWatchlistIds);
      console.log(`Cleaned ${removedCount} invalid asset(s) from watchlist`);
      return { cleaned: true, removedCount, validIds: validWatchlistIds };
    }
    
    return { cleaned: false, removedCount: 0, validIds: validWatchlistIds };
  } catch (error) {
    console.error('Error cleaning up watchlist:', error);
    return { cleaned: false, removedCount: 0, validIds: [] };
  }
};

