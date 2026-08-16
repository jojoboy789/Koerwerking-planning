import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDoc, setDoc } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCneVtJOGHwwoXhug4kqlUNo3EksQ-cFXQ",
  authDomain: "planning-koer-gbr.firebaseapp.com",
  projectId: "planning-koer-gbr",
  storageBucket: "planning-koer-gbr.firebasestorage.app",
  messagingSenderId: "509744259244",
  appId: "1:509744259244:web:ba7feb5991d0cc0526ff09"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let isConnected = false;

export function initFirebase() {
  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      isConnected = true;
      console.log('🔥 Firebase initialized successfully for project:', firebaseConfig.projectId);
    }
  } catch (err) {
    console.error('⚠️ Firebase initialization error:', err);
    isConnected = false;
  }
}

export function isFirebaseConnected(): boolean {
  return isConnected && db !== null;
}

export async function fetchRemoteDatabase(): Promise<any | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, 'system', 'database');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch from Firebase Firestore:', err);
    return null;
  }
}

export async function saveRemoteDatabase(data: any): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, 'system', 'database');
    await setDoc(docRef, {
      ...data,
      lastSyncAt: new Date().toISOString(),
      projectId: firebaseConfig.projectId
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Could not write to Firebase Firestore:', err);
    return false;
  }
}
