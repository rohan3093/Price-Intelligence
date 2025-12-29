/**
 * Assets API Client
 * 
 * Uses Firebase Firestore for shared asset data across all users.
 * Falls back to localStorage if Firebase is unavailable or not configured.
 */

import { Asset, PricePoint } from "../types";
import { storage } from "./storage";
import { 
  db, 
  assetsCollection, 
  isFirebaseConfigured 
} from "./firebase";
import {
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  writeBatch,
} from "firebase/firestore";

/**
 * Convert Firestore document to Asset
 */
function docToAsset(docSnap: QueryDocumentSnapshot | DocumentSnapshot): Asset {
  const data = docSnap.data();
  if (!data) {
    throw new Error("Document data is missing");
  }

  return {
    id: parseInt(docSnap.id) || data.id || 0,
    name: data.name || '',
    sku: data.sku || '',
    brand: data.brand || '',
    category: data.category || 'Sneakers',
    image: data.image || '',
    sizes: data.sizes || [],
    priceAnchors: data.priceAnchors || {},
    listingsSnapshot: data.listingsSnapshot || {},
    volatility: data.volatility || 'medium',
    defaultSize: data.defaultSize || '',
    lastUpdated: data.lastUpdated || new Date().toISOString(),
    // Legacy fields
    size: data.size || data.defaultSize || '',
    b2bMarketPrice: data.b2bMarketPrice,
    endCustomerMarketPrice: data.endCustomerMarketPrice,
    stockxGoatPrice: data.stockxGoatPrice,
    pricePoints: data.pricePoints,
    dataPoints: data.dataPoints,
    fairRange: data.fairRange,
    confidence: data.confidence,
    change30d: data.change30d,
    change90d: data.change90d,
    liquidity: data.liquidity,
    volumeLabel: data.volumeLabel,
    insight: data.insight,
    bestAvailablePrice: data.bestAvailablePrice,
    b2bRange: data.b2bRange,
    b2cRange: data.b2cRange,
    globalRange: data.globalRange,
  };
}

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 * Recursively handles nested objects and arrays
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
 * Convert Asset to Firestore document data
 * Firestore doesn't allow undefined values, so we filter them out
 */
