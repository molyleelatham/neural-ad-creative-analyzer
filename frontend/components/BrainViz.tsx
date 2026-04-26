"use client";

import React from "react";

const ROI_DATA = [
  // Limbic System (red/orange tones)
  { id: 'amygdala', label: 'Amygdala',      cx: 0.42, cy: 0.55, r: 0.04,  phase: 0.0, base: 0.78, system: 'Limbic' },
  { id: 'hippocampus', label: 'Hippocampus', cx: 0.38, cy: 0.52, r: 0.045, phase: 0.3, base: 0.72, system: 'Limbic' },
  { id: 'acc', label: 'Anterior Cingulate', cx: 0.50, cy: 0.35, r: 0.05,  phase: 0.6, base: 0.68, system: 'Limbic' },
  { id: 'insula', label: 'Insula',          cx: 0.58, cy: 0.48, r: 0.04,  phase: 0.9, base: 0.65, system: 'Limbic' },
  
  // Executive Functions (blue tones)
  { id: 'dlpfc', label: 'DLPFC',          cx: 0.35, cy: 0.28, r: 0.055, phase: 1.2, base: 0.81, system: 'Executive' },
  { id: 'vmpfc', label: 'Ventromedial PFC', cx: 0.52, cy: 0.38, r: 0.048, phase: 1.5, base: 0.75, system: 'Executive' },
  { id: 'parietal', label: 'Parietal',     cx: 0.65, cy: 0.42, r: 0.06,  phase: 1.8, base: 0.83, system: 'Executive' },
  
  // Reward System (yellow/orange tones)
  { id: 'striatum', label: 'Striatum',     cx: 0.48, cy: 0.52, r: 0.05,  phase: 2.1, base: 0.70, system: 'Reward' },
  { id: 'nacc', label: 'NAcc',            cx: 0.45, cy: 0.55, r: 0.04,  phase: 2.4, base: 0.67, system: 'Reward' },
  
  // Sensory Processing (purple tones)
  { id: 'visual', label: 'Visual Cortex', cx: 0.50, cy: 0.75, r: 0.08,  phase: 2.7, base: 0.88, system: 'Sensory' },
  { id: 'temporal', label: 'Temporal Lobe', cx: 0.72, cy: 0.58, r: 0.065, phase: 3.0, base: 0.76, system: 'Sensory' },
  { id: 'language', label: 'Language',    cx: 0.28, cy: 0.45, r: 0.045, phase: 3.3, base: 0.62, system: 'Sensory' },
];

const ACCENT      = 'oklch(0.55 0.08 180)';
const ACCENT_SOFT = 'oklch(0.92 0.03 180)';

// Data interface for brain activation
interface BrainData {
  roi_means?: {
    emotion: number;
    language: number;
    attention: number;
    visual: number;
    dmn: number;
  };
  peak_score?: number;
  peak_second?: number;
  sustained_score?: number;
}

