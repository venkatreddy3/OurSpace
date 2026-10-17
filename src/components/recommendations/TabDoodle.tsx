import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * TabDoodle
 * A hand-drawn illustration that fills the empty space beside the Recommendations content and changes with the tab:
 * headphones and music for the Playlist, popcorn and a clapperboard for the Watchlist, a map pin for Places.
 * Purely decorative: it never takes clicks and is hidden whenever there isn't spare room beside the content.
 */

export type DoodleTab = 'watchlist' | 'playlist' | 'places';

const INK = 'currentColor';
const line = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const thin = { ...line, strokeWidth: 1.4 };

const Sparkle: React.FC<{ x: number; y: number; s?: number; fill?: string }> = ({ x, y, s = 1, fill = '#FFD76A' }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6Z"
    fill={fill}
    {...thin}
  />
);

const Heart: React.FC<{ x: number; y: number; s?: number; fill?: string; r?: number }> = ({ x, y, s = 1, fill = '#FF8FB3', r = 0 }) => (
  <path
    transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
    d="M0 9 C-9 3 -10 -4 -5 -6 C-2 -7 0 -5 0 -3 C0 -5 2 -7 5 -6 C10 -4 9 3 0 9Z"
    fill={fill}
    {...thin}
  />
);

// ─── Playlist: headphones, notes, sound waves ───────────────────────────────
const Headphones: React.FC = () => (
  <svg viewBox="0 0 240 260" className="w-full h-auto" aria-hidden="true">
    {/* sound waves */}
    <path d="M30 150 C20 162 20 186 30 198" fill="none" stroke="#FF8FB3" strokeWidth="3" strokeLinecap="round" />
    <path d="M16 140 C2 158 2 190 16 208" fill="none" stroke="#FF8FB3" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    <path d="M210 150 C220 162 220 186 210 198" fill="none" stroke="#FF8FB3" strokeWidth="3" strokeLinecap="round" />
    <path d="M224 140 C238 158 238 190 224 208" fill="none" stroke="#FF8FB3" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

    {/* headband */}
    <path d="M62 158 C56 58 184 58 178 158" fill="none" stroke="#FFB3CD" strokeWidth="12" strokeLinecap="round" />
    <path d="M62 158 C56 58 184 58 178 158" fill="none" {...line} strokeWidth="2" transform="translate(0 -6)" opacity="0.5" />
    <path d="M62 158 C56 58 184 58 178 158" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.45" />

    {/* ear cups */}
    <rect x="42" y="140" width="40" height="70" rx="18" fill="#FF8FB3" {...line} />
    <rect x="50" y="152" width="24" height="46" rx="11" fill="#FFC2D8" {...thin} />
    <rect x="158" y="140" width="40" height="70" rx="18" fill="#FF8FB3" {...line} />
    <rect x="166" y="152" width="24" height="46" rx="11" fill="#FFC2D8" {...thin} />
    <circle cx="62" cy="175" r="4" fill="#fff" opacity="0.8" />
    <circle cx="178" cy="175" r="4" fill="#fff" opacity="0.8" />

    {/* cable */}
    <path d="M62 210 C62 240 100 232 120 244" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="0.1 5" />

    {/* notes */}
    <g transform="translate(112 18) rotate(-8)">
      <path d="M0 40 V6 L24 0 V34" fill="none" {...line} />
      <ellipse cx="-5" cy="41" rx="7" ry="5.2" fill="#B07CFF" {...line} />
      <ellipse cx="19" cy="35" rx="7" ry="5.2" fill="#B07CFF" {...line} />
      <path d="M0 14 L24 8" {...line} strokeWidth="3" />
    </g>
    <g transform="translate(196 52) rotate(10)">
      <path d="M0 24 V0 L10 -3" fill="none" {...line} />
      <ellipse cx="-4" cy="25" rx="5.5" ry="4.2" fill="#FFD76A" {...line} />
    </g>
    <g transform="translate(28 66) rotate(-12)">
      <path d="M0 24 V0 L10 -3" fill="none" {...line} />
      <ellipse cx="-4" cy="25" rx="5.5" ry="4.2" fill="#7FD6C8" {...line} />
    </g>

    <Heart x={206} y={116} s={1.1} />
    <Sparkle x={16} y={112} s={0.9} />
    <Sparkle x={150} y={26} s={0.6} fill="#FFFFFF" />
    <Sparkle x={222} y={236} s={0.7} />
    <circle cx="36" cy="236" r="3" fill="#B07CFF" />
    <circle cx="46" cy="246" r="2" fill="#FF8FB3" />
  </svg>
);

