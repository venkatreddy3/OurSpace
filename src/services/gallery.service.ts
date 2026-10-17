/**
 * Gallery storage.
 * - Real mode: photos are uploaded to Cloudinary and one Firestore document per photo is shared by the couple.
 * - Mock mode (no Firebase config): photos stay in the browser's IndexedDB, as before.
 */
import { collection, doc, addDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseMocked } from './firebase.js';
import { uploadIfLocal } from './cloudinary.service.js';

export interface GalleryItem {
  id: string;
  photoUrl: string;
  caption: string;
  date: string;
  album: string;
  createdAt: number;
  authorId?: string;
}

export type NewGalleryItem = Omit<GalleryItem, 'id' | 'createdAt' | 'authorId'> & { createdAt?: number };

const DB_NAME = 'ourspace-gallery';
const STORE = 'photos';

const isMock = () => isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const run = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
};

const newestFirst = (items: GalleryItem[]) => [...items].sort((a, b) => b.createdAt - a.createdAt);

const readAllMock = async (): Promise<GalleryItem[]> => {
  try {
    return newestFirst(await run<GalleryItem[]>('readonly', (s) => s.getAll()));
  } catch {
    return [];
  }
};

const mockListeners = new Set<(items: GalleryItem[]) => void>();
const emitMock = async () => {
  const items = await readAllMock();
  mockListeners.forEach((cb) => cb(items));
};

/** Shrink a photo so the gallery stays light (max 1600px, JPEG) */
export const shrinkImageFile = async (file: File, maxSide = 1600): Promise<string> => {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
};

export const galleryService = {
  /** Streams the couple's photos (newest first). Returns an unsubscribe function. */
  subscribe(coupleId: string, callback: (items: GalleryItem[]) => void): () => void {
    if (isMock()) {
      mockListeners.add(callback);
      void readAllMock().then(callback);
      return () => {
        mockListeners.delete(callback);
      };
    }

    const q = query(collection(db, 'gallery'), where('coupleId', '==', coupleId));
    return onSnapshot(
      q,
      (snap) => {
        const items: GalleryItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            photoUrl: data.photoUrl,
            caption: data.caption,
            date: data.date,
            album: data.album,
            createdAt: data.createdAt,
            authorId: data.authorId,
          });
        });
        callback(newestFirst(items));
      },
      (err) => console.error('Gallery listener failed:', err)
    );
  },

  /** Saves one photo. In real mode this uploads it to Cloudinary first; throws if that fails. */
  async add(item: NewGalleryItem, ctx: { coupleId: string; authorId: string }): Promise<void> {
    const createdAt = item.createdAt ?? Date.now();

    if (isMock()) {
      const id = `img-${createdAt}-${Math.random().toString(36).slice(2, 9)}`;
      await run('readwrite', (s) => s.put({ ...item, id, createdAt, authorId: ctx.authorId }));
      await emitMock();
      return;
    }

    const photoUrl = await uploadIfLocal(item.photoUrl);
    await addDoc(collection(db, 'gallery'), {
      coupleId: ctx.coupleId,
      authorId: ctx.authorId,
      photoUrl,
      caption: item.caption,
      date: item.date,
      album: item.album,
      createdAt,
    });
  },

  async remove(id: string): Promise<void> {
    try {
      if (isMock()) {
        await run('readwrite', (s) => s.delete(id));
        await emitMock();
        return;
      }
      await deleteDoc(doc(db, 'gallery', id));
    } catch (err) {
      console.warn('Could not delete photo from the gallery:', err);
    }
  },
};

export default galleryService;
