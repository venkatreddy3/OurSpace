import {
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase.js';
import api from './api.js';
import { getAuthToken } from './authToken.js';

/**
 * Profile completion and username sign-in.
 * A username login is a Firebase email/password credential on a hidden, non-deliverable address,
 * linked to the same account as Google, so either way signs into the same profile.
 * The password goes straight to Firebase; our server never sees it.
 */

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
export const MIN_AGE = 16;
export const MAX_AGE = 120;
export const MIN_PASSWORD = 8;

export type Gender = 'female' | 'male' | 'nonbinary' | 'private';

export interface ProfileDetails {
  name: string;
  gender: Gender;
  /** YYYY-MM-DD */
  dob: string;
  username: string;
  password: string;
}

const usernameEmail = (username: string) => `${username}@ourspace.invalid`;

const authed = async () => ({ headers: { Authorization: `Bearer ${await getAuthToken()}` } });

/** Whole years between a YYYY-MM-DD date and today, or null for an invalid date */
export const ageFromDob = (dob: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split('-').map(Number);
  const born = new Date(y, m - 1, d);
  if (born.getFullYear() !== y || born.getMonth() !== m - 1 || born.getDate() !== d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d)) age--;
  return age >= 0 ? age : null;
};

/** The username already linked to this Google account (from an earlier, unfinished attempt), if any */
export const linkedUsername = (user: FirebaseUser | null): string | null => {
  const provider = user?.providerData.find((p) => p.providerId === 'password');
  const match = provider?.email?.match(/^(.+)@ourspace\.invalid$/);
  return match ? match[1] : null;
};

const messageFor = (err: unknown, fallback: string): string => {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'That username is taken.';
    case 'auth/weak-password':
      return 'That password is too weak. Try a longer one.';
    case 'auth/requires-recent-login':
      return 'For your security, please sign in again and retry.';
    case 'auth/operation-not-allowed':
      return 'Username sign-in is not switched on yet. Ask the app owner to enable Email/Password in Firebase.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Wrong username or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a bit and try again.';
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.';
    default:
      return (err as Error)?.message || fallback;
  }
};

const apiMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;

export const profileService = {
  /** Resolves true when the username is free for the signed-in user */
  async checkUsername(username: string): Promise<boolean> {
    const res = await api.get('/auth/username-available', { params: { u: username }, ...(await authed()) });
    return Boolean(res.data?.available);
  },

  /** Links the password, then saves the profile on the server. Returns the saved user document. */
  async complete(details: ProfileDetails): Promise<unknown> {
    const user: FirebaseUser | null = auth?.currentUser ?? null;
    if (!user) throw new Error('Please sign in again.');

    const email = usernameEmail(details.username);
    const existing = user.providerData.find((p) => p.providerId === 'password');
    try {
      if (existing) {
        if (existing.email !== email) {
          throw new Error(`Your username was already set to "${linkedUsername(user)}". Please keep it.`);
        }
        await updatePassword(user, details.password);
      } else {
        await linkWithCredential(user, EmailAuthProvider.credential(email, details.password));
      }
    } catch (err) {
      throw new Error(messageFor(err, 'Could not set your password.'));
    }

    try {
      const { name, gender, dob, username } = details;
      const res = await api.post('/auth/complete-profile', { name, gender, dob, username }, await authed());
      return res.data.user;
    } catch (err) {
      throw new Error(apiMessage(err, 'Could not save your profile. Please try again.'));
    }
  },

  /** Signs in with a username and password; resolves with the Firebase user */
  async signInWithUsername(username: string, password: string): Promise<FirebaseUser> {
    if (!auth) throw new Error('Sign-in is not available right now.');
    try {
      const result = await signInWithEmailAndPassword(auth, usernameEmail(username.trim().toLowerCase()), password);
      return result.user;
    } catch (err) {
      throw new Error(messageFor(err, 'Could not sign you in.'));
    }
  },
};

export default profileService;
