/**
 * Connections API - Trade Coordination Layer (Pre-Exchange Phase)
 * 
 * Facilitates introductions between buyers and sellers without handling money/escrow.
 * Part of the "coordinated execution" phase of market development.
 */

import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { ConnectionRequest, TradeListing, TradingProfile } from "../types";

// ============================================================================
// Connection Requests
// ============================================================================

/**
 * Create a new connection request (buyer wants to connect with seller)
 */
export async function createConnectionRequest(
  requesterId: string,
  requesterEmail: string,
  request: Omit<ConnectionRequest, 'id' | 'requesterId' | 'requesterEmail' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: "Firebase not initialized" };
  }
  
  if (requesterId === request.targetId) {
    return { success: false, error: "You can't request an introduction to your own listing" };
  }
  
  try {
    const requestId = `${requesterId}_${request.assetId}_${Date.now()}`;
    const connectionRef = doc(db, "connections", requestId);
    
    const connectionData: ConnectionRequest = {
      id: requestId,
      requesterId,
      requesterEmail,
      ...request,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const cleanData = Object.fromEntries(
      Object.entries(connectionData).filter(([_, v]) => v !== undefined)
    );
    
    await setDoc(connectionRef, cleanData);
    
    return { success: true, requestId };
  } catch (error) {
    console.error("Error creating connection request:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get all connection requests for a user (sent or received)
 */
export async function getUserConnections(
  userId: string,
  type: 'sent' | 'received' | 'all' = 'all'
): Promise<ConnectionRequest[]> {
  if (!db) return [];
  
  const sortByDate = (list: ConnectionRequest[]) =>
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const fetchWithFallback = async (
    field: string,
    value: string
  ): Promise<ConnectionRequest[]> => {
    try {
      const q = query(
        collection(db!, "connections"),
        where(field, "==", value),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as ConnectionRequest);
    } catch {
      // Fallback: query without orderBy (no composite index needed)
      const q = query(
        collection(db!, "connections"),
        where(field, "==", value)
      );
      const snapshot = await getDocs(q);
      return sortByDate(snapshot.docs.map(d => d.data() as ConnectionRequest)).slice(0, 50);
    }
  };

  try {
    if (type === 'sent') {
      return await fetchWithFallback("requesterId", userId);
    } else if (type === 'received') {
      return await fetchWithFallback("targetId", userId);
    } else {
      const [sent, received] = await Promise.all([
        fetchWithFallback("requesterId", userId),
        fetchWithFallback("targetId", userId),
      ]);
      return sortByDate([...sent, ...received]);
    }
  } catch (error) {
    console.error("Error fetching connections:", error);
    return [];
  }
}

/**
 * Update connection status (accept, decline, complete, cancel)
 */
export async function updateConnectionStatus(
  requestId: string,
  status: ConnectionRequest['status'],
  additionalData?: Partial<ConnectionRequest>
): Promise<boolean> {
  if (!db) return false;
  
  try {
    const connectionRef = doc(db, "connections", requestId);
    
    await updateDoc(connectionRef, {
      status,
      updatedAt: new Date().toISOString(),
      ...additionalData
    });
    
    return true;
  } catch (error) {
    console.error("Error updating connection status:", error);
    return false;
  }
}

/**
 * Report transaction completion (for data collection)
 */
export async function reportTransactionComplete(
  requestId: string,
  actualPrice: number,
  feedback?: string,
  rating?: number
): Promise<boolean> {
  if (!db) return false;
  
  try {
    const connectionRef = doc(db, "connections", requestId);
    
    await updateDoc(connectionRef, {
      status: 'completed',
      actualPrice,
      feedback,
      rating,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error("Error reporting transaction:", error);
    return false;
  }
}

// ============================================================================
// Trade Listings
// ============================================================================

/**
 * Create a new trade listing (seller lists item).
 * Deactivates any existing active listing for the same user+asset+size first.
 */
export async function createTradeListing(
  userId: string,
  userEmail: string,
  listing: Omit<TradeListing, 'id' | 'userId' | 'userEmail' | 'createdAt' | 'updatedAt' | 'active'>
): Promise<{ success: boolean; listingId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: "Firebase not initialized" };
  }
  
  try {
    // Deactivate any existing active listings for the same user+asset+size
    const existingQuery = query(
      collection(db, "trade_listings"),
      where("userId", "==", userId),
      where("assetId", "==", listing.assetId),
      where("size", "==", listing.size),
      where("active", "==", true)
    );
    
    let existingDocs;
    try {
      existingDocs = await getDocs(existingQuery);
    } catch {
      // Fallback if composite index missing: query by userId only
      const fallback = query(
        collection(db, "trade_listings"),
        where("userId", "==", userId)
      );
      const allDocs = await getDocs(fallback);
      existingDocs = {
        docs: allDocs.docs.filter(d => {
          const data = d.data();
          return data.assetId === listing.assetId && data.size === listing.size && data.active === true;
        })
      };
    }
    
    if (existingDocs.docs.length > 0) {
      const batch = writeBatch(db);
      existingDocs.docs.forEach(d => {
        batch.update(d.ref, { active: false, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    }
    
    const listingId = `${userId}_${listing.assetId}_${listing.size}_${Date.now()}`;
    const listingRef = doc(db, "trade_listings", listingId);
    
    const listingData: TradeListing = {
      id: listingId,
      userId,
      userEmail,
      ...listing,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const cleanData = Object.fromEntries(
      Object.entries(listingData).filter(([_, v]) => v !== undefined)
    );
    
    await setDoc(listingRef, cleanData);
    
    return { success: true, listingId };
  } catch (error) {
    console.error("Error creating trade listing:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Deduplicate listings: keep only the newest per user+asset+size.
 */
function deduplicateListings(listings: TradeListing[]): TradeListing[] {
  const best = new Map<string, TradeListing>();
  for (const l of listings) {
    const key = `${l.userId}_${l.assetId}_${l.size}`;
    const existing = best.get(key);
    if (!existing || new Date(l.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      best.set(key, l);
    }
  }
  return Array.from(best.values());
}

/**
 * Get all active listings for an asset.
 * Tries composite-index query first, falls back to single-field query.
 */
export async function getAssetListings(assetId: number, size?: string): Promise<TradeListing[]> {
  if (!db) return [];
  
  try {
    const q = query(
      collection(db, "trade_listings"),
      where("assetId", "==", assetId),
      where("active", "==", true),
      orderBy("askingPrice", "asc")
    );
    const snapshot = await getDocs(q);
    let listings = snapshot.docs.map(d => d.data() as TradeListing);
    if (size) listings = listings.filter(l => l.size === size);
    return deduplicateListings(listings);
  } catch (primaryError) {
    console.warn("getAssetListings: composite query failed, trying fallback:", primaryError);
    try {
      const fallback = query(
        collection(db, "trade_listings"),
        where("assetId", "==", assetId)
      );
      const snapshot = await getDocs(fallback);
      let listings = snapshot.docs
        .map(d => d.data() as TradeListing)
        .filter(l => l.active);
      if (size) listings = listings.filter(l => l.size === size);
      listings.sort((a, b) => a.askingPrice - b.askingPrice);
      return deduplicateListings(listings);
    } catch (fallbackError) {
      console.error("getAssetListings: fallback also failed:", fallbackError);
      return [];
    }
  }
}

/**
 * Get user's active listings.
 * Tries composite-index query first, falls back to single-field query.
 */
export async function getUserListings(userId: string): Promise<TradeListing[]> {
  if (!db) return [];
  
  try {
    const q = query(
      collection(db, "trade_listings"),
      where("userId", "==", userId),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return deduplicateListings(snapshot.docs.map(d => d.data() as TradeListing));
  } catch (primaryError) {
    console.warn("getUserListings: composite query failed, trying fallback:", primaryError);
    try {
      const fallback = query(
        collection(db, "trade_listings"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(fallback);
      const listings = snapshot.docs
        .map(d => d.data() as TradeListing)
        .filter(l => l.active)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return deduplicateListings(listings);
    } catch (fallbackError) {
      console.error("getUserListings: fallback also failed:", fallbackError);
      return [];
    }
  }
}

/**
 * Clean up duplicate active listings for a user.
 * Keeps only the newest listing per asset+size and deactivates the rest.
 */
export async function cleanupDuplicateListings(userId: string): Promise<number> {
  if (!db) return 0;
  
  try {
    const q = query(
      collection(db, "trade_listings"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const allActive = snapshot.docs
      .map(d => ({ ref: d.ref, data: d.data() as TradeListing }))
      .filter(d => d.data.active);
    
    // Group by asset+size, keep newest
    const groups = new Map<string, typeof allActive>();
    for (const item of allActive) {
      const key = `${item.data.assetId}_${item.data.size}`;
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    }
    
    let deactivated = 0;
    const batch = writeBatch(db);
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      group.sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
      // Keep first (newest), deactivate rest
      for (let i = 1; i < group.length; i++) {
        batch.update(group[i].ref, { active: false, updatedAt: new Date().toISOString() });
        deactivated++;
      }
    }
    
    if (deactivated > 0) {
      await batch.commit();
      console.log(`Cleaned up ${deactivated} duplicate listing(s)`);
    }
    return deactivated;
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
    return 0;
  }
}

/**
 * Update listing (price, quantity, etc.)
 */
export async function updateListing(
  listingId: string,
  updates: Partial<TradeListing>
): Promise<boolean> {
  if (!db) return false;
  
  try {
    const listingRef = doc(db, "trade_listings", listingId);
    
    await updateDoc(listingRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating listing:", error);
    return false;
  }
}

/**
 * Deactivate listing (mark as sold/removed)
 */
export async function deactivateListing(listingId: string): Promise<boolean> {
  try {
    return await updateListing(listingId, { active: false });
  } catch (error) {
    console.error("Error deactivating listing:", error);
    return false;
  }
}

// ============================================================================
// Trading Profile
// ============================================================================

/**
 * Get or create trading profile for user
 */
export async function getTradingProfile(userId: string, email: string): Promise<TradingProfile> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }
  
  try {
    const profileRef = doc(db, "trading_profiles", userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return profileSnap.data() as TradingProfile;
    }
    
    // Create default profile
    const newProfile: TradingProfile = {
      userId,
      email,
      verified: false,
      phoneVerified: false,
      emailVerified: true, // Assume true if using Firebase Auth
      kycCompleted: false,
      totalTrades: 0,
      completedTrades: 0,
      cancelledTrades: 0,
      averageRating: 0,
      activeListings: 0,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };
    
    await setDoc(profileRef, newProfile);
    return newProfile;
  } catch (error) {
    console.error("Error getting trading profile:", error);
    throw error;
  }
}

/**
 * Update trading profile
 */
export async function updateTradingProfile(
  userId: string,
  updates: Partial<TradingProfile>
): Promise<boolean> {
  if (!db) return false;
  
  try {
    const profileRef = doc(db, "trading_profiles", userId);
    
    await updateDoc(profileRef, {
      ...updates,
      lastActiveAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating trading profile:", error);
    return false;
  }
}

/**
 * Increment trade counts after transaction
 */
export async function recordTrade(
  userId: string,
  completed: boolean,
  rating?: number
): Promise<boolean> {
  if (!db) return false;
  
  try {
    const profileRef = doc(db, "trading_profiles", userId);
    const profile = await getDoc(profileRef);
    
    if (!profile.exists()) {
      console.error("Profile not found");
      return false;
    }
    
    const data = profile.data() as TradingProfile;
    
    const newTotalTrades = data.totalTrades + 1;
    const newCompletedTrades = completed ? data.completedTrades + 1 : data.completedTrades;
    const newCancelledTrades = !completed ? data.cancelledTrades + 1 : data.cancelledTrades;
    
    // Update average rating if rating provided
    let newAverageRating = data.averageRating;
    if (rating && completed) {
      const totalRatings = data.completedTrades;
      const currentSum = data.averageRating * totalRatings;
      newAverageRating = (currentSum + rating) / newCompletedTrades;
    }
    
    await updateDoc(profileRef, {
      totalTrades: newTotalTrades,
      completedTrades: newCompletedTrades,
      cancelledTrades: newCancelledTrades,
      averageRating: newAverageRating,
      lastActiveAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error("Error recording trade:", error);
    return false;
  }
}

