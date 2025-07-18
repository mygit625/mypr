
'use server';

import { db } from './firebase';
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
  getCountFromServer
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
  recentClicks?: ClickData[]; // Optional: for holding recent clicks data on the client
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

const linksCollection = collection(db, 'dynamicLinks');
const clicksSubcollection = (linkId: string) => collection(db, `dynamicLinks/${linkId}/clicks`);

export async function isCodeUnique(code: string): Promise<boolean> {
  const docRef = doc(linksCollection, code);
  const docSnap = await getDoc(docRef);
  return !docSnap.exists();
}

export async function createDynamicLink(code: string, links: Links): Promise<void> {
  const docRef = doc(linksCollection, code);
  const newLink: Omit<DynamicLink, 'id'> = {
    links,
    createdAt: Date.now(),
    clickCount: 0,
  };
  await setDoc(docRef, newLink);
}

export async function getLink(code: string): Promise<DynamicLink | null> {
  const docRef = doc(linksCollection, code);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as DynamicLink;
}

export async function logClick(code: string, clickData: Omit<ClickData, 'timestamp'>): Promise<void> {
    const linkDocRef = doc(linksCollection, code);
    const clicksCollectionRef = clicksSubcollection(code);

    try {
        const completeClickData: ClickData = {
            ...clickData,
            timestamp: Date.now(),
        };
        // Perform writes in parallel
        await Promise.all([
            addDoc(clicksCollectionRef, completeClickData),
            updateDoc(linkDocRef, { clickCount: increment(1) })
        ]);
    } catch (e) {
        console.error(`[FATAL] Click logging failed for code ${code}:`, e);
    }
}


export async function getRecentLinks(): Promise<DynamicLink[]> {
  const q = query(linksCollection, orderBy('createdAt', 'desc'), limit(10));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DynamicLink));
}


export async function getRecentClicksForLink(linkId: string, count: number = 5): Promise<ClickData[]> {
    const q = query(clicksSubcollection(linkId), orderBy('timestamp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ClickData);
}

export async function getClicksForLink(linkId: string): Promise<ClickData[]> {
    const q = query(clicksSubcollection(linkId), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ClickData);
}


// New function for admin tool
export async function recalculateAllClickCounts(): Promise<{success: boolean, updatedCount: number, error?: string}> {
  try {
    const querySnapshot = await getDocs(linksCollection);
    let updatedCount = 0;

    for (const linkDoc of querySnapshot.docs) {
      const linkId = linkDoc.id;
      const clicksRef = clicksSubcollection(linkId);
      const snapshot = await getCountFromServer(clicksRef);
      const clickCount = snapshot.data().count;
      
      await updateDoc(doc(linksCollection, linkId), { clickCount: clickCount });
      updatedCount++;
    }
    return { success: true, updatedCount };
  } catch (e: any) {
    console.error("Failed to recalculate click counts:", e);
    return { success: false, updatedCount: 0, error: e.message };
  }
}
