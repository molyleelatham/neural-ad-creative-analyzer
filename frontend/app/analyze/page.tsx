"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';
import { V3Nav } from '@/components/V3Nav';
import { BrainViz, ROITimeline } from '@/components/BrainViz';

const ACCENT  = 'oklch(0.55 0.08 180)';
const BACKEND = '/api';

// ── Types matching backend ──────────────────────────────────────────────────
type CampaignObjective = 'purchase' | 'engagement' | 'virality' | 'clarity';
type AudienceSegment = 'budget_sensitive' | 'social_proof_driven' | 'viral_share_oriented' | 'premium_brand_oriented';

interface AnalysisResult {
  mode: 'single' | 'compare';
  variants: Array<{
    variant_id: string;
    filename: string;
    visual: {
      scores: {
        purchase: number;
        engagement: number;
        virality: number;
        clarity: number;
      };
      neural_features: {
        attention_score: number;
        emotional_intensity: number;
        memory_encoding: number;
        p_convert_peak: number;
      };
      segments: Array<{
        label: string;
        confidence: number;
        visual_weight_pct: number;
        pillar?: string;
      }>;
    };
    brain_single?: {
      ad: {
        ad_id: string;
        T_seconds: number;
        peak_score: number;
        peak_second: number;
        sustained_score: number;
        dropoff_penalty: number;
        composite_score: number;
        dominant_emotion_overall: string;
        roi_means: {
          emotion: number;
          language: number;
          attention: number;
          visual: number;
          dmn: number;
        };
        timeline: Array<{
          second: number;
          dominant_emotion: string;
          posterior_P_convert: number;
          roi_emotion: number;
          roi_language: number;
          roi_attention: number;
          roi_visual: number;
          roi_dmn: number;
        }>;
      };
      vs_baseline?: {
        ad_id: string;
        verdict: string;
        percentile: number;
        score_vs_baseline: Record<string, {
          ad_value: number;
          baseline: number;
          delta: number;
          z_score: number;
          percentile: number;
        }>;
        roi_vs_baseline: Record<string, {
          ad_value: number;
          baseline: number;
          delta: number;
          z_score: number;
          percentile: number;
        }>;
      };
      pillars: Array<{
        key: string;
        label: string;
        description: string;
        score: number;
        roi_contributions: Record<string, number>;
        brain_regions: string[];
        color: string;
      }>;
      pillar_timeline: Array<{
        second: number;
        hook: number;
        emotion: number;
        persuasion: number;
        memory: number;
        sensory: number;
        engagement: number;
      }>;
      brain: {
        n_vertices: number;
        n_left: number;
        n_right: number;
        duration_seconds: number;
        regions: Array<{
          roi: string;
          label: string;
          mean_activation: number;
          peak_activation: number;
          peak_second: number;
          vertex_range: number[][];
        }>;
        vertex_activations_mean: number[];
        vertex_activations_peak: number[];
      };
      llm_interpretation?: string;
    };
  }>;
  explanation: string;
  recommendations: string[];
  warnings?: string[];
  // New fields for enhanced LLM evaluation
  narrative_source?: string;
  narrative_model?: string;
  // Baseline comparison for single mode
  baseline_comparison?: {
    ad_id: string;
    verdict: string;
    percentile: number;
    score_vs_baseline: Record<string, {
      ad_value: number;
      baseline: number;
      delta: number;
      z_score: number;
      percentile: number;
    }>;
    roi_vs_baseline: Record<string, {
      ad_value: number;
      baseline: number;
      delta: number;
      z_score: number;
      percentile: number;
    }>;
  };
}

function pillBtn(primary?: boolean) {
  return {
    background: primary ? 'var(--v3-ink)' : 'white',
    color: primary ? 'white' : 'var(--v3-ink)',
    border: primary ? 'none' : '1px solid oklch(0.92 0.005 90)',
    padding: '9px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit', cursor: 'pointer',
    boxShadow: primary ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
  } as React.CSSProperties;
}

function card() {
  return {
    background: 'white', borderRadius: 16, padding: 24,
    border: '1px solid oklch(0.93 0.005 90)',
    boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)',
  } as React.CSSProperties;
}

