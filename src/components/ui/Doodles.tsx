import React from 'react';

/**
 * Hand-drawn line illustrations (stroke uses currentColor so they follow the theme's blue).
 * Purpose: recreate the loose, human-centric doodle style used across the site.
 */
interface DoodleProps {
  className?: string;
  /** Colour used for the filled "liquid" areas */
  fill?: string;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Pot: React.FC<{ x: number; y: number; scale?: number; filled?: boolean; heart?: boolean; fill: string }> = ({
  x, y, scale = 1, filled, heart, fill,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} {...stroke}>
    {filled && <path d="M-41 -14 C-20 -6 20 -22 41 -14 C38 30 -38 30 -41 -14Z" fill={fill} stroke="none" />}
    <path d="M-42 0 C-50 -40 -24 -58 0 -58 C24 -58 50 -40 42 0 C38 30 -38 30 -42 0Z" />
    <path d="M-12 -58 C-10 -68 10 -68 12 -58" />
    <circle cx="0" cy="-72" r="4" />
    <path d="M40 -22 C62 -30 70 -50 78 -64 L66 -66 C60 -50 52 -40 38 -32" />
    <path d="M-42 -32 C-72 -36 -72 8 -42 6" />
    <path d="M-14 30 L-20 68 L-6 72" />
    <path d="M14 30 L26 62 L40 60" />
    {heart && <path d="M0 -8 C-14 -22 -26 -2 0 14 C26 -2 14 -22 0 -8Z" fill={fill} stroke="none" />}
  </g>
);

interface CatsProps {
  className?: string;
  catA?: string;
  catB?: string;
  stripe?: string;
}

const Z: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <path
    d="M0 0 H14 L0 16 H14"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill="none" stroke="#8fb0e0" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
  />
);

const INK = '#1f1b1b';

/** One kawaii cat head centred on (0,0); position and tilt it with a parent <g> */
const CatHead: React.FC<{ fill: string; stripe: string; open?: boolean; drool?: boolean }> = ({ fill, stripe, open, drool }) => {
  const o = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const f = { ...o, strokeWidth: 3, fill: 'none' };
  return (
    <g>
      <path d="M-46 6 C-50 -20 -44 -38 -30 -40 L-18 -28 C-6 -32 6 -32 18 -28 L30 -40 C44 -38 50 -20 46 6 C50 32 24 42 0 42 C-24 42 -50 32 -46 6Z" fill={fill} {...o} />
      <path d="M-9 -28 v9 M0 -29 v10 M9 -28 v9" {...f} stroke={stripe} strokeWidth={3} />
      <path d="M-30 8 C-25 14 -17 14 -12 8 M12 8 C17 14 25 14 30 8" {...f} />
      {open
        ? <path d="M-6 18 C-5 30 5 30 6 18Z" fill="#f08a9a" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        : <path d="M-6 19 C-3 24 3 24 6 19" {...f} strokeWidth={2.5} />}
      {drool && <path d="M8 28 C4 38 13 41 14 33 C14 30 11 28 8 28Z" fill="#9fd0f0" stroke={INK} strokeWidth={2} />}
      <circle cx="-34" cy="20" r="6" fill="#f5a3b5" opacity="0.85" />
      <circle cx="34" cy="20" r="6" fill="#f5a3b5" opacity="0.85" />
      <path d="M-48 8 L-62 3 M-48 18 L-62 20 M48 8 L62 3 M48 18 L62 20" {...f} strokeWidth={2.5} />
    </g>
  );
};

/** A tail drawn as an outlined thick stroke */
const Tail: React.FC<{ d: string; fill: string }> = ({ d, fill }) => (
  <g fill="none" strokeLinecap="round">
    <path d={d} stroke={INK} strokeWidth={17} />
    <path d={d} stroke={fill} strokeWidth={9} />
  </g>
);

