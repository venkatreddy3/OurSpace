/**
 * Sticky-note paper colours. Each id also selects its own illustration set in NoteDecor
 * (a corner bouquet or branch, a character in the top corner, and tape or a pin).
 */
export interface NotePreset {
  id: string;
  label: string;
  /** Paper, border and text colour (solid pastel paper in both light and dark mode) */
  bg: string;
  /** Swatch shown in the colour picker */
  circle: string;
}

export const NOTE_PRESETS: NotePreset[] = [
  { id: 'pastel-yellow',  label: 'Yellow',   bg: 'bg-yellow-100 border-yellow-400 text-yellow-900',   circle: 'bg-yellow-500' },
  { id: 'neon-pink',      label: 'Pink',     bg: 'bg-pink-100 border-pink-400 text-pink-900',         circle: 'bg-pink-500' },
  { id: 'soft-lavender',  label: 'Lavender', bg: 'bg-purple-100 border-purple-400 text-purple-900',   circle: 'bg-purple-500' },
  { id: 'obsidian-glass', label: 'Slate',    bg: 'bg-slate-100 border-slate-400 text-slate-900',      circle: 'bg-slate-500' },
  { id: 'mint-meadow',    label: 'Mint',     bg: 'bg-emerald-100 border-emerald-400 text-emerald-900', circle: 'bg-emerald-500' },
  { id: 'peach-sunset',   label: 'Peach',    bg: 'bg-orange-100 border-orange-400 text-orange-900',   circle: 'bg-orange-500' },
  { id: 'sky-breeze',     label: 'Sky',      bg: 'bg-sky-100 border-sky-400 text-sky-900',            circle: 'bg-sky-500' },
  { id: 'cherry-berry',   label: 'Cherry',   bg: 'bg-red-100 border-red-400 text-red-900',            circle: 'bg-red-500' },
];

export const NOTE_PRESET_IDS = NOTE_PRESETS.map((p) => p.id);

/**
 * Picks a design for a new item so the board stays varied: the least-used design goes first,
 * and it is never the same as the one picked just before.
 */
export const pickFreshDesign = (allIds: string[], usedIds: string[], justUsed?: string | null): string => {
  const counts = new Map(allIds.map((id) => [id, 0]));
  usedIds.forEach((id) => {
    if (counts.has(id)) counts.set(id, (counts.get(id) as number) + 1);
  });
  const fewest = Math.min(...counts.values());
  let pool = allIds.filter((id) => counts.get(id) === fewest && id !== justUsed);
  if (pool.length === 0) pool = allIds.filter((id) => id !== justUsed);
  if (pool.length === 0) pool = allIds;
  return pool[Math.floor(Math.random() * pool.length)];
};
