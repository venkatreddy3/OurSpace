import React, { useEffect, useRef } from 'react';

interface DotFieldProps {
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  bulgeStrength?: number;
  glowRadius?: number;
  glowColor?: string;
  glowIntensity?: number;
  pattern?: 'grid' | 'hex';
  twist?: number;
  baseOpacity?: number;
  waveAmplitude?: number;
  speed?: number;
  sparkle?: boolean;
  interactive?: boolean;
  holdToZoom?: boolean;
  intro?: boolean;
  lightMode?: boolean;
  /** Drifting aurora glow colours rendered behind the dots (Stitch-style). */
  aurora?: string[];
  auroraIntensity?: number;
  /** Pan/zoom of a host canvas so the field scrolls with it. */
  offsetX?: number;
  offsetY?: number;
  zoomScale?: number;
}

/**
 * DotField Component
 * Purpose:
 * - Canvas dot lattice with a gentle ambient wave, a cursor bulge + glow,
 *   optional sparkle, an intro reveal, and hold-to-magnify.
 * - Fills its parent; pointer input is read from the window so it works
 *   while sitting underneath other interactive layers.
 */
/** Same colour at zero alpha, so gradients fade out without darkening. */
const fade = (color: string): string => {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return 'rgba(255,255,255,0)';
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`;
};

const DotField: React.FC<DotFieldProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    const start = performance.now();
    const mouse = { x: -9999, y: -9999, active: false, hold: 0, holding: false, bulge: 0, sx: 0, sy: 0 };
    const blobs: { x: number; y: number; r: number }[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      width = parent?.clientWidth || window.innerWidth;
      height = parent?.clientHeight || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= width && mouse.y <= height;
    };
    const onLeave = () => { mouse.active = false; };
    const onDown = () => { mouse.holding = true; };
    const onUp = () => { mouse.holding = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('blur', onUp);
    document.addEventListener('mouseleave', onLeave);

    const draw = (now: number) => {
      const p = propsRef.current;
      const {
        gradientFrom = '#ffffff', gradientTo = '#ffffff', gradientAngle = 0,
        dotRadius = 1.5, dotSpacing = 14, cursorRadius = 90, bulgeStrength = 0.5,
        glowRadius = 160, glowColor = '#ffffff', glowIntensity = 0.1,
        pattern = 'grid', twist = 0, baseOpacity = 0.45, waveAmplitude = 1.5,
        speed = 1, sparkle = false, interactive = true, holdToZoom = false,
        intro = false, lightMode = false, aurora = [], auroraIntensity = 0.5, offsetX = 0, offsetY = 0, zoomScale = 1,
      } = p;

      const t = ((now - start) / 1000) * speed;
      const introP = intro ? Math.min((now - start) / 1600, 1) : 1;
      const spacing = Math.max(dotSpacing * zoomScale, 6);
      const rowH = pattern === 'hex' ? spacing * 0.866 : spacing;

      // Hold-to-zoom eases a magnifying lens up while the pointer is down.
      const holdTarget = holdToZoom && mouse.holding && mouse.active ? 1 : 0;
      mouse.hold += (holdTarget - mouse.hold) * 0.12;
      const lens = 1 + mouse.hold * 0.3;
      const bulgeTarget = interactive && mouse.active ? 1 : 0;
      mouse.bulge += (bulgeTarget - mouse.bulge) * 0.1;
      const radiusC = cursorRadius * lens;

      ctx.clearRect(0, 0, width, height);

      // Linear gradient across the canvas at gradientAngle
      const a = (gradientAngle * Math.PI) / 180;
      const cx = width / 2, cy = height / 2;
      const half = (Math.abs(Math.cos(a)) * width + Math.abs(Math.sin(a)) * height) / 2;
      const grad = ctx.createLinearGradient(
        cx - Math.cos(a) * half, cy - Math.sin(a) * half,
        cx + Math.cos(a) * half, cy + Math.sin(a) * half,
      );
      grad.addColorStop(0, gradientFrom);
      grad.addColorStop(1, gradientTo);

      // Aurora: big soft colour blobs drifting along the bottom/sides,
      // plus one that trails the cursor. Also boosts nearby dots.
      blobs.length = 0;
      if (aurora.length) {
        if (mouse.sx === 0 && mouse.sy === 0) { mouse.sx = cx; mouse.sy = cy; }
        if (mouse.active) { mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06; }
        const base = Math.max(width, height);
        aurora.forEach((color, k) => {
          const ph = k * 2.1;
          const bx = width * (0.15 + 0.7 * ((k + 0.5) / aurora.length)) + Math.sin(t * 0.25 + ph) * width * 0.12;
          const by = height * (0.85 + Math.cos(t * 0.2 + ph) * 0.1);
          const br = base * (0.28 + 0.05 * Math.sin(t * 0.3 + ph));
          blobs.push({ x: bx, y: by, r: br });
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          g.addColorStop(0, color);
          g.addColorStop(1, fade(color));
          ctx.save();
          ctx.globalCompositeOperation = lightMode ? 'source-over' : 'lighter';
          ctx.globalAlpha = auroraIntensity * (lightMode ? 0.35 : 0.55);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        });
        if (mouse.bulge > 0.01) {
          const color = aurora[Math.floor(t / 3) % aurora.length];
          const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, glowRadius * 2.2 * lens);
          g.addColorStop(0, color);
          g.addColorStop(1, fade(color));
          ctx.save();
          ctx.globalCompositeOperation = lightMode ? 'source-over' : 'lighter';
          ctx.globalAlpha = auroraIntensity * 0.45 * mouse.bulge;
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
          blobs.push({ x: mouse.sx, y: mouse.sy, r: glowRadius * 1.6 * lens });
        }
      }

      // Cursor glow (lightMode darkens instead of lightens)
      if (mouse.bulge > 0.01 && glowIntensity > 0) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, glowRadius * lens);
        g.addColorStop(0, glowColor);
        g.addColorStop(1, fade(glowColor));
        ctx.save();
        ctx.globalAlpha = glowIntensity * mouse.bulge * (lightMode ? 0.6 : 1);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      const sx = ((offsetX % spacing) + spacing) % spacing;
      const sy = ((offsetY % rowH) + rowH) % rowH;
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / rowH) + 2;
      const maxDist = Math.hypot(cx, cy) || 1;

      ctx.fillStyle = grad;
      for (let j = -1; j < rows; j++) {
        const rowShift = pattern === 'hex' && j % 2 !== 0 ? spacing / 2 : 0;
        for (let i = -1; i < cols; i++) {
          let x = i * spacing + sx + rowShift;
          let y = j * rowH + sy;

          // Optional twist: rotate lattice around centre by distance
          if (twist) {
            const dx = x - cx, dy = y - cy;
            const ang = (Math.hypot(dx, dy) / maxDist) * twist;
            x = cx + dx * Math.cos(ang) - dy * Math.sin(ang);
            y = cy + dx * Math.sin(ang) + dy * Math.cos(ang);
          }

          // Ambient wave
          const wave = Math.sin(x * 0.02 + t) + Math.cos(y * 0.02 + t * 0.8);
          x += wave * waveAmplitude * 0.5;
          y += Math.sin(x * 0.02 - t * 0.9) * waveAmplitude * 0.5;

          let r = dotRadius * (1 + wave * 0.08);
          let alpha = baseOpacity;

          // Cursor bulge: push dots outward and swell them
          if (mouse.bulge > 0.01) {
            const dx = x - mouse.x, dy = y - mouse.y;
            const d = Math.hypot(dx, dy);
            if (d < radiusC && d > 0.001) {
              const f = (1 - d / radiusC) ** 2 * mouse.bulge;
              const push = f * bulgeStrength * 18 * lens;
              x += (dx / d) * push;
              y += (dy / d) * push;
              r += f * bulgeStrength * dotRadius * 2.2 * lens;
              alpha = Math.min(1, alpha + f * 0.55);
            }
          }

          // Dots brighten where aurora light falls
          for (let b = 0; b < blobs.length; b++) {
            const bd = Math.hypot(x - blobs[b].x, y - blobs[b].y) / blobs[b].r;
            if (bd < 1) alpha = Math.min(1, alpha + (1 - bd) * (1 - bd) * 0.5);
          }

          if (sparkle) {
            const s = Math.sin(t * 2.2 + i * 12.9898 + j * 78.233);
            if (s > 0.96) { r *= 1.8; alpha = Math.min(1, alpha + 0.5); }
          }

          if (introP < 1) {
            const dist = Math.hypot(x - cx, y - cy) / maxDist;
            const k = Math.min(Math.max((introP * 1.6 - dist * 0.6) / 0.4, 0), 1);
            r *= k;
            alpha *= k;
            if (k <= 0) continue;
          }

          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('blur', onUp);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default DotField;
