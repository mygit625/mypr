import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

let app: App;

// This logic ensures that the admin app is initialized only once.
if (getApps().length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      // The service account key is a JSON string, so it needs to be parsed.
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Admin SDK not initialized.", e);
      // Initialize without credentials to avoid crashing the app, but admin operations will fail.
      app = initializeApp();
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK is not initialized with admin privileges. This is expected in client-side builds.");
    // Initialize without credentials in environments where the key is not available (like client-side bundle).
    app = initializeApp();
  }
} else {
  // Use the already initialized app.
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, admin };