function BrainViz({
  size = 560,
  showLabels = true,
  mono = false,
  intensity = 1,
  brainData,
}: {
  size?: number;
  showLabels?: boolean;
  mono?: boolean;
  intensity?: number;
  brainData?: BrainData | null;
}) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const W = size, H = size;
  const accent = mono ? '#1a1a1a' : ACCENT;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="roiGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={accent} stopOpacity="0.55" />
          <stop offset="60%"  stopColor={accent} stopOpacity="0.12" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#1a1a1a" strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
        <clipPath id="brainClip">
          <BrainOutline W={W} H={H} fillOnly />
        </clipPath>
      </defs>

      {/* Crosshair reticle */}
      <g stroke="#1a1a1a" strokeOpacity="0.15" strokeWidth="0.5">
        <line x1={W * 0.5} y1="0" x2={W * 0.5} y2={H} strokeDasharray="2 4" />
        <line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5} strokeDasharray="2 4" />
      </g>

      {/* Brain outline */}
      <BrainOutline W={W} H={H} stroke="#1a1a1a" strokeWidth={1.25} fill="url(#hatch)" />

      {/* Hemisphere divider */}
      <line
        x1={W * 0.5} y1={H * 0.18}
        x2={W * 0.5} y2={H * 0.86}
        stroke="#1a1a1a" strokeOpacity="0.25" strokeWidth="0.75"
      />

      {/* ROI activations clipped to brain */}
      <g clipPath="url(#brainClip)">
        {ROI_DATA.map((roi) => {
          const pulse      = 0.5 + 0.5 * Math.sin(t * 1.4 + roi.phase);
          
          // Use real brain data if available, otherwise fall back to mock data
          let realActivation = roi.base;
          if (brainData?.roi_means) {
            // Map the new ROI structure to available data
            switch (roi.id) {
              case 'amygdala':
              case 'hippocampus':
                realActivation = Math.min(1, brainData.roi_means.emotion / 100);
                break;
              case 'acc':
              case 'insula':
                realActivation = Math.min(1, (brainData.roi_means.emotion + brainData.roi_means.attention) / 200);
                break;
              case 'dlpfc':
              case 'vmpfc':
              case 'parietal':
                realActivation = Math.min(1, brainData.roi_means.attention / 100);
                break;
              case 'striatum':
              case 'nacc':
                realActivation = Math.min(1, (brainData.sustained_score || roi.base * 100) / 100);
                break;
              case 'visual':
                realActivation = Math.min(1, brainData.roi_means.visual / 100);
                break;
              case 'temporal':
              case 'language':
                realActivation = Math.min(1, brainData.roi_means.language / 100);
                break;
              default:
                realActivation = roi.base;
            }
          }
          
          const activation = realActivation * (0.55 + 0.45 * pulse) * intensity;
          const cx         = roi.cx * W;
          const cy         = roi.cy * H;
          const rGlow      = roi.r * W * (1.4 + 0.5 * pulse);
          
          // Color by brain system
          const systemColor = roi.system === 'Limbic' ? '#ef4444' :
                             roi.system === 'Executive' ? '#3b82f6' :
                             roi.system === 'Reward' ? '#f59e0b' :
                             roi.system === 'Sensory' ? '#8b5cf6' : accent;
          
          return (
            <g key={roi.id}>
              <circle cx={cx} cy={cy} r={rGlow} fill="url(#roiGlow)" opacity={activation} />
              <circle cx={cx} cy={cy} r={roi.r * W * 0.45} fill={systemColor} opacity={0.85} />
              <circle cx={cx} cy={cy} r={roi.r * W * 0.45 + 1.5 * pulse}
                fill="none" stroke={systemColor} strokeWidth="1" opacity={0.7 - 0.5 * pulse} />
            </g>
          );
        })}
      </g>

      {/* Tick markers */}
      <g stroke="#1a1a1a" strokeWidth="0.75" strokeOpacity="0.55" fill="none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <React.Fragment key={i}>
            <line x1={p * W} y1="0"  x2={p * W} y2="6" />
            <line x1={p * W} y1={H}  x2={p * W} y2={H - 6} />
            <line x1="0"    y1={p * H} x2="6"    y2={p * H} />
            <line x1={W}    y1={p * H} x2={W - 6} y2={p * H} />
          </React.Fragment>
        ))}
      </g>

      {/* Brain Systems Legend */}
      {showLabels && (
        <g transform={`translate(${W - 120}, 20)`}>
          <rect x="0" y="0" width="110" height="85" fill="white" fillOpacity="0.95" stroke="#1a1a1a" strokeOpacity="0.2" rx="4" />
          <text x="55" y="15" fontSize="10" fontWeight="600" textAnchor="middle" fill="#1a1a1a">Brain Systems</text>
          
          <circle cx="10" cy="25" r="3" fill="#ef4444" />
          <text x="18" y="28" fontSize="8" fill="#1a1a1a">Limbic</text>
          
          <circle cx="10" cy="37" r="3" fill="#3b82f6" />
          <text x="18" y="40" fontSize="8" fill="#1a1a1a">Executive</text>
          
          <circle cx="10" cy="49" r="3" fill="#f59e0b" />
          <text x="18" y="52" fontSize="8" fill="#1a1a1a">Reward</text>
          
          <circle cx="10" cy="61" r="3" fill="#8b5cf6" />
          <text x="18" y="64" fontSize="8" fill="#1a1a1a">Sensory</text>
          
          <text x="55" y="78" fontSize="7" textAnchor="middle" fill="#1a1a1a" fillOpacity="0.6">
            Neuromarketing Focus
          </text>
        </g>
      )}

      {/* Key Region Labels */}
      {showLabels && ROI_DATA.filter(roi => ['amygdala', 'vmpfc', 'striatum', 'visual'].includes(roi.id)).map((roi) => {
        const pulse      = 0.5 + 0.5 * Math.sin(t * 1.4 + roi.phase);
        const activation = roi.base * (0.55 + 0.45 * pulse);
        const cx         = roi.cx * W;
        const cy         = roi.cy * H;
        const onLeft     = roi.cx < 0.5;
        const labelX     = onLeft ? 18 : W - 130; // Adjust for legend
        const anchor     = onLeft ? 'start' : 'end';
        
        const systemColor = roi.system === 'Limbic' ? '#ef4444' :
                           roi.system === 'Executive' ? '#3b82f6' :
                           roi.system === 'Reward' ? '#f59e0b' :
                           roi.system === 'Sensory' ? '#8b5cf6' : accent;
        
        return (
          <g key={`lbl-${roi.id}`}>
            <line
              x1={cx} y1={cy}
              x2={labelX + (onLeft ? -4 : 4)} y2={cy}
              stroke="#1a1a1a" strokeOpacity="0.35" strokeWidth="0.5"
            />
            <circle cx={labelX + (onLeft ? -4 : 4)} cy={cy} r="1.5" fill={systemColor} />
            <text
              x={labelX} y={cy - 4}
              fontFamily="var(--v3-font-mono), 'JetBrains Mono', monospace"
              fontSize="9" fill="#1a1a1a" textAnchor={anchor}
              letterSpacing="0.08em" style={{ textTransform: 'uppercase' }}
            >
              {roi.label}
            </text>
            <text
              x={labelX} y={cy + 8}
              fontFamily="var(--v3-font-mono), 'JetBrains Mono', monospace"
              fontSize="10" fill={systemColor} textAnchor={anchor} fontWeight="600"
            >
              {(activation * 100).toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BrainOutline({
  W, H,
  stroke = 'none',
  strokeWidth = 1,
  fill = 'transparent',
  fillOnly = false,
}: {
  W: number; H: number;
  stroke?: string; strokeWidth?: number; fill?: string; fillOnly?: boolean;
}) {
  const cx = W * 0.5, cy = H * 0.52;
  const w  = W * 0.42,  h  = H * 0.36;
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

// Timeline data interface
interface TimelineData {
  second: number;
  posterior_P_convert: number;
  roi_attention: number;
  roi_emotion: number;
  roi_language: number;
  roi_visual: number;
  roi_dmn: number;
}

function ROITimeline({
  height = 80,
  color = ACCENT,
  timelineData,
}: {
  height?: number;
  color?: string;
  timelineData?: TimelineData[] | null;
}) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const W = 600, H = height, N = 60;
  let points: [number, number][];
  
  if (timelineData && timelineData.length > 0) {
    // Use real timeline data
    const maxSecond = Math.max(...timelineData.map(d => d.second));
    const maxValue = Math.max(...timelineData.map(d => d.posterior_P_convert));
    
    points = timelineData.map((data, i) => {
      const x = (data.second / maxSecond) * W;
      const y = (data.posterior_P_convert / maxValue) * H * 0.8 + H * 0.1; // Scale to 80% of height with 10% padding
      return [x, H - y] as [number, number];
    });
  } else {
    // Fall back to mock animated data
    points = Array.from({ length: N }, (_, i) => {
      const x     = (i / (N - 1)) * W;
      const phase = i * 0.18;
      const y     = H * 0.5
        + Math.sin(t * 0.8  + phase)       * H * 0.18
        + Math.sin(t * 1.6  + phase * 1.7) * H * 0.12
        + Math.cos(t * 0.4  + phase * 0.6) * H * 0.08;
      return [x, H - y] as [number, number];
    });
  }
  
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%" height={H}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export { BrainViz, ROITimeline };
