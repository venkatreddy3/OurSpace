import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK using modern modular imports
const initFirebaseAdmin = () => {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized with credentials from env variables.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: applicationDefault(),
      });
      console.log('Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS file.');
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase Admin credentials missing: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
    } else {
      console.warn('WARNING: Firebase Admin credentials missing. Please define keys in server/.env.');
      initializeApp({
        projectId: 'ourspace-mock-project',
      });
    }
  } catch (error) {
    console.error('Firebase Admin Initialization error:', error);
    if (process.env.NODE_ENV === 'production') throw error;
  }
};

initFirebaseAdmin();

export const adminAuth = getAuth();
export const adminDb = getFirestore();
