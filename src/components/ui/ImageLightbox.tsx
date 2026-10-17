import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface LightboxItem {
  src: string;
  title?: string;
  subtitle?: string;
}

interface Props {
  items: LightboxItem[];
  /** Index of the photo being shown, or null when the viewer is closed */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

/**
 * ImageLightbox
 * Full-size photo viewer: dark backdrop, close button, previous/next (buttons and arrow keys),
 * Escape or a click outside the photo to close. Rendered in a portal so no parent can clip or cover it.
 */
const ImageLightbox: React.FC<Props> = ({ items, index, onClose, onIndexChange }) => {
  const isOpen = index !== null && index >= 0 && index < items.length;
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = items.length;

  const go = (step: number) => {
    if (index === null || count < 2) return;
    onIndexChange((index + step + count) % count);
  };

  // Keyboard: Escape closes, arrows move between photos
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Freeze the page behind and put the keyboard on the close button
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const item = isOpen ? items[index as number] : null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90"
          />

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close photo"
          >
            <X className="w-5 h-5" />
          </button>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <motion.figure
            key={index}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-[5] flex flex-col items-center gap-3 max-w-full"
          >
            <img
              src={item.src}
              alt={item.title || 'Photo'}
              draggable={false}
              className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl bg-black/20"
            />
            {(item.title || item.subtitle || count > 1) && (
              <figcaption className="text-center text-white">
                {item.title && <p className="font-serif text-lg font-semibold">{item.title}</p>}
                {item.subtitle && <p className="text-xs text-white/70 mt-0.5">{item.subtitle}</p>}
                {count > 1 && <p className="text-[11px] font-mono text-white/50 mt-1.5">{(index as number) + 1} / {count}</p>}
              </figcaption>
            )}
          </motion.figure>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ImageLightbox;