function assetToFirestoreData(asset: Asset): any {
  // Convert sizes array, ensuring pricePoints dates are ISO strings and removing undefined values
  const sizes = (asset.sizes || []).map(size => {
    const cleanedSize: any = {
      size: size.size || '',
      b2bMarketPrice: size.b2bMarketPrice || '',
      endCustomerMarketPrice: size.endCustomerMarketPrice || '',
      stockxGoatPrice: size.stockxGoatPrice || '',
      fairRange: size.fairRange || '',
      confidence: size.confidence ?? 0,
      change30d: size.change30d || '',
      change90d: size.change90d || '',
      liquidity: size.liquidity || '',
      volumeLabel: size.volumeLabel || '',
      pricePoints: size.pricePoints ? (() => {
        const pricePoints = size.pricePoints;
        if ('whatsapp' in pricePoints) {
          // New channel-based structure
          return {
            whatsapp: (pricePoints.whatsapp || []).map((point: PricePoint) => ({
              price: point.price,
              listingCount: point.listingCount,
              lastSeen: point.lastSeen instanceof Date ? point.lastSeen.toISOString() : (point.lastSeen || null),
              source: point.source || null,
              size: point.size || null,
              channel: point.channel || 'whatsapp',
              transactionType: point.transactionType || null,
              marketplaceName: point.marketplaceName || null,
              sellerName: point.sellerName || null,
              sellerContact: point.sellerContact || null,
              sellerLocation: point.sellerLocation || null,
              sellerProfileImage: point.sellerProfileImage || null,
            })),
            marketplace: (pricePoints.marketplace || []).map((point: PricePoint) => ({
              price: point.price,
              listingCount: point.listingCount,
              lastSeen: point.lastSeen instanceof Date ? point.lastSeen.toISOString() : (point.lastSeen || null),
              source: point.source || null,
              size: point.size || null,
              channel: point.channel || 'marketplace',
              transactionType: point.transactionType || null,
              marketplaceName: point.marketplaceName || null,
              url: point.url || null,
            })),
            international: (pricePoints.international || []).map((point: PricePoint) => ({
              price: point.price,
              listingCount: point.listingCount,
              lastSeen: point.lastSeen instanceof Date ? point.lastSeen.toISOString() : (point.lastSeen || null),
              source: point.source || null,
              size: point.size || null,
              channel: point.channel || 'international',
              transactionType: point.transactionType || null,
              marketplaceName: point.marketplaceName || null,
              reshippingCost: point.reshippingCost || null,
              url: point.url || null,
            })),
          };
        } else if ('b2b' in pricePoints) {
          // Legacy structure
          return {
            b2b: ((pricePoints as any).b2b || []).map((point: PricePoint) => ({
              price: point.price,
              listingCount: point.listingCount,
              lastSeen: point.lastSeen instanceof Date ? point.lastSeen.toISOString() : (point.lastSeen || null),
              source: point.source || null,
              size: point.size || null,
            })),
            endCustomer: ((pricePoints as any).endCustomer || []).map((point: PricePoint) => ({
              price: point.price,
              listingCount: point.listingCount,
              lastSeen: point.lastSeen instanceof Date ? point.lastSeen.toISOString() : (point.lastSeen || null),
              source: point.source || null,
              size: point.size || null,
            })),
            stockxGoat: ((pricePoints as any).stockxGoat || []).map((point: PricePoint) => ({
              price: point.price,
              listingCount: point.listingCount,
              lastSeen: point.lastSeen instanceof Date ? point.lastSeen.toISOString() : (point.lastSeen || null),
              source: point.source || null,
              size: point.size || null,
            })),
          };
        } else {
          return {
            whatsapp: [],
            marketplace: [],
            international: [],
          };
        }
      })() : {
        whatsapp: [],
        marketplace: [],
        international: [],
      },
    };
    
    // Add optional fields only if they exist
    if (size.lastUpdated) {
      cleanedSize.lastUpdated = size.lastUpdated instanceof Date ? size.lastUpdated.toISOString() : size.lastUpdated;
    }
    if (size.dataPoints !== undefined && size.dataPoints !== null) {
      cleanedSize.dataPoints = size.dataPoints;
    }
    if (size.insight) {
      cleanedSize.insight = size.insight;
    }
    if (size.bestAvailablePrice !== undefined && size.bestAvailablePrice !== null) {
      cleanedSize.bestAvailablePrice = size.bestAvailablePrice;
    }
    
    return cleanedSize;
  });

  const data: any = {
    id: asset.id, // Store ID as a field for querying
    name: asset.name || '',
    sku: asset.sku || '',
    brand: asset.brand || '',
    category: asset.category || 'Sneakers',
    image: asset.image || '',
    sizes: sizes,
    priceAnchors: asset.priceAnchors || {},
    listingsSnapshot: asset.listingsSnapshot || {},
    volatility: asset.volatility || 'medium',
    defaultSize: asset.defaultSize || '',
    lastUpdated: new Date().toISOString(),
  };
  
  console.log("assetToFirestoreData - sizes count:", sizes.length, "sizes:", sizes);

  // Only include optional fields if they have values (not undefined or null)
  if (asset.size !== undefined && asset.size !== null) {
    data.size = asset.size || asset.defaultSize || '';
  }
  if (asset.b2bMarketPrice !== undefined && asset.b2bMarketPrice !== null) {
    data.b2bMarketPrice = asset.b2bMarketPrice;
  }
  if (asset.endCustomerMarketPrice !== undefined && asset.endCustomerMarketPrice !== null) {
    data.endCustomerMarketPrice = asset.endCustomerMarketPrice;
  }
  if (asset.stockxGoatPrice !== undefined && asset.stockxGoatPrice !== null) {
    data.stockxGoatPrice = asset.stockxGoatPrice;
  }
  if (asset.pricePoints !== undefined && asset.pricePoints !== null) {
    data.pricePoints = asset.pricePoints;
  }
  if (asset.dataPoints !== undefined && asset.dataPoints !== null) {
    data.dataPoints = asset.dataPoints;
  }
  if (asset.fairRange !== undefined && asset.fairRange !== null) {
    data.fairRange = asset.fairRange;
  }
  if (asset.confidence !== undefined && asset.confidence !== null) {
    data.confidence = asset.confidence;
  }
  if (asset.change30d !== undefined && asset.change30d !== null) {
    data.change30d = asset.change30d;
  }
  if (asset.change90d !== undefined && asset.change90d !== null) {
    data.change90d = asset.change90d;
  }
  if (asset.liquidity !== undefined && asset.liquidity !== null) {
    data.liquidity = asset.liquidity;
  }
  if (asset.volumeLabel !== undefined && asset.volumeLabel !== null) {
    data.volumeLabel = asset.volumeLabel;
  }
  if (asset.insight !== undefined && asset.insight !== null) {
    data.insight = asset.insight;
  }
  if (asset.bestAvailablePrice !== undefined && asset.bestAvailablePrice !== null) {
    data.bestAvailablePrice = asset.bestAvailablePrice;
  }
  if (asset.b2bRange !== undefined && asset.b2bRange !== null) {
    data.b2bRange = asset.b2bRange;
  }
  if (asset.b2cRange !== undefined && asset.b2cRange !== null) {
    data.b2cRange = asset.b2cRange;
  }
  if (asset.globalRange !== undefined && asset.globalRange !== null) {
    data.globalRange = asset.globalRange;
  }

  // Remove any undefined values that might have slipped through (recursively)
  const cleaned = removeUndefined(data);
  console.log("assetToFirestoreData - cleaned data sizes:", cleaned.sizes?.length);
  return cleaned;
}

