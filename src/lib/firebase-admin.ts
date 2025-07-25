import admin from 'firebase-admin';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

if (getApps().length === 0) {
  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
  });
}

const db = getFirestore();
const auth = getAuth();

export { db, auth, admin };
