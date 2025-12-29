/**
 * Browser compatibility checks
 * Run this in browser console to verify compatibility
 */

export const browserCheck = {
  // Check if localStorage is available
  checkLocalStorage: (): boolean => {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, "1");
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error("localStorage not available:", e);
      return false;
    }
  },

  // Check localStorage quota
  checkStorageQuota: async (): Promise<{ available: boolean; used: number; quota: number; percentage?: number }> => {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { available: false, used: 0, quota: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      console.log(`Storage: ${(used / 1024 / 1024).toFixed(2)} MB / ${(quota / 1024 / 1024).toFixed(2)} MB (${percentage.toFixed(2)}%)`);

      return {
        available: true,
        used,
        quota,
        percentage,
      };
    } catch (e) {
      console.error("Error checking storage quota:", e);
      return { available: false, used: 0, quota: 0 };
    }
  },

  // Check for required browser features
  checkFeatures: (): Record<string, boolean> => {
    const features = {
      localStorage: typeof Storage !== "undefined",
      json: typeof JSON !== "undefined",
      fetch: typeof fetch !== "undefined",
      cssVariables: CSS.supports("color", "var(--test)"),
      flexbox: CSS.supports("display", "flex"),
      grid: CSS.supports("display", "grid"),
    };

    console.log("Browser features:", features);
    return features;
  },

  // Run all checks
  runAllChecks: () => {
    console.log("=== Browser Compatibility Check ===");
    console.log("User Agent:", navigator.userAgent);
    console.log("Platform:", navigator.platform);
    
    const localStorageOk = browserCheck.checkLocalStorage();
    console.log("localStorage:", localStorageOk ? "✅ Available" : "❌ Not Available");
    
    browserCheck.checkFeatures();
    
    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      browserCheck.checkStorageQuota().then((result) => {
        if (result.available && result.percentage !== undefined) {
          console.log("Storage Quota:", result.percentage < 80 ? "✅ OK" : "⚠️ Getting full");
        }
      });
    }

    // Check for errors in localStorage
    try {
      const keys = Object.keys(localStorage);
      console.log(`localStorage keys: ${keys.length}`);
      console.log("Keys:", keys);
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
  },
};

// Auto-run in development
if (import.meta.env.DEV && typeof window !== "undefined") {
  // @ts-ignore
  window.browserCheck = browserCheck;
  console.log("Browser check utilities available. Run: browserCheck.runAllChecks()");
}