/**
 * Get all assets from Firestore
 */
export async function fetchAllAssets(): Promise<Asset[]> {
  // Check if Firebase is configured
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    console.log("Firebase not configured, using localStorage");
    const localAssets = storage.loadAssets();
    return localAssets || [];
  }

  try {
    // Try with orderBy first, fallback to simple query if index not created yet
    try {
      const q = query(assetsCollection, orderBy('lastUpdated', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToAsset);
    } catch (orderByError: any) {
      // If index error, use simple query (Firebase will prompt to create index)
      if (orderByError.code === 'failed-precondition') {
        console.warn("Firestore index needed. Using simple query. Click the link in console to create index.");
        const snapshot = await getDocs(assetsCollection);
        return snapshot.docs.map(docToAsset);
      }
      throw orderByError;
    }
  } catch (error) {
    console.warn("Failed to fetch assets from Firebase, using localStorage fallback:", error);
    const localAssets = storage.loadAssets();
    return localAssets || [];
  }
}

/**
 * Get a single asset by ID
 */
export async function fetchAsset(id: number): Promise<Asset | null> {
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    const localAssets = storage.loadAssets();
    return localAssets?.find((a) => a.id === id) || null;
  }

  try {
    // Query by numeric ID field (we store id as a field in the document)
    const q = query(assetsCollection, where('id', '==', id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return docToAsset(snapshot.docs[0]);
    }
    
    // Fallback: try to get by document ID directly (if document ID matches asset ID)
    // Note: Firestore doesn't support querying by document ID directly, so we'll just return null
    // The document ID should match the asset ID when created
    return null;
  } catch (error) {
    console.warn("Failed to fetch asset from Firebase, using localStorage fallback:", error);
    const localAssets = storage.loadAssets();
    return localAssets?.find((a) => a.id === id) || null;
  }
}