// ─── Watchlist: popcorn, clapperboard, film strip ───────────────────────────
const BUCKET = { topL: 22, topW: 92, botL: 34, botW: 68, top: 138, bottom: 236, stripes: 5 };

const Movies: React.FC = () => {
  const { topL, topW, botL, botW, top, bottom, stripes } = BUCKET;
  return (
    <svg viewBox="0 0 240 260" className="w-full h-auto" aria-hidden="true">
      {/* film strip behind */}
      <g transform="translate(112 168) rotate(-16)">
        <rect x="0" y="0" width="118" height="42" rx="4" fill="#4A3F55" {...line} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <React.Fragment key={i}>
            <rect x={7 + i * 19} y="4" width="9" height="6" rx="1.5" fill="#FFF3F6" />
            <rect x={7 + i * 19} y="32" width="9" height="6" rx="1.5" fill="#FFF3F6" />
          </React.Fragment>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={5 + i * 22} y="13" width="19" height="16" rx="2" fill={['#FFB3CD', '#FFE08A', '#A9C4EE', '#BFE5CB', '#D8C4F5'][i]} />
        ))}
      </g>

      {/* clapperboard */}
      <g transform="translate(118 44) rotate(9)">
        <rect x="0" y="26" width="96" height="62" rx="6" fill="#FFFFFF" {...line} />
        <path d="M10 46 H62 M10 58 H50 M10 70 H70" {...thin} opacity="0.55" />
        <g transform="rotate(-14 0 24)">
          <rect x="0" y="6" width="96" height="20" rx="4" fill="#2A2330" {...line} />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${6 + i * 19} 6 L${18 + i * 19} 6 L${10 + i * 19} 26 L${-2 + i * 19} 26Z`} fill="#FFF3F6" />
          ))}
        </g>
        <rect x="0" y="22" width="96" height="9" rx="2" fill="#2A2330" {...line} />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${6 + i * 19} 22 L${18 + i * 19} 22 L${15 + i * 19} 31 L${3 + i * 19} 31Z`} fill="#FFF3F6" />
        ))}
      </g>

      {/* popcorn bucket */}
      <g>
        {/* puffs */}
        {[
          [34, 128, 13],
          [54, 116, 15],
          [76, 120, 16],
          [96, 114, 14],
          [108, 130, 12],
          [64, 130, 12],
        ].map(([cx, cy, r], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="#FFF3C9" {...thin} />
            <path d={`M${cx - r * 0.4} ${cy - r * 0.2} q${r * 0.3} -${r * 0.5} ${r * 0.7} 0`} fill="none" stroke="#E8B64A" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        ))}
        <path d={`M${topL} ${top} L${topL + topW} ${top} L${botL + botW} ${bottom} L${botL} ${bottom}Z`} fill="#FFFFFF" {...line} />
        {Array.from({ length: stripes }).map((_, i) =>
          i % 2 === 0 ? (
            <path
              key={i}
              d={`M${topL + (topW / stripes) * i} ${top} L${topL + (topW / stripes) * (i + 1)} ${top} L${botL + (botW / stripes) * (i + 1)} ${bottom} L${botL + (botW / stripes) * i} ${bottom}Z`}
              fill="#FF6B7A"
            />
          ) : null
        )}
        <path d={`M${topL} ${top} L${topL + topW} ${top} L${botL + botW} ${bottom} L${botL} ${bottom}Z`} fill="none" {...line} />
        <path d={`M${topL - 4} ${top} H${topL + topW + 4}`} {...line} strokeWidth="3" />
        {/* a few flying kernels */}
        <circle cx="116" cy="96" r="4" fill="#FFF3C9" {...thin} />
        <circle cx="22" cy="104" r="3.4" fill="#FFF3C9" {...thin} />
        <circle cx="130" cy="140" r="3" fill="#FFF3C9" {...thin} />
      </g>

      <Sparkle x={20} y={60} s={0.9} />
      <Sparkle x={222} y={150} s={0.7} fill="#FFFFFF" />
      <Heart x={206} y={30} s={1} r={10} />
      <circle cx="34" cy="30" r="3" fill="#FF8FB3" />
      <circle cx="44" cy="40" r="2" fill="#B07CFF" />
    </svg>
  );
};

