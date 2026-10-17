import React from 'react';

/**
 * Hand-illustrated decorations for the sticky notes.
 * Each colour gets its own theme: a bouquet or vine growing out of the bottom-left corner, one character doodle
 * (bee, bow, butterfly, moon) in the top-right corner, and tape or a pushpin at the top centre.
 * Everything sits INSIDE the paper (the note clips it), reserves its own space, and never blocks clicks.
 */

const INK = '#2A2330';
const line = { stroke: INK, strokeWidth: 1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const thin = { ...line, strokeWidth: 0.5, opacity: 0.45 };

// ─── Building blocks (SVG groups, composed into clusters) ────────────────────
interface GProps { x: number; y: number; s?: number; r?: number }
const at = ({ x, y, s = 1, r = 0 }: GProps) => `translate(${x} ${y}) rotate(${r}) scale(${s})`;

/** Layered daisy: two rings of petals, veins and a dotted centre */
const DaisyG: React.FC<GProps & { petal?: string; back?: string; center?: string }> = ({
  petal = '#FFFFFF', back = '#F1EADB', center = '#F5A524', ...p
}) => (
  <g transform={at(p)}>
    {Array.from({ length: 10 }).map((_, i) => (
      <ellipse key={`b${i}`} cx="0" cy="-8.2" rx="2.6" ry="6" transform={`rotate(${i * 36 + 18})`} fill={back} {...line} />
    ))}
    {Array.from({ length: 10 }).map((_, i) => (
      <g key={`f${i}`} transform={`rotate(${i * 36})`}>
        <ellipse cx="0" cy="-7" rx="2.9" ry="6.4" fill={petal} {...line} />
        <path d="M0 -3.5 V-10" {...thin} />
      </g>
    ))}
    <circle r="4" fill={center} {...line} />
    <circle cx="-1.2" cy="-1.2" r="0.7" fill={INK} opacity="0.55" />
    <circle cx="1.3" cy="-0.4" r="0.7" fill={INK} opacity="0.55" />
    <circle cx="0" cy="1.5" r="0.7" fill={INK} opacity="0.55" />
  </g>
);

/** Cherry blossom: five notched petals, veins, stamens */
const BlossomG: React.FC<GProps & { petal?: string; deep?: string }> = ({ petal = '#FFC2D8', deep = '#F27FA6', ...p }) => (
  <g transform={at(p)}>
    {Array.from({ length: 5 }).map((_, i) => (
      <g key={i} transform={`rotate(${i * 72})`}>
        <path d="M0 0 C-6 -3 -8.5 -9.5 -3.6 -12 C-2.2 -10.8 -1 -11.2 0 -10 C1 -11.2 2.2 -10.8 3.6 -12 C8.5 -9.5 6 -3 0 0Z" fill={petal} {...line} />
        <path d="M0 -2 C-1.5 -5 -1.6 -8 -1 -9.5 M0 -2 V-8 M0 -2 C1.5 -5 1.6 -8 1 -9.5" fill="none" stroke={deep} strokeWidth="0.6" strokeLinecap="round" />
      </g>
    ))}
    {Array.from({ length: 7 }).map((_, i) => (
      <g key={`s${i}`} transform={`rotate(${i * 51})`}>
        <path d="M0 0 V-4.2" stroke={INK} strokeWidth="0.5" opacity="0.7" />
        <circle cy="-4.6" r="0.9" fill="#E8A23B" />
      </g>
    ))}
    <circle r="1.6" fill="#E0457B" {...line} />
  </g>
);

const LeafG: React.FC<GProps & { fill?: string; len?: number }> = ({ fill = '#8BC79A', len = 14, ...p }) => (
  <g transform={at(p)}>
    <path d={`M0 0 C${len * 0.25} ${-len * 0.4} ${len * 0.75} ${-len * 0.4} ${len} 0 C${len * 0.75} ${len * 0.4} ${len * 0.25} ${len * 0.4} 0 0Z`} fill={fill} {...line} />
    <path d={`M1 0 H${len * 0.85}`} {...thin} />
  </g>
);

const Stem: React.FC<{ d: string; color?: string; w?: number }> = ({ d, color = '#4E9A63', w = 1.6 }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
);

/** Dotted flight trail */
const Trail: React.FC<{ d: string }> = ({ d }) => (
  <path d={d} fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" strokeDasharray="0.1 3" opacity="0.7" />
);

// ─── Clusters ────────────────────────────────────────────────────────────────
const Svg: React.FC<{ w: number; h: number; sc: number; className: string; inline?: boolean; style?: React.CSSProperties; children: React.ReactNode }> = ({
  w, h, sc, className, inline, style, children,
}) => (
  <svg
    aria-hidden="true"
    viewBox={`0 0 ${w} ${h}`}
    className={inline ? 'pointer-events-none block' : `pointer-events-none absolute z-20 ${className}`}
    style={{ width: w * sc * 0.88, height: h * sc * 0.88, ...style }}
  >
    {children}
  </svg>
);

const DaisyBouquet: React.FC<{ sc: number; alt?: boolean; inline?: boolean }> = ({ sc, alt, inline }) => (
  <Svg w={74} h={74} sc={sc} className="left-1 bottom-1" inline={inline}>
    <Stem d="M8 70 C10 54 12 40 17 27" />
    <Stem d="M8 70 C20 58 30 48 41 38" />
    <Stem d="M8 70 C24 68 40 62 55 53" />
    <LeafG x={11} y={56} r={-62} fill="#8BC79A" len={13} />
    <LeafG x={14} y={60} r={-12} fill="#74B887" len={14} />
    <LeafG x={28} y={65} r={-18} fill="#8BC79A" len={13} />
    <LeafG x={20} y={47} r={-30} fill="#74B887" len={11} />
    <DaisyG x={17} y={24} s={1.1} petal={alt ? '#EBDDFF' : '#FFFFFF'} back={alt ? '#D7C4F7' : '#F1EADB'} center={alt ? '#B07CFF' : '#F5A524'} r={8} />
    <DaisyG x={42} y={35} s={0.82} petal={alt ? '#FFFFFF' : '#FFF3C9'} back={alt ? '#EBDDFF' : '#F6E3A4'} center={alt ? '#FFB000' : '#E8861A'} r={-14} />
    <DaisyG x={57} y={52} s={0.6} petal={alt ? '#EBDDFF' : '#FFFFFF'} back={alt ? '#D7C4F7' : '#F1EADB'} center={alt ? '#B07CFF' : '#F5A524'} r={20} />
  </Svg>
);

const Bee: React.FC<{ sc: number }> = ({ sc }) => (
  <Svg w={52} h={34} sc={sc} className="right-1 top-1" style={{ transform: 'rotate(8deg)' }}>
    <Trail d="M2 30 C10 28 12 20 20 20" />
    <ellipse cx="34" cy="10" rx="6.5" ry="4" transform="rotate(-25 34 10)" fill="#CFEAFB" {...line} opacity="0.95" />
    <ellipse cx="40" cy="8.5" rx="6.5" ry="4" transform="rotate(10 40 8.5)" fill="#E6F4FD" {...line} opacity="0.95" />
    <ellipse cx="36" cy="20" rx="11" ry="7.5" fill="#FFD23F" {...line} />
    <path d="M32 13.2 C30.6 18 30.6 22 32 26.6 M38 12.8 C36.8 18 36.8 22 38 27.2" fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />
    <circle cx="46" cy="19" r="4.6" fill="#FFD23F" {...line} />
    <circle cx="47.5" cy="18" r="0.9" fill={INK} />
    <path d="M47 14.6 C47.5 11.6 49 10.6 50.6 10.6" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
    <path d="M25 20 L22 20.6" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
  </Svg>
);

const BlossomBranch: React.FC<{ sc: number; inline?: boolean }> = ({ sc, inline }) => (
  <Svg w={80} h={72} sc={sc} className="left-1 bottom-1" inline={inline}>
    <path d="M4 66 C16 58 22 46 34 38 C44 32 54 30 66 20" fill="none" stroke="#7A4B3A" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M26 46 C32 52 40 52 50 48" fill="none" stroke="#7A4B3A" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M44 33 C46 26 50 22 56 20" fill="none" stroke="#7A4B3A" strokeWidth="1.3" strokeLinecap="round" />
    <LeafG x={17} y={57} r={-20} fill="#9ED3A6" len={10} />
    <LeafG x={36} y={39} r={-70} fill="#9ED3A6" len={9} />
    <circle cx="22" cy="50" r="2.6" fill="#F27FA6" {...line} />
    <circle cx="48" cy="26" r="2.2" fill="#F27FA6" {...line} />
    <BlossomG x={20} y={52} s={0.95} r={10} />
    <BlossomG x={35} y={36} s={1.1} r={-18} petal="#FFD3E4" />
    <BlossomG x={52} y={47} s={0.78} r={30} petal="#FFB3CD" />
    <BlossomG x={64} y={22} s={0.9} r={5} />
    {/* falling petals */}
    <path d="M10 40 c2 -3 5 -3 6 0 c-1 3 -4 4 -6 0Z" fill="#FFC2D8" {...line} transform="rotate(30 13 40)" />
    <path d="M72 44 c2 -3 5 -3 6 0 c-1 3 -4 4 -6 0Z" fill="#FFC2D8" {...line} transform="rotate(-40 75 44)" />
  </Svg>
);

const Bow: React.FC<{ sc: number }> = ({ sc }) => (
  <Svg w={50} h={44} sc={sc} className="right-1 top-1" style={{ transform: 'rotate(10deg)' }}>
    <path d="M25 22 C20 36 14 40 12 36 L19 24Z" fill="#FF8FB3" {...line} />
    <path d="M25 22 C30 36 36 40 38 36 L31 24Z" fill="#FF8FB3" {...line} />
    <path d="M25 22 C14 6 2 8 3 18 C4 28 16 26 25 22Z" fill="#FF6B9A" {...line} />
    <path d="M25 22 C36 6 48 8 47 18 C46 28 34 26 25 22Z" fill="#FF6B9A" {...line} />
    <path d="M10 14 C14 12 18 14 20 18 M40 14 C36 12 32 14 30 18" fill="none" stroke="#fff" strokeWidth="1" opacity="0.7" strokeLinecap="round" />
    <rect x="21" y="17.5" width="8" height="9" rx="3" fill="#E0457B" {...line} />
  </Svg>
);

const Lavender: React.FC<{ sc: number; inline?: boolean }> = ({ sc, inline }) => {
  const stalk = (x0: number, y0: number, x1: number, y1: number, id: string) => {
    const florets = Array.from({ length: 7 }).map((_, i) => {
      const t = 0.36 + i * 0.09;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const side = i % 2 ? 1 : -1;
      return (
        <ellipse
          key={`${id}${i}`}
          cx={x + side * 2.2}
          cy={y}
          rx="2.1"
          ry="3.2"
          transform={`rotate(${side * 28} ${x + side * 2.2} ${y})`}
          fill={i % 3 === 0 ? '#CDB8FF' : '#B07CFF'}
          {...line}
        />
      );
    });
    return (
      <g key={id}>
        <Stem d={`M${x0} ${y0} Q${(x0 + x1) / 2 - 3} ${(y0 + y1) / 2} ${x1} ${y1}`} />
        {florets}
        <ellipse cx={x1} cy={y1 - 2} rx="1.9" ry="3" fill="#CDB8FF" {...line} />
      </g>
    );
  };
  return (
    <Svg w={70} h={72} sc={sc} className="left-1 bottom-1" inline={inline}>
      <LeafG x={10} y={66} r={-72} fill="#9ED3A6" len={16} />
      <LeafG x={12} y={68} r={-30} fill="#8BC79A" len={15} />
      {stalk(12, 70, 14, 12, 'a')}
      {stalk(14, 70, 30, 20, 'b')}
      {stalk(14, 70, 44, 34, 'c')}
      <DaisyG x={54} y={56} s={0.62} petal="#FFFFFF" back="#EBDDFF" center="#FFB000" r={15} />
    </Svg>
  );
};

const Butterfly: React.FC<{ sc: number }> = ({ sc }) => (
  <Svg w={52} h={40} sc={sc} className="right-1 top-1" style={{ transform: 'rotate(14deg)' }}>
    <Trail d="M2 36 C10 34 14 26 22 26" />
    <path d="M34 20 C28 4 14 4 14 14 C14 22 26 24 34 20Z" fill="#C9A6FF" {...line} />
    <path d="M34 20 C40 4 54 4 54 14 C54 22 42 24 34 20Z" fill="#A98BFF" {...line} />
    <path d="M34 22 C26 24 18 30 22 36 C28 40 33 30 34 22Z" fill="#FFB3D6" {...line} />
    <path d="M34 22 C42 24 50 30 46 36 C40 40 35 30 34 22Z" fill="#FF8FB3" {...line} />
    <circle cx="22" cy="12" r="2" fill="#fff" opacity="0.8" />
    <circle cx="46" cy="12" r="2" fill="#fff" opacity="0.8" />
    <path d="M34 14 V30" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M34 14 C32 9 29 8 27 9 M34 14 C36 9 39 8 41 9" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
  </Svg>
);

const Vine: React.FC<{ sc: number; inline?: boolean }> = ({ sc, inline }) => (
  <Svg w={78} h={74} sc={sc} className="left-1 bottom-1" inline={inline}>
    <path d="M6 70 C8 52 22 48 24 34 C26 22 18 14 26 6" fill="none" stroke="#4E9A63" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M6 70 C24 66 40 58 52 46 C60 38 62 30 72 26" fill="none" stroke="#4E9A63" strokeWidth="1.8" strokeLinecap="round" />
    <LeafG x={9} y={58} r={-60} fill="#8BC79A" len={13} />
    <LeafG x={22} y={40} r={-120} fill="#74B887" len={12} />
    <LeafG x={24} y={22} r={-40} fill="#8BC79A" len={11} />
    <LeafG x={20} y={66} r={-14} fill="#74B887" len={14} />
    <LeafG x={38} y={58} r={-50} fill="#8BC79A" len={12} />
    <LeafG x={50} y={46} r={-95} fill="#74B887" len={12} />
    <LeafG x={62} y={34} r={-60} fill="#8BC79A" len={11} />
    <circle cx="30" cy="12" r="2.4" fill="#E3B04B" {...line} />
    <circle cx="34" cy="16" r="2.1" fill="#E3B04B" {...line} />
    <circle cx="66" cy="22" r="2.2" fill="#E3B04B" {...line} />
    <BlossomG x={28} y={56} s={0.7} r={12} petal="#F6E7B4" deep="#E3B04B" />
    <BlossomG x={56} y={40} s={0.62} r={-20} petal="#F6E7B4" deep="#E3B04B" />
  </Svg>
);

const MoonStars: React.FC<{ sc: number }> = ({ sc }) => {
  const star = (x: number, y: number, s: number) => (
    <path key={`${x}${y}`} transform={`translate(${x} ${y}) scale(${s})`} d="M0 -6 L1.7 -1.7 L6 0 L1.7 1.7 L0 6 L-1.7 1.7 L-6 0 L-1.7 -1.7Z" fill="#FFD76A" {...line} />
  );
  return (
    <Svg w={46} h={40} sc={sc} className="right-1 top-1" style={{ transform: 'rotate(8deg)' }}>
      <path d="M18 4 A14 14 0 1 0 34 26 A11 11 0 0 1 18 4Z" fill="#FFE6A3" {...line} />
      <circle cx="14" cy="22" r="1.6" fill="#E9C97A" />
      <circle cx="19" cy="28" r="1.1" fill="#E9C97A" />
      {star(36, 8, 1)}
      {star(42, 22, 0.6)}
      {star(10, 6, 0.55)}
    </Svg>
  );
};

// ─── Tape and pins ───────────────────────────────────────────────────────────
const Pin: React.FC<{ color: string; sc: number }> = ({ color, sc }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 34"
    className="pointer-events-none absolute z-20 left-1/2 top-1 -translate-x-1/2"
    style={{ width: 17 * sc, height: 24 * sc, filter: 'drop-shadow(0 2px 1.5px rgba(0,0,0,0.3))' }}
  >
    <path d="M12 16 L12 32" stroke="#8A8A8A" strokeWidth="1.8" strokeLinecap="round" />
    <ellipse cx="12" cy="9" rx="8.5" ry="7.5" fill={color} {...line} />
    <ellipse cx="12" cy="9" rx="8.5" ry="7.5" fill="url(#none)" />
    <path d="M6.5 6 C8 3.5 10.5 2.8 13 3.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
    <path d="M7 12.5 C9 15 14 15.5 17 12.5" fill="none" stroke={INK} strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />
  </svg>
);

const TORN = 'polygon(0 0, 4% 15%, 0 30%, 4% 45%, 0 60%, 4% 75%, 0 100%, 100% 100%, 96% 85%, 100% 70%, 96% 55%, 100% 40%, 96% 25%, 100% 0)';

const Tape: React.FC<{ color: string; kind: 'dots' | 'stripes' | 'kraft'; className: string; sc: number; style?: React.CSSProperties }> = ({
  color, kind, className, sc, style,
}) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none absolute z-20 block ${className}`}
    style={{
      width: 64 * sc,
      height: 17 * sc,
      background:
        kind === 'dots'
          ? `radial-gradient(rgba(255,255,255,0.95) 1.6px, transparent 1.8px) 0 0 / 9px 9px, ${color}`
          : kind === 'stripes'
            ? `repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0 4px, transparent 4px 9px), ${color}`
            : color,
      border: '1px solid rgba(42,35,48,0.3)',
      clipPath: TORN,
      boxShadow: '0 2px 3px rgba(0,0,0,0.18)',
      ...style,
    }}
  />
);

// ─── Per-colour layouts ──────────────────────────────────────────────────────
const NoteDecor: React.FC<{ presetId: string; scale: number }> = ({ presetId, scale }) => {
  const sc = Math.min(1.5, Math.max(0.85, scale));

  switch (presetId) {
    case 'neon-pink':
      return (
        <>
          <Pin color="#E0457B" sc={sc} />
          <Bow sc={sc} />
        </>
      );
    case 'soft-lavender':
      return (
        <>
          <Tape color="#CDB8FF" kind="dots" sc={sc} className="top-1.5 left-1/2" style={{ transform: 'translateX(-50%) rotate(-2deg)' }} />
          <Butterfly sc={sc} />
        </>
      );
    case 'obsidian-glass':
      return (
        <>
          <Pin color="#E3B04B" sc={sc} />
          <MoonStars sc={sc} />
        </>
      );
    default: // pastel-yellow
      return (
        <>
          <Tape color="#F2D27A" kind="stripes" sc={sc} className="top-1.5 left-1/2" style={{ transform: 'translateX(-50%) rotate(-3deg)' }} />
          <Bee sc={sc} />
        </>
      );
  }
};

/** Size (px) of the corner illustration, so the note can reserve a float of the same size */
export const cornerSize = (presetId: string, scale: number) => {
  const sc = Math.min(1.5, Math.max(0.85, scale)) * 0.88;
  const dims: Record<string, [number, number]> = {
    'neon-pink': [80, 72],
    'soft-lavender': [70, 72],
    'obsidian-glass': [78, 74],
  };
  const [w, h] = dims[presetId] || [74, 74];
  return { w: Math.round(w * sc), h: Math.round(h * sc) };
};

/** The corner bouquet / branch / vine, rendered inline so the note text can wrap around it */
export const NoteCorner: React.FC<{ presetId: string; scale: number }> = ({ presetId, scale }) => {
  const sc = Math.min(1.5, Math.max(0.85, scale));
  switch (presetId) {
    case 'neon-pink': return <BlossomBranch sc={sc} inline />;
    case 'soft-lavender': return <Lavender sc={sc} inline />;
    case 'obsidian-glass': return <Vine sc={sc} inline />;
    default: return <DaisyBouquet sc={sc} inline />;
  }
};

export default NoteDecor;
