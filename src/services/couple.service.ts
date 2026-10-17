import { doc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseMocked } from './firebase.js';
import { useAuthStore } from '../store/authStore.js';

/**
 * Couple-level settings. For now that is the date the couple got together ("together since"),
 * which the Love Clock and the Home counter count from. Until it is set, those show zero.
 */

const isMock = () => isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
const MOCK_SESSION_KEY = 'ourspace-mock-session';
const EARLIEST_YEAR = 1950;

/** Today as YYYY-MM-DD in the local time zone (what a date input's max expects) */
export const todayLocalIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Returns a message when the date can't be used, or null when it's fine */
export const validateAnniversary = (date: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Please pick a date.';
  const [y, m, d] = date.split('-').map(Number);
  const real = new Date(y, m - 1, d);
  if (real.getFullYear() !== y || real.getMonth() !== m - 1 || real.getDate() !== d) return 'That date doesn’t exist.';
  if (y < EARLIEST_YEAR) return `Please pick a date after ${EARLIEST_YEAR}.`;
  if (date > todayLocalIso()) return 'The date can’t be in the future.';
  return null;
};

export const coupleService = {
  /** Saves the "together since" date for the signed-in user's couple. Both partners see it. */
  async setAnniversary(date: string): Promise<void> {
    const problem = validateAnniversary(date);
    if (problem) throw new Error(problem);

    const { couple } = useAuthStore.getState();
    if (!couple) throw new Error('Pair with your partner first.');

    if (isMock()) {
      try {
        const cached = localStorage.getItem(MOCK_SESSION_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.couple = { ...parsed.couple, anniversaryDate: date };
          localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(parsed));
        }
      } catch {
        /* storage unavailable: the in-memory update below still works */
      }
    } else {
      await updateDoc(doc(db, 'couples', couple.id), { anniversaryDate: date });
    }

    useAuthStore.setState({ couple: { ...couple, anniversaryDate: date } });
  },
};

export default coupleService;
