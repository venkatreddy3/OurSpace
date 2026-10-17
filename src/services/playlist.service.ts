import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseMocked } from './firebase.js';

export interface PlaylistSong {
  id: string;
  coupleId: string;
  /** Who recommended it */
  authorId: string;
  authorName: string;
  title: string;
  artist: string;
  artwork?: string;
  previewUrl?: string;
  /** Apple Music page for the track */
  link?: string;
  /** Personal note, e.g. "This song reminds me of you" */
  message?: string;
  /** 1–5, given by the partner after listening */
  rating?: number;
  ratedAt?: string;
  createdAt: string;
}

export type NewSong = Omit<PlaylistSong, 'id' | 'createdAt' | 'rating' | 'ratedAt'>;

const KEY = 'ourspace-mock-playlist';
const isMock = () => isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

const sortSongs = (songs: PlaylistSong[]) =>
  [...songs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const readMock = (): PlaylistSong[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as PlaylistSong[];
  } catch {
    return [];
  }
};

let listeners: ((songs: PlaylistSong[]) => void)[] = [];

const writeMock = (songs: PlaylistSong[]) => {
  localStorage.setItem(KEY, JSON.stringify(songs));
  listeners.forEach((cb) => cb(sortSongs(songs)));
};

export const playlistService = {
  subscribe(coupleId: string, callback: (songs: PlaylistSong[]) => void): () => void {
    if (isMock()) {
      listeners.push(callback);
      callback(sortSongs(readMock()));
      // keeps a second browser tab in sync (acts as the "partner" in dev mode)
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) callback(sortSongs(readMock()));
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners = listeners.filter((cb) => cb !== callback);
        window.removeEventListener('storage', onStorage);
      };
    }

    const q = query(collection(db, 'playlist'), where('coupleId', '==', coupleId));
    return onSnapshot(q, (snap) => {
      const songs: PlaylistSong[] = [];
      snap.forEach((d) => {
        const data = d.data();
        songs.push({
          ...(data as Omit<PlaylistSong, 'id' | 'createdAt'>),
          id: d.id,
          createdAt:
            typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      });
      callback(sortSongs(songs));
    });
  },

  async add(song: NewSong): Promise<void> {
    const clean = Object.fromEntries(Object.entries(song).filter(([, v]) => v !== undefined)) as NewSong;
    if (isMock()) {
      writeMock([{ ...clean, id: `song-${Date.now()}`, createdAt: new Date().toISOString() }, ...readMock()]);
      return;
    }
    await addDoc(collection(db, 'playlist'), { ...clean, createdAt: new Date().toISOString() });
  },

  async rate(id: string, rating: number): Promise<void> {
    const patch = { rating, ratedAt: new Date().toISOString() };
    if (isMock()) {
      writeMock(readMock().map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return;
    }
    await updateDoc(doc(db, 'playlist', id), patch);
  },

  async remove(id: string): Promise<void> {
    if (isMock()) {
      writeMock(readMock().filter((s) => s.id !== id));
      return;
    }
    await deleteDoc(doc(db, 'playlist', id));
  },
};

export default playlistService;
