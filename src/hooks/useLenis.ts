import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * useLenis Smooth Scroll Hook
 * Purpose:
 * - Initializes Lenis scrolling client.
 * - Handles the requestAnimationFrame loop and cleans up on unmount.
 */
export const useLenis = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
};
export default useLenis;
