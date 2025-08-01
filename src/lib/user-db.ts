
"use client";

import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';

/**
 * Creates a user document in Firestore if one doesn't already exist.
 * This is typically called after a user signs up for the first time.
 * This function will throw an error if Firestore permissions are insufficient.
 * @param user The Firebase Auth user object.
 */
export const createUserDocument = async (user: User) => {
  const userDocRef = doc(db, 'users', user.uid);

  // Check if the document already exists to prevent overwriting on first social login
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    const { email, displayName, photoURL } = user;
    // The await setDoc call is now wrapped in a try/catch in the calling function (`handleUserCreation`)
    // to gracefully handle permission errors without failing the entire sign-up process.
    await setDoc(userDocRef, {
      uid: user.uid,
      email,
      displayName,
      photoURL,
      createdAt: serverTimestamp(),
    });
  }
  // If the document exists, we do nothing to avoid overwriting existing data.
};
