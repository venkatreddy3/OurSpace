import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore.js';
import AnniversaryDialog from '../dashboard/AnniversaryDialog';

/** A single digit that rolls up and out when its value changes */
const RollingDigit: React.FC<{ value: string }> = ({ value }) => (
  <span className="relative inline-block h-[1.3em] w-[0.62em] overflow-hidden align-bottom leading-[1.3em]">
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        className="absolute inset-0 text-center"
        initial={{ y: '110%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        exit={{ y: '-110%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </span>
);

const RollingNumber: React.FC<{ value: string }> = ({ value }) => (
  <span className="inline-flex">
    {value.split('').map((ch, i) => (
      <RollingDigit key={value.length - i} value={ch} />
    ))}
  </span>
);

/** One flip-clock style card: rolling digits, centre split line, tiny unit label beneath */
const FlipTile: React.FC<{ value: string; unit: string; accent?: boolean }> = ({ value, unit, accent }) => (
  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
    <div
      className={`relative flex items-center justify-center w-full h-10 rounded-lg border shadow-sm font-display text-xl tabular-nums ${
        accent ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface border-border-gray text-on-background'
      }`}
    >
      <RollingNumber value={value} />
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-surface-container" />
    </div>
    <span className="text-[8px] uppercase tracking-[0.18em] text-on-surface-variant leading-none">{unit}</span>
  </div>
);

/**
 * LoveClock
 * Purpose: live, ticking "loved since" counter for the couple (sidebar card).
 * Counts from the couple's "together since" date. Until one is set it shows zero and offers a button to set it.
 */
const LoveClock: React.FC = () => {
  const { couple } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const startMs = useMemo(
    () => (couple?.anniversaryDate ? new Date(couple.anniversaryDate).getTime() : null),
    [couple?.anniversaryDate]
  );
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (startMs === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startMs]);

  const elapsed = startMs === null ? 0 : Math.max(0, Math.floor((now - startMs) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = String(Math.floor(elapsed / 86400));
  const h = pad(Math.floor((elapsed % 86400) / 3600));
  const m = pad(Math.floor((elapsed % 3600) / 60));
  const s = pad(elapsed % 60);
  const since =
    startMs === null ? null : new Date(startMs).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      className="bg-surface-container border border-border-gray rounded-2xl p-4 transition-colors duration-300"
      aria-label={`Loved for ${d} days ${h} hours ${m} minutes ${s} seconds`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[1.7rem] leading-none text-primary whitespace-nowrap" style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}>Loved since</span>
        {since ? (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="text-[10px] text-on-surface-variant hover:text-primary whitespace-nowrap transition-colors cursor-pointer"
            title="Change the date"
          >
            {since}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="text-[10px] font-semibold text-primary hover:underline whitespace-nowrap cursor-pointer"
          >
            Set the date
          </button>
        )}
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        <FlipTile value={d} unit="days" />
        <FlipTile value={h} unit="hrs" />
        <FlipTile value={m} unit="min" />
        <FlipTile value={s} unit="sec" accent />
      </div>
      <AnniversaryDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};

export default LoveClock;
