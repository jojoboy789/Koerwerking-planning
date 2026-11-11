
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import crypto from 'crypto';
import { getFirestore, Firestore, doc, getDoc, setDoc } from 'firebase/firestore';

import {
  initializeApp as initializeAdminApp,
  getApps as getAdminApps,
  applicationDefault,
  cert,
} from 'firebase-admin/app';

import { getStorage as getAdminStorage } from 'firebase-admin/storage';

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
let adminBucket: ReturnType<ReturnType<typeof getAdminStorage>['bucket']> | null = null;
let isConnected = false;

/**
 * Haal Google-inloggegevens op.
 *
 * Voorkeur:
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON
 * 2. GOOGLE_APPLICATION_CREDENTIALS
 * 3. Google Cloud Application Default Credentials
 */
function getAdminCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);

      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Serviceaccount mist verplichte gegevens.');
      }

      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

      console.log('🔐 Firebase gebruikt serviceaccount uit omgevingsvariabele.');

      return cert(serviceAccount);
    } catch (error) {
      console.error('❌ Ongeldige FIREBASE_SERVICE_ACCOUNT_JSON:', error);
      throw error;
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('🔐 Firebase gebruikt GOOGLE_APPLICATION_CREDENTIALS.');
  } else {
    console.log('🔐 Firebase probeert Google Application Default Credentials.');
  }

  return applicationDefault();
}

