/**
 * Drops API Client
 * 
 * Uses Firebase Firestore for shared drop data across all users.
 * Falls back to localStorage if Firebase is unavailable or not configured.
 */

import { Drop } from "../types";
import { storage } from "./storage";
import { 
  db, 
  dropsCollection, 
  isFirebaseConfigured 
} from "./firebase";
import {
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase/firestore";

/**
 * Convert Firestore document to Drop
 */
function docToDrop(docSnap: QueryDocumentSnapshot | DocumentSnapshot): Drop {
  const data = docSnap.data();
  if (!data) {
    throw new Error("Document data is missing");
  }

  // Parse document ID - handle both numeric string IDs and non-numeric IDs
  const docId = docSnap.id;
  const parsedId = parseInt(docId);
  const numericId = !isNaN(parsedId) && parsedId > 0 ? parsedId : null;
  
  return {
    id: numericId || data.id || parseInt(docId) || 0,
    name: data.name || '',
    sku: data.sku,
    brand: data.brand || '',
    image: data.image || '',
    releaseDate: data.releaseDate || '',
    releaseTime: data.releaseTime,
    retailPrice: data.retailPrice,
    retailers: data.retailers || [],
    linkedAssetId: data.linkedAssetId,
    description: data.description,
    category: data.category || 'Sneakers',
    sizes: data.sizes || [],
    status: data.status || 'pending_review',
    source: data.source || {
      type: 'manual',
      confidence: 100,
    },
    verified: data.verified || false,
    verifiedBy: data.verifiedBy,
    verifiedAt: data.verifiedAt,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    createdBy: data.createdBy,
  };
}

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Convert Drop to Firestore document data
 */
function dropToFirestoreData(drop: Drop): any {
  const data: any = {
    id: drop.id,
    name: drop.name || '',
    brand: drop.brand || '',
    image: drop.image || '',
    releaseDate: drop.releaseDate || '',
    retailers: drop.retailers || [],
    category: drop.category || 'Sneakers',
    status: drop.status || 'pending_review',
    source: drop.source || {
      type: 'manual',
      confidence: 100,
    },
    verified: drop.verified || false,
    createdAt: drop.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Only include optional fields if they have values
  if (drop.sku !== undefined && drop.sku !== null) data.sku = drop.sku;
  if (drop.releaseTime !== undefined && drop.releaseTime !== null) data.releaseTime = drop.releaseTime;
  if (drop.retailPrice !== undefined && drop.retailPrice !== null) data.retailPrice = drop.retailPrice;
  if (drop.linkedAssetId !== undefined && drop.linkedAssetId !== null) data.linkedAssetId = drop.linkedAssetId;
  if (drop.description !== undefined && drop.description !== null) data.description = drop.description;
  if (drop.sizes !== undefined && drop.sizes !== null && drop.sizes.length > 0) data.sizes = drop.sizes;
  if (drop.verifiedBy !== undefined && drop.verifiedBy !== null) data.verifiedBy = drop.verifiedBy;
  if (drop.verifiedAt !== undefined && drop.verifiedAt !== null) data.verifiedAt = drop.verifiedAt;
  if (drop.createdBy !== undefined && drop.createdBy !== null) data.createdBy = drop.createdBy;

  return removeUndefined(data);
}

/**
 * Helper: get full release Date object including time (if available)
 * 
 * - If `releaseTime` exists (e.g. "2:00 PM IST"), we parse it and set hours/minutes
 * - Otherwise, we use the date as-is
 */
function getReleaseDateTime(drop: Drop): Date {
  const releaseDate = new Date(drop.releaseDate);

  if (drop.releaseTime) {
    const timeMatch = drop.releaseTime.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();

      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      releaseDate.setHours(hours, minutes, 0, 0);
    }
  }

  return releaseDate;
}

/**
 * Get all drops from Firestore
 */
export async function fetchAllDrops(): Promise<Drop[]> {
  if (!isFirebaseConfigured() || !dropsCollection || !db) {
    console.log("Firebase not configured, using localStorage for drops");
    const localDrops = storage.loadDrops();
    return localDrops || [];
  }

  try {
    // Try with orderBy first, fallback to simple query if index not created yet
    try {
      const q = query(dropsCollection, orderBy('releaseDate', 'asc'));
      const snapshot = await getDocs(q);
      const drops = snapshot.docs.map(docToDrop);
      console.log(`Fetched ${drops.length} drops from Firestore`);
      // Clear localStorage cache and save fresh data
      storage.saveDrops(drops);
      return drops;
    } catch (orderByError: any) {
      if (orderByError.code === 'failed-precondition') {
        console.warn("Firestore index needed. Using simple query. Click the link in console to create index.");
        const snapshot = await getDocs(dropsCollection);
        const drops = snapshot.docs.map(docToDrop);
        console.log(`Fetched ${drops.length} drops from Firestore (simple query)`);
        storage.saveDrops(drops);
        return drops;
      }
      throw orderByError;
    }
  } catch (error) {
    console.warn("Failed to fetch drops from Firebase, using localStorage fallback:", error);
    const localDrops = storage.loadDrops();
    return localDrops || [];
  }
}

/**
 * Get drops by status
 */
export async function fetchDropsByStatus(status: Drop['status']): Promise<Drop[]> {
  if (!isFirebaseConfigured() || !dropsCollection || !db) {
    const localDrops = storage.loadDrops();
    return (localDrops || []).filter(d => d.status === status);
  }

  try {
    const q = query(dropsCollection, where('status', '==', status), orderBy('releaseDate', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToDrop);
  } catch (error) {
    console.warn("Failed to fetch drops by status, using localStorage fallback:", error);
    const localDrops = storage.loadDrops();
    return (localDrops || []).filter(d => d.status === status);
  }
}

/**
 * Get upcoming drops (status: upcoming or live)
 */
export async function fetchUpcomingDrops(): Promise<Drop[]> {
  const allDrops = await fetchAllDrops();
  const now = new Date();
  return allDrops
    .filter((drop) => {
      if (drop.status === "upcoming" || drop.status === "live") {
        const releaseDateTime = getReleaseDateTime(drop);
        return releaseDateTime >= now;
      }
      return false;
    })
    .sort((a, b) => {
      const dateA = getReleaseDateTime(a).getTime();
      const dateB = getReleaseDateTime(b).getTime();
      return dateA - dateB;
    });
}

/**
 * Get a single drop by ID
 */
export async function fetchDrop(id: number): Promise<Drop | null> {
  if (!isFirebaseConfigured() || !dropsCollection || !db) {
    const localDrops = storage.loadDrops();
    return localDrops?.find((d) => d.id === id) || null;
  }

  try {
    const q = query(dropsCollection, where('id', '==', id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return docToDrop(snapshot.docs[0]);
    }
    return null;
  } catch (error) {
    console.warn("Failed to fetch drop from Firebase, using localStorage fallback:", error);
    const localDrops = storage.loadDrops();
    return localDrops?.find((d) => d.id === id) || null;
  }
}

/**
 * Get the next available drop ID
 */
async function getNextDropId(): Promise<number> {
  if (!isFirebaseConfigured() || !dropsCollection || !db) {
    const localDrops = storage.loadDrops() || [];
    return localDrops.length ? Math.max(...localDrops.map((d) => d.id)) + 1 : 1;
  }

  try {
    const snapshot = await getDocs(dropsCollection);
    if (snapshot.empty) {
      const localDrops = storage.loadDrops() || [];
      return localDrops.length ? Math.max(...localDrops.map((d) => d.id)) + 1 : 1;
    }
    
    const firebaseIds = snapshot.docs.map(doc => {
      const data = doc.data();
      return parseInt(doc.id) || data.id || 0;
    });
    
    const localDrops = storage.loadDrops() || [];
    const localIds = localDrops.map(d => d.id);
    
    const allIds = [...firebaseIds, ...localIds];
    return allIds.length ? Math.max(...allIds) + 1 : 1;
  } catch (error) {
    console.warn("Failed to fetch drops for ID generation, using localStorage:", error);
    const localDrops = storage.loadDrops() || [];
    return localDrops.length ? Math.max(...localDrops.map((d) => d.id)) + 1 : 1;
  }
}

/**
 * Create a new drop
 */
export async function createDrop(drop: Omit<Drop, "id">): Promise<Drop> {
  if (!isFirebaseConfigured() || !dropsCollection || !db) {
    const localDrops = storage.loadDrops() || [];
    const nextId = localDrops.length ? Math.max(...localDrops.map((d) => d.id)) + 1 : 1;
    const newDrop: Drop = { ...drop, id: nextId };
    storage.saveDrops([...localDrops, newDrop]);
    return newDrop;
  }

  try {
    const nextId = await getNextDropId();
    const newDrop: Drop = { ...drop, id: nextId };
    const firestoreData = dropToFirestoreData(newDrop);
    
    const dropDoc = doc(dropsCollection, nextId.toString());
    await setDoc(dropDoc, firestoreData);
    
    return newDrop;
  } catch (error) {
    console.warn("Failed to create drop in Firebase, using localStorage fallback:", error);
    const localDrops = storage.loadDrops() || [];
    const nextId = localDrops.length ? Math.max(...localDrops.map((d) => d.id)) + 1 : 1;
    const newDrop: Drop = { ...drop, id: nextId };
    storage.saveDrops([...localDrops, newDrop]);
    return newDrop;
  }
}

/**
 * Update an existing drop
 */
export async function updateDrop(drop: Drop): Promise<Drop> {
  if (!isFirebaseConfigured() || !dropsCollection || !db) {
    console.log("Firebase not configured, updating localStorage");
    const localDrops = storage.loadDrops() || [];
    const updatedDrops = localDrops.map((d) => (d.id === drop.id ? drop : d));
    storage.saveDrops(updatedDrops);
    return drop;
  }

  try {
    console.log(`Updating drop ${drop.id} in Firestore:`, drop);
    
    // First, try to find the document by querying the id field
    // This handles cases where document ID might not match the numeric id
    const q = query(dropsCollection, where('id', '==', drop.id));
    const snapshot = await getDocs(q);
    
    let dropDocRef;
    if (!snapshot.empty) {
      // Found by query - use this document reference
      dropDocRef = snapshot.docs[0].ref;
      console.log(`Found document by query: ${dropDocRef.path}`);
    } else {
      // Try using the numeric ID as document ID (for documents created with numeric IDs)
      dropDocRef = doc(dropsCollection, drop.id.toString());
      console.log(`Using document ID directly: ${dropDocRef.path}`);
      
      // Verify document exists
      const docSnap = await getDoc(dropDocRef);
      if (!docSnap.exists()) {
        throw new Error(`Document with id ${drop.id} not found. Tried path: ${dropDocRef.path}`);
      }
    }
    
    const firestoreData = dropToFirestoreData(drop);
    console.log("Firestore data to update:", firestoreData);
    
    await updateDoc(dropDocRef, firestoreData);
    console.log(`Successfully updated drop ${drop.id} in Firestore`);
    
    // Verify the update by reading the document back
    try {
      const updatedDoc = await getDoc(dropDocRef);
      if (updatedDoc.exists()) {
        const updatedData = updatedDoc.data();
        console.log("Verified update - document status:", updatedData?.status);
      } else {
        console.warn("Warning: Document doesn't exist after update!");
      }
    } catch (verifyError) {
      console.warn("Could not verify update:", verifyError);
    }
    
    // Also update localStorage cache
    const localDrops = storage.loadDrops() || [];
    storage.saveDrops(localDrops.map((d) => (d.id === drop.id ? drop : d)));
    
    return drop;
  } catch (error: any) {
    console.error("Failed to update drop in Firebase:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      dropId: drop.id,
    });
    
    // Don't silently fallback - throw the error so UI can handle it
    throw new Error(`Failed to update drop: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a drop
 */
export async function deleteDrop(id: number): Promise<void> {
  console.log(`Attempting to delete drop with ID: ${id} (type: ${typeof id})`);
  
  if (!isFirebaseConfigured() || !dropsCollection || !db) {
    console.log("Firebase not configured, deleting from localStorage");
    const localDrops = storage.loadDrops() || [];
    const beforeCount = localDrops.length;
    storage.saveDrops(localDrops.filter((d) => d.id !== id));
    const afterCount = storage.loadDrops()?.length || 0;
    console.log(`Deleted from localStorage: ${beforeCount} -> ${afterCount} drops`);
    return;
  }

  try {
    // First, try to find the document by querying the id field
    // This handles cases where document ID might not match the numeric id
    const q = query(dropsCollection, where('id', '==', id));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Found by query - delete all matching documents (should only be one)
      for (const docSnap of snapshot.docs) {
        console.log(`Deleting Firestore document found by query: ${docSnap.ref.path}`);
        await deleteDoc(docSnap.ref);
        console.log(`Successfully deleted drop ${id} from Firestore (${docSnap.id})`);
      }
    } else {
      // Try using the numeric ID as document ID (for documents created with numeric IDs)
      const dropDoc = doc(dropsCollection, id.toString());
      console.log(`Trying to delete by document ID: ${dropDoc.path}`);
      
      // Check if document exists
      const docSnap = await getDoc(dropDoc);
      if (docSnap.exists()) {
        await deleteDoc(dropDoc);
        console.log(`Successfully deleted drop ${id} from Firestore`);
      } else {
        throw new Error(`Document with id ${id} not found. Tried path: ${dropDoc.path}`);
      }
    }
    
    // Also remove from localStorage cache
    const localDrops = storage.loadDrops() || [];
    storage.saveDrops(localDrops.filter((d) => d.id !== id));
  } catch (error: any) {
    console.error("Failed to delete drop from Firebase:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      id: id,
      idType: typeof id,
    });
    
    // Update localStorage as fallback
    const localDrops = storage.loadDrops() || [];
    storage.saveDrops(localDrops.filter((d) => d.id !== id));
    
    // Re-throw with a clearer message
    throw new Error(`Failed to delete drop: ${error.message || 'Unknown error'}`);
  }
}

