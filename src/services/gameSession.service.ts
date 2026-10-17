import { useSocketStore } from '../store/socketStore';
import { isFirebaseMocked } from './firebase.js';

/** Messages exchanged between the two partners while inviting and playing */
export type GameMsg =
  | { type: 'invite'; sessionId: string; gameId: string; gameTitle: string; fromUid: string; fromName: string }
  | { type: 'accept' | 'decline' | 'cancel' | 'leave' | 'sync_request'; sessionId: string; fromUid: string; fromName: string }
  | { type: 'state'; sessionId: string; fromUid: string; fromName: string; state: unknown };

const TAB_ID = Math.random().toString(36).slice(2);

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ourspace-games') : null;

/**
 * Sends a game message to the partner.
 * - BroadcastChannel reaches other open tabs instantly (dev/mock mode, no backend needed).
 * - socket.io relays it through the couple room to the partner's device.
 */
export const sendGameMsg = (msg: GameMsg, coupleId: string | null) => {
  channel?.postMessage({ tabId: TAB_ID, msg });
  const socket = useSocketStore.getState().socket;
  if (socket?.connected && coupleId) socket.emit('game_msg', { coupleId, msg });
};

/** Listens for game messages from the partner. Returns an unsubscribe function. */
export const subscribeGameMsgs = (myUid: string, onMsg: (m: GameMsg) => void) => {
  const onChannel = (e: MessageEvent) => {
    const { tabId, msg } = e.data as { tabId: string; msg: GameMsg };
    if (tabId === TAB_ID) return;
    // In mock mode two tabs can share one uid, so accept anything from another tab
    if (msg.fromUid !== myUid || isFirebaseMocked) onMsg(msg);
  };
  channel?.addEventListener('message', onChannel);

  const socket = useSocketStore.getState().socket;
  const onSocket = (msg: GameMsg) => {
    if (msg.fromUid !== myUid) onMsg(msg);
  };
  socket?.on('game_msg_received', onSocket);

  return () => {
    channel?.removeEventListener('message', onChannel);
    socket?.off('game_msg_received', onSocket);
  };
};