// ─── Places: map pin, dotted route, compass ─────────────────────────────────
const Places: React.FC = () => (
  <svg viewBox="0 0 240 260" className="w-full h-auto" aria-hidden="true">
    {/* dotted route */}
    <path d="M24 236 C60 200 30 170 80 160 C120 152 96 128 118 118" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 7" />
    {/* ground shadow */}
    <ellipse cx="150" cy="226" rx="40" ry="8" fill="#000" opacity="0.1" />

    {/* pin */}
    <path
      d="M150 24 C112 24 94 54 94 80 C94 118 150 196 150 196 C150 196 206 118 206 80 C206 54 188 24 150 24Z"
      fill="#FF8FB3"
      {...line}
    />
    <path d="M112 50 C120 40 134 36 146 38" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    <circle cx="150" cy="78" r="24" fill="#FFFFFF" {...line} />
    <path d="M150 64 L156 78 L150 92 L144 78Z" fill="#FF6B9A" {...thin} />

    {/* compass */}
    <g transform="translate(46 70)">
      <circle r="24" fill="#FFF3C9" {...line} />
      <circle r="17" fill="none" {...thin} opacity="0.6" />
      <path d="M0 -14 L5 0 L0 14 L-5 0Z" fill="#FF6B9A" {...thin} transform="rotate(35)" />
      <circle r="2.4" fill={INK} />
    </g>

    {/* cloud and trees */}
    <path d="M172 204 C162 204 160 190 172 188 C174 176 192 176 195 187 C206 186 208 204 198 204Z" fill="#fff" {...thin} />
    <g transform="translate(206 150)">
      <path d="M0 40 V22" {...line} />
      <path d="M0 22 C-14 22 -14 4 0 -6 C14 4 14 22 0 22Z" fill="#9ED3A6" {...line} />
    </g>
    <g transform="translate(26 176) scale(0.8)">
      <path d="M0 40 V22" {...line} />
      <path d="M0 22 C-14 22 -14 4 0 -6 C14 4 14 22 0 22Z" fill="#9ED3A6" {...line} />
    </g>

    <Sparkle x={214} y={40} s={0.8} />
    <Sparkle x={90} y={30} s={0.6} fill="#FFFFFF" />
    <Heart x={30} y={132} s={0.9} r={-10} />
    <circle cx="224" cy="120" r="3" fill="#B07CFF" />
  </svg>
);

const ART: Record<DoodleTab, React.FC> = { playlist: Headphones, watchlist: Movies, places: Places };

const TabDoodle: React.FC<{ tab: DoodleTab }> = ({ tab }) => {
  const reduce = useReducedMotion();
  const Art = ART[tab];
  return (
    <div
      aria-hidden="true"
      // Only when the area beside the content (which stops at 56rem) is wide enough for the picture
      className="pointer-events-none absolute right-8 top-24 hidden w-56 text-on-background/80 @min-[1200px]:block"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14, rotate: -3, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, rotate: 2, scale: 0.96 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={reduce ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Art />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TabDoodle;
