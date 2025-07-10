import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A more robust way to initialize Firebase in a Next.js environment
let app;
const appName = 'ToolsInnClient';
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig, appName);
} else {
  app = getApp(appName);
}

// Pass the databaseId to getFirestore
const db = getFirestore(app, process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID);

export { app, db };
