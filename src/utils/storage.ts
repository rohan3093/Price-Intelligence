/**
 * Centralized storage utilities for data persistence
 * Uses localStorage with proper error handling and data versioning
 */

import { Asset, Drop } from "../types";
import { B2BListing } from "../components/B2BListings";

const STORAGE_KEYS = {
  ASSETS: "intelligence_exchange_assets",
  B2B_LISTINGS: "intelligence_exchange_b2b_listings",
  DROPS: "intelligence_exchange_drops",
  WATCHLIST: "intelligence_exchange_watchlist",
  ANALYST_AUTH: "analyst_authenticated",
  ANALYST_EMAIL: "analyst_email",
  DESIGN_TOKENS: "designTokens",
  APP_VERSION: "intelligence_exchange_version",
} as const;

const CURRENT_VERSION = "1.0.0";

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export const storage = {
  // Assets
  saveAssets: (assets: Asset[]): boolean => {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage not available, data will not persist");
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
      return true;
    } catch (e) {
      // Handle quota exceeded error
      if (e instanceof DOMException && e.code === 22) {
        console.error("localStorage quota exceeded. Consider clearing old data.");
      } else {
        console.error("Failed to save assets", e);
      }
      return false;
    }
  },

  loadAssets: (): Asset[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load assets", e);
      return null;
    }
  },

  // B2B Listings
  saveB2BListings: (listings: B2BListing[]): boolean => {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage not available, data will not persist");
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.B2B_LISTINGS, JSON.stringify(listings));
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.code === 22) {
        console.error("localStorage quota exceeded. Consider clearing old data.");
      } else {
        console.error("Failed to save B2B listings", e);
      }
      return false;
    }
  },

  loadB2BListings: (): B2BListing[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.B2B_LISTINGS);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load B2B listings", e);
      return null;
    }
  },

  // Drops
  saveDrops: (drops: Drop[]): boolean => {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage not available, data will not persist");
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.DROPS, JSON.stringify(drops));
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.code === 22) {
        console.error("localStorage quota exceeded. Consider clearing old data.");
      } else {
        console.error("Failed to save drops", e);
      }
      return false;
    }
  },

  loadDrops: (): Drop[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DROPS);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load drops", e);
      return null;
    }
  },

  // Watchlist
  saveWatchlist: (assetIds: number[]): boolean => {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage not available, data will not persist");
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(assetIds));
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.code === 22) {
        console.error("localStorage quota exceeded. Consider clearing old data.");
      } else {
        console.error("Failed to save watchlist", e);
      }
      return false;
    }
  },

  loadWatchlist: (): number[] | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load watchlist", e);
      return null;
    }
  },

  // Analytics
  trackEvent: (eventName: string, data?: Record<string, any>): void => {
    try {
      const events = JSON.parse(localStorage.getItem("analytics_events") || "[]");
      events.push({
        event: eventName,
        data,
        timestamp: new Date().toISOString(),
      });
      // Keep only last 1000 events to prevent storage bloat
      const trimmed = events.slice(-1000);
      localStorage.setItem("analytics_events", JSON.stringify(trimmed));
    } catch (e) {
      // Silently fail analytics
    }
  },

  getAnalytics: (): any[] => {
    try {
      return JSON.parse(localStorage.getItem("analytics_events") || "[]");
    } catch (e) {
      return [];
    }
  },

  // Version check for migrations
  checkVersion: (): boolean => {
    const stored = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
    if (stored !== CURRENT_VERSION) {
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
      // Could trigger migrations here if needed
      return false; // Version changed
    }
    return true; // Same version
  },
};

