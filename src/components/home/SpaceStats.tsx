import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { BookHeart, Camera, Compass, Music, Pin, type LucideIcon } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp.js';
import type { SpaceData } from '../../hooks/useSpaceData.js';

interface Tile {
  to: string;
  label: string;
  icon: LucideIcon;
  count: number | null;
  tint: string;
}

const StatTile: React.FC<{ tile: Tile; index: number }> = ({ tile, index }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const shown = useCountUp(tile.count ?? 0, inView && tile.count !== null);
  const reduce = useReducedMotion();
  const Icon = tile.icon;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        ref={ref}
        to={tile.to}
        className="group card-edge relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl px-4 py-6 text-center transition-all duration-300 hover:-translate-y-1.5"
      >
        <span className={`${tile.tint} flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
          <Icon className="h-6 w-6 text-on-surface" />
        </span>
        <span className="font-display text-4xl tabular-nums leading-none mt-1">{tile.count === null ? '–' : shown}</span>
        <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{tile.label}</span>
      </Link>
    </motion.div>
  );
};

/** SpaceStats: how much the couple has built together, counting up as it scrolls into view. */
const SpaceStats: React.FC<{ data: SpaceData }> = ({ data }) => {
  const tiles: Tile[] = [
    { to: '/memory-stack', label: 'Memories', icon: BookHeart, count: data.memories ? data.memories.length : null, tint: 'bg-tint-1' },
    { to: '/gallery', label: 'Photos', icon: Camera, count: data.photos ? data.photos.length : null, tint: 'bg-tint-2' },
    { to: '/pinboard', label: 'Pins', icon: Pin, count: data.pins ? data.pins.length : null, tint: 'bg-tint-3' },
    { to: '/recommendations', label: 'Songs', icon: Music, count: data.songs ? data.songs.length : null, tint: 'bg-tint-4' },
    { to: '/recommendations', label: 'Picks', icon: Compass, count: data.recs ? data.recs.length : null, tint: 'bg-tint-1' },
  ];

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24" aria-labelledby="space-stats-heading">
      <h2 id="space-stats-heading" className="font-display text-3xl sm:text-5xl text-center mb-8">
        Our space so far
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
        {tiles.map((tile, i) => (
          <StatTile key={tile.label} tile={tile} index={i} />
        ))}
      </div>
    </section>
  );
};

export default SpaceStats;
