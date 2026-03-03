/**
 * Firebase Cloud Messaging (FCM) Service
 * Handles FCM token registration, refresh, and message receiving
 */

import { messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// VAPID key - should be set in environment variables
// Get this from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Check if FCM is supported in this environment
 */
export const isFCMSupported = (): boolean => {
  return !!(
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    messaging &&
    'Notification' in window
  );
};

/**
 * Request FCM token for the current user
 * This token is used to send push notifications to this device
 */
export const getFCMToken = async (): Promise<string | null> => {
  if (!isFCMSupported() || !messaging) {
    console.warn('FCM is not supported in this environment');
    return null;
  }

  try {
    // Request notification permission first
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }
    } else if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      console.log('FCM token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Save FCM token to Firestore for a user
 */
export const saveFCMToken = async (userId: string, token: string): Promise<boolean> => {
  if (!db) {
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const existingData = userDoc.exists() ? userDoc.data() : {};

    // Store tokens as an array (users can have multiple devices)
    const existingTokens = existingData.fcmTokens || [];
    const updatedTokens = existingTokens.includes(token)
      ? existingTokens
      : [...existingTokens, token];

    await setDoc(
      userDocRef,
      {
        fcmTokens: updatedTokens,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
};

/**
 * Remove FCM token from Firestore (e.g., when user logs out)
 */
export const removeFCMToken = async (userId: string, token: string): Promise<boolean> => {
  if (!db) {
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return true; // Nothing to remove
    }

    const existingData = userDoc.data();
    const existingTokens = existingData.fcmTokens || [];
    const updatedTokens = existingTokens.filter((t: string) => t !== token);

    await setDoc(
      userDocRef,
      {
        fcmTokens: updatedTokens,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return false;
  }
};

/**
 * Register FCM token for a user (get token and save it)
 */
export const registerFCMToken = async (userId: string): Promise<string | null> => {
  const token = await getFCMToken();
  if (token) {
    await saveFCMToken(userId, token);
  }
  return token;
};

/**
 * Listen for foreground messages (when app is open)
 * Background messages are handled by service worker
 */
export const onForegroundMessage = (
  callback: (payload: any) => void
): (() => void) | null => {
  if (!isFCMSupported() || !messaging) {
    return null;
  }

  try {
    return onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      callback(payload);
    });
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
    return null;
  }
};

/**
 * Get all FCM tokens for a user
 */
export const getUserFCMTokens = async (userId: string): Promise<string[]> => {
  if (!db) {
    return [];
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.fcmTokens || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user FCM tokens:', error);
    return [];
  }
};

