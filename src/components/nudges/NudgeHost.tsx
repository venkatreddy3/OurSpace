import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore';
import { useNudgeStore } from '../../store/nudgeStore';
import { sendNudge, subscribeNudges, type Nudge } from '../../services/nudge.service';

const MAX_LENGTH = 200;
const NOTE_COLORS = ['#FFF1A8', '#FFD3E4', '#C9EFD6', '#DCD3FF'];
const SCRIPT_FONT = { fontFamily: "'Dancing Script', cursive", fontWeight: 600 } as const;

/** Deterministic pseudo-random 0..1 from a string + salt, so a note keeps its spot across re-renders */
const rand = (seed: string, salt: number) => {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
};

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

// ─── Composer: write a note to your partner ───────────────────────────────────
const NudgeComposer: React.FC = () => {
  const { composerOpen, replyTo, closeComposer, remove } = useNudgeStore();
  const { user, partner } = useAuthStore();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (composerOpen) { setText(''); setSent(false); }
  }, [composerOpen]);

  useEffect(() => {
    if (!composerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeComposer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composerOpen, closeComposer]);

  const submit = () => {
    const body = text.trim();
    if (!body || sent || !user) return;
    sendNudge(
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: body,
        fromUid: user.uid,
        fromName: user.displayName || 'Your partner',
        ts: Date.now(),
        replyToText: replyTo?.text,
      },
      user.coupleId
    );
    if (replyTo) remove(replyTo.id);
    setSent(true);
    setTimeout(closeComposer, 1300);
  };

  const partnerName = partner?.displayName || 'your partner';

  return (
    <AnimatePresence>
      {composerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeComposer}
          />
          <motion.div
            role="dialog"
            aria-label="Send a note"
            className="relative w-full max-w-md rounded-3xl bg-[#FFF7F3] p-6 sm:p-7 text-[#4A1D2B]"
            style={{ border: '2px solid #4A1D2B', boxShadow: '8px 8px 0 #FF8FA3' }}
            initial={{ opacity: 0, y: 90, rotate: -7, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, rotate: -1.2, scale: 1 }}
            exit={sent ? { opacity: 0, y: -240, rotate: 10, scale: 0.4 } : { opacity: 0, y: 60, rotate: 5, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            {sent ? (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <motion.div
                  initial={{ x: -30, y: 30, rotate: -30, opacity: 0 }}
                  animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                >
                  <Icon name="send" className="text-[#F43F5E] text-6xl" />
                </motion.div>
                <p className="font-display text-2xl">On its way!</p>
                <p className="text-sm text-[#4A1D2B]/70">{partnerName} will see it right away.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl leading-tight">{replyTo ? 'Write back' : 'Send a note'}</p>
                    <p className="text-sm text-[#4A1D2B]/70 mt-1">
                      It pops up on {partnerName}&rsquo;s home screen.
                    </p>
                  </div>
                  <button
                    onClick={closeComposer}
                    className="w-9 h-9 shrink-0 rounded-full border-2 border-[#4A1D2B] flex items-center justify-center hover:bg-[#4A1D2B]/10 transition-colors"
                    aria-label="Close"
                  >
                    <Icon name="close" className="text-xl" />
                  </button>
                </div>

                {replyTo && (
                  <div className="mt-4 rounded-xl border-l-4 border-[#F43F5E] bg-[#F3E7D3] px-3 py-2 text-sm text-[#4A1D2B]/80">
                    <span className="block text-[10px] uppercase tracking-[0.18em] mb-0.5">Replying to</span>
                    <span className="line-clamp-2">{replyTo.text}</span>
                  </div>
                )}

                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                  placeholder="Thinking of you…"
                  rows={4}
                  className="mt-4 w-full resize-none rounded-2xl border-2 border-[#D8CCB8] bg-white px-4 py-3 text-xl text-[#4A1D2B] placeholder:text-[#4A1D2B]/45! outline-none focus:border-[#F43F5E] transition-colors"
                  style={SCRIPT_FONT}
                />

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs tabular-nums text-[#4A1D2B]/60">{text.length}/{MAX_LENGTH}</span>
                  <motion.button
                    onClick={submit}
                    disabled={!text.trim()}
                    whileHover={text.trim() ? { scale: 1.05, rotate: -1.5 } : undefined}
                    whileTap={text.trim() ? { scale: 0.94 } : undefined}
                    className="flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-sm transition-colors disabled:cursor-not-allowed"
                    style={{
                      background: text.trim() ? '#F43F5E' : '#E7DCC8',
                      color: text.trim() ? '#FFFFFF' : 'rgba(42,35,48,0.5)',
                      border: '2px solid #4A1D2B',
                    }}
                  >
                    Send <Icon name="send" className="text-lg" />
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─── Incoming note: a sticky note that drops onto the home screen ─────────────
const StickyPopup: React.FC<{ nudge: Nudge; index: number }> = ({ nudge, index }) => {
  const { remove, openComposer } = useNudgeStore();
  const place = useMemo(() => {
    const color = NOTE_COLORS[Math.floor(rand(nudge.id, 1) * NOTE_COLORS.length)];
    return {
      color,
      x: 6 + rand(nudge.id, 2) * 58, // vw
      y: 20 + rand(nudge.id, 3) * 42, // vh
      rot: (rand(nudge.id, 4) - 0.5) * 12,
      delay: rand(nudge.id, 5) * 0.5 + index * 0.12,
    };
  }, [nudge.id, index]);

  return (
    <motion.div
      layout
      className="fixed z-[60] w-[250px] sm:w-[280px]"
      style={{ left: `clamp(8px, ${place.x}vw, calc(100vw - 268px))`, top: `${place.y}vh` }}
      initial={{ y: -420, opacity: 0, rotate: place.rot * 3, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, rotate: place.rot, scale: 1 }}
      exit={{ scale: 0, rotate: place.rot + 25, opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 170, damping: 11, delay: place.delay }}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.2 + rand(nudge.id, 6) * 2, repeat: Infinity, ease: 'easeInOut', delay: place.delay + 1 }}
        className="relative rounded-md px-5 pt-7 pb-4 text-[#4A1D2B]"
        style={{ background: place.color, border: '2px solid #4A1D2B', boxShadow: '6px 6px 0 rgba(42,35,48,0.9)' }}
      >
        {/* Tape strip */}
        <span
          className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg]"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(42,35,48,0.25)' }}
        />
        <p className="text-[10px] uppercase tracking-[0.18em] opacity-70">From {nudge.fromName}</p>

        {nudge.replyToText && (
          <p className="mt-2 border-l-2 border-[#4A1D2B]/40 pl-2 text-xs opacity-70 line-clamp-2">{nudge.replyToText}</p>
        )}

        <p className="mt-2 text-2xl leading-snug break-words" style={SCRIPT_FONT}>
          {nudge.text}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => openComposer(nudge)}
            className="flex items-center gap-1 rounded-full bg-[#4A1D2B] px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            <Icon name="reply" className="text-base" /> Reply
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => remove(nudge.id)}
            className="flex items-center gap-1 rounded-full border-2 border-[#4A1D2B] px-3 py-1 text-xs font-semibold"
          >
            <Icon name="delete" className="text-base" /> Remove
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Bell: shown on every other page while notes are waiting ──────────────────
const NudgeBell: React.FC<{ count: number }> = ({ count }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      onClick={() => navigate('/')}
      className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full"
      style={{ background: '#FF8FA3', color: '#4A1D2B', border: '2px solid #4A1D2B', boxShadow: '4px 4px 0 #4A1D2B' }}
      initial={{ scale: 0, rotate: -40 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 40 }}
      transition={{ type: 'spring', stiffness: 380, damping: 14 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      aria-label={`${count} new ${count === 1 ? 'note' : 'notes'} from your partner. Open home`}
      title="New note from your partner"
    >
      <motion.span
        className="material-symbols-outlined text-3xl"
        style={{ fontVariationSettings: "'FILL' 1", transformOrigin: '50% 10%' }}
        animate={{ rotate: [0, -18, 16, -12, 8, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.2 }}
      >
        notifications
      </motion.span>
      <motion.span
        key={count}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 12 }}
        className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold"
        style={{ background: '#4A1D2B', color: '#FFF7F3', border: '2px solid #FFF7F3' }}
      >
        {count}
      </motion.span>
    </motion.button>
  );
};

/**
 * NudgeHost
 * Purpose: app-wide plumbing for partner notes.
 * - Listens for incoming notes on every dashboard page.
 * - On Home: incoming notes drop in as sticky popups (Reply / Remove).
 * - Elsewhere: a bouncing bell with a count that leads back to Home.
 * - Renders the composer popup, opened from the "Send a note" link.
 */
const NudgeHost: React.FC<{ isHome: boolean }> = ({ isHome }) => {
  const { user } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const isConnected = useSocketStore((s) => s.isConnected);
  const allNotes = useNudgeStore((s) => s.inbox);
  // Only notes from the other partner are mine to see
  const inbox = useMemo(() => allNotes.filter((n) => n.fromUid !== user?.uid), [allNotes, user?.uid]);
  const add = useNudgeStore((s) => s.add);

  // Join the couple's socket room so the server can relay notes to us
  useEffect(() => {
    if (socket && isConnected && user?.coupleId) socket.emit('join_couple_room', user.coupleId);
  }, [socket, isConnected, user?.coupleId]);

  useEffect(() => {
    if (!user) return;
    return subscribeNudges(user.uid, add);
  }, [user, add, socket]);

  return (
    <>
      <NudgeComposer />
      {isHome && (
        <AnimatePresence>
          {inbox.slice(-5).map((n, i) => (
            <StickyPopup key={n.id} nudge={n} index={i} />
          ))}
        </AnimatePresence>
      )}
      <AnimatePresence>{!isHome && inbox.length > 0 && <NudgeBell count={inbox.length} />}</AnimatePresence>
    </>
  );
};

export default NudgeHost;