// ── Upload drop zone ────────────────────────────────────────────────────────
function DropZone({
  label, file, onFile,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      style={{
        border: `2px dashed ${dragging ? ACCENT : 'oklch(0.88 0.005 90)'}`,
        borderRadius: 16, padding: 28,
        background: dragging ? 'oklch(0.96 0.04 180 / 0.15)' : 'oklch(0.985 0.003 90)',
        cursor: 'pointer', textAlign: 'center',
        transition: 'all 0.18s',
      }}
    >
      <input
        ref={inputRef} type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {file ? (
        <>
          <div style={{ fontSize: 28, marginBottom: 8 }}>
            {file.type.startsWith('video') ? '🎬' : '🖼️'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>{file.name}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)', marginTop: 4 }}>
            {(file.size / 1024 / 1024).toFixed(2)} MB · click to change
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, marginBottom: 10 }}>↑</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--v3-ink)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--v3-ink-3)' }}>Image or video · drag & drop or click</div>
        </>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const [mode, setMode]             = useState<'single' | 'compare'>('single');
  const [tab, setTab]               = useState<'vision' | 'brain' | 'summary'>('vision');
  const [fileA, setFileA]           = useState<File | null>(null);
  const [fileB, setFileB]           = useState<File | null>(null);
  const [objective, setObjective]   = useState<CampaignObjective>('purchase');
  const [audience, setAudience]     = useState<AudienceSegment>('budget_sensitive');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const canAnalyze = mode === 'single' ? !!fileA : (!!fileA && !!fileB);

  const handleAnalyze = async () => {
    if (!fileA) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('files', fileA);
      if (mode === 'compare' && fileB) fd.append('files', fileB);
      fd.append('objective', objective);
      fd.append('audience_segment', audience);
      const res = await fetch(`${BACKEND}/analyze-full`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'oklch(0.98 0.005 90)', fontFamily: 'var(--v3-font-sans)', minHeight: '100vh' }}>
      <V3Nav currentPage="analyze" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>
              ● ANALYZE
            </div>
            <h1 style={{
              fontFamily: 'var(--v3-font-serif)',
              fontSize: 52, fontWeight: 400, margin: 0, letterSpacing: '-0.025em',
              color: 'var(--v3-ink)',
            }}>
              Ad intelligence
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={pillBtn()}>Share</button>
            <button style={pillBtn()}>Export PDF</button>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          background: 'white', borderRadius: 16, padding: 6,
          border: '1px solid oklch(0.92 0.005 90)',
          marginBottom: 24,
          display: 'flex', gap: 6,
        }}>
          {(['single', 'compare'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px 14px',
              background: mode === m ? 'oklch(0.97 0.005 90)' : 'transparent',
              border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: mode === m ? 600 : 500,
              color: mode === m ? 'var(--v3-ink)' : 'var(--v3-ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {m === 'single' ? (
                <span style={{ width: 14, height: 14, borderRadius: 4, background: ACCENT, display: 'inline-block' }} />
              ) : (
                <span style={{
                  width: 14, height: 14, borderRadius: 4, display: 'inline-grid',
                  gridTemplateColumns: '1fr 1fr', gap: 1.5,
                  border: `1.5px solid ${ACCENT}`, overflow: 'hidden',
                }}>
                  <span style={{ background: ACCENT }} />
                  <span style={{ background: ACCENT, opacity: 0.4 }} />
                </span>
              )}
              {m === 'single' ? 'Single ad' : 'A/B compare'}
            </button>
          ))}
        </div>

        {/* Upload zone(s) */}
        <div style={{
          ...card(),
          padding: 28,
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: mode === 'compare' ? '1fr 1fr' : '1fr',
          gap: 20,
        }}>
          <DropZone label="Upload your ad (image or video)" file={fileA} onFile={setFileA} />
          {mode === 'compare' && (
            <DropZone label="Upload variant B" file={fileB} onFile={setFileB} />
          )}

          {/* Objective + Audience inputs */}
          <div style={{
            gridColumn: mode === 'compare' ? 'span 2' : undefined,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
          }}>
            {[
              {
                label: 'Campaign objective',
                value: objective,
                onChange: (v: string) => setObjective(v as CampaignObjective),
                options: [
                  { value: 'purchase',   label: 'Purchase' },
                  { value: 'engagement', label: 'Engagement' },
                  { value: 'virality',   label: 'Virality' },
                  { value: 'clarity',    label: 'Clarity' },
                ],
              },
              {
                label: 'Audience segment',
                value: audience,
                onChange: (v: string) => setAudience(v as AudienceSegment),
                options: [
                  { value: 'budget_sensitive',       label: 'Budget sensitive' },
                  { value: 'social_proof_driven',    label: 'Social proof driven' },
                  { value: 'viral_share_oriented',   label: 'Viral share oriented' },
                  { value: 'premium_brand_oriented', label: 'Premium brand oriented' },
                ],
              },
            ].map(({ label, value, onChange, options }) => (
              <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-ink-2)' }}>{label}</span>
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  style={{
                    height: 40, borderRadius: 12, padding: '0 12px',
                    border: '1px solid oklch(0.92 0.005 90)',
                    background: 'oklch(0.985 0.003 90)',
                    fontFamily: 'inherit', fontSize: 13, color: 'var(--v3-ink)',
                    cursor: 'pointer', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: 32,
                  }}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div style={{ gridColumn: mode === 'compare' ? 'span 2' : undefined, textAlign: 'center' }}>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || loading}
              style={{
                ...pillBtn(true),
                padding: '14px 32px',
                fontSize: 15,
                opacity: canAnalyze ? 1 : 0.4,
                cursor: canAnalyze ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Analyzing…' : 'Run analysis →'}
            </button>
            {error && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--v3-bad)' }}>{error}</div>
            )}
          </div>
        </div>

        {/* Results */}
        {(result || loading) && (
          <>
            {/* Composite + scores */}
            <div style={{
              background: 'white', borderRadius: 20,
              border: '1px solid oklch(0.92 0.005 90)',
              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.05)',
              overflow: 'hidden', marginBottom: 24,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {/* Ad thumb */}
                <div style={{ padding: 28, borderRight: '1px solid oklch(0.94 0.005 90)' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 10 }}>CREATIVE</div>
                  {fileA && (
                    <div style={{ aspectRatio: '4/5', borderRadius: 14, overflow: 'hidden', background: 'oklch(0.985 0.003 90)', position: 'relative' }}>
                      {fileA.type.startsWith('video') ? (
                        <video src={URL.createObjectURL(fileA)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                      ) : (
                        <img src={URL.createObjectURL(fileA)} alt="Ad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  )}
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--v3-ink-2)' }}>
                    <div style={{ fontWeight: 500 }}>{fileA?.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', marginTop: 2 }}>
                      {fileA ? `${(fileA.size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </div>
                  </div>
                </div>

                {/* Composite */}
                <div style={{ padding: 32 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em' }}>COMPOSITE</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                    <span style={{
                      fontFamily: 'var(--v3-font-serif)',
                      fontSize: 96, fontWeight: 400, lineHeight: 0.85, letterSpacing: '-0.04em',
                    }}>
                      {loading ? '—' : Math.round(result?.variants?.[0]?.brain_single?.ad?.composite_score ?? result?.variants?.[0]?.visual.scores.purchase ?? 0)}
                      {!loading && result?.variants?.[0] && (
                        <span style={{ color: 'var(--v3-ink-3)', fontSize: 40 }}>
                          .{String((result.variants[0].brain_single?.ad?.composite_score ?? result.variants[0].visual.scores.purchase ?? 0).toFixed(1)).split('.')[1]}
                        </span>
                      )}
                    </span>
                    {result?.variants?.[0] && (
                      <span style={{
                        background: 'oklch(0.94 0.06 155)', color: 'oklch(0.4 0.13 155)',
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                      }}>
                        ↑ {Math.round((result.variants[0].brain_single?.ad?.composite_score ?? result.variants[0].visual.scores.purchase ?? 0) * 0.9)}th pctile
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      ['Purchase',    result?.variants?.[0]?.visual.scores.purchase],
                      ['Engagement',  result?.variants?.[0]?.visual.scores.engagement],
                      ['Virality',    result?.variants?.[0]?.visual.scores.virality],
                      ['Clarity',     result?.variants?.[0]?.visual.scores.clarity],
                    ].map(([k, v]) => (
                      <div key={k as string} style={{ padding: 14, background: 'oklch(0.985 0.003 90)', borderRadius: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--v3-ink-3)', marginBottom: 4 }}>{k as string}</div>
                        <div style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 30, fontWeight: 400 }}>
                          {loading ? '—' : Math.round((v as number) ?? 0)}
                        </div>
                        <div style={{ height: 4, background: 'oklch(0.93 0.005 90)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${v ?? 0}%`, height: '100%', background: ACCENT, borderRadius: 999, transition: 'width 1s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab selector */}
            <div style={{
              background: 'white', borderRadius: 999, padding: 5,
              border: '1px solid oklch(0.92 0.005 90)',
              display: 'inline-flex', gap: 4, marginBottom: 24,
            }}>
              {[
                { id: 'vision',  label: 'Computer vision', icon: '◇' },
                { id: 'brain',   label: 'Brain analysis',  icon: '◎' },
                { id: 'summary', label: 'AI summary',      icon: '✦' },
              ].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                  padding: '8px 18px', border: 'none', cursor: 'pointer',
                  background: tab === t.id ? 'oklch(0.97 0.005 90)' : 'transparent',
                  borderRadius: 999, fontFamily: 'inherit',
                  fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
                  color: tab === t.id ? 'var(--v3-ink)' : 'var(--v3-ink-3)',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                  <span style={{ color: tab === t.id ? ACCENT : 'var(--v3-ink-3)' }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'vision'  && <VisionTab  result={result} />}
            {tab === 'brain'   && <BrainTab   result={result} />}
            {tab === 'summary' && <SummaryTab result={result} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Vision tab ──────────────────────────────────────────────────────────────
function VisionTab({ result }: { result: AnalysisResult | null }) {
  const segs = result?.variants?.[0]?.visual.segments ?? [
    { label: 'Person / face', confidence: 0.94, visual_weight_pct: 38, pillar: 'Attention' },
    { label: 'Headline text', confidence: 0.91, visual_weight_pct: 22, pillar: 'Clarity' },
    { label: 'Call to action', confidence: 0.88, visual_weight_pct: 14, pillar: 'Urgency' },
    { label: 'Product',        confidence: 0.82, visual_weight_pct: 13, pillar: 'Trust' },
    { label: 'Brand logo',     confidence: 0.76, visual_weight_pct: 8,  pillar: 'Trust' },
    { label: 'Background',     confidence: 0.99, visual_weight_pct: 5,  pillar: 'Emotion' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
      <div style={card()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 24, fontWeight: 400, margin: 0 }}>Visual elements</h3>
          <span style={{
            fontSize: 11, fontWeight: 500, color: ACCENT,
            background: 'oklch(0.96 0.04 180)', padding: '4px 10px', borderRadius: 999,
          }}>ArcAnalytics Custom ISM · {segs.length} detected</span>
        </div>
        {segs.map((s, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 90px',
            alignItems: 'center', padding: '14px 0', gap: 16,
            borderTop: '1px solid oklch(0.95 0.005 90)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>{s.label}</div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', textTransform: 'uppercase' }}>{s.pillar}</span>
            </div>
            <div style={{ height: 6, background: 'oklch(0.95 0.005 90)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                width: `${s.visual_weight_pct * 2.5}%`, height: '100%',
                background: `linear-gradient(90deg, ${ACCENT}, oklch(0.65 0.13 200))`,
                borderRadius: 999,
              }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 400 }}>
                {s.visual_weight_pct}<span style={{ fontSize: 12, color: 'var(--v3-ink-3)' }}>%</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)' }}>
                conf {typeof s.confidence === 'number' ? s.confidence.toFixed(2) : s.confidence}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={card()}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 18, fontWeight: 500, margin: '0 0 16px' }}>Pillar scores</h3>
          {[['Attention', 84], ['Emotion', 72], ['Trust', 68], ['Clarity', 89], ['Urgency', 76]].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--v3-ink)' }}>{k}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 80, height: 4, background: 'oklch(0.95 0.005 90)', borderRadius: 999 }}>
                  <div style={{ width: `${v}%`, height: '100%', background: ACCENT, borderRadius: 999 }} />
                </div>
                <span className="mono" style={{ fontSize: 12, fontWeight: 600, width: 24, textAlign: 'right' }}>{v}</span>
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--v3-ink-3)' }}>
              No brain region data available
            </div>
          )}
        </div>

        <div style={{
          ...card(),
          background: `linear-gradient(135deg, oklch(0.96 0.04 180), white)`,
          border: '1px solid oklch(0.9 0.04 180)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'white', border: `1px solid oklch(0.9 0.04 180)`,
              display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 12,
            }}>✦</span>
            <span className="mono" style={{ fontSize: 10, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em' }}>KEY FINDING</span>
          </div>
          <p style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 17, lineHeight: 1.45, margin: 0, color: 'var(--v3-ink)' }}>
            Face dominates 38% of visual weight — strong attention. CTA only 14%; raise contrast to recover ~8 clarity points.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Brain tab ───────────────────────────────────────────────────────────────
function BrainTab({ result }: { result: AnalysisResult | null }) {
  const brainData = result?.variants?.[0]?.brain_single;
  
  // Get real data from backend
  const pillars = brainData?.pillars || [];
  const brainRegions = brainData?.brain?.regions || [];
  const timeline = brainData?.pillar_timeline || [];
  const adScores = brainData?.ad;
  const baselineComparison = brainData?.vs_baseline;
  
  
  
  

  function getBrainSystem(roi: string): string {
    const limbicRegions = ['amygdala', 'hippocampus', 'acc', 'anterior_cingulate', 'insula', 'ventromedial_pfc'];
    const executiveRegions = ['dlpfc', 'prefrontal', 'parietal'];
    const sensoryRegions = ['occipital', 'temporal', 'parietal_sensory'];
    const rewardRegions = ['striatum', 'nacc', 'ventral_tegmental'];
    
    const roiLower = roi.toLowerCase();
    if (limbicRegions.some(r => roiLower.includes(r))) return 'Limbic';
    if (executiveRegions.some(r => roiLower.includes(r))) return 'Executive';
    if (sensoryRegions.some(r => roiLower.includes(r))) return 'Sensory';
    if (rewardRegions.some(r => roiLower.includes(r))) return 'Reward';
    return 'Other';
  }

  function getSystemColor(system: string): string {
    switch (system) {
      case 'Limbic': return '#ef4444';
      case 'Executive': return '#3b82f6';
      case 'Reward': return '#f59e0b';
      case 'Sensory': return '#8b5cf6';
      default: return ACCENT;
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid oklch(0.95 0.005 90)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Neuromarketing Pillars</h3>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: ACCENT, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, animation: 'pulse 1.5s infinite' }} />
            Live
          </span>
        </div>
        <div style={{ padding: 24 }}>
          {pillars.length > 0 ? pillars.map((pillar, i) => (
            <div key={i} style={{ marginBottom: i < pillars.length - 1 ? 20 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)', marginBottom: 2 }}>
                    {pillar.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>
                    {pillar.brain_regions.join(', ')}
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                  background: pillar.color + '15', color: pillar.color,
                }}>
                  {Math.round(pillar.score * 100)}%
                </span>
              </div>
              <div style={{ height: 4, background: 'oklch(0.95 0.005 90)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${pillar.score * 100}%`, height: '100%',
                  background: pillar.color, borderRadius: 999,
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', lineHeight: 1.4, marginTop: 4 }}>
                {pillar.description}
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--v3-ink-3)' }}>
              No pillar data available
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={card()}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 20, fontWeight: 500, margin: '0 0 12px' }}>Brain Region Activation</h3>
          <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', marginBottom: 16 }}>
            Mean activation across key brain regions
          </div>
          {brainRegions.length > 0 ? brainRegions.map((region, i) => {
            const system = getBrainSystem(region.roi);
            const systemColor = getSystemColor(system);
            return (
            <div key={i} style={{ 
              display: 'grid', 
              gridTemplateColumns: '140px 1fr 40px 40px', 
              alignItems: 'center', 
              padding: '6px 0', 
              gap: 12,
              borderBottom: i < brainRegions.length - 1 ? '1px solid oklch(0.96 0.005 90)' : 'none'
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--v3-ink)', fontWeight: 500 }}>
                  {region.label}
                </div>
                <div style={{ 
                  fontSize: 9, 
                  color: systemColor,
                  fontWeight: 600
                }}>
                  {system}
                </div>
              </div>
              <div style={{ height: 4, background: 'oklch(0.95 0.005 90)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (region.mean_activation / 0.15) * 100)}%`, height: '100%',
                  background: systemColor, borderRadius: 999,
                }} />
              </div>
              <span className="mono" style={{ fontSize: 10, fontWeight: 600, textAlign: 'right', color: 'var(--v3-ink)' }}>
                {region.mean_activation.toFixed(3)}
              </span>
              <span className="mono" style={{ fontSize: 10, textAlign: 'right', color: 'var(--v3-ink-3)' }}>
                {region.peak_second.toFixed(1)}s
              </span>
            </div>
          ))}
        </div>

        {/* Pillar Timeline */}
        {timeline.length > 0 && (
          <div style={card()}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 20, fontWeight: 500, margin: '0 0 12px' }}>Pillar Timeline</h3>
            <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', marginBottom: 16 }}>
              Neuromarketing pillar activation over time
            </div>
            <div style={{ padding: 12, background: 'oklch(0.985 0.003 90)', borderRadius: 12 }}>
              <ROITimeline height={80} timelineData={timeline} />
            </div>
            {adScores && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)' }}>0.0s</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999,
                  background: 'oklch(0.96 0.04 180)', color: ACCENT,
                }}>
                  peak @ {adScores.peak_second.toFixed(1)}s · {adScores.peak_score.toFixed(2)}
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)' }}>
                  {adScores.T_seconds}.0s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Baseline Comparison */}
        {baselineComparison && (
          <div style={card()}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 20, fontWeight: 500, margin: '0 0 12px' }}>Score vs Baseline</h3>
            <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', marginBottom: 16 }}>
              Performance compared to industry baseline
            </div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>
                  Overall Performance
                </span>
                <span style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: baselineComparison.percentile >= 75 ? 'oklch(0.94 0.06 155)' : 
                              baselineComparison.percentile >= 50 ? 'oklch(0.94 0.08 75)' : 
                              'oklch(0.94 0.08 25)',
                  color: baselineComparison.percentile >= 75 ? 'oklch(0.4 0.13 155)' : 
                         baselineComparison.percentile >= 50 ? 'oklch(0.4 0.13 75)' : 
                         'oklch(0.4 0.13 25)',
                  fontWeight: 600
                }}>
                  {baselineComparison.percentile}th percentile
                </span>
              </div>
              
              <p style={{ 
                fontSize: 13, 
                color: 'var(--v3-ink-2)', 
                margin: '0 0 12px 0',
                fontStyle: 'italic'
              }}>
                {baselineComparison.verdict}
              </p>

              {/* Score Comparisons */}
              {baselineComparison.score_vs_baseline && Object.keys(baselineComparison.score_vs_baseline).length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(baselineComparison.score_vs_baseline).map(([key, metric]) => (
                    <div key={key} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'oklch(0.99 0.005 90)',
                      borderRadius: 6
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--v3-ink-2)', textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>
                          {metric.baseline.toFixed(3)} → {metric.ad_value.toFixed(3)}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: metric.delta > 0 ? 'oklch(0.4 0.13 155)' : 'oklch(0.4 0.13 25)'
                        }}>
                          {metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ROI Comparisons */}
              {baselineComparison.roi_vs_baseline && Object.keys(baselineComparison.roi_vs_baseline).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-ink)', margin: '0 0 8px' }}>
                    Region vs Baseline
                  </h4>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {Object.entries(baselineComparison.roi_vs_baseline).slice(0, 4).map(([key, metric]) => (
                      <div key={key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: 'oklch(0.985 0.003 90)',
                        borderRadius: 4
                      }}>
                        <span style={{ fontSize: 11, color: 'var(--v3-ink-3)', textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: metric.delta > 0 ? 'oklch(0.4 0.13 155)' : 'oklch(0.4 0.13 25)'
                        }}>
                          {metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary tab ─────────────────────────────────────────────────────────────
function SummaryTab({ result }: { result: AnalysisResult | null }) {
  const recs = result?.recommendations ?? [
    ['Tighten the cut',     'Drop 7–9s where attention bottoms.',  '+4.1'],
    ['CTA contrast +60%',  'Visual weight 14% → 22%.',            '+3.2'],
    ['Logo to opening frame', 'Lift Memory ROI ~12 pts.',         '+2.9'],
  ];

  const isAIEnhanced = result?.narrative_source === 'llm';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
      <div style={{ ...card(), padding: 36 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 10px', borderRadius: 999,
          background: isAIEnhanced ? 'oklch(0.96 0.04 180)' : 'oklch(0.96 0.005 90)', 
          marginBottom: 20,
        }}>
          <span style={{ color: isAIEnhanced ? ACCENT : 'var(--v3-ink-3)', fontSize: 12 }}>
            {isAIEnhanced ? '🧠' : '📋'}
          </span>
          <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: isAIEnhanced ? ACCENT : 'var(--v3-ink-3)', letterSpacing: '0.1em' }}>
            {isAIEnhanced ? 'AI UNIFIED ANALYSIS' : 'TEMPLATE ANALYSIS'}
          </span>
          {isAIEnhanced && result?.narrative_model && (
            <span className="mono" style={{ fontSize: 9, color: ACCENT, opacity: 0.7 }}>
              ({result.narrative_model})
            </span>
          )}
        </div>
        
        {/* Unified Analysis - combines CV and brain insights */}
        <p style={{
          fontFamily: 'var(--v3-font-serif)',
          fontSize: 24, lineHeight: 1.4, fontWeight: 400, margin: 0,
          letterSpacing: '-0.01em', color: 'var(--v3-ink)',
        }}>
          {result?.explanation || (
            <>
              The creative{' '}
              <em style={{
                background: `linear-gradient(120deg, ${ACCENT}, oklch(0.62 0.16 45))`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontStyle: 'italic',
              }}>over-indexes on attention</em>{' '}
              in the first 4 seconds — but sustained activation drops 28% post-product reveal.
            </>
          )}
        </p>

        {isAIEnhanced && (
          <div style={{ 
            marginTop: 16, 
            padding: '12px 16px', 
            background: 'oklch(0.96 0.04 180 / 0.1)', 
            borderRadius: 8,
            border: '1px solid oklch(0.96 0.04 180 / 0.2)'
          }}>
            <p style={{ 
              fontSize: 12, 
              lineHeight: 1.5, 
              color: ACCENT, 
              margin: 0,
              fontWeight: 500
            }}>
              💡 This analysis synthesizes computer vision and brain model data into unified insights
            </p>
          </div>
        )}

        

        {!isAIEnhanced && (
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--v3-ink-2)', marginTop: 20 }}>
            Pattern matches high-recall, low-action ads. Three structural changes can move composite score significantly upward.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={card()}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 18, fontWeight: 500, margin: '0 0 4px', color: 'var(--v3-ink)' }}>Recommendations</h3>
          <p style={{ fontSize: 12, color: 'var(--v3-ink-3)', margin: '0 0 16px' }}>Ranked by projected lift</p>
          {(Array.isArray(recs[0]) ? recs as string[][] : (recs as string[]).map((r) => [r, '', ''])).map((rec, i) => {
            const [t, b, lift] = rec;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr auto',
                padding: '14px 0', gap: 12, alignItems: 'center',
                borderTop: '1px solid oklch(0.95 0.005 90)',
              }}>
                <span className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>{t}</div>
                  {b && <div style={{ fontSize: 12, color: 'var(--v3-ink-3)' }}>{b}</div>}
                </div>
                {lift && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                    background: 'oklch(0.94 0.06 155)', color: 'oklch(0.4 0.13 155)',
                  }}>{lift}</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          padding: 18, borderRadius: 16,
          background: `linear-gradient(135deg, var(--v3-ink), oklch(0.25 0.02 200))`,
          color: 'white',
        }}>
          <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>PROJECTED LIFT</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 40, fontWeight: 400 }}>+10.2</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>composite points</span>
          </div>
        </div>
      </div>
    </div>
  );
}
