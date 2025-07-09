'use server';

import { db } from './firebase';
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

const urlsCollection = collection(db, 'short_urls');

export interface ShortUrl {
  id: string;
  longUrl: string;
  createdAt: Date;
}

export async function createShortUrl(code: string, longUrl: string): Promise<void> {
  const urlDocRef = doc(urlsCollection, code);
  await setDoc(urlDocRef, {
    longUrl,
    createdAt: serverTimestamp(),
  });
}

export async function getUrlByCode(code: string): Promise<string | null> {
  const urlDocRef = doc(urlsCollection, code);
  const docSnap = await getDoc(urlDocRef);

  if (docSnap.exists()) {
    return docSnap.data().longUrl as string;
  } else {
    return null;
  }
}

export async function isCodeUnique(code: string): Promise<boolean> {
  const urlDocRef = doc(urlsCollection, code);
  const docSnap = await getDoc(urlDocRef);
  return !docSnap.exists();
}


export async function getRecentUrls(count: number = 10): Promise<ShortUrl[]> {
  const q = query(urlsCollection, orderBy('createdAt', 'desc'), limit(count));
  const querySnapshot = await getDocs(q);
  
  const urls: ShortUrl[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    urls.push({
      id: doc.id,
      longUrl: data.longUrl,
      // Convert Firestore Timestamp to JS Date
      createdAt: data.createdAt?.toDate() ?? new Date(),
    });
  });

  return urls;
}