/**
 * Get the next available asset ID from Firebase or localStorage
 */
async function getNextAssetId(): Promise<number> {
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    // Fallback: use localStorage
    const localAssets = storage.loadAssets() || [];
    return localAssets.length ? Math.max(...localAssets.map((a) => a.id)) + 1 : 1;
  }

  try {
    // Fetch all assets from Firebase to get max ID
    const snapshot = await getDocs(assetsCollection);
    if (snapshot.empty) {
      // Also check localStorage as fallback
      const localAssets = storage.loadAssets() || [];
      return localAssets.length ? Math.max(...localAssets.map((a) => a.id)) + 1 : 1;
    }
    
    const firebaseIds = snapshot.docs.map(doc => {
      const data = doc.data();
      return parseInt(doc.id) || data.id || 0;
    });
    
    // Also check localStorage
    const localAssets = storage.loadAssets() || [];
    const localIds = localAssets.map(a => a.id);
    
    const allIds = [...firebaseIds, ...localIds];
    return allIds.length ? Math.max(...allIds) + 1 : 1;
  } catch (error) {
    console.warn("Failed to fetch assets for ID generation, using localStorage:", error);
    const localAssets = storage.loadAssets() || [];
    return localAssets.length ? Math.max(...localAssets.map((a) => a.id)) + 1 : 1;
  }
}

/**
 * Create a new asset
 */
export async function createAsset(asset: Omit<Asset, "id">): Promise<Asset> {
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    // Fallback: generate ID and save to localStorage
    const localAssets = storage.loadAssets();
    const assetsArray = localAssets || [];
    const nextId = assetsArray.length ? Math.max(...assetsArray.map((a) => a.id)) + 1 : 1;
    const newAsset: Asset = { ...asset, id: nextId };
    storage.saveAssets([...assetsArray, newAsset]);
    return newAsset;
  }

  try {
    // Generate ID from Firebase
    const nextId = await getNextAssetId();
    
    const newAsset: Asset = { ...asset, id: nextId };
    const firestoreData = assetToFirestoreData(newAsset);
    
    // Use the generated ID as the document ID
    const assetDoc = doc(assetsCollection, nextId.toString());
    await setDoc(assetDoc, firestoreData);
    
    return newAsset;
  } catch (error) {
    console.warn("Failed to create asset in Firebase, using localStorage fallback:", error);
    // Fallback to localStorage
    const localAssets = storage.loadAssets();
    const assetsArray = localAssets || [];
    const nextId = assetsArray.length ? Math.max(...assetsArray.map((a) => a.id)) + 1 : 1;
    const newAsset: Asset = { ...asset, id: nextId };
    storage.saveAssets([...assetsArray, newAsset]);
    return newAsset;
  }
}

/**
 * Batch create multiple assets efficiently
 * Uses Firestore batch writes (max 500 operations per batch)
 */
export async function batchCreateAssets(
  assets: Omit<Asset, "id">[],
  onProgress?: (created: number, total: number) => void
): Promise<Asset[]> {
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    // Fallback: create one by one in localStorage
    const localAssets = storage.loadAssets() || [];
    const createdAssets: Asset[] = [];
    let nextId = localAssets.length ? Math.max(...localAssets.map((a) => a.id)) + 1 : 1;
    
    for (const asset of assets) {
      const newAsset: Asset = { ...asset, id: nextId++ };
      createdAssets.push(newAsset);
      onProgress?.(createdAssets.length, assets.length);
    }
    
    storage.saveAssets([...localAssets, ...createdAssets]);
    return createdAssets;
  }

  try {
    // Get starting ID from Firebase
    let nextId = await getNextAssetId();
    const createdAssets: Asset[] = [];
    
    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchAssets = assets.slice(i, i + BATCH_SIZE);
      
      for (const asset of batchAssets) {
        const newAsset: Asset = { ...asset, id: nextId };
        const firestoreData = assetToFirestoreData(newAsset);
        const assetDoc = doc(assetsCollection, nextId.toString());
        batch.set(assetDoc, firestoreData);
        createdAssets.push(newAsset);
        nextId++;
      }
      
      // Commit this batch
      await batch.commit();
      onProgress?.(createdAssets.length, assets.length);
    }
    
    return createdAssets;
  } catch (error) {
    console.error("Failed to batch create assets in Firebase:", error);
    // Fallback: create one by one (createAsset handles ID generation)
    const createdAssets: Asset[] = [];
    
    for (const asset of assets) {
      try {
        const newAsset = await createAsset(asset);
        createdAssets.push(newAsset);
        onProgress?.(createdAssets.length, assets.length);
      } catch (err) {
        console.error(`Failed to create asset ${asset.name}:`, err);
      }
    }
    
    return createdAssets;
  }
}

