import { io, Socket } from 'socket.io-client';
import { useSocketStore } from '../store/socketStore';
import { getAuthToken } from './authToken.js';

let socketInstance: Socket | null = null;

/**
 * Socket Client Helper
 * Purpose:
 * - Initiates socket connection.
 * - Handles connect, disconnect, and connect_error event updates.
 */
export const initSocket = (): Socket => {
  if (socketInstance) return socketInstance;

  // Uses Vite proxies to connect back to Express Socket.io server
  socketInstance = io('/', {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    // Evaluated on every (re)connect, so an expired token is replaced with a fresh one
    auth: (cb) => {
      void getAuthToken().then((token) => cb({ token }));
    },
  });

  const { setSocket, setConnected } = useSocketStore.getState();
  setSocket(socketInstance);

  socketInstance.on('connect', () => {
    console.log('WebSocket Client Connected!');
    setConnected(true);
  });

  socketInstance.on('disconnect', () => {
    console.log('WebSocket Client Disconnected!');
    setConnected(false);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('WebSocket Client Connection Error:', error);
    setConnected(false);
  });

  socketInstance.connect();
  return socketInstance;
};

export const disconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance = null;
  const { setSocket, setConnected } = useSocketStore.getState();
  setSocket(null);
  setConnected(false);
};
