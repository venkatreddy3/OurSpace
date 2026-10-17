import { create } from 'zustand';

export type Phase = 'choose' | 'waiting' | 'playing' | 'declined' | 'local';

export interface GameSession {
  id: string;
  gameId: string;
  gameTitle: string;
  /** 0 = the one who sent the invite, 1 = the one who joined, null = both on this device */
  role: 0 | 1 | null;
  phase: Phase;
  partnerLeft: boolean;
}

export interface IncomingInvite {
  sessionId: string;
  gameId: string;
  gameTitle: string;
  fromName: string;
}

interface GameState {
  session: GameSession | null;
  invite: IncomingInvite | null;
  setSession: (s: GameSession | null) => void;
  patchSession: (p: Partial<GameSession>) => void;
  setInvite: (i: IncomingInvite | null) => void;
}

export const newSessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Zustand store for the current shared game session and any invite waiting for an answer */
export const useGameStore = create<GameState>((set) => ({
  session: null,
  invite: null,
  setSession: (session) => set({ session }),
  patchSession: (p) => set((s) => (s.session ? { session: { ...s.session, ...p } } : s)),
  setInvite: (invite) => set({ invite }),
}));
