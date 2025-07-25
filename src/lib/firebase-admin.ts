import { admin } from 'firebase-admin';
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App;

if (getApps().length === 0) {
  if (serviceAccountKey) {
    try {
      const parsedKey = JSON.parse(serviceAccountKey);
      app = initializeApp({
        credential: cert(parsedKey),
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Admin SDK not initialized.", e);
      // Initialize without credentials to prevent crashing, but admin operations will fail.
      app = initializeApp();
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK is not initialized with admin privileges.");
    // Initialize without credentials in environments where the key is not available
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, admin };
