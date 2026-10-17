import { useSocketStore } from '../store/socketStore';
import { useNudgeStore } from '../store/nudgeStore';
import { isFirebaseMocked } from './firebase.js';

/** A short text note sent from one partner to the other */
export interface Nudge {
  id: string;
  text: string;
  fromUid: string;
  fromName: string;
  ts: number;
  /** Text of the note this one replies to (shown as a quote) */
  replyToText?: string;
}

const MOCK_UID = 'dev-user-uid';
const TAB_ID = Math.random().toString(36).slice(2);

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ourspace-nudges') : null;

/**
 * Sends a note to the partner.
 * - BroadcastChannel delivers instantly to other open tabs (works without a backend, used in dev/mock mode).
 * - socket.io relays it to the partner's device through the couple room when the server is reachable.
 */
export const sendNudge = (nudge: Nudge, coupleId: string | null) => {
  channel?.postMessage({ tabId: TAB_ID, nudge });
  // Dev/mock mode: one browser plays both partners, so drop it in the shared inbox right away
  // (NudgeHost only shows notes sent by the *other* identity).
  if (isFirebaseMocked) useNudgeStore.getState().add(nudge);
  const socket = useSocketStore.getState().socket;
  if (socket?.connected && coupleId) {
    socket.emit('send_nudge', { coupleId, nudge });
  }
};

/** Listens for notes coming from the partner. Returns an unsubscribe function. */
export const subscribeNudges = (myUid: string, onNudge: (n: Nudge) => void) => {
  const onChannel = (e: MessageEvent) => {
    const { tabId, nudge } = e.data as { tabId: string; nudge: Nudge };
    if (tabId === TAB_ID) return;
    // In mock mode both "partners" share one uid, so accept anything from another tab
    if (nudge.fromUid !== myUid || myUid === MOCK_UID) onNudge(nudge);
  };
  channel?.addEventListener('message', onChannel);

  const socket = useSocketStore.getState().socket;
  const onSocket = (nudge: Nudge) => {
    if (nudge.fromUid !== myUid) onNudge(nudge);
  };
  socket?.on('nudge_received', onSocket);

  return () => {
    channel?.removeEventListener('message', onChannel);
    socket?.off('nudge_received', onSocket);
  };
};
