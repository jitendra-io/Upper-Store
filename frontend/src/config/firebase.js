import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB1TidKwrvAw7KaF5Ecsq7VdBrSFEpR3ks",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "studio-9852622242-c97d3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "studio-9852622242-c97d3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "studio-9852622242-c97d3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "782131652354",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:782131652354:web:516fb166b446d400e5041b"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, googleProvider, signInWithPopup };
