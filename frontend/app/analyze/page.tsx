/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirrors backend/models/merged_schemas.py
// ─────────────────────────────────────────────────────────────────────────────

type CampaignObjective = "purchase" | "engagement" | "virality" | "clarity";
type AudienceSegment =
  | "budget_sensitive"
  | "social_proof_driven"
  | "viral_share_oriented"
  | "premium_brand_oriented";

type AdSegment = {
  label: string;
  display_label?: string | null;
  pillar?: string | null;
  scoring_weight?: number | null;
  impact_score?: number | null;
  confidence: number;
  visual_weight_pct: number;
  reasoning: string;
};

type VariantScore = {
  purchase: number;
  engagement: number;
  virality: number;
  clarity: number;
};

type NeuralFeatures = {
  attention_score: number;
  emotional_intensity: number;
  memory_signal: number;
  friction_score: number;
  predicted_attention_ms: number;
};

type VariantAnalysis = {
  variant_id: string;
  filename: string;
  scores: VariantScore;
  neural_features: NeuralFeatures;
  segments: AdSegment[];
  segments_source?: "mock" | "sam3";
  pillar_scores?: Record<string, number> | null;
  pillar_breakdown?: Record<string, any> | null;
  summary: string;
};

type TimelinePoint = {
  second: number;
  dominant_emotion: string;
  posterior_P_convert: number;
  roi_emotion: number;
  roi_language: number;
  roi_attention: number;
  roi_visual: number;
  roi_dmn: number;
};

type BrainAdScore = {
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
  timeline: TimelinePoint[];
};

type PillarScore = {
  key: string;
  label: string;
  description: string;
  score: number;
  color: string;
};

type AnalyzeResponse = {
  ad: BrainAdScore;
  vs_baseline: {
    ad_id: string;
    verdict: string;
    percentile: number;
  };
  pillars: PillarScore[];
  pillar_timeline: any[];
};

type ABResult = {
  winner: string;
  confidence: number;
  P_A_wins_overall: number;
};

type CompareResponse = {
  ad_a: BrainAdScore;
  ad_b: BrainAdScore;
  ab_result: ABResult;
};

type FullVariantResult = {
  variant_id: string;
  filename: string;
  visual: VariantAnalysis;
  brain_single: AnalyzeResponse | null;
};

