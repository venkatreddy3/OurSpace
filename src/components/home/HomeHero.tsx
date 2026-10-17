import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BookHeart, Camera, Mail, Pin } from 'lucide-react';
import FloatingHearts from './FloatingHearts';

interface HomeHeroProps {
  name: string;
  partnerName: string | null;
  /** Whole days together, or null when the date isn't set yet */
  days: number | null;
  onSendNote: () => void;
}

const greetingFor = (hour: number): string => {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Sweet dreams';
};

const actions = [
  { to: '/memory-stack', label: 'Add a memory', icon: BookHeart },
  { to: '/pinboard', label: 'Pin a note', icon: Pin },
  { to: '/gallery', label: 'Add photos', icon: Camera },
] as const;

/**
 * HomeHero
 * Time-of-day greeting with the couple's names, a line about the story so far, and the everyday shortcuts,
 * over softly drifting hearts.
 */
const HomeHero: React.FC<HomeHeroProps> = ({ name, partnerName, days, onSendNote }) => {
  const reduce = useReducedMotion();
  const firstName = name.trim().split(/\s+/)[0] || name;
  const greeting = useMemo(() => greetingFor(new Date().getHours()), []);

  const fade = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20 text-center">
      <FloatingHearts />

      <motion.span
        {...fade(0)}
        className="relative inline-flex items-center gap-2 rounded-full border border-border-gray bg-surface px-4 py-1.5 text-xs text-on-surface-variant"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {partnerName ? `Connected with ${partnerName}` : 'Waiting for your partner to join'}
      </motion.span>

      <motion.h1 {...fade(0.1)} className="relative font-display text-5xl sm:text-7xl mt-6 leading-[1.05]">
        {greeting},
        <br />
        <span className="text-shimmer">{firstName}</span>
        <motion.span
          aria-hidden="true"
          className="inline-block ml-2 text-primary"
          animate={reduce ? undefined : { scale: [1, 1.18, 1, 1.12, 1] }}
          transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
        >
          ♥
        </motion.span>
      </motion.h1>

      <motion.p {...fade(0.25)} className="relative mt-5 text-base sm:text-lg text-on-surface-variant max-w-xl mx-auto">
        {days === null
          ? 'Tell us when your story began and we will start counting every day together.'
          : partnerName
            ? `Day ${days + 1} of you and ${partnerName}. Make it a good one.`
            : `Day ${days + 1} of your story.`}
      </motion.p>

      <motion.div {...fade(0.4)} className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
        {actions.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group inline-flex items-center gap-2 rounded-full border border-border-gray bg-surface px-5 py-2.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-lg"
          >
            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={onSendNote}
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-lg cursor-pointer"
        >
          <Mail className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
          Send a note
        </button>
      </motion.div>
    </section>
  );
};

export default HomeHero;
