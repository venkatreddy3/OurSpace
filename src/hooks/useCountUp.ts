import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Counts up to `target` once `play` is true (and eases to a new target if it changes later).
 * People who prefer reduced motion get the final number straight away.
 */
export const useCountUp = (target: number, play: boolean, duration = 1100): number => {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!play) return;
    if (reduce) {
      latest.current = target;
      setValue(target);
      return;
    }
    const from = latest.current;
    if (from === target) return;
    const startedAt = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      latest.current = next;
      setValue(next);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, play, duration, reduce]);

  return value;
};

export default useCountUp;
