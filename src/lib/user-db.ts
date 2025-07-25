"use client";

import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';

/**
 * Creates a user document in Firestore if one doesn't already exist.
 * This is typically called after a user signs up for the first time.
 * @param user The Firebase Auth user object.
 */
export const createUserDocument = async (user: User) => {
  const userDocRef = doc(db, 'users', user.uid);

  // Check if the document already exists to prevent overwriting on first social login
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    const { email, displayName, photoURL } = user;
    try {
      await setDoc(userDocRef, {
        uid: user.uid,
        email,
        displayName,
        photoURL,
        createdAt: serverTimestamp(),
        // You can add more fields here, like subscription status, etc.
        // subscription: {
        //   plan: 'free',
        //   status: 'active'
        // }
      });
    } catch (error) {
      console.error("Error creating user document in Firestore: ", error);
      // You might want to throw the error to be caught by the calling function
      throw new Error("Could not save user information to the database.");
    }
  }
  // If the document exists, we do nothing to avoid overwriting existing data.
};
