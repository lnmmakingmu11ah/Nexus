import React, { useEffect, useRef } from 'react';

interface StreakBurstProps {
  /** Fires the burst animation when this flips to true */
  active: boolean;
  /** Callback when animation completes */
  onDone?: () => void;
  /** Size of burst area in px (default 80) */
  size?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  radius: number;
  color: string;
  decay: number;
}

const COLORS = [
  '#fbbf24', // amber
  '#34d399', // emerald
  '#60a5fa', // blue
  '#f472b6', // pink
  '#a78bfa', // violet
  '#fb923c', // orange
];

export const StreakBurst: React.FC<StreakBurstProps> = ({
  active,
  onDone,
  size = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;

    // Generate particles
    const particles: Particle[] = Array.from({ length: 22 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.4;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        radius: 2 + Math.random() * 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        decay: 0.028 + Math.random() * 0.018,
      };
    });

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      let allFaded = true;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.alpha -= p.decay;
        if (p.alpha > 0) {
          allFaded = false;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.restore();
        }
      }

      if (allFaded) {
        ctx.clearRect(0, 0, size, size);
        onDone?.();
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, size, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="pointer-events-none absolute inset-0 z-50"
      style={{ width: size, height: size }}
    />
  );
};

/**
 * Hook to manage StreakBurst trigger state.
 * Call `triggerBurst()` to fire the animation.
 * Pass `burstActive` to `<StreakBurst active={burstActive} onDone={resetBurst} />`
 */
export function useStreakBurst() {
  const [burstActive, setBurstActive] = React.useState(false);

  const triggerBurst = React.useCallback(() => {
    setBurstActive(false);
    // Micro delay forces React to re-mount canvas so animation restarts
    requestAnimationFrame(() => setBurstActive(true));
  }, []);

  const resetBurst = React.useCallback(() => setBurstActive(false), []);

  return { burstActive, triggerBurst, resetBurst };
}
