import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import FloatingHearts from './FloatingHearts';

interface HomeHeroProps {
  name: string;
  partnerName: string | null;
  /** Whole days together, or null when the date isn't set yet */
  days: number | null;
}

/** Playful hellos, one picked at random each visit (kept free of anything gendered) */
const GREETINGS = [
  'Hiee bbg',
  'Heyy cutie',
  'Hi gorgeous',
  'Well hello there',
  'Miss me?',
  'Hey you',
  'Hi my love',
  'Hiii sunshine',
  'Look who’s here',
  'There you are',
  'Hey babe',
  'Hi darling',
  'Oh hi, trouble',
  'Hey stunner',
  'Hey favourite human',
];

/** A comma after the greeting unless it already ends in punctuation ("Miss me?") */
const withComma = (greeting: string): string => (/[?!.,]$/.test(greeting) ? greeting : `${greeting},`);

const LAST_KEY = 'ourspace-last-greeting';

/** A random greeting that is never the same as the one shown on the previous visit */
const pickGreeting = (): string => {
  let last = -1;
  try {
    last = Number(sessionStorage.getItem(LAST_KEY) ?? -1);
  } catch {
    /* storage unavailable: repeats are fine */
  }
  let index = Math.floor(Math.random() * GREETINGS.length);
  if (index === last) index = (index + 1) % GREETINGS.length;
  try {
    sessionStorage.setItem(LAST_KEY, String(index));
  } catch {
    /* ignore */
  }
  return GREETINGS[index];
};

/**
 * HomeHero
 * A flirty random hello with the person's name in a flowing script font, a line about the story so far,
 * over softly drifting hearts.
 */
const HomeHero: React.FC<HomeHeroProps> = ({ name, partnerName, days }) => {
  const reduce = useReducedMotion();
  const firstName = name.trim().split(/\s+/)[0] || name;
  const greeting = useMemo(pickGreeting, []);

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

      <motion.h1
        {...fade(0.1)}
        className="relative mt-6 text-6xl sm:text-8xl leading-[1.1] normal-case"
        style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}
      >
        {withComma(greeting)}
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
    </section>
  );
};

export default HomeHero;
