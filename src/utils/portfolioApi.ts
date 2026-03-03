/**
 * Portfolio API - User-specific portfolio/inventory stored in Firestore
 * 
 * When user is signed in: Portfolio is stored in Firestore under their user ID
 * When user is signed out: Falls back to localStorage (device-specific)
 * 
 * Mirrors the pattern from watchlistApi.ts
 */

import { doc, setDoc, onSnapshot, Unsubscribe, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { PortfolioPosition } from '../types';

// Firestore path: users/{userId}/portfolio - store portfolio as a subcollection or field
// Using field approach for simplicity (like watchlist)
const getUserDocRef = (userId: string) => {
  if (!db) {
    return null;
  }
  return doc(db, 'users', userId);
};

/**
 * Load portfolio for a user from Firestore
 * Uses getDocFromServer to ensure fresh data from server (not cache)
 */
export const loadUserPortfolio = async (userId: string): Promise<PortfolioPosition[]> => {
  const docRef = getUserDocRef(userId);
  if (!docRef) {
    console.error('No Firestore docRef available');
    return [];
  }

  try {
    // Use getDocFromServer to bypass cache and get fresh data from server
    const docSnap = await getDocFromServer(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const portfolio = data.portfolio || [];
      return Array.isArray(portfolio) ? portfolio : [];
    }
    return [];
  } catch (error) {
    console.error('Error loading portfolio from Firestore:', error);
    return [];
  }
};

/**
 * Save portfolio for a user to Firestore
 */
export const saveUserPortfolio = async (userId: string, positions: PortfolioPosition[]): Promise<boolean> => {
  const docRef = getUserDocRef(userId);
  if (!docRef) {
    console.error('Cannot save portfolio: No Firestore docRef available');
    return false;
  }

  try {
    // Clean positions: remove undefined values (Firestore doesn't accept them)
    const cleanedPositions = positions.map(pos => {
      const cleaned: any = {
        assetId: pos.assetId,
        quantity: pos.quantity,
        createdAt: pos.createdAt,
        updatedAt: pos.updatedAt,
      };
      
      // Only add fields if they have defined values
      if (pos.size !== undefined) cleaned.size = pos.size;
      if (pos.acquisitionPrice !== undefined) cleaned.acquisitionPrice = pos.acquisitionPrice;
      if (pos.notes !== undefined) cleaned.notes = pos.notes;
      if (pos.sold !== undefined) cleaned.sold = pos.sold;
      if (pos.soldPrice !== undefined) cleaned.soldPrice = pos.soldPrice;
      if (pos.soldDate !== undefined) cleaned.soldDate = pos.soldDate;
      
      return cleaned;
    });
    
    // Use merge: true to update only the portfolio field without overwriting other fields
    await setDoc(docRef, {
      portfolio: cleanedPositions,
      portfolioUpdatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return true;
  } catch (error: any) {
    console.error('Error saving portfolio to Firestore:', error);
    alert(`Portfolio save failed: ${error?.message || 'Unknown error'}`);
    return false;
  }
};

/**
 * Subscribe to real-time portfolio updates for a user
 * Returns an unsubscribe function
 */
export const subscribeToUserPortfolio = (
  userId: string,
  onUpdate: (positions: PortfolioPosition[]) => void
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
        onUpdate(data.portfolio || []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.error('Error subscribing to portfolio:', error);
    }
  );
};

/**
 * Add or update a position in user's portfolio
 */
export const upsertPortfolioPosition = async (
  userId: string,
  assetId: number,
  updates: Partial<PortfolioPosition>
): Promise<boolean> => {
  const currentPortfolio = await loadUserPortfolio(userId);
  const now = new Date().toISOString();
  
  const existingIndex = currentPortfolio.findIndex(pos => pos.assetId === assetId);
  
  if (existingIndex >= 0) {
    // Update existing position
    currentPortfolio[existingIndex] = {
      ...currentPortfolio[existingIndex],
      ...updates,
      updatedAt: now,
    };
    
    // Remove position if quantity is 0 or negative
    if (currentPortfolio[existingIndex].quantity <= 0) {
      currentPortfolio.splice(existingIndex, 1);
    }
  } else {
    // Add new position
    const quantity = typeof updates.quantity === 'number' && updates.quantity > 0 ? updates.quantity : 1;
    currentPortfolio.push({
      assetId,
      size: updates.size,
      quantity,
      acquisitionPrice: updates.acquisitionPrice,
      notes: updates.notes,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  return saveUserPortfolio(userId, currentPortfolio);
};

/**
 * Remove a position from user's portfolio
 */
export const removePortfolioPosition = async (userId: string, assetId: number): Promise<boolean> => {
  const currentPortfolio = await loadUserPortfolio(userId);
  return saveUserPortfolio(userId, currentPortfolio.filter(pos => pos.assetId !== assetId));
};

/**
 * Mark a position as sold (partial or full)
 */
export const markPositionAsSold = async (
  userId: string,
  assetId: number,
  soldQuantity: number,
  soldPrice: number
): Promise<boolean> => {
  const currentPortfolio = await loadUserPortfolio(userId);
  const now = new Date().toISOString();
  
  const existingIndex = currentPortfolio.findIndex(pos => pos.assetId === assetId && !pos.sold);
  
  if (existingIndex < 0) {
    console.error('Position not found');
    return false;
  }
  
  const position = currentPortfolio[existingIndex];
  
  if (soldQuantity >= position.quantity) {
    // Full sale: mark the entire position as sold
    currentPortfolio[existingIndex] = {
      ...position,
      sold: true,
      soldPrice,
      soldDate: now,
      updatedAt: now,
    };
  } else {
    // Partial sale: split the position
    // 1. Reduce the active position quantity
    currentPortfolio[existingIndex] = {
      ...position,
      quantity: position.quantity - soldQuantity,
      updatedAt: now,
    };
    
    // 2. Create a new sold position record
    currentPortfolio.push({
      assetId: position.assetId,
      size: position.size,
      quantity: soldQuantity,
      acquisitionPrice: position.acquisitionPrice,
      notes: position.notes,
      sold: true,
      soldPrice,
      soldDate: now,
      createdAt: position.createdAt,
      updatedAt: now,
    });
  }
  
  return saveUserPortfolio(userId, currentPortfolio);
};

