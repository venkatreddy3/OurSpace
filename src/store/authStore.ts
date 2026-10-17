import { create } from 'zustand';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseMocked } from '../services/firebase.js';
import api from '../services/api.js';
import { profileService, type ProfileDetails } from '../services/profile.service.js';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coupleId: string | null;
  inviteCode: string;
  username?: string;
  /** Set once name, gender, date of birth, username and password are saved */
  profileComplete?: boolean;
}

/** True when a signed-in (real) user still has to complete their profile. Mock mode skips this. */
export const needsProfile = (user: User | null): boolean =>
  !!user && !isFirebaseMocked && import.meta.env.VITE_ENABLE_MOCK_AUTH !== 'true' && !user.profileComplete;

export interface Couple {
  id: string;
  partner1Id: string;
  partner2Id: string;
  anniversaryDate: string | null;
  status: 'active' | 'pending';
}

interface AuthState {
  user: User | null;
  partner: User | null;
  couple: Couple | null;
  isAuthenticated: boolean;
  isPairingLoading: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => () => void;
  loginWithFirebaseUser: (firebaseUser: FirebaseUser) => Promise<void>;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  completeProfile: (details: ProfileDetails) => Promise<boolean>;
  loginWithMock: () => void;
  logout: () => Promise<void>;
  switchIdentity: () => void; // TEMP dev testing: swap me <-> partner
  pairWithPartner: (code: string) => Promise<boolean>;
}

/**
 * Zustand Auth Store
 * Manages Firebase Client Authentication, Google token verification callbacks,
 * and falls back to a mock auth state if VITE_ENABLE_MOCK_AUTH is set to true.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  partner: null,
  couple: null,
  isAuthenticated: false,
  isPairingLoading: false,
  isLoading: true,
  error: null,

  loginWithFirebaseUser: async (firebaseUser) => {
    try {
      set({ isLoading: true, error: null });
      const token = await firebaseUser.getIdToken();
      
      const res = await api.post('/auth/google-callback', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.data.success) {
        const meRes = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (meRes.data.success) {
          set({
            user: meRes.data.user,
            partner: meRes.data.partner,
            couple: meRes.data.couple,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      }
    } catch (err: any) {
      console.error('Handshake verification failed:', err);
      set({
        error: err.response?.data?.message || 'Verification failed on ourspace servers.',
        isLoading: false,
      });
    }
  },

  loginWithPassword: async (username, password) => {
    try {
      set({ error: null });
      const firebaseUser = await profileService.signInWithUsername(username, password);
      await get().loginWithFirebaseUser(firebaseUser);
    } catch (err: any) {
      set({ error: err.message || 'Could not sign you in.', isLoading: false });
    }
  },

  completeProfile: async (details) => {
    try {
      set({ error: null });
      await profileService.complete(details);
      const token = await auth.currentUser.getIdToken();
      const meRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (meRes.data.success) {
        set({ user: meRes.data.user, partner: meRes.data.partner, couple: meRes.data.couple, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Could not save your profile.' });
      return false;
    }
  },

  loginWithMock: () => {
    const mockData = {
      user: {
        uid: 'dev-user-uid',
        email: 'dev@ourspace.app',
        displayName: 'Dev User',
        photoURL: '',
        coupleId: 'mock-couple-123',
        inviteCode: 'DEV123',
      },
      partner: {
        uid: 'dev-partner-uid',
        email: 'partner@ourspace.app',
        displayName: 'Partner',
        photoURL: '',
        coupleId: 'mock-couple-123',
        inviteCode: 'PART456',
      },
      couple: {
        id: 'mock-couple-123',
        partner1Id: 'dev-user-uid',
        partner2Id: 'dev-partner-uid',
        anniversaryDate: '2025-09-01',
        status: 'active' as const,
      },
    };

    localStorage.setItem('ourspace-mock-session', JSON.stringify(mockData));
    set({
      user: mockData.user,
      partner: mockData.partner,
      couple: mockData.couple,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  checkAuth: () => {
    // If running in development Mock Mode
    if (isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true') {
      const cached = localStorage.getItem('ourspace-mock-session');
      if (cached) {
        const parsed = JSON.parse(cached);
        set({
          user: parsed.user,
          partner: parsed.partner,
          couple: parsed.couple,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return () => {}; // return empty unsubscribe handler
    }

    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (firebaseUser) {
        unsubscribeFirestore = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;

            if (userData.coupleId) {
              try {
                const token = await firebaseUser.getIdToken();
                const res = await api.get('/auth/me', {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                if (res.data.success) {
                  set({
                    user: res.data.user,
                    partner: res.data.partner,
                    couple: res.data.couple,
                    isAuthenticated: true,
                    isLoading: false,
                  });
                  return;
                }
              } catch (err) {
                console.error('Failed to sync updated session details:', err);
              }
            }

            set({
              user: userData,
              partner: null,
              couple: null,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        });
      } else {
        set({ user: null, partner: null, couple: null, isAuthenticated: false, isLoading: false });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  },

  logout: async () => {
    if (isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true') {
      localStorage.removeItem('ourspace-mock-session');
      set({ user: null, partner: null, couple: null, isAuthenticated: false });
      return;
    }

    try {
      await signOut(auth);
      await api.post('/auth/logout');
      set({ user: null, partner: null, couple: null, isAuthenticated: false });
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  },

  // TEMP dev testing: swaps the logged-in user and partner across the whole app.
  switchIdentity: () => {
    const { user, partner, couple } = get();
    if (!user || !partner) return;
    localStorage.setItem(
      'ourspace-mock-session',
      JSON.stringify({ user: partner, partner: user, couple }),
    );
    set({ user: partner, partner: user });
  },

  pairWithPartner: async (code) => {
    if (isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true') {
      // In mock mode, emulate pair confirmation directly
      const sessionData = {
        user: {
          uid: 'dev-user-uid',
          email: 'dev@ourspace.app',
          displayName: 'Dev User',
          photoURL: '',
          coupleId: 'mock-couple-123',
          inviteCode: 'DEV123',
        },
        partner: {
          uid: 'dev-partner-uid',
          email: 'partner@ourspace.app',
          displayName: 'Partner',
          photoURL: '',
          coupleId: 'mock-couple-123',
          inviteCode: code,
        },
        couple: {
          id: 'mock-couple-123',
          partner1Id: 'dev-user-uid',
          partner2Id: 'dev-partner-uid',
          anniversaryDate: '2025-09-01',
          status: 'active' as const,
        },
      };
      localStorage.setItem('ourspace-mock-session', JSON.stringify(sessionData));
      set({
        user: sessionData.user,
        partner: sessionData.partner,
        couple: sessionData.couple,
      });
      return true;
    }

    try {
      set({ isPairingLoading: true, error: null });
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('No active authentication session found.');

      const token = await firebaseUser.getIdToken();
      const res = await api.post('/auth/pair-partner', { inviteCode: code }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.success) {
        const meRes = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (meRes.data.success) {
          set({
            user: meRes.data.user,
            partner: meRes.data.partner,
            couple: meRes.data.couple,
            isPairingLoading: false,
          });
          return true;
        }
      }
      set({ isPairingLoading: false });
      return false;
    } catch (err: any) {
      console.error('Pairing process failed:', err);
      set({
        error: err.response?.data?.message || 'Failed to link accounts.',
        isPairingLoading: false,
      });
      return false;
    }
  },
}));
