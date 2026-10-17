import React, { useState, useRef, useLayoutEffect } from 'react';
import { PinItem, pinboardService } from '../../services/pinboard.service.js';
import { Trash2, GripHorizontal, Palette } from 'lucide-react';
import { clsx } from 'clsx';
import NoteDecor, { NoteCorner, cornerSize } from './NoteDecor';

interface StickyNoteProps {
  pin: PinItem;
  onDragStart: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const DEFAULT_W = 256;
const MIN_W = 180;
const MIN_H = 180;

const colorPresets = [
  // Solid pastel paper in both light and dark mode (matches the photo cards)
  { id: 'pastel-yellow', label: 'Yellow', bg: 'bg-yellow-100 border-yellow-400 text-yellow-900', circle: 'bg-yellow-500' },
  { id: 'neon-pink',     label: 'Pink',   bg: 'bg-pink-100 border-pink-400 text-pink-900',       circle: 'bg-pink-500' },
  { id: 'soft-lavender', label: 'Lavender', bg: 'bg-purple-100 border-purple-400 text-purple-900', circle: 'bg-purple-500' },
  { id: 'obsidian-glass', label: 'Obsidian', bg: 'bg-slate-100 border-slate-400 text-slate-900',  circle: 'bg-primary' },
];

/**
 * StickyNote Component
 * Purpose:
 * - Freeform, draggable sticky notes placed in world-space coordinates.
 * - Positioned with `left: pin.x` / `top: pin.y` inside the scaled world container.
 * - Resize handle (bottom-right) resizes both dimensions; text scales with card width.
 * - Auto-saves title/content on blur.
 */
const StickyNote: React.FC<StickyNoteProps> = ({
  pin,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  const [title, setTitle] = useState(pin.title);
  const [content, setContent] = useState(pin.content);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [cardW, setCardW] = useState(pin.width  || DEFAULT_W);
  const [cardH, setCardH] = useState(pin.height || 0); // 0 → auto height
  const cardRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const dragStartPos  = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 });
  const resizeStart   = useRef({ mouseX: 0, mouseY: 0, w: DEFAULT_W, h: 0 });

  const activeColor = colorPresets.find((c) => c.id === pin.color) || colorPresets[0];

  // Slight, stable tilt so the notes feel hand-placed (-1.8deg .. 1.8deg)
  const tilt = (() => {
    let h = 0;
    for (let i = 0; i < pin.id.length; i++) h = (h * 31 + pin.id.charCodeAt(i)) | 0;
    return ((Math.abs(h) % 360) / 360 - 0.5) * 3.6;
  })();

  // ── Proportional typography ────────────────────────────────────────────────
  const scaleFactor  = cardW / DEFAULT_W;
  const titleSize    = `${Math.max(17, Math.round(23 * scaleFactor))}px`;
  const bodySize     = `${Math.max(15, Math.round(18 * scaleFactor))}px`;
  const metaSize     = `${Math.max(9,  Math.round(11 * scaleFactor))}px`;
  const iconSize     = Math.max(12, Math.round(14 * scaleFactor));
  const padding      = Math.max(12, Math.round(16 * scaleFactor));

  // ── Utility: read canvas zoom from CSS transform ───────────────────────────
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
      const dh = (mv.clientY - resizeStart.current.mouseY) / z;
      setCardW(Math.max(MIN_W, resizeStart.current.w + dw));
      setCardH(Math.max(MIN_H, resizeStart.current.h + dh));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      pinboardService.updatePinSize(pin.id, cardW, cardRef.current?.offsetHeight || MIN_H);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  // Plain-text editor (a div, so the text can wrap around the corner illustration)
  useLayoutEffect(() => {
    const el = editRef.current;
    if (el && document.activeElement !== el && el.innerText !== pin.content) el.innerText = pin.content;
  }, [pin.content]);

  const handleBlur = () => {
    if (title !== pin.title || content !== pin.content) {
      pinboardService.updatePinContent(pin.id, title, content);
    }
  };

  const handleColorChange = (colorId: string) => {
    pinboardService.updatePinContent(pin.id, title, content, colorId);
    setShowColorPicker(false);
  };

