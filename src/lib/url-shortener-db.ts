
'use server';

import { admin, db as adminDb } from './firebase-admin';
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

// Consistently use the adminDb for all server-side operations
const linksCollection = collection(adminDb, 'dynamicLinks');
const clicksSubcollection = (linkId: string) => collection(adminDb, `dynamicLinks/${linkId}/clicks`);


export async function isCodeUnique(code: string): Promise<boolean> {
  // Use the adminDb for server-side checks
  const docRef = doc(linksCollection, code);
  const docSnap = await getDoc(docRef);
  return !docSnap.exists();
}

export async function createDynamicLink(code: string, links: Links): Promise<void> {
  const docRef = doc(linksCollection, code);
  const newLink = {
    links,
    createdAt: Timestamp.now(),
    clickCount: 0,
  };
  await setDoc(docRef, newLink);
}

export async function getLink(code: string): Promise<DynamicLink | null> {
  const docRef = doc(linksCollection, code);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  // Convert Firestore Timestamp to number if it exists
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt;

  return { id: docSnap.id, ...data, createdAt } as DynamicLink;
}


export async function logClick(code: string, clickData: Omit<ClickData, 'timestamp'>): Promise<void> {
    const linkDocRef = doc(linksCollection, code);
    const clicksCollectionRef = clicksSubcollection(code);

    try {
        const completeClickData = {
            ...clickData,
            timestamp: Timestamp.now(),
        };
        // Use batch write for atomicity
        const batch = adminDb.batch();
        batch.set(doc(clicksCollectionRef), completeClickData);
        batch.update(linkDocRef, { clickCount: increment(1) });
        await batch.commit();

    } catch (e) {
        console.error(`[FATAL] Click logging failed for code ${code}:`, e);
    }
}


export async function getRecentLinks(): Promise<DynamicLink[]> {
  const q = query(linksCollection, orderBy('createdAt', 'desc'), limit(10));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt;
      return { id: doc.id, ...data, createdAt } as DynamicLink;
  });
}


export async function getRecentClicksForLink(linkId: string, count: number = 5): Promise<ClickData[]> {
    const q = query(clicksSubcollection(linkId), orderBy('timestamp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : data.timestamp;
        return { ...data, timestamp } as ClickData;
    });
}

export async function getClicksForLink(linkId: string): Promise<ClickData[]> {
    const q = query(clicksSubcollection(linkId), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
     return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : data.timestamp;
        return { ...data, timestamp } as ClickData;
    });
}


export async function recalculateAllClickCounts(): Promise<{success: boolean, updatedCount: number, error?: string}> {
  try {
    const linksSnapshot = await getDocs(linksCollection);
    let updatedCount = 0;
    
    const batch = adminDb.batch();

    for (const linkDoc of linksSnapshot.docs) {
      const linkId = linkDoc.id;
      const clicksSnapshot = await getDocs(clicksSubcollection(linkId));
      const clickCount = clicksSnapshot.size;
      
      const linkRef = doc(linksCollection, linkId);
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
