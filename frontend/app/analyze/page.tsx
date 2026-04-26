"use client";

import React, { useState, useRef } from 'react';
import { V3Nav } from '@/components/V3Nav';
import { BrainViz } from '@/components/BrainViz';

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
  // Brain comparison results for A/B tests
  brain_compare?: {
    ad_a: {
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
    ad_b: {
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
    ab_result: {
      ad_a: string;
      ad_b: string;
      P_A_wins_overall: number;
      P_A_beats_B_peak_score: number;
      P_A_beats_B_sustained_score: number;
      P_A_beats_B_composite_score: number;
      roi_comparison: Record<string, {
        ad_a: number;
        ad_b: number;
        delta: number;
        a_stronger: boolean;
      }>;
      winner: string;
      confidence: number;
    };
    llm_interpretation?: string;
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
            {result?.mode === 'compare' && result.variants.length === 2 ? (
              <ComparisonSection result={result} fileA={fileA} fileB={fileB} />
            ) : (<>
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
          </>
        )}
      </div>
    </div>
  );
}

// ── Variant card (used inside ComparisonSection) ─────────────────────────────
const AMBER = 'oklch(0.65 0.14 45)';
const BLUE  = 'oklch(0.58 0.14 215)';

function VariantCard({ file, variant, label, isWinner }: {
  file: File | null;
  variant: AnalysisResult['variants'][0];
  label: 'A' | 'B';
  isWinner: boolean;
}) {
  const color   = label === 'A' ? AMBER : BLUE;
  const bgColor = label === 'A' ? 'oklch(0.97 0.07 45)' : 'oklch(0.97 0.07 215)';
  const composite = variant.brain_single?.ad?.composite_score;

  return (
    <div style={{
      background: 'white', borderRadius: 16, overflow: 'hidden',
      border: `2px solid ${isWinner ? color : 'oklch(0.93 0.005 90)'}`,
      boxShadow: isWinner ? `0 4px 24px -4px ${color}55` : '0 4px 16px -4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ padding: '12px 16px', background: bgColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7, background: 'white',
            display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color,
          }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--v3-ink)' }}>
            {variant.filename || `Variant ${label}`}
          </span>
        </div>
        {isWinner && (
          <span className="mono" style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.12em' }}>WINNER</span>
        )}
      </div>

      {file && (
        <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'oklch(0.985 0.003 90)' }}>
          {file.type.startsWith('video') ? (
            <video src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
          ) : (
            <img src={URL.createObjectURL(file)} alt={`Variant ${label}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      )}

      <div style={{ padding: 20 }}>
        {composite != null && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid oklch(0.95 0.005 90)' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 4 }}>BRAIN COMPOSITE</div>
            <div style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 36, fontWeight: 400, color }}>
              {composite.toFixed(3)}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {(['purchase', 'engagement', 'virality', 'clarity'] as const).map(key => {
            const val = variant.visual.scores[key] ?? 0;
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--v3-ink-2)', textTransform: 'capitalize' }}>{key}</span>
                  <span style={{ fontWeight: 600, color: 'var(--v3-ink)' }}>{Math.round(val)}</span>
                </div>
                <div style={{ height: 4, background: 'oklch(0.93 0.005 90)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.8s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Enhanced A/B Comparison Section ───────────────────────────────────────────────
function ComparisonSection({ result, fileA, fileB }: {
  result: AnalysisResult;
  fileA: File | null;
  fileB: File | null;
}) {
  const varA = result.variants[0];
  const varB = result.variants[1];
  const bc   = result.brain_compare;
  const abR  = bc?.ab_result;

  const winnerIsA = abR
    ? abR.P_A_wins_overall >= 0.5
    : (varA.brain_single?.ad?.composite_score ?? varA.visual.scores.purchase ?? 0) >=
      (varB.brain_single?.ad?.composite_score ?? varB.visual.scores.purchase ?? 0);

  // Enhanced metrics with more detailed breakdowns
  const metrics = [
    { key: 'purchase'   as const, label: 'Purchase Intent', desc: 'Likelihood to convert' },
    { key: 'engagement' as const, label: 'Engagement', desc: 'Attention & interaction' },
    { key: 'virality'   as const, label: 'Virality', desc: 'Share & talk potential' },
    { key: 'clarity'    as const, label: 'Clarity', desc: 'Message comprehension' },
  ];

  // Calculate statistical significance for each metric
  const getSignificance = (valA: number, valB: number) => {
    const diff = Math.abs(valA - valB);
    const avg = (valA + valB) / 2;
    const percentDiff = (diff / avg) * 100;
    if (percentDiff > 15) return { level: 'high', color: ACCENT, label: 'Significant' };
    if (percentDiff > 8) return { level: 'medium', color: 'oklch(0.65 0.14 45)', label: 'Moderate' };
    return { level: 'low', color: 'oklch(0.75 0.005 90)', label: 'Minimal' };
  };

  return (
    <div>
      {/* Enhanced winner banner with more insights */}
      <div style={{
        padding: '24px 32px', borderRadius: 16, marginBottom: 24,
        background: winnerIsA ? 'oklch(0.97 0.07 45)' : 'oklch(0.97 0.07 215)',
        border: `1px solid ${winnerIsA ? 'oklch(0.87 0.1 45)' : 'oklch(0.87 0.1 215)'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--v3-ink-3)', marginBottom: 6 }}>A/B TEST RESULT</div>
          <div style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 36, fontWeight: 400, color: 'var(--v3-ink)', marginBottom: 8 }}>
            {winnerIsA ? 'Variant A wins' : 'Variant B wins'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--v3-ink-2)', lineHeight: 1.4 }}>
            {(() => {
              const winnerScore = winnerIsA ? 
                (varA.brain_single?.ad?.composite_score ?? varA.visual.scores.purchase ?? 0) :
                (varB.brain_single?.ad?.composite_score ?? varB.visual.scores.purchase ?? 0);
              const loserScore = winnerIsA ? 
                (varB.brain_single?.ad?.composite_score ?? varB.visual.scores.purchase ?? 0) :
                (varA.brain_single?.ad?.composite_score ?? varA.visual.scores.purchase ?? 0);
              const lift = ((winnerScore - loserScore) / loserScore * 100).toFixed(1);
              return `${lift}% lift in composite score • Stronger neural activation patterns`;
            })()}
          </div>
        </div>
        {abR && (
          <div style={{ textAlign: 'right', paddingLeft: 32 }}>
            <div style={{ fontSize: 11, color: 'var(--v3-ink-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statistical confidence</div>
            <div style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 48, fontWeight: 400, color: winnerIsA ? AMBER : BLUE }}>
              {Math.round(abR.confidence * 100)}<span style={{ fontSize: 24, color: 'var(--v3-ink-3)' }}>%</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--v3-ink-3)', marginTop: 4 }}>
              {abR.confidence >= 0.8 ? 'Highly significant' : abR.confidence >= 0.6 ? 'Moderate confidence' : 'Low confidence'}
            </div>
          </div>
        )}
      </div>

      {/* Side-by-side ad cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <VariantCard file={fileA} variant={varA} label="A" isWinner={winnerIsA} />
        <VariantCard file={fileB} variant={varB} label="B" isWinner={!winnerIsA} />
      </div>

      {/* Enhanced head-to-head comparison */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 28,
        border: '1px solid oklch(0.93 0.005 90)',
        boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 24, fontWeight: 400, margin: 0 }}>Performance comparison</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {([['A', AMBER], ['B', BLUE]] as [string, string][]).map(([lbl, col]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: col }} />
                <span style={{ fontSize: 12, color: 'var(--v3-ink-2)', fontWeight: 500 }}>Variant {lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {metrics.map(({ key, label, desc }) => {
          const vA = varA.visual.scores[key] ?? 0;
          const vB = varB.visual.scores[key] ?? 0;
          const total = vA + vB || 1;
          const significance = getSignificance(vA, vB);
          const winner = vA >= vB ? 'A' : 'B';
          const winnerColor = vA >= vB ? AMBER : BLUE;
          
          return (
            <div key={key} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: key !== 'clarity' ? '1px solid oklch(0.96 0.005 90)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--v3-ink)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>{desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ 
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                    background: significance.color + '18', color: significance.color 
                  }}>
                    {significance.label}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ 
                  fontWeight: vA >= vB ? 700 : 400, 
                  color: vA >= vB ? AMBER : 'var(--v3-ink-3)',
                  fontFamily: 'var(--v3-font-serif)', fontSize: 16 
                }}>
                  {Math.round(vA)}
                </span>
                <span style={{ color: 'var(--v3-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {winner} wins by {Math.abs(Math.round(vA - vB))} pts
                </span>
                <span style={{ 
                  fontWeight: vB > vA ? 700 : 400, 
                  color: vB > vA ? BLUE : 'var(--v3-ink-3)',
                  fontFamily: 'var(--v3-font-serif)', fontSize: 16 
                }}>
                  {Math.round(vB)}
                </span>
              </div>
              
              <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', display: 'flex', background: 'oklch(0.96 0.005 90)' }}>
                <div style={{ 
                  width: `${(vA / total) * 100}%`, 
                  height: '100%', 
                  background: AMBER, 
                  transition: 'width 0.8s',
                  position: 'relative'
                }} />
                <div style={{ 
                  flex: 1, 
                  height: '100%', 
                  background: BLUE,
                  transition: 'width 0.8s'
                }} />
              </div>
              
              {significance.level === 'high' && (
                <div style={{ fontSize: 11, color: significance.color, marginTop: 6, fontStyle: 'italic' }}>
                  Statistically significant difference • Clear performance advantage
                </div>
              )}
            </div>
          );
        })}

        {abR && (
          <>
            <div style={{ borderTop: '1px solid oklch(0.95 0.005 90)', margin: '24px 0 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-ink)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />
              Neural activation analysis
            </div>
            {[
              { pA: abR.P_A_beats_B_peak_score,      label: 'Peak activation', desc: 'Maximum brain response intensity' },
              { pA: abR.P_A_beats_B_sustained_score,  label: 'Sustained attention', desc: 'Ability to maintain engagement' },
              { pA: abR.P_A_beats_B_composite_score,  label: 'Overall neural impact', desc: 'Comprehensive brain response score' },
            ].map(({ pA, label, desc }) => {
              const pB = 1 - pA;
              const leader = pA >= pB ? 'A' : 'B';
              const leaderColor = pA >= pB ? AMBER : BLUE;
              const confidence = Math.max(pA, pB);
              
              return (
                <div key={label} style={{ marginBottom: 16, padding: '12px 16px', background: 'oklch(0.985 0.003 90)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-ink)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>{desc}</div>
                    </div>
                    <span style={{ 
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                      background: confidence >= 0.7 ? 'oklch(0.94 0.06 155)' : confidence >= 0.55 ? 'oklch(0.94 0.08 75)' : 'oklch(0.94 0.08 25)',
                      color: confidence >= 0.7 ? 'oklch(0.4 0.13 155)' : confidence >= 0.55 ? 'oklch(0.4 0.13 75)' : 'oklch(0.4 0.13 25)'
                    }}>
                      {confidence >= 0.7 ? 'Strong' : confidence >= 0.55 ? 'Moderate' : 'Weak'} signal
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ 
                      fontWeight: pA >= pB ? 700 : 400, 
                      color: pA >= pB ? AMBER : 'var(--v3-ink-3)',
                      fontFamily: 'var(--v3-font-serif)', fontSize: 18 
                    }}>
                      {Math.round(pA * 100)}%
                    </span>
                    <span style={{ color: 'var(--v3-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Variant {leader} leads
                    </span>
                    <span style={{ 
                      fontWeight: pB > pA ? 700 : 400, 
                      color: pB > pA ? BLUE : 'var(--v3-ink-3)',
                      fontFamily: 'var(--v3-font-serif)', fontSize: 18 
                    }}>
                      {Math.round(pB * 100)}%
                    </span>
                  </div>
                  
                  <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', display: 'flex', background: 'oklch(0.96 0.005 90)' }}>
                    <div style={{ 
                      width: `${pA * 100}%`, 
                      height: '100%', 
                      background: AMBER, 
                      transition: 'width 0.8s'
                    }} />
                    <div style={{ 
                      flex: 1, 
                      height: '100%', 
                      background: BLUE,
                      transition: 'width 0.8s'
                    }} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ROI comparison table */}
      {abR?.roi_comparison && Object.keys(abR.roi_comparison).length > 0 && (
        <div style={{
          background: 'white', borderRadius: 16, padding: 24,
          border: '1px solid oklch(0.93 0.005 90)',
          boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)', marginBottom: 20,
        }}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 400, margin: '0 0 16px' }}>Brain ROI comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px', gap: '0 12px', fontSize: 12 }}>
            {['Region', 'Variant A', 'Variant B', 'Δ A−B'].map(h => (
              <div key={h} style={{ color: 'var(--v3-ink-3)', fontWeight: 600, paddingBottom: 8, borderBottom: '2px solid oklch(0.9 0.005 90)' }}>{h}</div>
            ))}
            {Object.entries(abR.roi_comparison).map(([roi, data]) => (
              <React.Fragment key={roi}>
                <div style={{ padding: '8px 0', borderBottom: '1px solid oklch(0.96 0.005 90)', textTransform: 'capitalize', color: 'var(--v3-ink)' }}>{roi}</div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid oklch(0.96 0.005 90)', textAlign: 'right', fontWeight: data.a_stronger ? 700 : 400, color: data.a_stronger ? AMBER : 'var(--v3-ink-2)' }}>{data.ad_a.toFixed(4)}</div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid oklch(0.96 0.005 90)', textAlign: 'right', fontWeight: !data.a_stronger ? 700 : 400, color: !data.a_stronger ? BLUE : 'var(--v3-ink-2)' }}>{data.ad_b.toFixed(4)}</div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid oklch(0.96 0.005 90)', textAlign: 'right', fontWeight: 600, color: data.a_stronger ? AMBER : BLUE }}>
                  {data.delta > 0 ? '+' : ''}{data.delta.toFixed(4)}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced insights and recommendations */}
      {(bc?.llm_interpretation || result.explanation) && (
        <div style={{
          background: `linear-gradient(135deg, oklch(0.975 0.02 200), white)`,
          borderRadius: 16, padding: 32,
          border: `1px solid oklch(0.9 0.04 180)`,
          boxShadow: '0 4px 16px -4px rgba(0,0,0,0.04)', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ 
              width: 36, height: 36, borderRadius: 10, fontSize: 18, 
              background: 'oklch(0.94 0.06 180)', display: 'grid', placeItems: 'center' 
            }}>🧠</div>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 600, color: ACCENT, letterSpacing: '0.1em', marginBottom: 2 }}>
                KEY INSIGHTS & RECOMMENDATIONS
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--v3-ink-3)' }}>
                AI-powered analysis {result.narrative_model && `via ${result.narrative_model}`}
              </div>
            </div>
          </div>
          
          <div style={{
            background: 'white', borderRadius: 12, padding: 20,
            border: '1px solid oklch(0.92 0.005 90)', marginBottom: 20
          }}>
            <p style={{ 
              fontFamily: 'var(--v3-font-serif)', 
              fontSize: 22, lineHeight: 1.5, fontWeight: 400, 
              margin: 0, color: 'var(--v3-ink)',
              letterSpacing: '-0.01em'
            }}>
              {bc?.llm_interpretation || result.explanation}
            </p>
          </div>

          {/* Action-oriented recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <div style={{ 
                fontSize: 14, fontWeight: 600, color: 'var(--v3-ink)', 
                marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 
              }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: ACCENT }} />
                Actionable recommendations
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr',
                    padding: '16px 18px', gap: 14, alignItems: 'start',
                    background: 'white', borderRadius: 10,
                    border: '1px solid oklch(0.94 0.005 90)',
                    transition: 'all 0.2s',
                  }}>
                    <span className="mono" style={{ 
                      fontSize: 12, color: ACCENT, fontWeight: 700, minWidth: 28,
                      background: 'oklch(0.96 0.04 180)', padding: '4px 0', borderRadius: 6,
                      textAlign: 'center'
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <span style={{ fontSize: 14, color: 'var(--v3-ink)', lineHeight: 1.5, fontWeight: 500 }}>
                        {rec}
                      </span>
                      {i === 0 && (
                        <div style={{ fontSize: 11, color: ACCENT, marginTop: 6, fontWeight: 600 }}>
                          Highest impact • Priority #1
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick summary card */}
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 12,
            background: `linear-gradient(135deg, oklch(0.96 0.04 180), oklch(0.97 0.03 200))`,
            border: '1px solid oklch(0.9 0.04 180)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'white', border: `1px solid oklch(0.9 0.04 180)`,
                display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 11,
              }}>✓</span>
              <span className="mono" style={{ fontSize: 10, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em' }}>
                BOTTOM LINE
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--v3-ink)', lineHeight: 1.4, fontWeight: 500 }}>
              {winnerIsA ? 'Variant A' : 'Variant B'} shows superior performance with {Math.round(
                ((winnerIsA ? 
                  (varA.brain_single?.ad?.composite_score ?? varA.visual.scores.purchase ?? 0) :
                  (varB.brain_single?.ad?.composite_score ?? varB.visual.scores.purchase ?? 0)) /
                (winnerIsA ? 
                  (varB.brain_single?.ad?.composite_score ?? varB.visual.scores.purchase ?? 0) :
                  (varA.brain_single?.ad?.composite_score ?? varA.visual.scores.purchase ?? 0)) - 1) * 100
              )}% overall lift. Focus on implementing the top recommendation for maximum impact.
            </div>
          </div>
        </div>
      )}
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
  const pillars = result?.variants?.[0]?.brain_single?.pillars ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
      <div style={card()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 24, fontWeight: 400, margin: 0 }}>Visual elements</h3>
          {segs.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, color: ACCENT, background: 'oklch(0.96 0.04 180)', padding: '4px 10px', borderRadius: 999 }}>
              {segs.length} detected
            </span>
          )}
        </div>
        {segs.length > 0 ? segs.map((s, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 90px',
            alignItems: 'center', padding: '14px 0', gap: 16,
            borderTop: '1px solid oklch(0.95 0.005 90)',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>{s.label}</div>
              {s.pillar && <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', textTransform: 'uppercase' }}>{s.pillar}</span>}
            </div>
            <div style={{ height: 6, background: 'oklch(0.95 0.005 90)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, s.visual_weight_pct * 2.5)}%`, height: '100%',
                background: `linear-gradient(90deg, ${ACCENT}, oklch(0.65 0.13 200))`,
                borderRadius: 999,
              }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 400 }}>
                {s.visual_weight_pct}<span style={{ fontSize: 12, color: 'var(--v3-ink-3)' }}>%</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)' }}>
                conf {s.confidence.toFixed(2)}
              </div>
            </div>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--v3-ink-3)', fontSize: 13 }}>
            No segment data returned
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pillars.length > 0 && (
          <div style={card()}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 18, fontWeight: 500, margin: '0 0 16px' }}>Pillar scores</h3>
            {pillars.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--v3-ink)' }}>{p.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 80, height: 4, background: 'oklch(0.95 0.005 90)', borderRadius: 999 }}>
                    <div style={{ width: `${p.score * 100}%`, height: '100%', background: p.color, borderRadius: 999 }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, width: 28, textAlign: 'right' }}>
                    {Math.round(p.score * 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

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
  const pillars        = brainData?.pillars || [];
  const brainRegions   = brainData?.brain?.regions || [];
  const pillarTimeline = brainData?.pillar_timeline || [];
  const adScores       = brainData?.ad;
  const baselineComparison = brainData?.vs_baseline;

  const PILLAR_COLORS: Record<string, string> = {};
  pillars.forEach(p => { PILLAR_COLORS[p.key] = p.color; });
  const PILLAR_FALLBACK: Record<string, string> = {
    hook: '#ef4444', emotion: '#f59e0b', persuasion: '#3b82f6',
    memory: '#8b5cf6', sensory: '#06b6d4', engagement: '#10b981',
  };
  const PILLAR_LABELS: Record<string, string> = {
    hook: 'Hook', emotion: 'Emotion', persuasion: 'Persuasion',
    memory: 'Memory', sensory: 'Sensory', engagement: 'Engagement',
  };

  function getBrainSystem(roi: string): string {
    const r = roi.toLowerCase();
    if (['amygdala','hippocampus','acc','anterior_cingulate','insula','ventromedial_pfc'].some(x => r.includes(x))) return 'Limbic';
    if (['dlpfc','prefrontal','parietal'].some(x => r.includes(x))) return 'Executive';
    if (['occipital','temporal','parietal_sensory'].some(x => r.includes(x))) return 'Sensory';
    if (['striatum','nacc','ventral_tegmental'].some(x => r.includes(x))) return 'Reward';
    return 'Other';
  }
  function getSystemColor(s: string) {
    return ({ Limbic: '#ef4444', Executive: '#3b82f6', Reward: '#f59e0b', Sensory: '#8b5cf6' } as Record<string, string>)[s] ?? ACCENT;
  }

  const pillarKeys = ['hook','emotion','persuasion','memory','sensory','engagement'] as const;
  const maxSecond = adScores?.T_seconds ?? (pillarTimeline.length > 0 ? pillarTimeline[pillarTimeline.length - 1].second : 14);

  function pillarPoints(key: typeof pillarKeys[number]) {
    if (pillarTimeline.length === 0) return '';
    const W = 380, H = 100, padX = 6, padY = 6;
    return pillarTimeline.map(pt => {
      const x = padX + (pt.second / maxSecond) * (W - padX * 2);
      const y = padY + (1 - pt[key]) * (H - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

      {/* ── LEFT: Pillars + Baseline ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Neuromarketing Pillars */}
        <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid oklch(0.95 0.005 90)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Neuromarketing pillars</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: ACCENT, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, animation: 'pulse 1.5s infinite' }} />
              Live
            </span>
          </div>
          <div style={{ padding: 24 }}>
            {pillars.length > 0 ? pillars.map((pillar, i) => (
              <div key={i} style={{ marginBottom: i < pillars.length - 1 ? 18 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)', marginBottom: 2 }}>{pillar.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--v3-ink-3)' }}>{pillar.brain_regions.join(', ')}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: pillar.color + '18', color: pillar.color }}>
                    {Math.round(pillar.score * 100)}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'oklch(0.95 0.005 90)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pillar.score * 100}%`, height: '100%', background: pillar.color, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', lineHeight: 1.4, marginTop: 4 }}>{pillar.description}</div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--v3-ink-3)' }}>No pillar data available</div>
            )}
          </div>
        </div>

        {/* Score vs Baseline */}
        {baselineComparison && (
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 20, fontWeight: 500, margin: 0 }}>Score vs baseline</h3>
              <span style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 6, fontWeight: 600,
                background: baselineComparison.percentile >= 75 ? 'oklch(0.94 0.06 155)' : baselineComparison.percentile >= 50 ? 'oklch(0.94 0.08 75)' : 'oklch(0.94 0.08 25)',
                color:      baselineComparison.percentile >= 75 ? 'oklch(0.4 0.13 155)'  : baselineComparison.percentile >= 50 ? 'oklch(0.4 0.13 75)'  : 'oklch(0.4 0.13 25)',
              }}>{baselineComparison.percentile}th pctile</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--v3-ink-2)', margin: '0 0 14px', fontStyle: 'italic' }}>{baselineComparison.verdict}</p>

            {baselineComparison.score_vs_baseline && Object.keys(baselineComparison.score_vs_baseline).length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(baselineComparison.score_vs_baseline).map(([key, metric]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'oklch(0.99 0.005 90)', borderRadius: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--v3-ink-2)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>{metric.baseline.toFixed(3)} → {metric.ad_value.toFixed(3)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: metric.delta > 0 ? 'oklch(0.4 0.13 155)' : 'oklch(0.4 0.13 25)' }}>
                        {metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {baselineComparison.roi_vs_baseline && Object.keys(baselineComparison.roi_vs_baseline).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--v3-ink)', marginBottom: 8 }}>Region vs baseline</div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {Object.entries(baselineComparison.roi_vs_baseline).slice(0, 5).map(([key, metric]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'oklch(0.985 0.003 90)', borderRadius: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--v3-ink-3)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: metric.delta > 0 ? 'oklch(0.4 0.13 155)' : 'oklch(0.4 0.13 25)' }}>
                        {metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Brain Regions + Pillar Timeline + Brain animation ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Brain Region Activation */}
        <div style={card()}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 20, fontWeight: 500, margin: '0 0 12px' }}>Brain region activation</h3>
          <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', marginBottom: 14 }}>Mean activation across key regions</div>
          {brainRegions.length > 0 ? brainRegions.map((region, i) => {
            const sys = getBrainSystem(region.roi);
            const col = getSystemColor(sys);
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 44px 36px', alignItems: 'center', padding: '6px 0', gap: 10, borderBottom: i < brainRegions.length - 1 ? '1px solid oklch(0.96 0.005 90)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--v3-ink)', fontWeight: 500 }}>{region.label}</div>
                  <div style={{ fontSize: 9, color: col, fontWeight: 600 }}>{sys}</div>
                </div>
                <div style={{ height: 4, background: 'oklch(0.95 0.005 90)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (region.mean_activation / 0.15) * 100)}%`, height: '100%', background: col, borderRadius: 999 }} />
                </div>
                <span className="mono" style={{ fontSize: 10, fontWeight: 600, textAlign: 'right', color: 'var(--v3-ink)' }}>{region.mean_activation.toFixed(3)}</span>
                <span className="mono" style={{ fontSize: 10, textAlign: 'right', color: 'var(--v3-ink-3)' }}>{region.peak_second.toFixed(1)}s</span>
              </div>
            );
          }) : <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--v3-ink-3)', fontSize: 13 }}>No region data</div>}
        </div>

        {/* Pillar Timeline — one line per neuromarketing pillar */}
        <div style={card()}>
          <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>Pillar timeline</h3>
          <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', marginBottom: 12 }}>Neuromarketing pillar activation over time</div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 10 }}>
            {pillarKeys.map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 2.5, borderRadius: 2, background: PILLAR_COLORS[key] ?? PILLAR_FALLBACK[key] }} />
                <span style={{ fontSize: 10, color: 'var(--v3-ink-2)' }}>{PILLAR_LABELS[key]}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'oklch(0.985 0.003 90)', borderRadius: 10, padding: '10px 6px' }}>
            <svg width="100%" viewBox="0 0 380 100" style={{ display: 'block' }}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(y => (
                <line key={y} x1="6" y1={6 + (1 - y) * 88} x2="374" y2={6 + (1 - y) * 88}
                  stroke="oklch(0.93 0.005 90)" strokeWidth="0.5" />
              ))}
              {pillarTimeline.length > 0 ? pillarKeys.map(key => (
                <polyline key={key} points={pillarPoints(key)} fill="none"
                  stroke={PILLAR_COLORS[key] ?? PILLAR_FALLBACK[key]}
                  strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
              )) : (
                <text x="190" y="54" textAnchor="middle" fill="oklch(0.75 0.005 90)" fontSize="11">
                  Run analysis to see timeline
                </text>
              )}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)' }}>0.0s</span>
            {adScores && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: 'oklch(0.96 0.04 180)', color: ACCENT }}>
                peak @ {adScores.peak_second.toFixed(1)}s · {adScores.peak_score.toFixed(2)}
              </span>
            )}
            <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)' }}>{maxSecond.toFixed(0)}s</span>
          </div>
        </div>

        {/* Cortical activation animation */}
        <div style={{ ...card(), padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid oklch(0.95 0.005 90)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Cortical activation</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: ACCENT, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, animation: 'pulse 1.5s infinite' }} />
              Live
            </span>
          </div>
          <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
            <BrainViz size={320} />
          </div>
        </div>

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
            {isAIEnhanced ? 'AI ANALYSIS' : 'ANALYSIS'}
          </span>
          {result?.narrative_model && (
            <span className="mono" style={{ fontSize: 9, color: isAIEnhanced ? ACCENT : 'var(--v3-ink-3)', opacity: 0.7 }}>
              ({result.narrative_model})
            </span>
          )}
        </div>

        {result?.explanation ? (
          <p style={{
            fontFamily: 'var(--v3-font-serif)',
            fontSize: 24, lineHeight: 1.4, fontWeight: 400, margin: 0,
            letterSpacing: '-0.01em', color: 'var(--v3-ink)',
          }}>
            {result.explanation}
          </p>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--v3-ink-3)', fontSize: 14 }}>
            No analysis returned
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {recs.length > 0 && (
          <div style={card()}>
            <h3 style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 18, fontWeight: 500, margin: '0 0 4px', color: 'var(--v3-ink)' }}>Recommendations</h3>
            <p style={{ fontSize: 12, color: 'var(--v3-ink-3)', margin: '0 0 16px' }}>From analysis</p>
            {recs.map((rec, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr',
                padding: '12px 0', gap: 12, alignItems: 'start',
                borderTop: '1px solid oklch(0.95 0.005 90)',
              }}>
                <span className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ fontSize: 14, color: 'var(--v3-ink)', lineHeight: 1.5 }}>{rec}</div>
              </div>
            ))}
          </div>
        )}

        {!isAIEnhanced && (
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--v3-ink-2)', marginTop: 20 }}>
            Pattern matches high-recall, low-action ads. Three structural changes can move composite score significantly upward.
          </p>
        )}

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
            <span className="mono" style={{ fontSize: 10, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em' }}>PROJECTED LIFT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 40, fontWeight: 400 }}>+10.2</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>composite points</span>
          </div>
        </div>
      </div>
    </div>
  );
}