type FullAnalysisResult = {
  mode: "single" | "compare";
  variants: FullVariantResult[];
  brain_compare: CompareResponse | null;
  objective: CampaignObjective | null;
  audience_segment: AudienceSegment | null;
  overall_winner: string | null;
  objective_winner: string | null;
  explanation: string;
  recommendations: string[];
  narrative_source: "template" | "llm";
  narrative_model: string | null;
  warnings: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// All requests go through the Next.js rewrite proxy (/api/* → FastAPI backend).
// This avoids CORS issues in production. See next.config.ts for the backend URL.
const BACKEND = "/api";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

function scoreColor(v: number, max = 100) {
  const r = v / max;
  if (r >= 0.7) return "bg-rose-500";
  if (r >= 0.45) return "bg-amber-400";
  return "bg-emerald-400";
}

function prettyLabel(s: string) {
  const map: Record<string, string> = {
    product: "Product",
    headline_text: "Headline text",
    cta_button: "Call to action",
    brand_logo: "Brand logo",
    person: "Person / face",
    background: "Background",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

function segTitle(s: AdSegment) {
  return (s.display_label ?? "").trim() || prettyLabel(s.label);
}

function overallScore(scores: VariantScore) {
  return clamp((scores.purchase + scores.engagement + scores.virality + scores.clarity) / 4, 0, 100);
}

function roiLabel(roi: string) {
  const map: Record<string, string> = {
    emotion: "Emotion",
    language: "Language",
    attention: "Attention",
    visual: "Visual",
    dmn: "Default mode",
  };
  return map[roi] ?? roi;
}

const AUDIENCE_OPTIONS: Array<{ value: AudienceSegment; label: string }> = [
  { value: "budget_sensitive", label: "Budget sensitive" },
  { value: "social_proof_driven", label: "Social proof driven" },
  { value: "viral_share_oriented", label: "Viral / share oriented" },
  { value: "premium_brand_oriented", label: "Premium brand" },
];

const OBJECTIVE_OPTIONS: Array<{ value: CampaignObjective; label: string }> = [
  { value: "purchase", label: "Purchase" },
  { value: "engagement", label: "Engagement" },
  { value: "virality", label: "Virality" },
  { value: "clarity", label: "Clarity" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Loader() {
  const msgs = useMemo(
    () => [
      "Scanning creative composition…",
      "Running visual segment detection…",
      "Calling TribeV2 brain encoder…",
      "Computing Bayesian engagement scores…",
      "Generating recommendations…",
    ],
    [],
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % msgs.length), 1100);
    return () => clearInterval(t);
  }, [msgs.length]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-md">
      <div className="w-[90%] max-w-sm rounded-3xl border border-white/10 bg-zinc-950/90 p-8 shadow-2xl">
        <div className="mb-5 flex justify-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-fuchsia-500/30" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-fuchsia-500 via-sky-500 to-emerald-400 opacity-80" />
          </div>
        </div>
        <p className="text-center text-sm font-semibold text-white">Arcanalytics</p>
        <p className="mt-2 text-center text-xs text-zinc-400 transition-all">{msgs[idx]}</p>
      </div>
    </div>
  );
}

// ── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const w = clamp((value / max) * 100, 0, 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full transition-all ${scoreColor(value, max)}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

// ── Visual tab content ────────────────────────────────────────────────────────
function VisualTab({ variants }: { variants: FullVariantResult[] }) {
  return (
    <div className="space-y-6">
      {variants.map((v) => {
        const va = v.visual;
        const overall = overallScore(va.scores);
        return (
          <div key={v.variant_id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <div>
                <span className="text-xs font-bold tracking-widest text-zinc-400">
                  {variants.length > 1 ? `AD ${v.variant_id.toUpperCase()} — ` : ""}
                </span>
                <span className="text-xs text-zinc-400">{v.filename}</span>
              </div>
              <span className="text-lg font-bold text-white">{overall.toFixed(1)}<span className="text-xs text-zinc-500">/100</span></span>
            </div>

            {/* Objective scores */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["purchase", "engagement", "virality", "clarity"] as const).map((k) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                    <span className="capitalize">{k}</span>
                    <span>{va.scores[k].toFixed(0)}</span>
                  </div>
                  <ScoreBar value={va.scores[k]} />
                </div>
              ))}
            </div>

            {/* Segments */}
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Visual elements {va.segments_source === "sam3" ? "(Roboflow)" : "(mock)"}
              </p>
              <div className="space-y-2">
                {va.segments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-xs text-zinc-300">{segTitle(seg)}</div>
                    <div className="flex-1">
                      <ScoreBar value={seg.confidence * 100} />
                    </div>
                    <div className="w-12 text-right text-[11px] text-zinc-400">
                      {pct(seg.visual_weight_pct)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pillar scores */}
            {va.pillar_scores && Object.keys(va.pillar_scores).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Pillar scores
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(va.pillar_scores).map(([pillar, score]) => (
                    <div key={pillar} className="rounded-xl bg-white/5 p-2 text-center">
                      <div className="text-lg font-bold text-white">{score.toFixed(0)}</div>
                      <div className="text-[10px] text-zinc-400 capitalize">{pillar}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-4 text-[11px] text-zinc-500">{va.summary}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Brain tab content ─────────────────────────────────────────────────────────
function BrainTab({ variants, brainCompare }: { variants: FullVariantResult[]; brainCompare: CompareResponse | null }) {
  const hasBrain = variants.some((v) => v.brain_single !== null);

  if (!hasBrain) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
        <p className="mb-2 font-semibold text-zinc-300">Brain scoring unavailable</p>
        <p>Set <code className="rounded bg-white/10 px-1 text-zinc-300">TRIBEV2_URL</code> in your <code className="rounded bg-white/10 px-1 text-zinc-300">.env</code> to enable real TribeV2 brain encoding via Modal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* A/B result banner */}
      {brainCompare && (
        <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
          <p className="text-sm font-semibold text-fuchsia-300">
            Brain winner: {brainCompare.ab_result.winner.toUpperCase()}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            P(A beats B) = {(brainCompare.ab_result.P_A_wins_overall * 100).toFixed(1)}% &nbsp;·&nbsp;
            Confidence: {(brainCompare.ab_result.confidence * 100).toFixed(0)}%
          </p>
        </div>
      )}

      {variants.map((v) => {
        const brain = v.brain_single;
        if (!brain) return null;
        const ad = brain.ad;
        const roiKeys = ["emotion", "language", "attention", "visual", "dmn"] as const;

        return (
          <div key={v.variant_id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-bold tracking-widest text-zinc-400">
                  {variants.length > 1 ? `AD ${v.variant_id.toUpperCase()} — ` : ""}
                </span>
                <span className="text-xs text-zinc-400">{v.filename}</span>
              </div>
              <span className="text-lg font-bold text-sky-400">
                {(ad.composite_score * 100).toFixed(1)}<span className="text-xs text-zinc-500"> composite</span>
              </span>
            </div>

            {/* Scoring summary */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Peak P(Convert)", val: ad.peak_score, pctOf: 1 },
                { label: "Sustained", val: ad.sustained_score, pctOf: 1 },
                { label: "Peak at", val: ad.peak_second, suffix: "s", pctOf: null },
                { label: "Verdict", val: null, text: brain.vs_baseline.verdict.replace(/_/g, " ") },
              ].map(({ label, val, suffix, pctOf, text }: any) => (
                <div key={label} className="rounded-xl bg-white/5 p-3">
                  <div className="text-[10px] text-zinc-500">{label}</div>
                  <div className="mt-1 text-sm font-bold text-white">
                    {text ?? (pctOf !== null ? `${(val * 100).toFixed(1)}%` : `${val}${suffix ?? ""}`)}
                  </div>
                </div>
              ))}
            </div>

            {/* ROI activations */}
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Brain ROI activations</p>
            <div className="space-y-2">
              {roiKeys.map((roi) => {
                const mean = ad.roi_means[roi];
                // Normalise for display — scale to 0-100 assuming max ~0.05
                const display = clamp(mean * 2000, 0, 100);
                return (
                  <div key={roi} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-xs text-zinc-300">{roiLabel(roi)}</div>
                    <div className="flex-1">
                      <ScoreBar value={display} />
                    </div>
                    <div className="w-14 text-right text-[11px] text-zinc-400">
                      {mean.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pillars from TribeV2 */}
            {brain.pillars && brain.pillars.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Neuro pillars</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {brain.pillars.map((p) => (
                    <div key={p.key} className="rounded-xl bg-white/5 p-2 text-center">
                      <div
                        className="text-lg font-bold"
                        style={{ color: p.color || "#fff" }}
                      >
                        {(p.score * 100).toFixed(0)}
                      </div>
                      <div className="text-[10px] text-zinc-400">{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant emotion + timeline preview */}
            <div className="mt-4 text-[11px] text-zinc-500">
              Dominant activation: <span className="capitalize text-zinc-300">{ad.dominant_emotion_overall}</span>
              {" · "}Baseline percentile: <span className="text-zinc-300">{brain.vs_baseline.percentile.toFixed(0)}th</span>
            </div>

            {/* Inline timeline sparkline */}
            {ad.timeline.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">P(Convert) over time</p>
                <TimelineSpark timeline={ad.timeline} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tiny inline timeline chart ────────────────────────────────────────────────
function TimelineSpark({ timeline }: { timeline: TimelinePoint[] }) {
  if (!timeline.length) return null;
  const vals = timeline.map((t) => t.posterior_P_convert);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 0.001;
  const H = 48;
  const W = 100; // viewBox width (%)
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 100 ${H}`} className="h-12 w-full" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke="rgb(139,92,246)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── AI summary panel ──────────────────────────────────────────────────────────
function AISummary({
  explanation,
  recommendations,
  narrativeSource,
  narrativeModel,
  winner,
  warnings,
}: {
  explanation: string;
  recommendations: string[];
  narrativeSource: "template" | "llm";
  narrativeModel: string | null;
  winner: string | null;
  warnings: string[];
}) {
  return (
    <div className="mt-6 rounded-2xl border border-sky-500/20 bg-sky-950/30 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-sky-300">AI Summary</p>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
          {narrativeSource === "llm" ? narrativeModel ?? "llm" : "template"}
        </span>
      </div>

      {winner && (
        <p className="mb-3 text-sm font-semibold text-white">
          Overall winner: <span className="text-sky-400">{winner.toUpperCase()}</span>
        </p>
      )}

      <p className="mb-4 text-sm leading-relaxed text-zinc-300">{explanation}</p>

      {recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Recommendations</p>
          <ul className="space-y-1">
            {recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-zinc-300">
                <span className="mt-0.5 shrink-0 text-sky-500">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/30 p-3">
          {warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-300">{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type AnalysisMode = "single" | "compare";
type ResultTab = "visual" | "brain";

export default function AnalyzePage() {
  const [mode, setMode] = useState<AnalysisMode>("single");
  const [objective, setObjective] = useState<CampaignObjective>("engagement");
  const [audience, setAudience] = useState<AudienceSegment>("social_proof_driven");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("visual");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxFiles = mode === "single" ? 1 : 2;

  // Reset files when mode changes
  useEffect(() => {
    setFiles([]);
    setResult(null);
    setError(null);
  }, [mode]);

  function handleFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming).slice(0, maxFiles);
    setFiles(arr);
    setResult(null);
    setError(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function runAnalysis() {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("objective", objective);
    form.append("audience_segment", audience);
    files.forEach((f) => form.append("files", f));

    try {
      const res = await fetch(`${BACKEND}/analyze-full`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} — ${txt.slice(0, 200)}`);
      }
      const data: FullAnalysisResult = await res.json();
      setResult(data);
      setActiveTab("visual");
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = files.length >= (mode === "compare" ? 2 : 1);

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      {loading && <Loader />}

      <div className="mx-auto max-w-3xl px-5 py-12">
        {/* Header */}
        <header className="mb-8">
          <p className="text-[10px] font-semibold tracking-widest text-zinc-400">ARCANALYTICS</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ad Analysis</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Upload your creative. Get visual scoring + brain engagement analysis.
          </p>
        </header>

        {/* Mode selector */}
        <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
          {(["single", "compare"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                mode === m
                  ? "bg-white text-zinc-900 shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m === "single" ? "Single ad" : "A/B compare"}
            </button>
          ))}
        </div>

        {/* Options row */}
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Objective</label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as CampaignObjective)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {OBJECTIVE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AudienceSegment)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-5 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging
              ? "border-fuchsia-500 bg-fuchsia-500/10"
              : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple={mode === "compare"}
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <p className="text-sm font-medium text-zinc-300">
            {mode === "compare"
              ? "Drop 2 ad files here (image or video)"
              : "Drop your ad here (image or video)"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">JPG, PNG, MP4, MOV · or click to browse</p>

          {files.length > 0 && (
            <div className="mt-4 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1 text-xs text-zinc-300 mx-1">
                  <span className="text-zinc-500">{mode === "compare" ? `Ad ${i === 0 ? "A" : "B"}:`  : ""}</span>
                  {f.name}
                </div>
              ))}
            </div>
          )}

          {mode === "compare" && files.length === 1 && (
            <p className="mt-2 text-xs text-amber-400">Add one more file for Ad B</p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={runAnalysis}
          disabled={!canSubmit || loading}
          className="mb-8 inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-zinc-900 disabled:opacity-40"
        >
          {loading ? "Analysing…" : "Run analysis"}
        </button>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
            <p className="font-semibold">Error</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Tab selector */}
            <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(["visual", "brain"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-white text-zinc-900 shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab === "visual" ? "Visual scoring" : "Brain analysis"}
                </button>
              ))}
            </div>

            {activeTab === "visual" && <VisualTab variants={result.variants} />}
            {activeTab === "brain" && (
              <BrainTab variants={result.variants} brainCompare={result.brain_compare} />
            )}

            {/* AI summary always shown below tabs */}
            <AISummary
              explanation={result.explanation}
              recommendations={result.recommendations}
              narrativeSource={result.narrative_source}
              narrativeModel={result.narrative_model}
              winner={result.overall_winner}
              warnings={result.warnings}
            />
          </div>
        )}
      </div>
    </div>
  );
}
