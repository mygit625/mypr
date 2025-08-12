import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;
let adminDb: admin.firestore.Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;

if (admin.apps.length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Admin SDK not initialized.", e);
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK features will be unavailable.");
  }
} else {
  app = admin.apps[0]!;
}

if (app) {
  adminDb = admin.firestore(app);
  adminAuth = admin.auth(app);
}

// Export potentially undefined values. Consuming modules must handle this.
export { adminDb, adminAuth, admin };
