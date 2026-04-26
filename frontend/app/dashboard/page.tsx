"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { V3Nav } from '@/components/V3Nav';
import { ROITimeline } from '@/components/BrainViz';

const ACCENT = 'oklch(0.55 0.08 180)';

// Types for database data
interface Analysis {
  id: number;
  objective: string;
  audience_segment: string;
  mode: string;
  created_at: string;
  metadata: any;
  variants: Variant[];
}

interface Variant {
  id: number;
  variant_label: string;
  original_filename: string;
  visual_scores?: {
    purchase_score: number;
    engagement_score: number;
    virality_score: number;
    clarity_score: number;
  };
}

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
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real data from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = window.location.origin.includes('localhost') 
          ? 'http://localhost:8000' 
          : `${window.location.protocol}//${window.location.host.replace('3000', '8000')}`;
        
        // Fetch analyses and stats in parallel
        const [analysesRes, statsRes] = await Promise.all([
          fetch(`${baseUrl}/analyses?limit=20`),
          fetch(`${baseUrl}/stats`)
        ]);

        if (analysesRes.ok) {
          const analysesData = await analysesRes.json();
          setAnalyses(analysesData);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats from real data
  const calculateStats = () => {
    if (!analyses.length) return [
      { k: 'Total analyses', v: '0', d: 'No data yet', up: null },
      { k: 'Avg score', v: '--', d: 'Run analyses', up: null },
      { k: 'Database', v: 'Ready', d: 'Connected', up: true },
      { k: 'Status', v: 'Live', d: 'Operational', up: true },
    ];

    const allScores = analyses.flatMap(a => 
      a.variants.flatMap(v => 
        v.visual_scores ? [
          v.visual_scores.purchase_score,
          v.visual_scores.engagement_score,
          v.visual_scores.virality_score,
          v.visual_scores.clarity_score
        ] : []
      )
    );

    const avgScore = allScores.length > 0 
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
      : '--';

    const topAnalysis = analyses.reduce((top, current) => {
      const currentTop = current.variants.reduce((vTop, v) => {
        const score = v.visual_scores ? 
          Math.max(v.visual_scores.purchase_score, v.visual_scores.engagement_score) : 0;
        return score > vTop.score ? { score, name: v.original_filename } : vTop;
      }, { score: 0, name: '' });
      
      return currentTop.score > top.score ? currentTop : top;
    }, { score: 0, name: 'N/A' });

    return [
      { k: 'Total analyses', v: analyses.length.toString(), d: `${analyses.length} sessions`, up: true },
      { k: 'Avg score', v: avgScore, d: 'All metrics', up: parseFloat(avgScore) > 70 },
      { k: 'Top performer', v: topAnalysis.score.toFixed(1), d: topAnalysis.name, up: true },
      { k: 'Database', v: 'Live', d: 'Connected', up: true },
    ];
  };

  const displayStats = calculateStats();

  if (loading) {
    return (
      <div style={{ background: 'oklch(0.98 0.005 90)', minHeight: '100vh', fontFamily: 'var(--v3-font-sans)' }}>
        <V3Nav currentPage="dashboard" />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px 80px' }}>
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: 18, color: 'var(--v3-ink-2)' }}>Loading dashboard data...</div>
          </div>
        </div>
      </div>
    );
  }

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
          {displayStats.map((s) => (
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
          <p style={{ fontSize: 12, color: 'var(--v3-ink-3)', margin: '0 0 16px' }}>Last {period} · {analyses.length} analyses</p>
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

          {analyses.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--v3-ink-2)', marginBottom: 8 }}>No analyses yet</div>
              <div style={{ fontSize: 12, color: 'var(--v3-ink-3)', marginBottom: 16 }}>Run your first analysis to see data here</div>
              <Link href="/analyze" className="v3-btn v3-btn-primary" style={{ display: 'inline-block' }}>+ Run analysis</Link>
            </div>
          ) : (
            analyses.flatMap((analysis, analysisIndex) => 
              analysis.variants.map((variant, variantIndex) => {
                const score = variant.visual_scores ? 
                  Math.max(variant.visual_scores.purchase_score, variant.visual_scores.engagement_score) : 0;
                const trend = score > 75 ? '+12' : score > 60 ? '+3' : '-5';
                const seed = analysisIndex * 2 + variantIndex;
                
                return (
                  <div key={`${analysis.id}-${variant.id}`} style={{
                    display: 'grid', gridTemplateColumns: '60px 2fr 1fr 100px 80px 80px',
                    padding: '16px 24px', alignItems: 'center',
                    borderBottom: analysisIndex === analyses.length - 1 && variantIndex === analysis.variants.length - 1 
                      ? 'none' 
                      : '1px solid oklch(0.96 0.005 90)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'oklch(0.985 0.003 90)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>
                      {analysis.id}.{variantIndex + 1}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 40, borderRadius: 6, flexShrink: 0,
                        background: `linear-gradient(135deg, oklch(0.94 0.04 ${30 + seed * 50}), oklch(0.92 0.05 ${100 + seed * 30}))`,
                      }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>
                        {variant.original_filename}
                      </span>
                    </div>

                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999,
                      background: 'oklch(0.97 0.005 90)', color: 'var(--v3-ink-2)',
                      width: 'fit-content',
                    }}>
                      {analysis.objective}
                    </span>

                    <div style={{ paddingRight: 12 }}>
                      <MiniSpark seed={seed} />
                    </div>

                    <span className="mono" style={{
                      fontSize: 12, fontWeight: 600, textAlign: 'right',
                      color: trend.startsWith('−') ? 'var(--v3-bad)' : 'var(--v3-good)',
                    }}>{trend}</span>

                    <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, textAlign: 'right', color: 'var(--v3-ink)' }}>
                        {score.toFixed(1)}
                      </span>
                    </div>
                  );
              })
            )}
        </div>
      </div>
    </div>
  );
}
