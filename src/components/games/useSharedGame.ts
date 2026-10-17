import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useGameStore } from '../../store/gameStore';
import { sendGameMsg, subscribeGameMsgs } from '../../services/gameSession.service';
import { useSocketStore } from '../../store/socketStore';

/** Who is playing: names for both seats and whether *this* device may act for a seat. */
export const usePlayers = () => {
  const { user, partner } = useAuthStore();
  const role = useGameStore((s) => s.session?.role ?? null);
  const me = user?.displayName || 'You';
  const other = partner?.displayName || 'Partner';
  const names: [string, string] =
    role === null ? ['Player 1', 'Player 2'] : role === 0 ? [me, other] : [other, me];
  /** true when this device controls the given seat (always true when playing on one device) */
  const canAct = (seat: 0 | 1) => role === null || role === seat;
  return { role, names, canAct, me, other };
};

/**
 * Like useState, but when a game session is live the whole state object is mirrored to the partner.
 * Both devices end up with the same state; the latest write wins.
 */
export const useSharedState = <T,>(initial: () => T) => {
  const { user } = useAuthStore();
  const session = useGameStore((s) => s.session);
  const socket = useSocketStore((s) => s.socket); // resubscribe when the socket (re)connects
  const [state, setLocal] = useState<T>(initial);
  const ref = useRef(state);
  const gotState = useRef(false);

  const online = session?.phase === 'playing';
  const sessionId = session?.id;
  const role = session?.role ?? null;
  const uid = user?.uid ?? '';
  const name = user?.displayName || 'Partner';
  const coupleId = user?.coupleId ?? null;

  const set = useCallback(
    (u: T | ((prev: T) => T)) => {
      const next = typeof u === 'function' ? (u as (p: T) => T)(ref.current) : u;
      ref.current = next;
      setLocal(next);
      if (online && sessionId) {
        sendGameMsg({ type: 'state', sessionId, fromUid: uid, fromName: name, state: next }, coupleId);
      }
    },
    [online, sessionId, uid, name, coupleId],
  );

  useEffect(() => {
    if (!online || !sessionId) return;
    return subscribeGameMsgs(uid, (m) => {
      if (m.sessionId !== sessionId) return;
      if (m.type === 'state') {
        gotState.current = true;
        ref.current = m.state as T;
        setLocal(m.state as T);
      } else if (m.type === 'sync_request' && role === 0) {
        sendGameMsg({ type: 'state', sessionId, fromUid: uid, fromName: name, state: ref.current }, coupleId);
      }
    });
  }, [online, sessionId, uid, name, coupleId, role, socket]);

  // Host announces its starting state; joiner asks for it (retrying until it arrives)
  useEffect(() => {
    if (!online || !sessionId) return;
    if (role === 0) {
      sendGameMsg({ type: 'state', sessionId, fromUid: uid, fromName: name, state: ref.current }, coupleId);
      return;
    }
    if (role !== 1) return;
    let tries = 0;
    const ask = () => {
      if (gotState.current || tries++ > 6) return;
      sendGameMsg({ type: 'sync_request', sessionId, fromUid: uid, fromName: name }, coupleId);
    };
    ask();
    const t = setInterval(ask, 900);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, sessionId, role]);

  return [state, set] as const;
};
