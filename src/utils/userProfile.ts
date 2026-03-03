/**
 * User profile utilities
 */

import { doc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

interface UserProfileUpdate {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

export const saveUserProfile = async ({ uid, email, displayName }: UserProfileUpdate): Promise<void> => {
  if (!db) {
    return;
  }

  const hasEmail = !!email;

  await setDoc(
    doc(db, "users", uid),
    {
      email: email || null,
      displayName: displayName || null,
      emailRemindersEnabled: hasEmail ? true : false,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const saveUserProfileFromAuth = async (user: User): Promise<void> => {
  await saveUserProfile({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  });
};

