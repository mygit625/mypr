// src/lib/firebase-config.ts

import type { FirebaseOptions } from 'firebase/app';

let firebaseConfig: FirebaseOptions;

try {
  // On the server during build, Firebase App Hosting provides this env var.
  // It's a JSON string that needs to be parsed.
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
  } else {
    // For client-side and local development, fall back to individual NEXT_PUBLIC_ variables.
    // This ensures the app works correctly in all environments.
    firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }
} catch (e) {
  console.error("Failed to parse Firebase config. Ensure environment variables are set correctly.", e);
  // Provide a default empty config to avoid crashing the app on import
  firebaseConfig = {};
}


/**
 * Firebase configuration object.
 * This is defined in a separate file to ensure that Next.js's build process
 * correctly bundles the environment variables for client-side use.
 */
export { firebaseConfig };
