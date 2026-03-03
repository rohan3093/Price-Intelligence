/**
 * Drop Reminders API - User-specific drop reminders stored in Firestore
 * 
 * When user is signed in: Reminders are stored in Firestore under their user ID
 * When user is signed out: Falls back to localStorage (device-specific)
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface DropReminder {
  dropId: number;
  reminderMinutes: number; // Minutes before drop to remind (e.g., 60 = 1 hour before)
  createdAt: string;
}

// Firestore path: users/{userId} - store reminders as a field in the user document
const getUserDocRef = (userId: string) => {
  if (!db) {
    return null;
  }
  return doc(db, 'users', userId);
};

const STORAGE_KEY = 'drop_reminders';

/**
 * Load drop reminders for a user from Firestore or localStorage
 */
export const loadUserDropReminders = async (userId: string | null): Promise<DropReminder[]> => {
  // If signed in, try Firestore first
  if (userId) {
    const docRef = getUserDocRef(userId);
    if (docRef) {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return data.dropReminders || [];
        }
      } catch (error) {
        console.error('Error loading drop reminders from Firestore:', error);
        // Fall through to localStorage
      }
    }
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading drop reminders from localStorage:', error);
  }

  return [];
};

/**
 * Save drop reminders for a user to Firestore or localStorage
 */
export const saveUserDropReminders = async (
  userId: string | null,
  reminders: DropReminder[]
): Promise<boolean> => {
  // If signed in, save to Firestore
  if (userId) {
    const docRef = getUserDocRef(userId);
    if (docRef) {
      try {
        await setDoc(
          docRef,
          {
            dropReminders: reminders,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        // Also save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
        return true;
      } catch (error: any) {
        console.error('Error saving drop reminders to Firestore:', error);
        // Fall through to localStorage
      }
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    return true;
  } catch (error) {
    console.error('Error saving drop reminders to localStorage:', error);
    return false;
  }
};

/**
 * Add a reminder for a drop
 */
export const addDropReminder = async (
  userId: string | null,
  dropId: number,
  reminderMinutes: number = 60
): Promise<boolean> => {
  const reminders = await loadUserDropReminders(userId);
  
  // Remove existing reminder for this drop if any
  const filtered = reminders.filter((r) => r.dropId !== dropId);
  
  // Add new reminder
  const newReminder: DropReminder = {
    dropId,
    reminderMinutes,
    createdAt: new Date().toISOString(),
  };

  return saveUserDropReminders(userId, [...filtered, newReminder]);
};

/**
 * Remove a reminder for a drop
 */
export const removeDropReminder = async (
  userId: string | null,
  dropId: number
): Promise<boolean> => {
  const reminders = await loadUserDropReminders(userId);
  const filtered = reminders.filter((r) => r.dropId !== dropId);
  return saveUserDropReminders(userId, filtered);
};

/**
 * Check if a drop has a reminder
 */
export const hasDropReminder = async (
  userId: string | null,
  dropId: number
): Promise<boolean> => {
  const reminders = await loadUserDropReminders(userId);
  return reminders.some((r) => r.dropId === dropId);
};

/**
 * Get reminder for a specific drop
 */
export const getDropReminder = async (
  userId: string | null,
  dropId: number
): Promise<DropReminder | null> => {
  const reminders = await loadUserDropReminders(userId);
  return reminders.find((r) => r.dropId === dropId) || null;
};

