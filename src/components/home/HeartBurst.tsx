import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * HeartBurst
 * A little shower of hearts that flies out from the centre of its parent each time `trigger` increases.
 * Put it inside a `relative` element. The flight itself is a CSS animation (`heart-burst` in index.css).
 * Decorative; skipped for reduced motion.
 */
const COUNT = 14;

const HeartBurst: React.FC<{ trigger: number }> = ({ trigger }) => {
  const reduce = useReducedMotion();
  const [visibleFor, setVisibleFor] = useState(0);

  // Same fan of directions every time, so it reads as a burst
  const hearts = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + (i % 2) * 0.25;
        const reach = 70 + (i % 4) * 28;
        return {
          x: Math.round(Math.cos(angle) * reach),
          y: Math.round(Math.sin(angle) * reach - 30),
          size: 14 + (i % 3) * 5,
          spin: (i % 2 ? 1 : -1) * (20 + i * 4),
          delay: (i % 5) * 0.03,
        };
      }),
    []
  );

  useEffect(() => {
    if (trigger === 0 || reduce) return;
    setVisibleFor(trigger);
    const t = setTimeout(() => setVisibleFor(0), 1500);
    return () => clearTimeout(t);
  }, [trigger, reduce]);

  if (!visibleFor) return null;

  return (
    <div aria-hidden="true" key={visibleFor} className="pointer-events-none absolute left-1/2 top-1/2 text-primary">
      {hearts.map((h, i) => (
        <svg
          key={i}
          width={h.size}
          height={h.size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className="heart-burst absolute -ml-2 -mt-2"
          style={
            {
              '--x': `${h.x}px`,
              '--y': `${h.y}px`,
              '--spin': `${h.spin}deg`,
              animationDelay: `${h.delay}s`,
            } as React.CSSProperties
          }
        >
          <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />
        </svg>
      ))}
    </div>
  );
};

export default HeartBurst;
