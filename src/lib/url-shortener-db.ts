
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
  runTransaction,
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
}

export interface ClickData {
  deviceType: string;
  userAgent: string;
  timestamp: number;
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

export async function logClick(code: string, clickData: ClickData): Promise<void> {
  const linkDocRef = doc(linksCollection, code);
  
  await runTransaction(db, async (transaction) => {
    const linkDoc = await transaction.get(linkDocRef);
    if (!linkDoc.exists()) {
      throw new Error("Link does not exist!");
    }
    
    // Increment click count
    const currentCount = linkDoc.data().clickCount || 0;
    transaction.update(linkDocRef, { clickCount: currentCount + 1 });
    
    // Add new click data to subcollection
    const clickDocRef = doc(clicksSubcollection(code));
    transaction.set(clickDocRef, clickData);
  });
}

export async function getRecentLinks(): Promise<DynamicLink[]> {
  const q = query(linksCollection, orderBy('createdAt', 'desc'), limit(10));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as DynamicLink);
}
