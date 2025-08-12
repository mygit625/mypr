
'use server';

import { admin, adminDb } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Links {
  desktop: string;
  android: string;
  ios: string;
}

export interface DynamicLink {
  id: string;
  links: Links;
  createdAt: number;
  clickCount: number;
  recentClicks?: ClickData[];
}

export interface ClickData {
  deviceType: string;
  timestamp: number;
  rawData: {
    headers: Record<string, string>;
    ip?: string;
    userAgent: string;
    platform?: string | null;
    country?: string | null;
  };
}

// Helper function to check if the admin SDK is available and throw a clear error if not.
function getLinksCollection() {
  if (!adminDb) {
    throw new Error('Firebase Admin SDK is not initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY in your local .env.local file for this feature to work during development.');
  }
  return adminDb.collection('dynamicLinks');
}


export async function isCodeUnique(code: string): Promise<boolean> {
  const linksCollection = getLinksCollection();
  const docRef = linksCollection.doc(code);
  const docSnap = await docRef.get();
  return !docSnap.exists;
}

export async function createDynamicLink(code: string, links: Links): Promise<void> {
  const linksCollection = getLinksCollection();
  const docRef = linksCollection.doc(code);
  const newLink = {
    links,
    createdAt: Timestamp.now(),
    clickCount: 0,
  };
  await docRef.set(newLink);
}

export async function getLink(code: string): Promise<DynamicLink | null> {
  const linksCollection = getLinksCollection();
  const docRef = linksCollection.doc(code);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return null;
  
  const data = docSnap.data();
  if (!data) return null;

  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();

  return { id: docSnap.id, ...data, createdAt } as DynamicLink;
}


export async function logClick(code: string, clickData: Omit<ClickData, 'timestamp'>): Promise<void> {
    const linksCollection = getLinksCollection();
    const linkDocRef = linksCollection.doc(code);
    const clicksCollectionRef = linkDocRef.collection('clicks');

    try {
        const completeClickData = {
            ...clickData,
            timestamp: Timestamp.now(),
        };
        
        // This requires adminDb to be initialized.
        const batch = adminDb!.batch();
        const newClickRef = clicksCollectionRef.doc();
        batch.set(newClickRef, completeClickData);
        batch.update(linkDocRef, { clickCount: admin.firestore.FieldValue.increment(1) });
        await batch.commit();

    } catch (e) {
        console.error(`[FATAL] Click logging failed for code ${code}:`, e);
    }
}


export async function getRecentLinks(): Promise<DynamicLink[]> {
  const linksCollection = getLinksCollection();
  const q = linksCollection.orderBy('createdAt', 'desc').limit(10);
  const querySnapshot = await q.get();
  return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
      return { id: doc.id, ...data, createdAt } as DynamicLink;
  });
}


export async function getRecentClicksForLink(linkId: string, count: number = 5): Promise<ClickData[]> {
    const linksCollection = getLinksCollection();
    const q = linksCollection.doc(linkId).collection('clicks').orderBy('timestamp', 'desc').limit(count);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now();
        return { ...data, timestamp } as ClickData;
    });
}

export async function getClicksForLink(linkId: string): Promise<ClickData[]> {
    const linksCollection = getLinksCollection();
    const q = linksCollection.doc(linkId).collection('clicks').orderBy('timestamp', 'desc');
    const querySnapshot = await q.get();
     return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now();
        return { ...data, timestamp } as ClickData;
    });
}


export async function recalculateAllClickCounts(): Promise<{success: boolean, updatedCount: number, error?: string}> {
  try {
    const linksCollection = getLinksCollection();
    const linksSnapshot = await linksCollection.get();
    let updatedCount = 0;
    
    const batch = adminDb!.batch();

    for (const linkDoc of linksSnapshot.docs) {
      const linkId = linkDoc.id;
      const clicksSnapshot = await linkDoc.ref.collection('clicks').get();
      const clickCount = clicksSnapshot.size;
      
      batch.update(linkDoc.ref, { clickCount: clickCount });
      updatedCount++;
    }

    await batch.commit();
    return { success: true, updatedCount };
  } catch (e: any) {
    console.error("Failed to recalculate click counts:", e);
    return { success: false, updatedCount: 0, error: e.message };
  }
}
