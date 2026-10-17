import React, { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface InfiniteCanvasProps {
  children: React.ReactNode;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  zoomScale: number;
  setZoomScale: (zoom: number) => void;
  onImageDrop: (file: File, x: number, y: number) => void;
  /** Recenter on the notes; falls back to the origin when omitted */
  onRecenter?: () => void;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 3.0;

/**
 * InfiniteCanvas Component
 * Purpose:
 * - Wraps children in a single CSS transform: translate(pan) scale(zoom).
 * - Pins live in world-space so they scale/shrink with the canvas naturally.
 * - Exponential wheel zoom (smooth, direction-correct for both mouse & trackpad).
 * - Drag empty canvas to pan. Drop images to create PhotoPins.
 */
const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  children,
  pan,
  setPan,
  zoomScale,
  setZoomScale,
  onImageDrop,
  onRecenter,
}) => {
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(zoomScale);
  zoomRef.current = zoomScale;

  // Exponential zoom — correct direction for mouse wheel & trackpad pinch
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const current = zoomRef.current;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * Math.pow(1.0015, -e.deltaY)));
      setZoomScale(newScale);
    },
    [setZoomScale]
  );

  // Attach wheel listener as non-passive so preventDefault works
  const attachWheel = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      el.addEventListener('wheel', handleWheel, { passive: false });
    },
    [handleWheel]
  );

  const containerCallbackRef = useCallback(
    (el: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (!el) return;
      attachWheel(el);
    },
    [attachWheel]
  );

  // Handle Pan start — only on bare canvas, not on card children
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isCanvas =
      target === containerRef.current ||
      target.classList.contains('canvas-world') ||
      target.classList.contains('canvas-bg');
    if (!isCanvas) return;

    e.preventDefault();
    setIsPanning(true);

    panStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      setPan({
        x: panStart.current.panX + (moveEvt.clientX - panStart.current.mouseX),
        y: panStart.current.panY + (moveEvt.clientY - panStart.current.mouseY),
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag & Drop image handlers
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/') && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Convert screen coords → world coords
      const worldX = (e.clientX - rect.left - pan.x) / zoomScale;
      const worldY = (e.clientY - rect.top - pan.y) / zoomScale;
      onImageDrop(file, worldX, worldY);
    }
  };

  // HUD button zoom actions
  const zoomIn = () => setZoomScale(Math.min(zoomScale * 1.2, MAX_ZOOM));
  const zoomOut = () => setZoomScale(Math.max(zoomScale / 1.2, MIN_ZOOM));
  const resetView = () => {
    if (onRecenter) {
      onRecenter();
      return;
    }
    setZoomScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerCallbackRef}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full h-full overflow-hidden relative canvas-bg select-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* HUD Info Helper */}
      <div className="absolute top-4 left-4 z-30 hidden lg:block bg-surface border border-border-gray rounded-xl px-3 py-1.5 text-[10px] text-on-surface-variant font-mono pointer-events-none select-none">
        <span>🖱️ Drag to PAN &nbsp;•&nbsp; Scroll / Pinch to ZOOM &nbsp;•&nbsp; Drop image to PIN</span>
      </div>

      {/* World Space — single CSS transform carries pan + zoom */}
      <div
        className="canvas-world absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transformOrigin: '0 0',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomScale})`,
          willChange: 'transform',
        }}
      >
        {/* Infinite canvas surface — large enough to scroll freely */}
        <div className="absolute w-[8000px] h-[8000px] pointer-events-auto canvas-bg">
          {children}
        </div>
      </div>

      {/* Floating HUD Control Console */}
      <div className="absolute bottom-4 sm:bottom-6 right-3 sm:right-6 z-30 bg-surface border border-border-gray p-2 rounded-2xl flex flex-col gap-1.5 shadow-lg">
        <button
          onClick={zoomIn}
          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-all cursor-pointer"
          title="Recenter Canvas"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="flex justify-center border-t border-border-gray pt-1.5 mt-1.5 text-on-surface-variant">
          <Move className="w-3.5 h-3.5" />
        </div>
        {/* Live zoom % readout */}
        <div className="text-center text-[9px] font-mono text-on-surface-variant pb-0.5">
          {Math.round(zoomScale * 100)}%
        </div>
      </div>
    </div>
  );
};

export default InfiniteCanvas;
