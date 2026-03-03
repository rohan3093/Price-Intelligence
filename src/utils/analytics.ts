/**
 * Enhanced analytics tracking for MVP validation
 * Tracks user interactions, sessions, and engagement metrics
 * 
 * Performance optimizations:
 * - Batched writes to localStorage (debounced)
 * - Efficient data structures
 * - Reduced synchronous operations
 */

// Batch queue for events
let eventQueue: any[] = [];
let userUpdateQueue: any = null;
let sessionUpdateQueue: any = null;
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

const FLUSH_DELAY = 2000; // 2 seconds debounce for batched writes
const MAX_QUEUE_SIZE = 50; // Force flush when queue reaches this size

// Flush queued writes to localStorage
const flushWrites = () => {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  try {
    // Batch event writes
    if (eventQueue.length > 0) {
      const existingEvents = JSON.parse(localStorage.getItem("analytics_events") || "[]");
      const combined = [...existingEvents, ...eventQueue].slice(-2000);
      localStorage.setItem("analytics_events", JSON.stringify(combined));
      eventQueue = [];
    }

    // Update user data if queued
    if (userUpdateQueue) {
      const users = JSON.parse(localStorage.getItem("analytics_users") || "[]");
      const userIndex = users.findIndex((u: any) => u.id === userUpdateQueue.id);
      if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], ...userUpdateQueue };
      }
      localStorage.setItem("analytics_users", JSON.stringify(users));
      userUpdateQueue = null;
    }

    // Update session data if queued
    if (sessionUpdateQueue) {
      const sessions = JSON.parse(localStorage.getItem("analytics_sessions") || "[]");
      const sessionIndex = sessions.findIndex((s: any) => s.id === sessionUpdateQueue.id);
      if (sessionIndex >= 0) {
        sessions[sessionIndex] = { ...sessions[sessionIndex], ...sessionUpdateQueue };
      }
      localStorage.setItem("analytics_sessions", JSON.stringify(sessions));
      sessionUpdateQueue = null;
    }
  } catch (e) {
    // Silently fail
  }
};

// Schedule a batched flush
const scheduleFlush = () => {
  // Force flush if queue is getting large
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushWrites();
    return;
  }

  // Otherwise debounce
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushWrites, FLUSH_DELAY);
  }
};

// Generate or get unique user ID
const getUserId = (): string => {
  let userId = localStorage.getItem("analytics_user_id");
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("analytics_user_id", userId);
    // Track new user
    trackNewUser(userId);
  }
  return userId;
};

// Track new user
const trackNewUser = (userId: string) => {
  try {
    const users = JSON.parse(localStorage.getItem("analytics_users") || "[]");
    if (!users.find((u: any) => u.id === userId)) {
      users.push({
        id: userId,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        totalSessions: 0,
        totalTimeSpent: 0,
        totalEvents: 0,
      });
      localStorage.setItem("analytics_users", JSON.stringify(users));
    }
  } catch (e) {
    // Silently fail
  }
};

// Session management
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
    sessionStorage.setItem("analytics_session_start", new Date().toISOString());
    // Track session start
    trackSessionStart(sessionId);
  }
  return sessionId;
};

const trackSessionStart = (sessionId: string) => {
  try {
    const sessions = JSON.parse(localStorage.getItem("analytics_sessions") || "[]");
    const userId = getUserId();
    sessions.push({
      id: sessionId,
      userId,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      events: 0,
    });
    // Keep only last 500 sessions
    const trimmed = sessions.slice(-500);
    localStorage.setItem("analytics_sessions", JSON.stringify(trimmed));
  } catch (e) {
    // Silently fail
  }
};

