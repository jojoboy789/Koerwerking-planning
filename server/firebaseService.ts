import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getFirestore, Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import {
  initializeApp as initializeAdminApp,
  getApps as getAdminApps,
  applicationDefault,
} from 'firebase-admin/app';
import {
  getFirestore as getAdminFirestore,
  Firestore as AdminFirestore,
} from 'firebase-admin/firestore';

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
let adminDb: AdminFirestore | null = null;
let isConnected = false;

export function initFirebase() {
  try {
    if (!app) {
      app = getApps().length
        ? getApps()[0]
        : initializeApp(firebaseConfig);

      db = getFirestore(app);
      isConnected = true;
      console.log('🔥 Firebase initialized successfully for project:', firebaseConfig.projectId);
    }

    if (!adminDb) {
      const adminApp = getAdminApps().length
        ? getAdminApps()[0]
        : initializeAdminApp({
            credential: applicationDefault(),
            projectId: firebaseConfig.projectId,
          });

      adminDb = getAdminFirestore(adminApp);
      console.log('🔥 Firebase Admin SDK initialized.');
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
    return snap.exists() ? snap.data() : null;
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

/**
 * Registreer en claim een geplande Telegram-run.
 * Een bestaande run met dezelfde ID wordt niet opnieuw geclaimd.
 */
export async function claimScheduledTelegramRun(runId: string): Promise<boolean> {
  if (!adminDb) {
    throw new Error('Firebase Admin Firestore is niet geïnitialiseerd.');
  }

  const runRef = adminDb.collection('scheduledTelegramRuns').doc(runId);

  return adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(runRef);

    if (existing.exists) {
      const data = existing.data();

      if (data?.status === 'sent') {
        return false;
      }

      if (data?.status === 'claimed') {
        const claimedAt = Date.parse(data?.createdAt || '');
        const claimIsRecent =
          Number.isFinite(claimedAt) &&
          Date.now() - claimedAt < 10 * 60 * 1000;

        if (claimIsRecent) {
          return false;
        }
      }

      transaction.set(runRef, {
        status: 'claimed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return true;
    }

    transaction.create(runRef, {
      status: 'claimed',
      createdAt: new Date().toISOString(),
    });

    return true;
  });
}

/**
 * Werk de status van een geplande Telegram-run bij.
 */
export async function updateScheduledTelegramRun(
  runId: string,
  status: 'sent' | 'failed',
  error?: string
): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin Firestore is niet geïnitialiseerd.');
  }

  await adminDb.collection('scheduledTelegramRuns').doc(runId).set({
    status,
    updatedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  }, { merge: true });
}