export function initFirebase() {
  try {
    if (!app) {
      app = getApps().length
        ? getApps()[0]
        : initializeApp(firebaseConfig);

      db = getFirestore(app);
      isConnected = true;

      console.log(
        '🔥 Firebase initialized successfully for project:',
        firebaseConfig.projectId
      );
    }

    if (!adminDb) {
      const adminApp = getAdminApps().length
        ? getAdminApps()[0]
        : initializeAdminApp({
            credential: getAdminCredential(),
            projectId: firebaseConfig.projectId,
          });

      adminDb = getAdminFirestore(adminApp);

      adminBucket = getAdminStorage(adminApp).bucket(
        firebaseConfig.storageBucket
      );

      console.log('🔥 Firebase Admin SDK initialized.');
      console.log('🔥 Firebase Storage bucket initialized.');
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

    await setDoc(
      docRef,
      {
        ...data,
        lastSyncAt: new Date().toISOString(),
        projectId: firebaseConfig.projectId
      },
      { merge: true }
    );

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
export async function claimScheduledTelegramRun(
  runId: string
): Promise<boolean> {
  if (!adminDb) {
    throw new Error('Firebase Admin Firestore is niet geïnitialiseerd.');
  }

  const runRef = adminDb.collection('scheduledTelegramRuns').doc(runId);

  return adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(runRef);

    if (existing.exists) {
      const data = existing.data();

      // Een expliciete blokkering mag nooit door een nieuwe claim worden overschreven.
      if (data?.status === 'sent' || data?.status === 'sent') {
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

  await adminDb
    .collection('scheduledTelegramRuns')
    .doc(runId)
    .set(
      {
        status,
        updatedAt: new Date().toISOString(),
        ...(error ? { error } : {}),
      },
      { merge: true }
    );
}



export type TelegramScheduledTime = '04:50' | '12:30' | '21:00';

export interface TelegramBlockedRun {
  id: string;
  date: string;
  time: TelegramScheduledTime;
  status: 'sent';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const TELEGRAM_SCHEDULED_TIMES = new Set<TelegramScheduledTime>(['04:50', '12:30', '21:00']);

function getTelegramRunId(date: string, time: TelegramScheduledTime): string {
  return `${date}-${time.replace(':', '-')}`;
}

function isValidCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function getBelgianLocalDateTimeKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}-${values.hour}-${values.minute}`;
}

export async function addBlockedTelegramRun(
  date: string,
  time: TelegramScheduledTime,
  createdBy: string
): Promise<void> {
  if (!adminDb) throw new Error('Firebase Admin Firestore is niet geïnitialiseerd.');
  if (!isValidCalendarDate(date) || !TELEGRAM_SCHEDULED_TIMES.has(time)) {
    throw new Error('Kies een geldige datum en een geldig verzendmoment.');
  }

  const targetLocalKey = `${date}-${time.replace(':', '-')}`;
  if (targetLocalKey <= getBelgianLocalDateTimeKey(new Date())) {
    throw new Error('Dit verzendmoment is al voorbij. Kies een toekomstig moment.');
  }

  const runRef = adminDb.collection('scheduledTelegramRuns').doc(getTelegramRunId(date, time));
  const now = new Date().toISOString();

  await adminDb.runTransaction(async transaction => {
    const existing = await transaction.get(runRef);
    const status = existing.data()?.status;
    if (status === 'sent') throw new Error('Dit verzendmoment is al verstuurd en kan niet meer worden geblokkeerd.');
    if (status === 'claimed') throw new Error('De verzending is al gestart. Blokkeren is niet meer mogelijk.');
    if (status === 'sent') throw new Error('Dit verzendmoment is al geblokkeerd.');

    transaction.set(runRef, {
      status: 'sent',
      createdAt: now,
      updatedAt: now,
      createdBy: createdBy.slice(0, 120),
    });
  });
}

export async function listBlockedTelegramRuns(): Promise<TelegramBlockedRun[]> {
  if (!adminDb) throw new Error('Firebase Admin Firestore is niet geïnitialiseerd.');
  const snapshot = await adminDb.collection('scheduledTelegramRuns')
    .where('createdBy', '==', 'BOT')
    .get();

  return snapshot.docs.flatMap(document => {
    const match = /^(\d{4}-\d{2}-\d{2})-(04-50|12-30|21-00)$/.exec(document.id);
    if (!match) return [];
    const data = document.data();
    return [{
      id: document.id,
      date: match[1],
      time: match[2].replace('-', ':') as TelegramScheduledTime,
      status: 'sent' as const,
      createdAt: String(data.createdAt || ''),
      updatedAt: String(data.updatedAt || ''),
      createdBy: String(data.createdBy || 'Admin'),
    }];
  }).sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`));
}

export async function deleteBlockedTelegramRun(runId: string): Promise<void> {
  if (!adminDb) throw new Error('Firebase Admin Firestore is niet geïnitialiseerd.');
  const match = /^(\d{4}-\d{2}-\d{2})-(04-50|12-30|21-00)$/.exec(runId);
  if (!match || !isValidCalendarDate(match[1])) throw new Error('Ongeldig verzendmoment.');

  const targetLocalKey = `${match[1]}-${match[2]}`;
  if (targetLocalKey <= getBelgianLocalDateTimeKey(new Date())) {
    throw new Error('Een blokkering kan niet meer worden verwijderd zodra het verzendmoment bereikt is.');
  }

  const runRef = adminDb.collection('scheduledTelegramRuns').doc(runId);
  await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(runRef);
    if (!snapshot.exists || snapshot.data()?.status !== 'sent') {
      throw new Error('Deze blokkering bestaat niet meer.');
    }
    if (targetLocalKey <= getBelgianLocalDateTimeKey(new Date())) {
      throw new Error('Het verzendmoment is intussen bereikt.');
    }
    transaction.delete(runRef);
  });
}


/**
 * Upload de actuele OC Dagplanning als downloadbare PDF.
 *
 * De Firebase download-token maakt de link deelbaar
 * zonder publieke Storage-regels in te schakelen.
 */
export async function uploadPublicOCPlanningPdf(
  pdf: Buffer
): Promise<string> {
  if (!adminBucket) {
    throw new Error('Firebase Storage is niet geïnitialiseerd.');
  }

  const objectPath = `telegram/oc-dagplanning-${Date.now()}.pdf`;
  const downloadToken = crypto.randomUUID();

  const file = adminBucket.file(objectPath);

  await file.save(pdf, {
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=60, must-revalidate',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const encodedPath = encodeURIComponent(objectPath);

  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}
