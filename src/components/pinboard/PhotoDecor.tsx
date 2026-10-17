import React from 'react';

/**
 * Hand-drawn extras for photo pins: washi tape, little doodles and a sticker.
 * Each photo picks one of a few colour themes from its id, so a board of photos looks varied.
 * Everything is decorative and never blocks clicks.
 */

const INK = '#2A2330';
const line = { stroke: INK, strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export type DoodleKind = 'heart' | 'star' | 'sparkle' | 'flower' | 'leaf' | 'cloud' | 'swirl';

export interface PhotoTheme {
  paper: string;
  accent: string;
  soft: string;
  tape: string;
  tapeKind: 'stripes' | 'dots' | 'plain';
  left: DoodleKind;
  right: DoodleKind;
  sticker: DoodleKind;
}

const THEMES: PhotoTheme[] = [
  { paper: '#FFF4F7', accent: '#E0457B', soft: '#FFC2D8', tape: '#F9B8CE', tapeKind: 'dots', left: 'heart', right: 'sparkle', sticker: 'heart' },
  { paper: '#FFFAE8', accent: '#D99A00', soft: '#FFE08A', tape: '#F2D27A', tapeKind: 'stripes', left: 'star', right: 'swirl', sticker: 'star' },
  { paper: '#F2F7FF', accent: '#4F7FC4', soft: '#BBD3F5', tape: '#A9C4EE', tapeKind: 'stripes', left: 'cloud', right: 'star', sticker: 'cloud' },
  { paper: '#F2FBF4', accent: '#3E9A5F', soft: '#BFE5CB', tape: '#A8D9B6', tapeKind: 'dots', left: 'leaf', right: 'flower', sticker: 'flower' },
  { paper: '#F8F3FF', accent: '#8B62C9', soft: '#D8C4F5', tape: '#CDB6F0', tapeKind: 'plain', left: 'sparkle', right: 'heart', sticker: 'sparkle' },
];

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const photoTheme = (id: string): PhotoTheme => THEMES[hash(id) % THEMES.length];
/** Small tilt (degrees) so photos look casually pinned: between -2.2 and 2.2 */
export const photoTilt = (id: string): number => ((hash(id + 't') % 45) - 22) / 10;

// ─── Doodles (24x24 box) ─────────────────────────────────────────────────────
const Doodle: React.FC<{ kind: DoodleKind; color: string; soft: string; size: number; rotate?: number }> = ({
  kind,
  color,
  soft,
  size,
  rotate = 0,
}) => {
  const body = (() => {
    switch (kind) {
      case 'heart':
        return <path d="M12 20 C4 14.5 3 9.5 6 7 C8.6 5 11 6.5 12 8.5 C13 6.5 15.4 5 18 7 C21 9.5 20 14.5 12 20Z" fill={soft} {...line} />;
      case 'star':
        return <path d="M12 3 L14.4 9.2 L21 9.7 L16 14 L17.6 20.5 L12 17 L6.4 20.5 L8 14 L3 9.7 L9.6 9.2Z" fill={soft} {...line} />;
      case 'sparkle':
        return (
          <>
            <path d="M12 2 C12.6 8 14 10 22 12 C14 14 12.6 16 12 22 C11.4 16 10 14 2 12 C10 10 11.4 8 12 2Z" fill={soft} {...line} />
            <circle cx="19" cy="5" r="1.2" fill={color} />
          </>
        );
      case 'flower':
        return (
          <>
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse key={r} cx="12" cy="6.5" rx="3.2" ry="4.6" transform={`rotate(${r} 12 12)`} fill={soft} {...line} />
            ))}
            <circle cx="12" cy="12" r="2.6" fill={color} {...line} />
          </>
        );
      case 'leaf':
        return (
          <>
            <path d="M4 20 C3 10 10 3 21 3 C21 14 14 21 4 20Z" fill={soft} {...line} />
            <path d="M4 20 L16 8" fill="none" {...line} />
          </>
        );
      case 'cloud':
        return <path d="M6 18 C2 18 1.5 12 6.5 11.5 C7 6.5 15 5.5 16.5 10.5 C21.5 10 22.5 18 18 18Z" fill={soft} {...line} />;
      default:
        return <path d="M3 17 C5 6 12 6 11 12 C10 17 5 15 7 11 C9 7 16 8 17 14 C18 19 21 19 22 15" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />;
    }
  })();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      {body}
    </svg>
  );
};

/** Doodle sitting beside the caption / grip */
export const FlankDoodle: React.FC<{ kind: DoodleKind; theme: PhotoTheme; size: number; rotate?: number; className?: string }> = ({
  kind,
  theme,
  size,
  rotate,
  className = '',
}) => (
  <span className={`pointer-events-none absolute ${className}`}>
    <Doodle kind={kind} color={theme.accent} soft={theme.soft} size={size} rotate={rotate} />
  </span>
);

/** Sticker stuck over the photo's corner, with a white die-cut border */
export const PhotoSticker: React.FC<{ theme: PhotoTheme; size: number }> = ({ theme, size }) => (
  <span
    className="pointer-events-none absolute -bottom-3 -right-3 z-10 flex items-center justify-center rounded-full bg-white shadow-md"
    style={{ width: size, height: size, transform: 'rotate(12deg)', border: `2px solid ${theme.soft}` }}
  >
    <Doodle kind={theme.sticker} color={theme.accent} soft={theme.soft} size={Math.round(size * 0.7)} />
  </span>
);

// ─── Washi tape ──────────────────────────────────────────────────────────────
const TORN =
  'polygon(0 0, 4% 15%, 0 30%, 4% 45%, 0 60%, 4% 75%, 0 100%, 100% 100%, 96% 85%, 100% 70%, 96% 55%, 100% 40%, 96% 25%, 100% 0)';

export const PhotoTape: React.FC<{ theme: PhotoTheme; scale: number; side: 'left' | 'right' }> = ({ theme, scale, side }) => {
  const stripes = `repeating-linear-gradient(45deg, ${theme.tape} 0 6px, rgba(255,255,255,0.55) 6px 12px)`;
  const dots = `radial-gradient(rgba(255,255,255,0.8) 1.6px, transparent 1.8px) 0 0 / 9px 9px, ${theme.tape}`;
  const background = theme.tapeKind === 'stripes' ? stripes : theme.tapeKind === 'dots' ? dots : theme.tape;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-20"
      style={{
        top: 4,
        [side]: -14,
        width: Math.round(66 * scale),
        height: Math.round(20 * scale),
        background,
        opacity: 0.88,
        clipPath: TORN,
        transform: `rotate(${side === 'left' ? -38 : 38}deg)`,
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))',
      }}
    />
  );
};
