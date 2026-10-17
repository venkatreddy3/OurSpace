import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore';
import { useGameStore } from '../../store/gameStore';
import { sendGameMsg, subscribeGameMsgs } from '../../services/gameSession.service';

/**
 * GameHost
 * Purpose: app-wide plumbing for playing games together.
 * - Listens for invites / answers / "partner left" on every dashboard page.
 * - Shows a popup when the partner invites you; "Join" opens the game for both of you.
 */
const GameHost: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const invite = useGameStore((s) => s.invite);

  useEffect(() => {
    if (!user) return;
    return subscribeGameMsgs(user.uid, (m) => {
      const { session, invite: pending, setInvite, patchSession } = useGameStore.getState();
      switch (m.type) {
        case 'invite':
          // Ignore invites while already in a live game
          if (session?.phase === 'playing') return;
          setInvite({ sessionId: m.sessionId, gameId: m.gameId, gameTitle: m.gameTitle, fromName: m.fromName });
          break;
        case 'cancel':
          if (pending?.sessionId === m.sessionId) setInvite(null);
          break;
        case 'accept':
          if (session?.id === m.sessionId && session.phase === 'waiting') patchSession({ phase: 'playing' });
          break;
        case 'decline':
          if (session?.id === m.sessionId && session.phase === 'waiting') patchSession({ phase: 'declined' });
          break;
        case 'leave':
          if (session?.id === m.sessionId) patchSession({ partnerLeft: true });
          break;
      }
    });
  }, [user, socket]);

  const join = () => {
    if (!invite || !user) return;
    useGameStore.getState().setSession({
      id: invite.sessionId,
      gameId: invite.gameId,
      gameTitle: invite.gameTitle,
      role: 1,
      phase: 'playing',
      partnerLeft: false,
    });
    sendGameMsg({ type: 'accept', sessionId: invite.sessionId, fromUid: user.uid, fromName: user.displayName }, user.coupleId);
    useGameStore.getState().setInvite(null);
    navigate('/games');
  };

  const decline = () => {
    if (!invite || !user) return;
    sendGameMsg({ type: 'decline', sessionId: invite.sessionId, fromUid: user.uid, fromName: user.displayName }, user.coupleId);
    useGameStore.getState().setInvite(null);
  };

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          role="alertdialog"
          aria-label="Game invite"
          className="fixed bottom-6 left-1/2 z-[95] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <div className="card-edge p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-on-surface">{invite.fromName} wants to play!</p>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  Join them for <span className="text-primary font-medium">{invite.gameTitle}</span>.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={join} className="btn-orange !py-2 flex-1 text-sm">Join game</button>
              <button onClick={decline} className="btn-outline-blue !py-2 text-sm">Not now</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameHost;
