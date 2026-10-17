import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, type MotionValue } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Compass, Gamepad2, Home, Image, LogOut, Moon, Pin, Award, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useTheme } from '../../context/themeContext';

/**
 * ArcMenu
 * Purpose: a hidden, semi-circular navigation for the Home screen.
 * - Slides out from the left edge when the cursor touches it (or the edge tab is tapped).
 * - Items sit on an arc; scroll (wheel / drag) to roll the next ones into view.
 */

/**
 * Geometry: the panel's right edge is a single circular arc (a big circle, so it reads as one clean curve),
 * and the items ride a concentric arc a little inside it.
 */
interface Geom {
  R: number; // radius of the edge arc
  cx: number; // x of the arc's centre (off-screen to the left)
  rho: number; // radius the items ride on
  step: number; // degrees between items
  vis: number; // items beyond +/- this angle fade out
}
const geomOf = (w: number, h: number): Geom => {
  const R = (h * h / 4 + w * w) / (2 * w); // circle through the top/bottom corners and the apex
  const cx = w - R;
  const rho = R - 42;
  const step = ((Math.min(86, h * 0.12) / rho) * 180) / Math.PI;
  const byY = Math.asin(Math.min(1, (h * 0.45) / rho));
  const byX = Math.acos(Math.min(1, (36 - cx) / rho)); // keep icons inside the edge
  return { R, cx, rho, step, vis: (Math.min(byY, byX) * 180) / Math.PI };
};

interface ArcEntry {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  action?: () => void;
}

const ArcItem: React.FC<{
  entry: ArcEntry;
  index: number;
  pos: MotionValue<number>;
  size: { w: number; h: number };
  g: Geom;
  active: boolean;
  onPick: (e: ArcEntry) => void;
}> = ({ entry, index, pos, size, g, active, onPick }) => {
  const rad = (a: number) => (a * Math.PI) / 180;
  const angle = useTransform(pos, (p) => (index - p) * g.step);
  const x = useTransform(angle, (a) => g.cx + g.rho * Math.cos(rad(a)) - 26);
  const y = useTransform(angle, (a) => size.h / 2 + g.rho * Math.sin(rad(a)) - 26);
  const opacity = useTransform(angle, (a) => Math.max(0, Math.min(1, (g.vis - Math.abs(a)) / (g.vis * 0.3))));
  const scale = useTransform(angle, (a) => 1.15 - Math.min(Math.abs(a) / g.vis, 1) * 0.35);
  const events = useTransform(angle, (a) => (Math.abs(a) > g.vis ? 'none' : 'auto'));
  const Icon = entry.icon;

  return (
    <motion.button
      type="button"
      onClick={() => onPick(entry)}
      style={{ x, y, opacity, scale, pointerEvents: events as unknown as 'auto' }}
      className="group absolute left-0 top-0 w-[52px] h-[52px] cursor-pointer"
      aria-label={entry.label}
      aria-current={active ? 'page' : undefined}
    >
      <span
        className={`w-full h-full rounded-full flex items-center justify-center border transition-colors shadow-md ${
          active
            ? 'bg-primary text-on-primary border-primary'
            : 'bg-surface-container-high text-on-surface border-border-gray group-hover:border-primary group-hover:text-primary'
        }`}
      >
        <Icon className="w-5 h-5" />
      </span>
      {/* label pill, to the right of the arc */}
      <span className="pointer-events-none absolute left-[62px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface-container border border-border-gray px-3 py-1 text-xs font-semibold text-on-surface opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shadow-lg">
        {entry.label}
      </span>
    </motion.button>
  );
};

const ArcMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ w: 120, h: 700 });
  const g = geomOf(size.w, size.h);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const entries: ArcEntry[] = [
    { key: 'home', label: 'Home', icon: Home, to: '/' },
    { key: 'pinboard', label: 'Pinboard', icon: Pin, to: '/pinboard' },
    { key: 'memory', label: 'MemoryStack', icon: Award, to: '/memory-stack' },
    { key: 'games', label: 'Couple Games', icon: Gamepad2, to: '/games' },
    { key: 'recs', label: 'Recommendations', icon: Compass, to: '/recommendations' },
    { key: 'gallery', label: 'Shared Gallery', icon: Image, to: '/gallery' },
    { key: 'theme', label: isDark ? 'Light mode' : 'Dark mode', icon: isDark ? Sun : Moon, action: () => setTheme(isDark ? 'light' : 'dark') },
    { key: 'logout', label: 'Log out', icon: LogOut, action: () => { void logout().then(() => navigate('/login')); } },
  ];
  const last = entries.length - 1;

  // Scroll position (in items). Starts mid-list so the arc is full on both sides; the current page is highlighted.
  const startIdx = (entries.length - 1) / 2;
  const target = useMotionValue(startIdx);
  const pos = useSpring(target, { stiffness: 220, damping: 28, mass: 0.6 });
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nudge = useCallback((delta: number) => {
    target.set(Math.min(last, Math.max(0, target.get() + delta)));
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => target.set(Math.round(target.get())), 160);
  }, [target, last]);

  // Size the arc to the window height
  useEffect(() => {
    const fit = () =>
      setSize({ w: Math.round(Math.min(140, Math.max(95, window.innerWidth * 0.1))), h: Math.round(window.innerHeight * 0.88) });
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Wheel scrolling rolls the arc (non-passive so the page behind doesn't scroll)
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      nudge(Math.sign(e.deltaY) * Math.min(1, Math.abs(e.deltaY) / 100) * 0.7);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, nudge]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown') nudge(1);
      if (e.key === 'ArrowUp') nudge(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, nudge]);

  // Keep the page still while the menu is open (scrolling here only rolls the arc)
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const block = (e: WheelEvent) => e.preventDefault();
    window.addEventListener('wheel', block, { passive: false });
    return () => {
      html.style.overflow = prev;
      window.removeEventListener('wheel', block);
    };
  }, [open]);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 280);
  };

  const pick = (e: ArcEntry) => {
    if (e.to) {
      setOpen(false);
      navigate(e.to);
    } else e.action?.();
  };

  // Touch / mouse drag along the arc
  const drag = useRef<{ y: number; pos: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { y: e.clientY, pos: target.get() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    target.set(Math.min(last, Math.max(0, drag.current.pos - (e.clientY - drag.current.y) / 70)));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    target.set(Math.round(target.get()));
  };

  return (
    <>
      {/* Hot zone: touching the left edge opens the menu */}
      <div className="fixed inset-y-0 left-0 w-3 z-[80]" onMouseEnter={openNow} aria-hidden="true" />

      {/* Edge tab: a small half-circle hint (also the tap target on touch screens) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={openNow}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[80] h-20 w-5 rounded-r-full bg-surface-container border border-l-0 border-border-gray text-on-surface-variant hover:text-primary hover:w-7 transition-all flex items-center justify-center cursor-pointer shadow-md"
            aria-label="Open menu"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            {/* Soft scrim; clicking it closes the menu */}
            <motion.div
              data-lenis-prevent
              className="fixed inset-0 z-[84] bg-black/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.nav
              ref={panelRef}
              data-lenis-prevent
              aria-label="Main menu"
              className="fixed left-0 top-1/2 z-[85] touch-none select-none"
              style={{ width: size.w, height: size.h, marginTop: -size.h / 2 }}
              initial={{ x: -size.w - 40 }}
              animate={{ x: 0 }}
              exit={{ x: -size.w - 40 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              onMouseEnter={openNow}
              onMouseLeave={closeSoon}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* Panel: left edge straight, right edge one smooth circular curve */}
              <svg
                className="absolute inset-0 overflow-visible pointer-events-none"
                width={size.w}
                height={size.h}
                style={{ filter: 'drop-shadow(8px 0 18px rgba(0,0,0,0.28))' }}
                aria-hidden="true"
              >
                <path
                  d={`M 0 0 A ${g.R} ${g.R} 0 0 1 0 ${size.h} Z`}
                  style={{ fill: 'var(--bg-sidebar)', stroke: 'var(--border-sidebar)' }}
                  strokeWidth="1.5"
                />
                {/* Dotted guide the icons ride on */}
                <path
                  d={`M ${g.cx + g.rho * Math.cos((g.vis * Math.PI) / 180)} ${size.h / 2 - g.rho * Math.sin((g.vis * Math.PI) / 180)} A ${g.rho} ${g.rho} 0 0 1 ${g.cx + g.rho * Math.cos((g.vis * Math.PI) / 180)} ${size.h / 2 + g.rho * Math.sin((g.vis * Math.PI) / 180)}`}
                  fill="none"
                  style={{ stroke: 'var(--border-gray)' }}
                  strokeWidth="1.5"
                  strokeDasharray="2 7"
                  strokeLinecap="round"
                />
              </svg>
              <p className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[9px] font-semibold uppercase tracking-[0.25em] text-on-surface-variant/70 pointer-events-none translate-x-3">
                Scroll
              </p>

              {entries.map((entry, i) => (
                <ArcItem
                  key={entry.key}
                  entry={entry}
                  index={i}
                  pos={pos}
                  size={size}
                  g={g}
                  active={entry.to === location.pathname}
                  onPick={pick}
                />
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ArcMenu;
