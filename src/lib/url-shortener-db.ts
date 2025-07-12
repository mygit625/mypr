
'use server';

import { getFirestoreInstance } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

// Helper function to get the collection reference with a valid DB instance
function getUrlsCollection() {
    const db = getFirestoreInstance();
    return collection(db, 'short_urls');
}

interface LinkBundle {
  desktop: string;
  android: string;
  ios: string;
}

export interface DynamicLink {
  id: string;
  links: LinkBundle;
  createdAt: Date;
}

export async function createDynamicLink(code: string, links: LinkBundle): Promise<void> {
  const urlsCollection = getUrlsCollection();
  const urlDocRef = doc(urlsCollection, code);
  await setDoc(urlDocRef, {
    links,
    createdAt: serverTimestamp(),
  });
}

export async function getLinkByCode(code: string): Promise<LinkBundle | null> {
  const urlsCollection = getUrlsCollection();
  const urlDocRef = doc(urlsCollection, code);
  const docSnap = await getDoc(urlDocRef);

  if (docSnap.exists()) {
    return docSnap.data().links as LinkBundle;
  } else {
    return null;
  }
}

export async function isCodeUnique(code: string): Promise<boolean> {
  const urlsCollection = getUrlsCollection();
  const urlDocRef = doc(urlsCollection, code);
  const docSnap = await getDoc(urlDocRef);
  return !docSnap.exists();
}


export async function getRecentLinks(count: number = 10): Promise<DynamicLink[]> {
  const urlsCollection = getUrlsCollection();
  const q = query(urlsCollection, orderBy('createdAt', 'desc'), limit(count));
  const querySnapshot = await getDocs(q);
  
  const links: DynamicLink[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    links.push({
      id: doc.id,
      links: data.links,
      // Convert Firestore Timestamp to JS Date
      createdAt: data.createdAt?.toDate() ?? new Date(),
    });
  });

  return links;
}
