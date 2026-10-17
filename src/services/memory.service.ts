import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseMocked } from './firebase.js';
import type { Memory, CreateMemoryDto, MoodTag } from '../types/memory.js';

/** Firestore rejects fields whose value is `undefined` (e.g. a memory with no voice note), so drop them */
const withoutUndefined = <T extends object>(data: T): T =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

// ─── Local Storage Key ──────────────────────────────────────────────────────
const MOCK_MEMORIES_KEY = 'ourspace-mock-memories';

// Dummy memories that earlier versions saved into the browser; removed on load
const OLD_SEED_IDS = new Set(['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5']);

const getInitialMockMemories = (): Memory[] => {
  const cached = localStorage.getItem(MOCK_MEMORIES_KEY);
  if (!cached) return [];
  const all = JSON.parse(cached) as Memory[];
  const real = all.filter((m) => !OLD_SEED_IDS.has(m.id));
  if (real.length !== all.length) localStorage.setItem(MOCK_MEMORIES_KEY, JSON.stringify(real));
  return real;
};

// ─── Mock Listener Registry ───────────────────────────────────────────────────
let mockListeners: ((memories: Memory[]) => void)[] = [];
const triggerMockListeners = () => {
  const memories = JSON.parse(localStorage.getItem(MOCK_MEMORIES_KEY) || '[]') as Memory[];
  // Sort newest first by date
  const sorted = [...memories].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  mockListeners.forEach((cb) => cb(sorted));
};

// ─── Memory Service ───────────────────────────────────────────────────────────
export const memoryService = {
  /**
   * Subscribes to real-time memory updates for a couple.
   * Returns an unsubscribe function.
   */
  subscribeMemories(
    coupleId: string,
    callback: (memories: Memory[]) => void,
    filters?: { moodTag?: MoodTag; year?: number; month?: number }
  ): () => void {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      mockListeners.push(callback);
      let memories = getInitialMockMemories();

      // Apply filters in mock mode
      if (filters?.moodTag) {
        memories = memories.filter((m) => m.moodTag === filters.moodTag);
      }
      if (filters?.year) {
        memories = memories.filter(
          (m) => new Date(m.date).getFullYear() === filters.year
        );
      }
      if (filters?.month !== undefined) {
        memories = memories.filter(
          (m) => new Date(m.date).getMonth() + 1 === filters.month
        );
      }

      const sorted = [...memories].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      callback(sorted);

      return () => {
        mockListeners = mockListeners.filter((cb) => cb !== callback);
      };
    }

    // Build Firestore query
    const constraintsList: any[] = [where('coupleId', '==', coupleId), orderBy('date', 'desc')];

    if (filters?.moodTag) {
      constraintsList.push(where('moodTag', '==', filters.moodTag));
    }

    const q = query(collection(db, 'memories'), ...constraintsList);

    return onSnapshot(q, (snapshot) => {
      const memories: Memory[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        memories.push({
          id: docSnap.id,
          coupleId: data.coupleId,
          authorId: data.authorId,
          title: data.title,
          description: data.description,
          date: data.date,
          location: data.location,
          moodTag: data.moodTag,
          photoUrls: data.photoUrls || [],
          audioUrl: data.audioUrl,
          likes: data.likes || [],
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt,
        });
      });
      callback(memories);
    });
  },

  /**
   * Creates a new memory in Firestore (or localStorage in mock mode).
   */
  async createMemory(memoryData: CreateMemoryDto): Promise<string> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const memories = JSON.parse(localStorage.getItem(MOCK_MEMORIES_KEY) || '[]') as Memory[];
      const id = `mem-${Date.now()}`;
      const newMemory: Memory = {
        ...memoryData,
        id,
        likes: [],
        createdAt: new Date().toISOString(),
      };
      memories.unshift(newMemory);
      localStorage.setItem(MOCK_MEMORIES_KEY, JSON.stringify(memories));
      triggerMockListeners();
      return id;
    }

    const docRef = await addDoc(collection(db, 'memories'), {
      ...withoutUndefined(memoryData),
      likes: [],
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  /**
   * Toggles a user's like on a memory.
   */
  async toggleLike(memoryId: string, userId: string, currentlyLiked: boolean): Promise<void> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const memories = JSON.parse(localStorage.getItem(MOCK_MEMORIES_KEY) || '[]') as Memory[];
      const updated = memories.map((m) => {
        if (m.id !== memoryId) return m;
        const likes = currentlyLiked
          ? m.likes.filter((id) => id !== userId)
          : [...m.likes, userId];
        return { ...m, likes };
      });
      localStorage.setItem(MOCK_MEMORIES_KEY, JSON.stringify(updated));
      triggerMockListeners();
      return;
    }

    const docRef = doc(db, 'memories', memoryId);
    await updateDoc(docRef, {
      likes: currentlyLiked ? arrayRemove(userId) : arrayUnion(userId),
    });
  },

  /**
   * Deletes a memory by ID.
   */
  async deleteMemory(memoryId: string): Promise<void> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const memories = JSON.parse(localStorage.getItem(MOCK_MEMORIES_KEY) || '[]') as Memory[];
      const filtered = memories.filter((m) => m.id !== memoryId);
      localStorage.setItem(MOCK_MEMORIES_KEY, JSON.stringify(filtered));
      triggerMockListeners();
      return;
    }

    const docRef = doc(db, 'memories', memoryId);
    await deleteDoc(docRef);
  },

  /**
   * Updates a memory's content fields.
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<Omit<Memory, 'id' | 'coupleId' | 'authorId' | 'createdAt'>>
  ): Promise<void> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const memories = JSON.parse(localStorage.getItem(MOCK_MEMORIES_KEY) || '[]') as Memory[];
      const updated = memories.map((m) => (m.id === memoryId ? { ...m, ...updates } : m));
      localStorage.setItem(MOCK_MEMORIES_KEY, JSON.stringify(updated));
      triggerMockListeners();
      return;
    }

    const docRef = doc(db, 'memories', memoryId);
    await updateDoc(docRef, withoutUndefined(updates));
  },
};

export default memoryService;
