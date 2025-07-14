
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
  
  const completeClickData: ClickData = {
    ...clickData,
    timestamp: Date.now(),
  };

  // 1. Atomically increment the click count.
  await updateDoc(linkDocRef, {
      clickCount: increment(1)
  });

  // 2. Add the detailed click document.
  await addDoc(clicksSubcollection(code), completeClickData);
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
