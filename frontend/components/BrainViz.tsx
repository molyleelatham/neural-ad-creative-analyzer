"use client";

import React from "react";

/* BrainViz — animated coronal brain section with pulsing ROI activations.
   Reusable across landing/analyze/dashboard. Pure SVG + requestAnimationFrame. */

const ROI_DATA = [
  { id: 'attention',  label: 'Attention',     cx: 0.50, cy: 0.32, r: 0.06, phase: 0.0, base: 0.85 },
  { id: 'visual',     label: 'Visual cortex', cx: 0.50, cy: 0.78, r: 0.08, phase: 0.6, base: 0.92 },
  { id: 'emotion',    label: 'Emotion',       cx: 0.32, cy: 0.55, r: 0.05, phase: 1.2, base: 0.74 },
  { id: 'language',   label: 'Language',      cx: 0.30, cy: 0.42, r: 0.045, phase: 1.8, base: 0.61 },
  { id: 'memory',     label: 'Memory',        cx: 0.68, cy: 0.55, r: 0.05, phase: 2.4, base: 0.68 },
  { id: 'dmn',        label: 'Default mode',  cx: 0.62, cy: 0.40, r: 0.04, phase: 3.0, base: 0.45 },
];

function BrainViz({ size = 560, showLabels = true, mono = false, intensity = 1 }: {
  size?: number;
  showLabels?: boolean;
  mono?: boolean;
  intensity?: number;
}) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const W = size, H = size;
  const accent = mono ? '#1a1a1a' : '#3b82f6';
  const accentSoft = mono ? 'rgba(26,26,26,0.08)' : 'rgba(59, 130, 246, 0.1)';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="roiGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.12" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#e5e7eb" strokeOpacity="0.3" strokeWidth="0.5" />
        </pattern>
        <clipPath id="brainClip">
          <BrainOutline W={W} H={H} fillOnly />
        </clipPath>
      </defs>

      {/* Crosshair reticle */}
      <g stroke="#e5e7eb" strokeOpacity="0.3" strokeWidth="0.5">
        <line x1={W*0.5} y1="0" x2={W*0.5} y2={H} strokeDasharray="2 4" />
        <line x1="0" y1={H*0.5} x2={W} y2={H*0.5} strokeDasharray="2 4" />
      </g>

      {/* Brain outline (coronal-ish silhouette) */}
      <BrainOutline W={W} H={H} stroke="#9ca3af" strokeWidth={1.25} fill="url(#hatch)" />

      {/* Hemisphere divider */}
      <line x1={W*0.5} y1={H*0.18} x2={W*0.5} y2={H*0.86} stroke="#9ca3af" strokeOpacity="0.4" strokeWidth="0.75" />

      {/* ROI clipped activations */}
      <g clipPath="url(#brainClip)">
        {ROI_DATA.map((roi) => {
          const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + roi.phase);
          const activation = (roi.base * (0.55 + 0.45 * pulse)) * intensity;
          const cx = roi.cx * W;
          const cy = roi.cy * H;
          const rGlow = roi.r * W * (1.4 + 0.5 * pulse);
          return (
            <g key={roi.id}>
              <circle cx={cx} cy={cy} r={rGlow} fill="url(#roiGlow)" opacity={activation} />
              <circle cx={cx} cy={cy} r={roi.r * W * 0.45} fill={accent} opacity={0.85} />
              <circle cx={cx} cy={cy} r={roi.r * W * 0.45 + 1.5 * pulse} fill="none"
                      stroke={accent} strokeWidth="1" opacity={0.7 - 0.5 * pulse} />
            </g>
          );
        })}
      </g>

      {/* Crosshair tick markers around perimeter */}
      <g stroke="#9ca3af" strokeWidth="0.75" strokeOpacity="0.6" fill="none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <React.Fragment key={i}>
            <line x1={p * W} y1="0" x2={p * W} y2="6" />
            <line x1={p * W} y1={H} x2={p * W} y2={H - 6} />
            <line x1="0" y1={p * H} x2="6" y2={p * H} />
            <line x1={W} y1={p * H} x2={W - 6} y2={p * H} />
          </React.Fragment>
        ))}
      </g>

      {/* Labels with leader lines */}
      {showLabels && ROI_DATA.map((roi) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + roi.phase);
        const activation = roi.base * (0.55 + 0.45 * pulse);
        const cx = roi.cx * W;
        const cy = roi.cy * H;
        const onLeft = roi.cx < 0.5;
        const labelX = onLeft ? 18 : W - 18;
        const labelY = cy;
        const anchor = onLeft ? 'start' : 'end';
        return (
          <g key={`lbl-${roi.id}`}>
            <line x1={cx} y1={cy} x2={labelX + (onLeft ? -4 : 4)} y2={labelY}
                  stroke="#6b7280" strokeOpacity="0.4" strokeWidth="0.5" />
            <circle cx={labelX + (onLeft ? -4 : 4)} cy={labelY} r="1.5" fill="#6b7280" />
            <text x={labelX} y={labelY - 4} fontFamily="var(--font-geist-mono), monospace"
                  fontSize="9" fill="#374151" textAnchor={anchor}
                  letterSpacing="0.08em" style={{ textTransform: 'uppercase' }}>
              {roi.label}
            </text>
            <text x={labelX} y={labelY + 8} fontFamily="var(--font-geist-mono), monospace"
                  fontSize="10" fill={accent} textAnchor={anchor}
                  fontWeight="600">
              {(activation * 100).toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* Coronal-section silhouette — symmetrical, soft cerebral lobes */
function BrainOutline({ W, H, stroke = 'none', strokeWidth = 1, fill = 'transparent', fillOnly = false }: {
  W: number;
  H: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillOnly?: boolean;
}) {
  const cx = W * 0.5, cy = H * 0.52;
  const w = W * 0.42, h = H * 0.36;
  // Build a rounded brain-ish shape with bezier curves
  const d = `
    M ${cx - w * 0.95} ${cy - h * 0.15}
    C ${cx - w * 1.05} ${cy - h * 0.85}, ${cx - w * 0.55} ${cy - h * 1.15}, ${cx - w * 0.18} ${cy - h * 1.05}
    C ${cx - w * 0.05} ${cy - h * 1.12}, ${cx + w * 0.05} ${cy - h * 1.12}, ${cx + w * 0.18} ${cy - h * 1.05}
    C ${cx + w * 0.55} ${cy - h * 1.15}, ${cx + w * 1.05} ${cy - h * 0.85}, ${cx + w * 0.95} ${cy - h * 0.15}
    C ${cx + w * 1.02} ${cy + h * 0.55}, ${cx + w * 0.65} ${cy + h * 1.05}, ${cx + w * 0.25} ${cy + h * 1.0}
    C ${cx + w * 0.10} ${cy + h * 1.08}, ${cx - w * 0.10} ${cy + h * 1.08}, ${cx - w * 0.25} ${cy + h * 1.0}
    C ${cx - w * 0.65} ${cy + h * 1.05}, ${cx - w * 1.02} ${cy + h * 0.55}, ${cx - w * 0.95} ${cy - h * 0.15}
    Z
  `;
  if (fillOnly) return <path d={d} />;
  return <path d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />;
}

/* Animated ROI timeline — used in result panels */
function ROITimeline({ height = 80, color = '#3b82f6' }: {
  height?: number;
  color?: string;
}) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const W = 600, H = height;
  const N = 60;
  const points = Array.from({ length: N }, (_, i) => {
    const x = (i / (N - 1)) * W;
    const phase = i * 0.18;
    const y = H * 0.5
      + Math.sin(t * 0.8 + phase) * H * 0.18
      + Math.sin(t * 1.6 + phase * 1.7) * H * 0.12
      + Math.cos(t * 0.4 + phase * 0.6) * H * 0.08;
    return [x, H - y];
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export { BrainViz, ROITimeline };