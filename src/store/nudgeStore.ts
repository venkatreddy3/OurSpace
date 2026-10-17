import { create } from 'zustand';
import type { Nudge } from '../services/nudge.service';

const STORAGE_KEY = 'ourspace-inbox';

const load = (): Nudge[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Nudge[]) : [];
  } catch {
    return [];
  }
};

const save = (inbox: Nudge[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inbox));
  } catch {
    /* storage unavailable: inbox just won't survive a reload */
  }
};

interface NudgeState {
  inbox: Nudge[];
  composerOpen: boolean;
  replyTo: Nudge | null;
  /** Text the composer starts with (e.g. today's question from the Home page) */
  prefill: string | null;
  add: (n: Nudge) => void;
  remove: (id: string) => void;
  openComposer: (replyTo?: Nudge, prefill?: string) => void;
  closeComposer: () => void;
}

/**
 * Zustand store for partner notes: the unread inbox (persisted) and the composer popup state.
 */
export const useNudgeStore = create<NudgeState>((set) => ({
  inbox: load(),
  composerOpen: false,
  replyTo: null,
  prefill: null,
  add: (n) =>
    set((s) => {
      if (s.inbox.some((x) => x.id === n.id)) return s;
      const inbox = [...s.inbox, n];
      save(inbox);
      return { inbox };
    }),
  remove: (id) =>
    set((s) => {
      const inbox = s.inbox.filter((x) => x.id !== id);
      save(inbox);
      return { inbox };
    }),
  openComposer: (replyTo, prefill) => set({ composerOpen: true, replyTo: replyTo ?? null, prefill: prefill ?? null }),
  closeComposer: () => set({ composerOpen: false, replyTo: null, prefill: null }),
}));
