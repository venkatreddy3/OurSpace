import { auth, isFirebaseMocked } from './firebase.js';

/** Fresh Firebase ID token for calls the backend must authenticate (the dev token in mock mode). */
export const getAuthToken = async (): Promise<string> => {
  if (isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true') return 'mock-dev-token';
  return (await auth?.currentUser?.getIdToken()) ?? '';
};