/**
 * Update an existing asset
 */
export async function updateAsset(asset: Asset): Promise<Asset> {
  console.log("updateAsset called with asset:", asset.id, "sizes:", asset.sizes?.length);
  
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    // Fallback: update in localStorage
    const localAssets = storage.loadAssets() || [];
    const updatedAssets = localAssets.map((a) => (a.id === asset.id ? asset : a));
    storage.saveAssets(updatedAssets);
    console.log("Updated asset in localStorage, sizes:", asset.sizes?.length);
    return asset;
  }

  try {
    const assetDoc = doc(assetsCollection, asset.id.toString());
    const firestoreData = assetToFirestoreData(asset);
    console.log("Updating Firestore document with sizes:", firestoreData.sizes?.length);
    await updateDoc(assetDoc, firestoreData);
    console.log("Successfully updated asset in Firestore");
    return asset;
  } catch (error) {
    console.error("Failed to update asset in Firebase:", error);
    console.warn("Falling back to localStorage");
    // Fallback to localStorage
    const localAssets = storage.loadAssets() || [];
    const updatedAssets = localAssets.map((a) => (a.id === asset.id ? asset : a));
    storage.saveAssets(updatedAssets);
    return asset;
  }
}

/**
 * Delete an asset
 */
export async function deleteAsset(id: number): Promise<void> {
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    // Fallback: delete from localStorage
    const localAssets = storage.loadAssets() || [];
    storage.saveAssets(localAssets.filter((a) => a.id !== id));
    return;
  }

  try {
    const assetDoc = doc(assetsCollection, id.toString());
    await deleteDoc(assetDoc);
  } catch (error) {
    console.warn("Failed to delete asset from Firebase, using localStorage fallback:", error);
    // Fallback to localStorage
    const localAssets = storage.loadAssets() || [];
    storage.saveAssets(localAssets.filter((a) => a.id !== id));
  }
}

/**
 * Sync local assets to Firebase (useful for migration)
 */
export async function syncLocalAssetsToFirebase(): Promise<void> {
  if (!isFirebaseConfigured() || !assetsCollection || !db) {
    console.warn("Firebase not configured, cannot sync");
    return;
  }

  const localAssets = storage.loadAssets() || [];
  if (localAssets.length === 0) {
    console.log("No local assets to sync");
    return;
  }

  try {
    // Fetch existing assets from Firebase
    const firebaseAssets = await fetchAllAssets();
    const firebaseAssetIds = new Set(firebaseAssets.map((a) => a.id));

    // Upload local assets that don't exist in Firebase
    for (const asset of localAssets) {
      if (!firebaseAssetIds.has(asset.id)) {
        try {
          await createAsset(asset);
          console.log(`Synced asset ${asset.id}: ${asset.name}`);
        } catch (error) {
          console.error(`Failed to sync asset ${asset.id}:`, error);
        }
      }
    }

    console.log("Sync complete");
  } catch (error) {
    console.error("Failed to sync local assets to Firebase:", error);
  }
}
