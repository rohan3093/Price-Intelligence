/**
 * Application configuration
 * For production, move sensitive values to environment variables
 */

export const config = {
  // App info
  appName: "Sentria",
  appVersion: "1.0.0",
  
  // Analytics
  enableAnalytics: true,
  
  // Feature flags
  features: {
    watchlist: true,
    alerts: true,
    educationHub: true,
    designSettings: true,
  },
  
  // Storage limits (to prevent localStorage bloat)
  maxAnalyticsEvents: 1000,
  maxAssets: 10000,
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

