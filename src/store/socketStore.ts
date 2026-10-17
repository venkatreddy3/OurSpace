import { create } from 'zustand';
import { Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  setSocket: (socket: Socket | null) => void;
  setConnected: (status: boolean) => void;
}

/**
 * Zustand Socket Store
 * Purpose:
 * - Tracks status of WebSocket connections.
 * - Stores live socket.io-client instance.
 */
export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  isConnected: false,
  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),
}));