/** Two sleepy kawaii cats cuddled together, soft pastel doodle */
export const SleepyCats: React.FC<CatsProps> = ({ className, catA = '#ffffff', catB = '#fbd3a0', stripe = '#f0a560' }) => {
  const o = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 400 240" className={className} role="img" aria-label="Two sleepy cats cuddling">
      <Z x={36} y={56} s={0.9} /><Z x={78} y={84} s={0.8} /><Z x={52} y={122} s={0.7} />
      <Z x={288} y={30} s={0.9} /><Z x={332} y={10} s={0.9} /><Z x={322} y={56} s={0.7} />
      <path d="M205 78 C188 62 192 48 202 48 C208 48 210 54 210 56 C210 54 214 48 220 48 C230 48 228 64 205 78Z" fill="#f5a3b5" {...o} strokeWidth={3} />
      {/* tails */}
      <Tail d="M96 196 C62 202 52 172 68 158" fill={catA} />
      <Tail d="M322 196 C356 202 366 172 350 158" fill={catB} />
      {/* white cat: round chibi body with stubby front paws */}
      <path d="M96 150 C80 176 84 212 114 216 L168 216 C198 212 202 176 184 150 Z" fill={catA} {...o} />
      <ellipse cx="124" cy="214" rx="14" ry="8" fill={catA} {...o} strokeWidth={3} />
      <ellipse cx="160" cy="214" rx="14" ry="8" fill={catA} {...o} strokeWidth={3} />
      {/* orange cat: round chibi body */}
      <path d="M236 146 C222 174 228 212 258 216 L312 216 C342 212 346 174 328 146 Z" fill={catB} {...o} />
      <ellipse cx="268" cy="214" rx="14" ry="8" fill={catB} {...o} strokeWidth={3} />
      <ellipse cx="304" cy="214" rx="14" ry="8" fill={catB} {...o} strokeWidth={3} />
      {/* orange cat's arm hugging the white cat */}
      <Tail d="M240 176 C222 184 204 186 186 184" fill={catB} />
      {/* heads leaning in towards each other */}
      <g transform="translate(138 118) rotate(-7)"><CatHead fill={catA} stripe="#b9b9b9" drool /></g>
      <g transform="translate(268 112) rotate(8)"><CatHead fill={catB} stripe={stripe} open /></g>
    </svg>
  );
};

/** Three little pots strolling side by side (hero illustration) */
export const WalkingPots: React.FC<DoodleProps> = ({ className, fill = 'var(--primary)' }) => (
  <svg viewBox="0 0 420 180" className={className} role="img" aria-label="Two little pots walking together">
    <Pot x={90} y={90} scale={0.95} fill={fill} />
    <Pot x={215} y={96} scale={1.05} fill={fill} heart />
    <Pot x={335} y={92} scale={1} fill={fill} filled />
    <path d="M20 168 C120 160 240 176 400 166" {...stroke} strokeWidth={1.6} opacity="0.45" />
  </svg>
);

/** A cup with a happy person soaking in it, steam curling above */
export const SoakingCup: React.FC<DoodleProps> = ({ className, fill = 'var(--primary)' }) => (
  <svg viewBox="0 0 240 200" className={className} role="img" aria-label="A person relaxing in a coffee cup">
    <g {...stroke}>
      <path d="M92 28 C84 18 96 12 88 4" />
      <path d="M150 30 C142 20 154 14 146 6" />
      <circle cx="120" cy="66" r="16" />
      <path d="M112 62 L114 62 M126 62 L128 62" />
      <path d="M114 72 C118 77 124 77 128 72" />
      <path d="M104 84 C84 80 70 84 62 96" />
      <path d="M136 84 C156 80 170 84 178 96" />
    </g>
    <path d="M42 100 C80 90 160 112 198 100 C196 150 168 176 120 176 C72 176 44 150 42 100Z" fill={fill} />
    <g {...stroke}>
      <path d="M38 96 L202 96 C202 150 170 180 120 180 C70 180 38 150 38 96Z" fill="none" />
      <path d="M200 112 C236 108 238 152 192 156" />
      <path d="M70 190 C100 198 140 198 170 190" />
      <path d="M96 130 C104 124 112 136 120 130 C128 124 136 136 144 130" stroke="var(--bg-background)" />
    </g>
  </svg>
);

/** An envelope with a heart seal */
export const Letter: React.FC<DoodleProps> = ({ className, fill = 'var(--primary)' }) => (
  <svg viewBox="0 0 220 160" className={className} role="img" aria-label="A love letter">
    <g {...stroke}>
      <rect x="20" y="34" width="180" height="104" rx="10" />
      <path d="M22 40 L110 98 L198 40" />
      <path d="M22 136 L84 80 M198 136 L136 80" />
    </g>
    <path d="M110 74 C98 58 80 80 110 100 C140 80 122 58 110 74Z" fill={fill} stroke="none" transform="translate(0 8)" />
    <g {...stroke} strokeWidth={1.8}>
      <path d="M176 14 L176 28 M169 21 L183 21" />
      <path d="M36 14 L36 24 M31 19 L41 19" />
    </g>
  </svg>
);

/** Wavy underline for headings */
export const Squiggle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 160 14" className={className} aria-hidden="true">
    <path d="M2 8 C14 0 22 14 34 7 C46 0 54 14 66 7 C78 0 86 14 98 7 C110 0 118 14 130 7 C140 2 148 8 158 5" {...stroke} />
  </svg>
);

export default WalkingPots;
