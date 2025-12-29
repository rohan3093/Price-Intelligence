/**
 * B2B Listings API Client
 * 
 * Uses Firebase Firestore for shared B2B listings across all analysts.
 * Falls back to localStorage if Firebase is unavailable or not configured.
 */

import { B2BListing } from "../components/B2BListings";
import { storage } from "./storage";
import { 
  db, 
  b2bListingsCollection, 
  isFirebaseConfigured 
} from "./firebase";
import {
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  QueryDocumentSnapshot,
} from "firebase/firestore";

/**
 * Convert Firestore document to B2BListing
 */
function docToB2BListing(docSnap: QueryDocumentSnapshot): B2BListing {
  const data = docSnap.data();
  if (!data) {
    throw new Error("Document data is missing");
  }

  return {
    id: parseInt(docSnap.id) || data.id || 0,
    assetName: data.assetName || '',
    sku: data.sku,
    size: data.size,
    side: data.side || 'WTS',
    price: data.price,
    groupName: data.groupName,
    contact: data.contact,
    notes: data.notes,
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * Convert B2BListing to Firestore document data
 * Firestore doesn't allow undefined values
 */
function listingToFirestoreData(listing: B2BListing): any {
  const data: any = {
    id: listing.id,
    assetName: listing.assetName,
    side: listing.side,
    createdAt: listing.createdAt || new Date().toISOString(),
  };

  // Only include optional fields if they have values
  if (listing.sku !== undefined && listing.sku !== null) data.sku = listing.sku;
  if (listing.size !== undefined && listing.size !== null) data.size = listing.size;
  if (listing.price !== undefined && listing.price !== null) data.price = listing.price;
  if (listing.groupName !== undefined && listing.groupName !== null) data.groupName = listing.groupName;
  if (listing.contact !== undefined && listing.contact !== null) data.contact = listing.contact;
  if (listing.notes !== undefined && listing.notes !== null) data.notes = listing.notes;

  return data;
}

/**
 * Get all B2B listings from Firestore
 */
export async function fetchAllB2BListings(): Promise<B2BListing[]> {
  if (!isFirebaseConfigured() || !b2bListingsCollection || !db) {
    console.log("Firebase not configured, using localStorage for B2B listings");
    const localListings = storage.loadB2BListings();
    return localListings || [];
  }

  try {
    // Try with orderBy first, fallback to simple query if index not created yet
    try {
      const q = query(b2bListingsCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToB2BListing);
    } catch (orderByError: any) {
      // If index error, use simple query (Firebase will prompt to create index)
      if (orderByError.code === 'failed-precondition') {
        console.warn("Firestore index needed. Using simple query. Click the link in console to create index.");
        const snapshot = await getDocs(b2bListingsCollection);
        return snapshot.docs.map(docToB2BListing);
      }
      throw orderByError;
    }
  } catch (error) {
    console.warn("Failed to fetch B2B listings from Firebase, using localStorage fallback:", error);
    const localListings = storage.loadB2BListings();
    return localListings || [];
  }
}

/**
 * Create a new B2B listing
 */
export async function createB2BListing(listing: Omit<B2BListing, "id">): Promise<B2BListing> {
  if (!isFirebaseConfigured() || !b2bListingsCollection || !db) {
    // Fallback: generate ID and save to localStorage
    const localListings = storage.loadB2BListings() || [];
    const nextId = localListings.length ? Math.max(...localListings.map((l) => l.id)) + 1 : 1;
    const newListing: B2BListing = { ...listing, id: nextId };
    storage.saveB2BListings([newListing, ...localListings]);
    return newListing;
  }

  try {
    // Generate ID first
    const localListings = storage.loadB2BListings() || [];
    const nextId = localListings.length ? Math.max(...localListings.map((l) => l.id)) + 1 : 1;
    
    const newListing: B2BListing = { ...listing, id: nextId };
    const firestoreData = listingToFirestoreData(newListing);
    
    // Use the generated ID as the document ID
    const listingDoc = doc(b2bListingsCollection, nextId.toString());
    await setDoc(listingDoc, firestoreData);
    
    return newListing;
  } catch (error) {
    console.warn("Failed to create B2B listing in Firebase, using localStorage fallback:", error);
    // Fallback to localStorage
    const localListings = storage.loadB2BListings() || [];
    const nextId = localListings.length ? Math.max(...localListings.map((l) => l.id)) + 1 : 1;
    const newListing: B2BListing = { ...listing, id: nextId };
    storage.saveB2BListings([newListing, ...localListings]);
    return newListing;
  }
}

/**
 * Delete a B2B listing
 */
export async function deleteB2BListing(id: number): Promise<void> {
  if (!isFirebaseConfigured() || !b2bListingsCollection || !db) {
    // Fallback: delete from localStorage
    const localListings = storage.loadB2BListings() || [];
    storage.saveB2BListings(localListings.filter((l) => l.id !== id));
    return;
  }

  try {
    const listingDoc = doc(b2bListingsCollection, id.toString());
    await deleteDoc(listingDoc);
  } catch (error) {
    console.warn("Failed to delete B2B listing from Firebase, using localStorage fallback:", error);
    // Fallback to localStorage
    const localListings = storage.loadB2BListings() || [];
    storage.saveB2BListings(localListings.filter((l) => l.id !== id));
  }
}

/**
 * Sync local B2B listings to Firebase (useful for migration)
 */
export async function syncLocalB2BListingsToFirebase(): Promise<void> {
  if (!isFirebaseConfigured() || !b2bListingsCollection || !db) {
    console.warn("Firebase not configured, cannot sync");
    return;
  }

  const localListings = storage.loadB2BListings() || [];
  if (localListings.length === 0) {
    console.log("No local B2B listings to sync");
    return;
  }

  try {
    // Fetch existing listings from Firebase
    const firebaseListings = await fetchAllB2BListings();
    const firebaseListingIds = new Set(firebaseListings.map((l) => l.id));

    // Upload local listings that don't exist in Firebase
    for (const listing of localListings) {
      if (!firebaseListingIds.has(listing.id)) {
        try {
          await createB2BListing(listing);
          console.log(`Synced B2B listing ${listing.id}: ${listing.assetName}`);
        } catch (error) {
          console.error(`Failed to sync B2B listing ${listing.id}:`, error);
        }
      }
    }

    console.log("B2B listings sync complete");
  } catch (error) {
    console.error("Failed to sync local B2B listings to Firebase:", error);
  }
}

