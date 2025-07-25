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

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Helper to handle user creation in Firestore
const handleUserCreation = async (user: User) => {
  if (user) {
    // Check if this is a new user by looking at the creation time
    const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
    if (isNewUser) {
      await createUserDocument(user);
    }
  }
  return user;
};


// Sign in with Google
export const signInWithGoogle = async () => {
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
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Note: We don't call handleUserCreation here as this is for existing users.
    // However, if you want to create a DB entry for users who signed up before this was implemented,
    // you could add a check here to create the document if it doesn't exist.
    return result.user;
  } catch (error) {
    console.error("Error signing in with email and password", error);
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
