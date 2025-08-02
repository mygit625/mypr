
"use client";

import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { app } from './firebase'; // Use the initialized client-side app
import { createUserDocument } from './user-db';

// Defer getAuth() call to ensure it runs only on the client-side when needed.
const getClientAuth = () => getAuth(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Helper to handle user creation in Firestore
const handleUserCreation = async (user: User) => {
  if (user) {
    // Check if this is a new user by looking at the creation time
    const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
    if (isNewUser) {
      try {
        await createUserDocument(user);
      } catch (error) {
        // This catch block handles the "Missing or insufficient permissions" error gracefully.
        // The user account is already created in Firebase Auth, so we don't want to show a failure message to the user.
        // Instead, we log a warning for the developer.
        console.warn(
          "Warning: User account was created, but writing to Firestore failed.",
          "This is likely due to restrictive Firestore security rules.",
          "Error:",
          error
        );
      }
    }
  }
  return user;
};


// Sign in with Google
export const signInWithGoogle = async () => {
  const auth = getClientAuth();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await handleUserCreation(result.user);
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Sign in with GitHub
export const signInWithGitHub = async () => {
  const auth = getClientAuth();
  try {
    const result = await signInWithPopup(auth, githubProvider);
    return await handleUserCreation(result.user);
  } catch (error) {
    console.error("Error signing in with GitHub", error);
    throw error;
  }
};

// Sign up with Email and Password
export const signUpWithEmail = async (email: string, password: string) => {
  const auth = getClientAuth();
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return await handleUserCreation(result.user);
  } catch (error) {
    console.error("Error signing up with email and password", error);
    throw error;
  }
};

// Sign in with Email and Password
export const signInWithEmail = async (email: string, password: string) => {
  const auth = getClientAuth();
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Note: We don't call handleUserCreation here as this is for existing users.
    return result.user;
  } catch (error) {
    console.error("Error signing in with email and password", error);
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  const auth = getClientAuth();
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const auth = getClientAuth();
  return onAuthStateChanged(auth, callback);
};
