import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseMocked } from './firebase.js';

/** A watchlist / place / bookmark recommendation shared between the couple */
export interface RecItem {
  id: string;
  coupleId: string;
  /** Who recommended it */
  authorId: string;
  authorName: string;
  category: 'watchlist' | 'places' | 'general';
  title: string;
  desc: string;
  meta: string;
  /** Poster / photo (URL or small data URL) */
  cover?: string;
  /** 1–5, given by the partner after watching / visiting / trying it */
  rating?: number;
  ratedAt?: string;
  createdAt: string;
}

export type NewRec = Omit<RecItem, 'id' | 'createdAt' | 'rating' | 'ratedAt'>;

const KEY = 'ourspace-mock-recs';
const isMock = () => isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

const sortRecs = (items: RecItem[]) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const readMock = (): RecItem[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as RecItem[];
  } catch {
    return [];
  }
};

let listeners: ((items: RecItem[]) => void)[] = [];

const writeMock = (items: RecItem[]) => {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((cb) => cb(sortRecs(items)));
};

export const recsService = {
  subscribe(coupleId: string, callback: (items: RecItem[]) => void): () => void {
    if (isMock()) {
      listeners.push(callback);
      callback(sortRecs(readMock()));
      // keeps a second browser tab in sync (acts as the "partner" in dev mode)
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) callback(sortRecs(readMock()));
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners = listeners.filter((cb) => cb !== callback);
        window.removeEventListener('storage', onStorage);
      };
    }

    const q = query(collection(db, 'recommendations'), where('coupleId', '==', coupleId));
    return onSnapshot(q, (snap) => {
      const items: RecItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          ...(data as Omit<RecItem, 'id' | 'createdAt'>),
          id: d.id,
          createdAt:
            typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      });
      callback(sortRecs(items));
    });
  },

  async add(item: NewRec): Promise<void> {
    const clean = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined)) as NewRec;
    if (isMock()) {
      writeMock([{ ...clean, id: `rec-${Date.now()}`, createdAt: new Date().toISOString() }, ...readMock()]);
      return;
    }
    await addDoc(collection(db, 'recommendations'), { ...clean, createdAt: new Date().toISOString() });
  },

  async rate(id: string, rating: number): Promise<void> {
    const patch = { rating, ratedAt: new Date().toISOString() };
    if (isMock()) {
      writeMock(readMock().map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return;
    }
    await updateDoc(doc(db, 'recommendations', id), patch);
  },

  async remove(id: string): Promise<void> {
    if (isMock()) {
      writeMock(readMock().filter((r) => r.id !== id));
      return;
    }
    await deleteDoc(doc(db, 'recommendations', id));
  },
};

export default recsService;
