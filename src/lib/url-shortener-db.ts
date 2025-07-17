
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
  runTransaction,
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
  const newLink: DynamicLink = {
    id: code,
    links,
    createdAt: Date.now(),
    clickCount: 0,
  };
  await setDoc(docRef, newLink);
}

export async function getLink(code: string): Promise<DynamicLink | null> {
  const docRef = doc(linksCollection, code);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as DynamicLink) : null;
}

export async function logClick(code: string, clickData: Omit<ClickData, 'timestamp'>): Promise<void> {
    const linkDocRef = doc(linksCollection, code);
    const clicksCollectionRef = clicksSubcollection(code);

    try {
        // Just add the click document. The increment is removed.
        const completeClickData: ClickData = {
            ...clickData,
            timestamp: Date.now(),
        };
        await addDoc(clicksCollectionRef, completeClickData);
    } catch (e) {
        console.error("Click logging failed: ", e);
        // Do not re-throw, as we don't want to block the redirect.
    }
}


export async function getRecentLinks(): Promise<DynamicLink[]> {
  const q = query(linksCollection, orderBy('createdAt', 'desc'), limit(10));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as DynamicLink);
}


export async function getRecentClicksForLink(linkId: string, count: number = 5): Promise<ClickData[]> {
    const q = query(clicksSubcollection(linkId), orderBy('timestamp', 'desc'), limit(count));
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
