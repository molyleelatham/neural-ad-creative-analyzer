"use client";

import { useState } from 'react';
import Link from 'next/link';
import { V3Nav } from '@/components/V3Nav';
import { ROITimeline } from '@/components/BrainViz';

const ACCENT = 'oklch(0.55 0.08 180)';

const REPORTS = [
  { id: '0428', name: 'Hero_v3_final.mp4',       objective: 'Engagement', score: 78.4, trend: '+12', status: 'strong', seed: 0 },
  { id: '0427', name: 'Spring_Launch_A.jpg',      objective: 'Purchase',   score: 84.1, trend: '+18', status: 'strong', seed: 1 },
  { id: '0427', name: 'Spring_Launch_B.jpg',      objective: 'Purchase',   score: 71.6, trend: '−3',  status: 'avg',    seed: 2 },
  { id: '0425', name: 'Cohort_Static_07.png',     objective: 'Clarity',    score: 62.0, trend: '−9',  status: 'weak',   seed: 3 },
  { id: '0422', name: 'TikTok_Demo_A.mp4',        objective: 'Virality',   score: 89.7, trend: '+24', status: 'strong', seed: 4 },
  { id: '0418', name: 'Display_300x250.gif',      objective: 'Engagement', score: 54.3, trend: '−14', status: 'weak',   seed: 5 },
];

function MiniSpark({ seed = 0 }: { seed: number }) {
  const N = 20;
  const pts = Array.from({ length: N }, (_, i) => {
    const v = 0.5 + 0.4 * Math.sin(i * 0.6 + seed) + 0.2 * Math.cos(i * 0.3 + seed * 1.7);
    return [(i / (N - 1)) * 100, 30 - v * 26] as [number, number];
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L 100 30 L 0 30 Z`;
  return (
    <svg viewBox="0 0 100 30" style={{ width: '100%', height: 28 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={ACCENT} stopOpacity="0.3" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${seed})`} />
      <path d={path} stroke={ACCENT} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function card() {
  return {
    background: 'white', borderRadius: 16, padding: 24,
    border: '1px solid oklch(0.93 0.005 90)',
    boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)',
  } as React.CSSProperties;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('30D');

  return (
    <div style={{ background: 'oklch(0.98 0.005 90)', minHeight: '100vh', fontFamily: 'var(--v3-font-sans)' }}>
      <V3Nav currentPage="dashboard" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>
              ● ACME COSMETICS
            </div>
            <h1 style={{
              fontFamily: 'var(--v3-font-serif)',
              fontSize: 52, fontWeight: 400, margin: 0, letterSpacing: '-0.025em',
              color: 'var(--v3-ink)',
            }}>
              Brand overview
            </h1>
          </div>
          <Link href="/analyze" className="v3-btn v3-btn-primary">+ New analysis</Link>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { k: 'Avg composite', v: '74.1', d: '+4.2 vs last mo', up: true },
            { k: 'Top performer',  v: '89.7', d: 'TikTok_Demo_A',  up: true },
            { k: 'Industry pctile', v: '72',  d: 'cosmetics',       up: true },
            { k: 'Top pattern',    v: 'Face', d: '11/24 reports',   up: null },
          ].map((s) => (
            <div key={s.k} style={card()}>
              <div style={{ fontSize: 12, color: 'var(--v3-ink-3)', marginBottom: 8 }}>{s.k}</div>
              <div style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 40, fontWeight: 400, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--v3-ink)' }}>
                {s.v}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                {s.up !== null && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                    background: s.up ? 'oklch(0.94 0.06 155)' : 'oklch(0.94 0.06 30)',
                    color: s.up ? 'oklch(0.4 0.13 155)' : 'oklch(0.4 0.13 30)',
                  }}>{s.up ? '↑' : '↓'}</span>
                )}
                <span style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>{s.d}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Brand overview notes */}
        <p style={{ fontSize: 13, color: 'var(--v3-ink-3)', margin: '-8px 0 24px', lineHeight: 1.6 }}>
          This page is designed for submission to understand what this data could end up being, being able to run at full scale we would be able to give out baseline averages for industries and also understand how marketing and targeting in different industries affect our brain.
        </p>

        {/* Trend chart */}
        <div style={{ ...card(), padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 24, fontWeight: 400, margin: 0, color: 'var(--v3-ink)' }}>
              Composite trend
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {['7D', '30D', '90D'].map((p) => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '4px 12px', fontSize: 11, fontWeight: 500,
                  background: period === p ? 'oklch(0.97 0.005 90)' : 'transparent',
                  border: '1px solid oklch(0.93 0.005 90)',
                  borderRadius: 999, fontFamily: 'inherit', cursor: 'pointer',
                  color: 'var(--v3-ink)',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--v3-ink-3)', margin: '0 0 16px' }}>Last {period} · {REPORTS.length} reports</p>
          <ROITimeline height={140} />
        </div>

        {/* Reports table */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid oklch(0.92 0.005 90)', overflow: 'hidden', boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)' }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid oklch(0.95 0.005 90)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 400, margin: 0, color: 'var(--v3-ink)' }}>
              Recent reports
            </h3>
            <button style={{
              fontSize: 12, color: ACCENT, background: 'transparent', border: 'none',
              fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
            }}>View all →</button>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 2fr 1fr 100px 80px 80px',
            padding: '12px 24px',
            background: 'oklch(0.985 0.003 90)',
            borderBottom: '1px solid oklch(0.95 0.005 90)',
          }}>
            {['#', 'Creative', 'Objective', 'Trend', 'Δ', 'Score'].map((h, i) => (
              <span key={i} className="mono" style={{
                fontSize: 10, color: 'var(--v3-ink-3)', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                textAlign: i >= 3 ? 'right' : 'left',
              }}>{h}</span>
            ))}
          </div>

          {REPORTS.map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '60px 2fr 1fr 100px 80px 80px',
              padding: '16px 24px', alignItems: 'center',
              borderBottom: i < REPORTS.length - 1 ? '1px solid oklch(0.96 0.005 90)' : 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(0.985 0.003 90)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>{r.id}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 40, borderRadius: 6, flexShrink: 0,
                  background: `linear-gradient(135deg, oklch(0.94 0.04 ${30 + r.seed * 50}), oklch(0.92 0.05 ${100 + r.seed * 30}))`,
                }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>{r.name}</span>
              </div>

              <span style={{
                fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999,
                background: 'oklch(0.97 0.005 90)', color: 'var(--v3-ink-2)',
                width: 'fit-content',
              }}>{r.objective}</span>

              <div style={{ paddingRight: 12 }}>
                <MiniSpark seed={r.seed} />
              </div>

              <span className="mono" style={{
                fontSize: 12, fontWeight: 600, textAlign: 'right',
                color: r.trend.startsWith('−') ? 'var(--v3-bad)' : 'var(--v3-good)',
              }}>{r.trend}</span>

              <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, textAlign: 'right', color: 'var(--v3-ink)' }}>
                {r.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
