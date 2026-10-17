import React, { useState, useRef } from 'react';
import { PinItem, pinboardService } from '../../services/pinboard.service.js';
import { Trash2, GripHorizontal, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlankDoodle, PhotoSticker, PhotoTape, photoTheme, photoTilt } from './PhotoDecor.js';

interface PhotoPinProps {
  pin: PinItem;
  onDragStart: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const DEFAULT_W = 224;
const MIN_W = 180;
const MIN_H = 180;

/**
 * PhotoPin Component
 * Purpose:
 * - Polaroid styled photo slots on the freeform board.
 * - Positioned in world-space (left: pin.x / top: pin.y).
 * - Resize handle (bottom-right) resizes the card; caption/icon sizes scale with width.
 * - Lightbox for full-screen image preview.
 */
const PhotoPin: React.FC<PhotoPinProps> = ({
  pin,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  const [caption, setCaption] = useState(pin.content);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cardW, setCardW] = useState(pin.width || DEFAULT_W);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 });
  const resizeStart  = useRef({ mouseX: 0, mouseY: 0, w: DEFAULT_W, h: 0 });

  // ── Proportional typography ────────────────────────────────────────────────
  const scaleFactor  = cardW / DEFAULT_W;
  const metaSize     = `${Math.max(9,  Math.round(11 * scaleFactor))}px`;
  const iconSize     = Math.max(12, Math.round(14 * scaleFactor));
  const padding      = Math.max(10, Math.round(12 * scaleFactor));
  const theme        = photoTheme(pin.id);
  const tilt         = photoTilt(pin.id);
  const HAND         = "'Caveat', 'Dancing Script', cursive";

  // ── Read canvas zoom from CSS transform ───────────────────────────────────
  const getZoom = (): number => {
    const world = cardRef.current?.closest('.canvas-world') as HTMLElement | null;
    if (!world) return 1;
    return new DOMMatrix(getComputedStyle(world).transform).a;
  };

  // ── Drag to reposition ─────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.preventDefault();
    onDragStart(pin.id);
    dragStartPos.current = { mouseX: e.clientX, mouseY: e.clientY, cardX: pin.x, cardY: pin.y };

    const onMove = (mv: MouseEvent) => {
      const z = getZoom();
      onDrag(pin.id,
        dragStartPos.current.cardX + (mv.clientX - dragStartPos.current.mouseX) / z,
        dragStartPos.current.cardY + (mv.clientY - dragStartPos.current.mouseY) / z,
      );
    };
    const onUp = (up: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      const z = getZoom();
      onDragEnd(pin.id,
        dragStartPos.current.cardX + (up.clientX - dragStartPos.current.mouseX) / z,
        dragStartPos.current.cardY + (up.clientY - dragStartPos.current.mouseY) / z,
      );
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  // ── Resize handle ──────────────────────────────────────────────────────────
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const h0 = cardRef.current?.offsetHeight || MIN_H;
    resizeStart.current = { mouseX: e.clientX, mouseY: e.clientY, w: cardW, h: h0 };

    const onMove = (mv: MouseEvent) => {
      const z  = getZoom();
      const dw = (mv.clientX - resizeStart.current.mouseX) / z;
      setCardW(Math.max(MIN_W, resizeStart.current.w + dw));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      pinboardService.updatePinSize(pin.id, cardW, cardRef.current?.offsetHeight || MIN_H);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  const handleBlur = () => {
    if (caption !== pin.content) {
      pinboardService.updatePinContent(pin.id, pin.title, caption);
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left:   pin.x,
          top:    pin.y,
          zIndex: pin.zIndex,
          width:  cardW,
          padding,
          background: theme.paper,
          border: `2px solid ${theme.soft}`,
          transform: `rotate(${tilt}deg)`,
          color: '#2A2330',
        }}
        className="rounded-2xl flex flex-col shadow-2xl relative group select-none overflow-hidden transition-shadow duration-300 hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]"
      >
        {/* ── Washi tape on the corners ──────────────────────────────────── */}
        <PhotoTape theme={theme} scale={scaleFactor} side="left" />
        <PhotoTape theme={theme} scale={scaleFactor} side="right" />

        {/* ── Drag Handle ────────────────────────────────────────────────── */}
        <div
          onMouseDown={handleMouseDown}
          className="drag-handle relative flex items-center justify-center cursor-grab active:cursor-grabbing text-current opacity-50 hover:opacity-90 transition-opacity"
          style={{ marginBottom: Math.round(10 * scaleFactor), paddingBottom: 4, borderBottom: `1.5px dashed ${theme.soft}` }}
        >
          <GripHorizontal style={{ width: iconSize, height: iconSize }} />
        </div>

        {/* ── Polaroid Frame + sticker ───────────────────────────────────── */}
        <div className="relative">
          <div
            className="relative flex items-center justify-center overflow-hidden aspect-[4/3] rounded-md bg-white"
            style={{ padding: Math.max(4, Math.round(5 * scaleFactor)), boxShadow: `0 2px 8px -2px ${theme.accent}55, inset 0 0 0 1.5px ${theme.soft}` }}
          >
            <div className="w-full h-full rounded-[3px] overflow-hidden relative flex items-center justify-center bg-black/5">
              {pin.photoUrl ? (
                <img
                  src={pin.photoUrl}
                  alt="Polaroid"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <span style={{ fontSize: metaSize }} className="opacity-50 font-mono">
                  No Image Asset
                </span>
              )}

              {/* Fullscreen trigger */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 border border-zinc-800 text-zinc-300 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Enlarge Image"
              >
                <Maximize2 style={{ width: iconSize, height: iconSize }} />
              </button>
            </div>
          </div>
          <PhotoSticker theme={theme} size={Math.round(34 * scaleFactor)} />
        </div>

        {/* ── Caption (handwritten) with doodles either side ─────────────── */}
        <div
          className="relative text-center"
          style={{ marginTop: Math.round(14 * scaleFactor), paddingLeft: Math.round(26 * scaleFactor), paddingRight: Math.round(26 * scaleFactor) }}
        >
          <FlankDoodle kind={theme.left} theme={theme} size={Math.round(22 * scaleFactor)} rotate={-12} className="left-0 top-1/2 -translate-y-1/2" />
          <FlankDoodle kind={theme.right} theme={theme} size={Math.round(22 * scaleFactor)} rotate={12} className="right-0 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={handleBlur}
            placeholder="Write a caption..."
            style={{ fontSize: `${Math.max(16, Math.round(21 * scaleFactor))}px`, fontFamily: HAND, fontWeight: 700, color: theme.accent }}
            className="w-full bg-transparent border-none placeholder:opacity-40 text-center focus:outline-none focus:ring-0 py-0.5"
          />
          {/* hand-drawn underline */}
          <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="block w-2/3 mx-auto" style={{ height: 6 }} aria-hidden>
            <path d="M1 3 C12 0 20 6 32 3 S52 0 64 3 S86 6 99 2" fill="none" stroke={theme.accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>

        {/* ── Bottom Controls ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between"
          style={{
            marginTop:  Math.round(10 * scaleFactor),
            paddingTop: Math.round(8  * scaleFactor),
            fontSize:   metaSize,
            borderTop: `1.5px dashed ${theme.soft}`,
          }}
        >
          <span className="font-mono tracking-wide opacity-60">
            {pin.authorId === 'dev-user-uid' ? 'ME' : 'PA'}
          </span>
          <button
            onClick={() => pinboardService.deletePin(pin.id)}
            className="opacity-50 hover:opacity-100 hover:text-red-500 p-1 rounded hover:bg-black/5 transition-all cursor-pointer"
            title="Delete Photo"
          >
            <Trash2 style={{ width: iconSize, height: iconSize }} />
          </button>
        </div>

        {/* ── Resize Grip ─────────────────────────────────────────────────── */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-1.5 right-1.5 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity z-10"
          title="Resize"
        >
          <svg viewBox="0 0 10 10" className="text-current opacity-60 w-full h-full">
            <path d="M9 3L3 9M9 7L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxOpen(false)}
              className="absolute inset-0 bg-black/95"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="max-w-4xl max-h-[85vh] z-10 flex flex-col items-center gap-4 relative"
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-12 right-0 text-on-surface-variant hover:text-on-surface bg-surface-container border border-primary/10 p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="bg-surface-container border border-primary/10 p-4 rounded-3xl shadow-2xl max-w-full flex flex-col items-center">
                <img
                  src={pin.photoUrl}
                  alt="Polaroid large"
                  className="max-h-[70vh] rounded-xl object-contain max-w-full"
                />
                {pin.content && (
                  <p className="text-sm text-rose-450 dark:text-rose-300 font-serif italic mt-4 text-center">
                    {pin.content}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PhotoPin;
