import { useEffect } from 'react';
import { useSocketStore } from '../store/socketStore';

/**
 * useSocketEvent Hook
 * Purpose:
 * - Simplifies listening to real-time events.
 * - Subscribes on mount and automatically unsubscribes/cleans up on unmount.
 *
 * @param eventName Name of the event to listen to.
 * @param callback Function triggered when event fires.
 */
export const useSocketEvent = (eventName: string, callback: (...args: any[]) => void) => {
  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [socket, eventName, callback]);
};

export default useSocketEvent;
