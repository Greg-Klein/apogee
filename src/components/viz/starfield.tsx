'use client';

import { memo, useEffect, useRef } from 'react';

/**
 * Ambient star layer.
 *
 * Isolated leaf component, fixed and pointer-inert, so it never repaints with the
 * scrolling document. Drawn once per resize and animated by opacity only; the whole
 * effect is skipped when the visitor asks for reduced motion.
 */
function StarfieldImpl() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let stars: Array<{ x: number; y: number; r: number; base: number; speed: number; phase: number }> = [];
    let dpr = 1;

    const seed = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = Math.min(260, Math.round((w * h) / 7800));
      stars = Array.from({ length: density }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.86 ? Math.random() * 0.7 + 0.25 : Math.random() * 1.2 + 0.8,
        base: Math.random() * 0.4 + 0.16,
        speed: Math.random() * 0.0009 + 0.0003,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = reduced ? s.base : s.base + Math.sin(t * s.speed + s.phase) * 0.14;
        ctx.globalAlpha = Math.max(0.04, a);
        ctx.fillStyle = s.r > 0.9 ? '#9fc0ff' : '#dfe6f5';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduced) frame = requestAnimationFrame(draw);
    };

    seed();
    frame = requestAnimationFrame(draw);

    let resizeTimer: number;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        seed();
        if (reduced) draw(0);
      }, 180);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-70" />;
}

export const Starfield = memo(StarfieldImpl);
