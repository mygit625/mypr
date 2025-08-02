import * as admin from 'firebase-admin';

let app: admin.app.App;

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
      app = admin.initializeApp();
    }
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK not initialized with admin privileges.");
    app = admin.initializeApp();
  }
} else {
  app = admin.apps[0]!;
}

const adminDb = admin.firestore(app);
const adminAuth = admin.auth(app);

export { adminDb, adminAuth, admin };
