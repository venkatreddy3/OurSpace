import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './DotGrid.css';

interface DotGridProps {
  baseColor?: string;
  activeColor?: string;
  shockRadius?: number;
  shockStrength?: number;
  dotSize?: number;
  gap?: number;
  offsetX?: number;
  offsetY?: number;
  zoomScale?: number;
  proximity?: number;
  resistance?: number;
  returnDuration?: number;
}

interface Dot {
  x: number;
  y: number;
  currentRadius: number;
  targetRadius: number;
  color: string;
  glow: number;
}

interface Ripple {
  x: number;
  y: number;
  progress: number;
  id: number;
}

/**
 * DotGrid Component
 * Purpose:
 * - HTML5 Canvas graph background.
 * - Draws grid nodes scaling on hover proximity.
 * - Triggers expanding click ripples fading out over returnDuration seconds.
 */
const DotGrid: React.FC<DotGridProps> = ({
  baseColor = '#2A2A35',
  activeColor = '#FF2A85',
  shockRadius = 100,
  shockStrength = 3,
  dotSize = 3,
  gap = 24,
  offsetX = 0,
  offsetY = 0,
  zoomScale = 1.0,
  proximity = 50,
  resistance = 750,
  returnDuration = 1.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fade in canvas on mount
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 0.8, duration: 1.2, ease: 'power2.out' });

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    const mouse = { x: -9999, y: -9999, active: false };
    const spacing = Math.max(gap * zoomScale, 10);
    let dots: Dot[] = [];

    const initDots = () => {
      dots = [];
      const startX = offsetX % spacing;
      const startY = offsetY % spacing;

      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          dots.push({
            x: i * spacing + startX,
            y: j * spacing + startY,
            currentRadius: dotSize,
            targetRadius: dotSize,
            color: baseColor,
            glow: 0,
          });
        }
      }
    };

    initDots();

    // Click ripples sweep tracking
    let ripples: Ripple[] = [];
    let nextRippleId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      dots.forEach((dot) => {
        let targetRadius = dotSize;
        let targetColor = baseColor;
        let targetGlow = 0;

        // 1. Mouse hover proximity check
        if (mouse.active) {
          const dx = mouse.x - dot.x;
          const dy = mouse.y - dot.y;
          const distSq = dx * dx + dy * dy;
          const proximitySq = proximity * proximity;

          if (distSq < proximitySq) {
            const dist = Math.sqrt(distSq);
            const factor = (proximity - dist) / proximity;
            targetRadius = dotSize + factor * 2;
            targetColor = activeColor;
            targetGlow = factor;
          }
        }

        // 2. Click shockwave ripples sweep check
        ripples.forEach((ripple) => {
          const dx = dot.x - ripple.x;
          const dy = dot.y - ripple.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Current shock radius based on progress
          const currentR = ripple.progress * shockRadius;
          const ringThickness = 24; // width of the ripple ring

          if (Math.abs(dist - currentR) < ringThickness) {
            const ringFactor = 1 - Math.abs(dist - currentR) / ringThickness; // 0 to 1
            const fadeFactor = 1 - ripple.progress; // 1 to 0 fade out
            
            // Adjust strength based on resistance factor
            const strengthFactor = (1000 - resistance) / 1000;
            const sizeOffset = ringFactor * fadeFactor * shockStrength * Math.max(strengthFactor, 0.1);

            targetRadius += sizeOffset;
            targetColor = activeColor;
            targetGlow = Math.max(targetGlow, ringFactor * fadeFactor);
          }
        });

        // Dampened spring animations
        dot.currentRadius += (targetRadius - dot.currentRadius) * 0.12;
        dot.glow += (targetGlow - dot.glow) * 0.12;

        ctx.fillStyle = targetColor;
        
        if (dot.glow > 0.05) {
          ctx.shadowBlur = dot.glow * 6;
          ctx.shadowColor = activeColor;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const handleMouseClick = (e: MouseEvent) => {
      const clickX = e.clientX;
      const clickY = e.clientY;

      const rippleId = nextRippleId++;
      const newRipple: Ripple = { x: clickX, y: clickY, progress: 0, id: rippleId };
      ripples.push(newRipple);

      // Animate ripple progression using GSAP
      gsap.to(newRipple, {
        progress: 1,
        duration: returnDuration,
        ease: 'quad.out',
        onComplete: () => {
          // Remove ripple from array
          ripples = ripples.filter((r) => r.id !== rippleId);
        },
      });
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initDots();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleMouseClick);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('resize', handleResize);
    };
  }, [baseColor, activeColor, shockRadius, shockStrength, dotSize, gap, offsetX, offsetY, zoomScale, proximity, resistance, returnDuration]);

  return <canvas ref={canvasRef} className="dot-grid-canvas" />;
};

export default DotGrid;