  const lineHeightPx = Math.round(parseFloat(bodySize) * 1.3);
  const corner = cornerSize(activeColor.id, scaleFactor);
  const HAND = "'Caveat', 'Dancing Script', cursive";

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left:   pin.x,
        top:    pin.y,
        zIndex: pin.zIndex,
        width:  cardW,
        height: cardH > 0 ? cardH : undefined,
        transform: `rotate(${tilt}deg)`,
      }}
      className="group"
    >
      {/* Soft contact shadow so the paper looks slightly lifted at the bottom edge */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-2 left-5 right-5 h-5 rounded-[50%] bg-black/25 blur-md"
      />

      {/* ── Paper ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding,
          paddingTop: padding + Math.round(14 * scaleFactor),
          paddingBottom: Math.round(10 * scaleFactor),
          boxShadow: '0 1px 0 rgba(0,0,0,0.08), 0 14px 22px -12px rgba(0,0,0,0.4)',
        }}
        className={clsx(
          'relative h-full border-2 rounded-md flex flex-col overflow-hidden transition-colors duration-300',
          activeColor.bg,
        )}
      >
        {/* Paper grain */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-30"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* Folded corner */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 h-6 w-6"
          style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.16) 50%, var(--bg-background) 50%)', borderTopLeftRadius: 4 }}
        />

        {/* ── Drag Handle ──────────────────────────────────────────────────── */}
        <div
          onMouseDown={handleMouseDown}
          className="drag-handle flex items-center justify-center cursor-grab active:cursor-grabbing border-b border-dashed border-current/20 text-current opacity-50 hover:opacity-90 transition-colors"
          style={{ marginBottom: Math.round(12 * scaleFactor), paddingBottom: 4 }}
        >
          <GripHorizontal style={{ width: iconSize, height: iconSize }} />
        </div>

        {/* ── Editor Body ───────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ gap: Math.round(6 * scaleFactor) }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            placeholder="Title"
            style={{ fontSize: titleSize, lineHeight: 1.15, fontFamily: HAND, fontWeight: 700 }}
            className="w-full bg-transparent border-none font-bold placeholder-current/40 focus:outline-none focus:ring-0 p-0 shrink-0"
          />
          {/* Text area: the corner illustration floats top-right and the handwriting wraps around it */}
          <div
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              backgroundImage: 'linear-gradient(to bottom, transparent calc(100% - 1px), rgba(42,35,48,0.13) 100%)',
              backgroundSize: `100% ${lineHeightPx}px`,
              backgroundAttachment: 'local',
            }}
          >
            <div
              className="float-right pointer-events-none"
              aria-hidden="true"
              style={{
                width: corner.w,
                height: corner.h,
                marginLeft: 8,
                marginBottom: 2,
                shapeOutside: 'circle(60% at 50% 55%)',
              }}
            >
              <NoteCorner presetId={activeColor.id} scale={scaleFactor} />
            </div>
            <div
              ref={editRef}
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Note text"
              data-placeholder="Type something..."
              onInput={(e) => {
                const text = e.currentTarget.innerText;
                const isBlank = text.trim() === '';
                if (isBlank) e.currentTarget.innerHTML = '';
                setContent(isBlank ? '' : text);
              }}
              onBlur={handleBlur}
              style={{
                fontSize: bodySize,
                fontFamily: HAND,
                fontWeight: 500,
                lineHeight: `${lineHeightPx}px`,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                minHeight: lineHeightPx * 2,
              }}
              className="w-full focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:opacity-40"
            />
          </div>
        </div>

        {/* ── Bottom Controls ───────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between border-t border-dashed border-current/20 shrink-0"
          style={{ marginTop: Math.round(4 * scaleFactor), paddingTop: Math.round(4 * scaleFactor) }}
        >
          {/* Color palette */}
          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-0.5 text-current opacity-50 hover:opacity-90 transition-all rounded hover:bg-current/5 cursor-pointer"
              title="Change color"
            >
              <Palette style={{ width: iconSize, height: iconSize }} />
            </button>

            {/* Delete (beside the colour button) */}
            <button
              onClick={() => pinboardService.deletePin(pin.id)}
              className="p-0.5 text-current opacity-40 hover:text-red-400 transition-all rounded hover:bg-current/5 cursor-pointer"
              title="Delete Sticky"
            >
              <Trash2 style={{ width: iconSize, height: iconSize }} />
            </button>

            {showColorPicker && (
              <div className="absolute bottom-6 left-0 bg-surface-container border border-primary/10 rounded-xl p-1.5 flex gap-1 z-55 shadow-lg">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleColorChange(preset.id)}
                    style={{ width: 14, height: 14 }}
                    className={clsx('rounded-full transition-transform hover:scale-125 border border-white/25', preset.circle)}
                    title={preset.label}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Author badge */}
            <span
              className="uppercase tracking-wider font-mono px-1.5 rounded bg-current/5 text-current/60 border border-current/10"
              style={{ fontSize: metaSize }}
            >
              {pin.authorId === 'dev-user-uid' ? 'ME' : 'PA'}
            </span>
          </div>
        </div>

        {/* ── Resize Grip ───────────────────────────────────────────────────── */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-1.5 right-1.5 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity z-10"
          title="Resize"
        >
          <svg viewBox="0 0 10 10" className="text-current opacity-40 w-full h-full">
            <path d="M9 3L3 9M9 7L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* ── Doodles: tape / pin / flowers, kept inside the paper ───────────── */}
        <NoteDecor presetId={activeColor.id} scale={scaleFactor} />
      </div>
    </div>
  );
};

export default StickyNote;
