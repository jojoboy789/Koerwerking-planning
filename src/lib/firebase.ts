import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCneVtJOGHwwoXhug4kqlUNo3EksQ-cFXQ",
  authDomain: "planning-koer-gbr.firebaseapp.com",
  projectId: "planning-koer-gbr",
  storageBucket: "planning-koer-gbr.firebasestorage.app",
  messagingSenderId: "509744259244",
  appId: "1:509744259244:web:ba7feb5991d0cc0526ff09"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
