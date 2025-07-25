
'use server';

import { admin, db as adminDb } from './firebase-admin';
import { db as clientDb } from './firebase'; 
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  addDoc,
  increment,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';

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

const linksCollection = (db: typeof adminDb | typeof clientDb) => collection(db, 'dynamicLinks');
const clicksSubcollection = (db: typeof adminDb | typeof clientDb, linkId: string) => collection(db, `dynamicLinks/${linkId}/clicks`);

export async function isCodeUnique(code: string): Promise<boolean> {
  const docRef = doc(clientDb, 'dynamicLinks', code);
  const docSnap = await getDoc(docRef);
  return !docSnap.exists();
}

export async function createDynamicLink(code: string, links: Links): Promise<void> {
  const docRef = adminDb.collection('dynamicLinks').doc(code);
  const newLink = {
    links,
    createdAt: Timestamp.now(),
    clickCount: 0,
  };
  await docRef.set(newLink);
}

export async function getLink(code: string): Promise<DynamicLink | null> {
  const docRef = doc(clientDb, 'dynamicLinks', code);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  // Convert Firestore Timestamp to number if it exists
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt;

  return { id: docSnap.id, ...data, createdAt } as DynamicLink;
}


export async function logClick(code: string, clickData: Omit<ClickData, 'timestamp'>): Promise<void> {
    const linkDocRef = adminDb.collection('dynamicLinks').doc(code);
    const clicksCollectionRef = linkDocRef.collection('clicks');

    try {
        const completeClickData = {
            ...clickData,
            timestamp: Timestamp.now(),
        };
        // Use batch write for atomicity
        const batch = adminDb.batch();
        batch.set(clicksCollectionRef.doc(), completeClickData);
        batch.update(linkDocRef, { clickCount: admin.firestore.FieldValue.increment(1) });
        await batch.commit();

    } catch (e) {
        console.error(`[FATAL] Click logging failed for code ${code}:`, e);
    }
}


export async function getRecentLinks(): Promise<DynamicLink[]> {
  const q = query(linksCollection(clientDb), orderBy('createdAt', 'desc'), limit(10));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt;
      return { id: doc.id, ...data, createdAt } as DynamicLink;
  });
}


export async function getRecentClicksForLink(linkId: string, count: number = 5): Promise<ClickData[]> {
    const q = query(clicksSubcollection(clientDb, linkId), orderBy('timestamp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : data.timestamp;
        return { ...data, timestamp } as ClickData;
    });
}

export async function getClicksForLink(linkId: string): Promise<ClickData[]> {
    const q = query(clicksSubcollection(clientDb, linkId), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
     return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : data.timestamp;
        return { ...data, timestamp } as ClickData;
    });
}


export async function recalculateAllClickCounts(): Promise<{success: boolean, updatedCount: number, error?: string}> {
  try {
    const linksSnapshot = await adminDb.collection('dynamicLinks').get();
    let updatedCount = 0;
    
    const batch = adminDb.batch();

    for (const linkDoc of linksSnapshot.docs) {
      const linkId = linkDoc.id;
      const clicksSnapshot = await adminDb.collection('dynamicLinks').doc(linkId).collection('clicks').get();
      const clickCount = clicksSnapshot.size;
      
      const linkRef = adminDb.collection('dynamicLinks').doc(linkId);
      batch.update(linkRef, { clickCount: clickCount });
      updatedCount++;
    }

    await batch.commit();
    return { success: true, updatedCount };
  } catch (e: any) {
    console.error("Failed to recalculate click counts:", e);
    return { success: false, updatedCount: 0, error: e.message };
  }
}
