
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
  getCountFromServer,
  getDocs as getClickDocs,
  query as clickQuery,
  orderBy as clickOrderBy,
  limit as clickLimit,
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

export interface ClickData {
  userAgent: string;
  deviceType: string;
}

export interface ClickLog {
  id: string;
  timestamp: Date;
  rawData: ClickData;
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

export async function logClick(code: string, rawData: ClickData): Promise<void> {
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
  const db = getFirestoreInstance();
  const urlsCollection = getUrlsCollection();
  const q = query(urlsCollection, orderBy('createdAt', 'desc'), limit(count));
  const querySnapshot = await getDocs(q);
  
  const links: DynamicLink[] = [];
  
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    
    // Get total click count for each link
    const clicksCollectionRef = collection(db, 'short_urls', docSnap.id, 'clicks');
    const clicksSnapshot = await getCountFromServer(clicksCollectionRef);
    const clickCount = clicksSnapshot.data().count;

    // Get the most recent 5 clicks
    const clicksQuery = clickQuery(clicksCollectionRef, clickOrderBy('timestamp', 'desc'), clickLimit(5));
    const recentClicksSnapshot = await getClickDocs(clicksQuery);
    const clicks = recentClicksSnapshot.docs.map(clickDoc => {
      const clickData = clickDoc.data();
      return {
        id: clickDoc.id,
        timestamp: clickData.timestamp?.toDate() ?? new Date(),
        rawData: clickData.rawData as ClickData,
      };
    });

    links.push({
      id: docSnap.id,
      links: data.links,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      clickCount: clickCount,
      clicks: clicks,
    });
  }

  return links;
}
