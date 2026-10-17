import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseMocked } from './firebase.js';

export interface PinItem {
  id: string;
  coupleId: string;
  authorId: string;
  type: 'note' | 'photo';
  title: string;
  content: string;
  photoUrl?: string;
  color: string;
  x: number;
  y: number;
  zIndex: number;
  width?: number;
  height?: number;
}

// LocalStorage key for developer bypass mode
const MOCK_PINS_KEY = 'ourspace-mock-pins';

const getInitialMockPins = (): PinItem[] => {
  const defaultPins: PinItem[] = [
    {
      id: 'mock-1',
      coupleId: 'mock-couple-123',
      authorId: 'dev-user-uid',
      type: 'note',
      title: 'Groceries 🛒',
      content: 'Grab sourdough bread, avocados, eggs, and coffee beans.',
      color: 'pastel-yellow',
      x: 100,
      y: 120,
      zIndex: 1,
    },
    {
      id: 'mock-2',
      coupleId: 'mock-couple-123',
      authorId: 'dev-partner-uid',
      type: 'note',
      title: 'Love Note ❤️',
      content: 'Have a wonderful day! So proud of you.',
      color: 'neon-pink',
      x: 480,
      y: 80,
      zIndex: 2,
    },
  ];
  const cached = localStorage.getItem(MOCK_PINS_KEY);
  if (!cached) {
    localStorage.setItem(MOCK_PINS_KEY, JSON.stringify(defaultPins));
    return defaultPins;
  }
  return JSON.parse(cached);
};

// Mock listeners tracking
let mockListeners: ((pins: PinItem[]) => void)[] = [];
const triggerMockListeners = () => {
  const pins = JSON.parse(localStorage.getItem(MOCK_PINS_KEY) || '[]');
  mockListeners.forEach((cb) => cb(pins));
};

export const pinboardService = {
  /**
   * Subscribes to real-time updates for a couple's pinboard.
   */
  subscribePins(coupleId: string, callback: (pins: PinItem[]) => void): () => void {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      mockListeners.push(callback);
      // Send initial data immediately
      callback(getInitialMockPins());

      return () => {
        mockListeners = mockListeners.filter((cb) => cb !== callback);
      };
    }

    // Firestore listener query
    const q = query(collection(db, 'pinboard'), where('coupleId', '==', coupleId));
    
    return onSnapshot(q, (snapshot) => {
      const pins: PinItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        pins.push({
          id: docSnap.id,
          coupleId: data.coupleId,
          authorId: data.authorId,
          type: data.type,
          title: data.title,
          content: data.content,
          photoUrl: data.photoUrl,
          color: data.color,
          x: data.x,
          y: data.y,
          zIndex: data.zIndex || 1,
        });
      });
      callback(pins);
    });
  },

  /**
   * Adds a new pin (StickyNote or PhotoPin).
   */
  async createPin(pinData: Omit<PinItem, 'id'>): Promise<string> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const pins = JSON.parse(localStorage.getItem(MOCK_PINS_KEY) || '[]');
      const id = `mock-pin-${Date.now()}`;
      const newPin = { ...pinData, id };
      pins.push(newPin);
      localStorage.setItem(MOCK_PINS_KEY, JSON.stringify(pins));
      triggerMockListeners();
      return id;
    }

    const docRef = await addDoc(collection(db, 'pinboard'), {
      ...pinData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  /**
   * Updates coordinates of a pin during drags.
   */
  async updatePinPosition(pinId: string, x: number, y: number, zIndex: number): Promise<void> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const pins = JSON.parse(localStorage.getItem(MOCK_PINS_KEY) || '[]') as PinItem[];
      const updated = pins.map((p) => (p.id === pinId ? { ...p, x, y, zIndex } : p));
      localStorage.setItem(MOCK_PINS_KEY, JSON.stringify(updated));
      triggerMockListeners();
      return;
    }

    const docRef = doc(db, 'pinboard', pinId);
    await updateDoc(docRef, { x, y, zIndex, updatedAt: new Date() });
  },

  /**
   * Edits the title and content of a pin.
   */
  async updatePinContent(pinId: string, title: string, content: string, color?: string): Promise<void> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const pins = JSON.parse(localStorage.getItem(MOCK_PINS_KEY) || '[]') as PinItem[];
      const updated = pins.map((p) => {
        if (p.id === pinId) {
          return {
            ...p,
            title,
            content,
            color: color || p.color,
          };
        }
        return p;
      });
      localStorage.setItem(MOCK_PINS_KEY, JSON.stringify(updated));
      triggerMockListeners();
      return;
    }

    const docRef = doc(db, 'pinboard', pinId);
    const updateData: any = { title, content, updatedAt: new Date() };
    if (color) updateData.color = color;
    
    await updateDoc(docRef, updateData);
  },

  /**
   * Updates the width and height of a pin after resize.
   */
  async updatePinSize(pinId: string, width: number, height: number): Promise<void> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const pins = JSON.parse(localStorage.getItem(MOCK_PINS_KEY) || '[]') as PinItem[];
      const updated = pins.map((p) => (p.id === pinId ? { ...p, width, height } : p));
      localStorage.setItem(MOCK_PINS_KEY, JSON.stringify(updated));
      triggerMockListeners();
      return;
    }

    const docRef = doc(db, 'pinboard', pinId);
    await updateDoc(docRef, { width, height, updatedAt: new Date() });
  },

  /**
   * Deletes a pin.
   */
  async deletePin(pinId: string): Promise<void> {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

    if (isMock) {
      const pins = JSON.parse(localStorage.getItem(MOCK_PINS_KEY) || '[]') as PinItem[];
      const filtered = pins.filter((p) => p.id !== pinId);
      localStorage.setItem(MOCK_PINS_KEY, JSON.stringify(filtered));
      triggerMockListeners();
      return;
    }

    const docRef = doc(db, 'pinboard', pinId);
    await deleteDoc(docRef);
  },
};
export default pinboardService;
