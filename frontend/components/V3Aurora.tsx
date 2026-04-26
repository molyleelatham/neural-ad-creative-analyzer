"use client";

import { useEffect, useRef } from 'react';

export function V3Aurora({ opacity = 0.55 }: { opacity?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (ref.current) {
        const x1 = 30 + Math.sin(t * 0.13) * 15;
        const y1 = 25 + Math.cos(t * 0.09) * 10;
        const x2 = 70 + Math.cos(t * 0.11) * 18;
        const y2 = 75 + Math.sin(t * 0.15) * 12;
        ref.current.style.background = [
          `radial-gradient(circle at ${x1}% ${y1}%, oklch(0.92 0.06 180 / 0.7) 0%, transparent 45%)`,
          `radial-gradient(circle at ${x2}% ${y2}%, oklch(0.94 0.05 45 / 0.5) 0%, transparent 50%)`,
          `radial-gradient(circle at 50% 50%, oklch(0.97 0.02 200 / 0.4) 0%, transparent 60%)`,
        ].join(', ');
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        filter: 'blur(40px)',
        zIndex: 0,
      }}
    />
  );
}
