
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
  addDoc,
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

export interface RawClickData {
  detectedOs: string;
  ip: string;
  headers: Record<string, string>;
}

export interface ClickLog {
  id: string;
  rawData: RawClickData;
  timestamp: Date;
}

export interface DynamicLink {
  id: string;
  links: LinkBundle;
  createdAt: Date;
  clicks?: ClickLog[];
  clickCount?: number;
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

export async function logClick(code: string, rawData: RawClickData): Promise<void> {
  try {
    const db = getFirestoreInstance();
    const clicksCollectionRef = collection(db, 'short_urls', code, 'clicks');
    await addDoc(clicksCollectionRef, {
      rawData,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to log click for code ${code}:`, error);
    // Fail silently to not block the redirect
  }
}


export async function getRecentLinks(count: number = 10): Promise<DynamicLink[]> {
  const urlsCollection = getUrlsCollection();
  const q = query(urlsCollection, orderBy('createdAt', 'desc'), limit(count));
  const querySnapshot = await getDocs(q);
  
  const links: DynamicLink[] = [];
  
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    
    // Fetch recent clicks for each link
    const db = getFirestoreInstance();
    const clicksCollectionRef = collection(db, 'short_urls', docSnap.id, 'clicks');
    const clicksQuery = query(clicksCollectionRef, orderBy('timestamp', 'desc'), limit(5)); // Get last 5 clicks
    const clicksSnapshot = await getDocs(clicksQuery);

    const clicks: ClickLog[] = [];
    clicksSnapshot.forEach(clickDoc => {
      const clickData = clickDoc.data();
      clicks.push({
        id: clickDoc.id,
        rawData: clickData.rawData,
        timestamp: clickData.timestamp?.toDate() ?? new Date(),
      });
    });
    
    // For total count, we would ideally use a counter field updated with transactions.
    // For simplicity here, we'll just show the count of recent clicks fetched.
    // A more scalable solution would be to add a clickCount field to the main link document.
    const clickCount = clicksSnapshot.size;

    links.push({
      id: docSnap.id,
      links: data.links,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      clicks: clicks,
      clickCount: clickCount, // This is not a total count, but a count of recent clicks.
    });
  }

  return links;
}