// Track session end and duration
const trackSessionEnd = () => {
  try {
    const sessionId = sessionStorage.getItem("analytics_session_id");
    const sessionStart = sessionStorage.getItem("analytics_session_start");
    if (!sessionId || !sessionStart) return;

    const startTime = new Date(sessionStart);
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000); // seconds

    const sessions = JSON.parse(localStorage.getItem("analytics_sessions") || "[]");
    const session = sessions.find((s: any) => s.id === sessionId);
    if (session) {
      session.endTime = endTime.toISOString();
      session.duration = duration;
      localStorage.setItem("analytics_sessions", JSON.stringify(sessions));

      // Update user total time spent
      const userId = getUserId();
      const users = JSON.parse(localStorage.getItem("analytics_users") || "[]");
      const user = users.find((u: any) => u.id === userId);
      if (user) {
        user.totalTimeSpent += duration;
        user.totalSessions += 1;
        user.lastSeen = endTime.toISOString();
        localStorage.setItem("analytics_users", JSON.stringify(users));
      }
    }
  } catch (e) {
    // Silently fail
  }
};

// Track page visibility for accurate session duration
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // Page hidden, flush writes and track session end
      flushWrites();
      trackSessionEnd();
    } else {
      // Page visible, start new session if needed
      getSessionId();
    }
  });

  // Track session end and flush on page unload
  window.addEventListener("beforeunload", () => {
    flushWrites();
    trackSessionEnd();
  });
  
  // Also flush on pagehide for iOS Safari
  window.addEventListener("pagehide", () => {
    flushWrites();
    trackSessionEnd();
  });
}

export const analytics = {
  track: (eventName: string, properties?: Record<string, any>) => {
    // Store in localStorage using batched writes for performance
    // In production, could send to Google Analytics, Mixpanel, etc.
    try {
      const userId = getUserId();
      const sessionId = getSessionId();
      
      // Queue event for batched write
      eventQueue.push({
        event: eventName,
        properties,
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
        url: window.location.pathname,
      });

      // Queue user update
      userUpdateQueue = {
        id: userId,
        totalEvents: (userUpdateQueue?.totalEvents || 0) + 1,
        lastSeen: new Date().toISOString(),
      };

      // Queue session update
      sessionUpdateQueue = {
        id: sessionId,
        events: (sessionUpdateQueue?.events || 0) + 1,
      };

      // Schedule batched flush
      scheduleFlush();
    } catch (e) {
      // Silently fail
    }
  },

  trackPageView: (view: string) => {
    analytics.track("page_view", { view });
  },

  trackAssetView: (assetId: number, assetName: string) => {
    analytics.track("asset_view", { assetId, assetName });
  },

  trackSearch: (query: string, resultsCount: number) => {
    analytics.track("search", { query, resultsCount });
  },

  trackAnalystAction: (action: string, details?: Record<string, any>) => {
    analytics.track("analyst_action", { action, ...details });
  },

  // Get all analytics events
  getAnalytics: () => {
    try {
      return JSON.parse(localStorage.getItem("analytics_events") || "[]");
    } catch (e) {
      return [];
    }
  },

  // Get user data
  getUsers: () => {
    try {
      return JSON.parse(localStorage.getItem("analytics_users") || "[]");
    } catch (e) {
      return [];
    }
  },

  // Get session data
  getSessions: () => {
    try {
      return JSON.parse(localStorage.getItem("analytics_sessions") || "[]");
    } catch (e) {
      return [];
    }
  },

  // Get current user ID
  getCurrentUserId: () => {
    return getUserId();
  },

  // Export analytics data (for admin to review)
  exportData: () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        events: analytics.getAnalytics(),
        users: analytics.getUsers(),
        sessions: analytics.getSessions(),
        summary: {
          totalUsers: analytics.getUsers().length,
          totalSessions: analytics.getSessions().filter((s: any) => s.duration !== null).length,
          totalEvents: analytics.getAnalytics().length,
        },
      };
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      // Silently fail
    }
  },
};

// Initialize session on load
if (typeof window !== "undefined") {
  getSessionId(); // Start tracking session
}

