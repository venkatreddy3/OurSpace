import { useAuthStore } from '../../store/authStore.js';

// Identity comes straight from the auth store (which can be swapped in dev via switchIdentity).
export const useIdentity = () => {
  const { user, partner, switchIdentity } = useAuthStore();

  const me = { uid: user?.uid || 'dev-user-uid', name: user?.displayName || 'You' };
  const otherName = partner?.displayName || 'your partner';

  return { me, otherName, toggle: switchIdentity, coupleId: user?.coupleId || 'mock-couple-123' };
};
