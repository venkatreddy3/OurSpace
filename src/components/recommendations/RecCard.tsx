import React from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  BookOpen, Bookmark, Cake, Camera, ChefHat, Church, Clapperboard, Coffee, Film, Flower2, Gift, IceCreamCone,
  Landmark, Lightbulb, MapPin, Mountain, Palmtree, Pizza, Plane, Popcorn, Sparkles, Sun, Tent, Ticket, Trash2,
  TreePine, Tv, Utensils, Waves, Wine, Bike, Gamepad2, Heart,
  type LucideIcon,
} from 'lucide-react';
import Stars from './Stars.js';
import type { RecItem } from '../../services/recs.service.js';

const ACCENTS = ['#b5546f', '#6f8f7a', '#6c82a8', '#b0875a', '#8b78a8', '#b36a5a'];
const accentFor = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

// Each category gets its own icon, hover animation and wording
const CATEGORY: Record<
  string,
  { icon: LucideIcon; iconVariants: Variants; tint: string; verb: string; done: string }
> = {
  places: {
    icon: MapPin,
    tint: '#efece7',
    verb: 'visit',
    done: 'visiting',
    // pin drops, bounces and settles
    iconVariants: {
      rest: { y: 0, scale: 1 },
      hover: { y: [0, -18, 0, -6, 0], scale: [1, 1.1, 0.94, 1.03, 1], transition: { duration: 0.8, ease: 'easeOut' } },
    },
  },
  watchlist: {
    icon: Film,
    tint: '#f4f2ee',
    verb: 'watch',
    done: 'watching',
    // film reel wiggles like a projector
    iconVariants: {
      rest: { rotate: 0, scale: 1 },
      hover: { rotate: [0, -10, 10, -6, 6, 0], scale: 1.12, transition: { duration: 0.7 } },
    },
  },
  general: {
    icon: Sparkles,
    tint: '#eae7e1',
    verb: 'check it out',
    done: 'trying it',
    // sparkle spins and pops
    iconVariants: {
      rest: { rotate: 0, scale: 1 },
      hover: { rotate: 180, scale: 1.2, transition: { type: 'spring', stiffness: 160, damping: 12 } },
    },
  },
};

// Pick a cover icon that fits the title (keywords first), otherwise a varied one per card
const POOLS: Record<string, LucideIcon[]> = {
  places: [MapPin, Camera, Sun, Tent, Palmtree, Landmark, Plane, Heart, Bike, Flower2],
  watchlist: [Film, Clapperboard, Popcorn, Tv, Ticket, Heart],
  general: [Sparkles, BookOpen, Lightbulb, Bookmark, ChefHat, Gift, Gamepad2, Cake],
};
const KEYWORDS: [RegExp, LucideIcon][] = [
  [/cafe|café|coffee|tea|bistro|brunch|bakery/i, Coffee],
  [/pizza/i, Pizza],
  [/ice ?cream|gelato|dessert/i, IceCreamCone],
  [/cake|birthday|bake/i, Cake],
  [/bar|wine|cocktail|pub|rooftop/i, Wine],
  [/restaurant|dinner|lunch|food|eat|kitchen|cook|recipe|sushi|burger/i, Utensils],
  [/beach|sea|ocean|lake|island|pool|waterfall|river/i, Waves],
  [/mountain|hike|hiking|trek|peak|hill|trail/i, Mountain],
  [/park|garden|forest|woods|nature|botanical/i, TreePine],
  [/camp|tent|cabin/i, Tent],
  [/museum|palace|fort|tower|temple|monument|gallery|castle/i, Landmark],
  [/church|mosque|shrine|cathedral/i, Church],
  [/flight|trip|travel|tour|road ?trip|holiday|vacation/i, Plane],
  [/photo|view|sunset|sunrise|point/i, Camera],
  [/book|read|novel/i, BookOpen],
  [/game|play/i, Gamepad2],
  [/gift|surprise/i, Gift],
  [/idea|tip|learn/i, Lightbulb],
];
const hashStr = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};
const iconFor = (rec: RecItem, fallback: LucideIcon): LucideIcon => {
  const hit = KEYWORDS.find(([re]) => re.test(rec.title));
  if (hit) return hit[1];
  const pool = POOLS[rec.category];
  return pool ? pool[hashStr(rec.id) % pool.length] : fallback;
};

interface Props {
  rec: RecItem;
  index: number;
  /** true when I recommended it */
  mine: boolean;
  partnerName: string;
  /** show a small "From you / From partner" tag on the card */
  showAuthor?: boolean;
  onRate: (n: number) => void;
  onRemove: () => void;
}

const RecCard: React.FC<Props> = ({ rec, index, mine, partnerName, showAuthor, onRate, onRemove }) => {
  const accent = accentFor(rec.id);
  const cat = CATEGORY[rec.category] || CATEGORY.general;
  const Icon = iconFor(rec, cat.icon);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(index, 8) * 0.04 }}
      whileHover="hover"
      className="group relative flex flex-col rounded-3xl p-2.5 border bg-surface-container list-none"
      style={{ borderColor: `${accent}40`, backgroundImage: `linear-gradient(${accent}12, ${accent}12)` }}
    >
      {/* Cover */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden flex items-center justify-center ${
          rec.category === 'watchlist' ? 'aspect-[2/3]' : 'aspect-square'
        }`}
        style={{ background: rec.cover ? `${accent}33` : `linear-gradient(160deg, ${accent}26, ${accent}0d)` }}
      >
        {rec.cover ? (
          <motion.img
            src={rec.cover}
            alt=""
            className="w-full h-full object-cover"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <>
            {/* soft rings behind the icon */}
            <span className="absolute w-3/4 aspect-square rounded-full border" style={{ borderColor: `${accent}30` }} />
            <span className="absolute w-1/2 aspect-square rounded-full border" style={{ borderColor: `${accent}40` }} />
            <motion.div variants={cat.iconVariants} initial="rest" className="relative" style={{ color: accent }}>
              <Icon className="w-14 h-14" strokeWidth={1.5} />
            </motion.div>
          </>
        )}
        {showAuthor && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/55 text-white backdrop-blur-sm"
          >
            {mine ? 'From you' : `From ${partnerName}`}
          </span>
        )}
        {mine && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
            title="Remove"
            aria-label="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Details */}
      <div className="pt-3 px-1 pb-1 flex-1 flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-on-surface leading-tight line-clamp-2">{rec.title}</p>
        {rec.meta && (
          <p className="text-[11px] font-medium" style={{ color: accent }}>
            {rec.meta}
          </p>
        )}
        {rec.desc && (
          <p
            className="text-xs text-on-surface-variant leading-relaxed pl-2.5 line-clamp-3"
            style={{ borderLeft: `2px solid ${accent}` }}
            title={rec.desc}
          >
            {rec.desc}
          </p>
        )}

        {/* Rating */}
        <div className="mt-auto pt-2 flex flex-col gap-0.5 min-h-[2.6rem]">
          {mine ? (
            rec.rating ? (
              <>
                <Stars value={rec.rating} size={14} />
                <span className="text-[10px] text-on-surface-variant">{partnerName} rated</span>
              </>
            ) : (
              <span className="text-[10px] text-on-surface-variant/70">Waiting for {partnerName} to {cat.verb}</span>
            )
          ) : (
            <>
              <Stars value={rec.rating || 0} onChange={onRate} size={15} />
              <span className="text-[10px] text-on-surface-variant">
                {rec.rating ? 'Your rating' : `Rate after ${cat.done}`}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.li>
  );
};

export default RecCard;
