import admin from 'firebase-admin';
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App;

if (getApps().length === 0) {
  if (serviceAccountKey) {
    app = initializeApp({
      credential: cert(JSON.parse(serviceAccountKey)),
    });
  } else {
    // Initialize without credentials in environments where the key is not available
    // (like the client-side or build environments that don't need admin access).
    // Operations requiring authentication will fail, but the app won't crash.
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, admin };
