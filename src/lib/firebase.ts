import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Robust singleton pattern for both app and Firestore
// This ensures that we don't re-initialize the services, which can cause
// connection issues in server-side environments.

let app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let db: Firestore;

if (process.env.NODE_ENV === 'production') {
  db = getFirestore(app);
} else {
  // In development, we need to handle Next.js hot-reloading.
  // We attach the db instance to the global object to persist it across reloads.
  if (!(global as any)._firestoreClient) {
    (global as any)._firestoreClient = getFirestore(app);
  }
  db = (global as any)._firestoreClient;
}

export { app, db };
