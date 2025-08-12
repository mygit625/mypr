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
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Admin SDK will not be initialized with admin privileges.", e);
    }
  } else {
    // In a deployed Google Cloud environment (like App Hosting),
    // initializeApp() can be called without arguments to use the default credentials.
    try {
      app = admin.initializeApp();
    } catch (e) {
        console.warn("Could not initialize Firebase Admin SDK. This is expected locally if FIREBASE_SERVICE_ACCOUNT_KEY is not set. Server-side features requiring admin privileges will be unavailable.", e);
    }
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
