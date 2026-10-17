import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: any = null;
let auth: any = null;
let googleProvider: any = null;
let db: any = null;
let isFirebaseMocked = false;

// Attempt Firebase initialization; fallback to mock mode if config is missing
try {
  const isMockExplicit = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
  const hasMissingKeys = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'mock-api-key';

  if (isMockExplicit || hasMissingKeys) {
    throw new Error('Config missing or VITE_ENABLE_MOCK_AUTH explicitly enabled.');
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  db = getFirestore(app);
  console.log('Firebase client SDK initialized successfully.');
} catch (error) {
  console.warn('Firebase Auth/Firestore not initialized. Running in local Dev Mock Mode:', error);
  isFirebaseMocked = true;
}

export { auth, googleProvider, db, isFirebaseMocked };
export default app;
