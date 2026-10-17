import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Particle {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  kind: 'heart' | 'sparkle';
  opacity: number;
}

/** A fixed, repeatable spread (no randomness at render time, so it never jumps around) */
const buildParticles = (count: number): Particle[] =>
  Array.from({ length: count }, (_, i) => {
    const seed = (i * 7919) % 1000;
    return {
      left: 4 + ((seed * 13) % 92),
      size: 10 + ((seed * 7) % 18),
      duration: 9 + ((seed * 3) % 8),
      delay: -((seed * 11) % 14),
      drift: ((seed % 41) - 20) * 1.4,
      kind: i % 4 === 0 ? 'sparkle' : 'heart',
      opacity: 0.18 + ((seed % 5) * 0.05),
    };
  });

const Heart: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />
  </svg>
);

const Sparkle: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 1l2.4 7.6L22 11l-7.6 2.4L12 21l-2.4-7.6L2 11l7.6-2.4z" />
  </svg>
);

/**
 * FloatingHearts
 * Soft hearts and sparkles that drift up behind the greeting. Decorative only; not rendered for reduced motion.
 */
const FloatingHearts: React.FC<{ count?: number }> = ({ count = 16 }) => {
  const reduce = useReducedMotion();
  const particles = useMemo(() => buildParticles(count), [count]);
  if (reduce) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden text-primary">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute bottom-[-30px]"
          style={{ left: `${p.left}%`, opacity: 0 }}
          animate={{
            y: [0, -460],
            x: [0, p.drift, -p.drift / 2],
            opacity: [0, p.opacity, p.opacity, 0],
            rotate: [0, p.drift / 2],
            scale: [0.8, 1, 0.9],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {p.kind === 'heart' ? <Heart size={p.size} /> : <Sparkle size={p.size * 0.8} />}
        </motion.span>
      ))}
    </div>
  );
};

export default FloatingHearts;
