/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CampaignObjective = "purchase" | "engagement" | "virality" | "clarity";
type AudienceSegment =
  | "budget_sensitive"
  | "social_proof_driven"
  | "viral_share_oriented"
  | "premium_brand_oriented";

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

type VariantAnalysis = {
  variant_id: string;
  filename: string;
  scores: VariantScore;
  neural_features: NeuralFeatures;
  segments: AdSegment[];
  segments_source?: "mock" | "sam3";
  roboflow_raw?: Record<string, unknown> | null;
  pillar_scores?: Record<string, number> | null;
  pillar_breakdown?: Record<string, any> | null;
  summary: string;
};

const PILLAR_ORDER = ["Attention", "Emotion", "Trust", "Clarity", "Urgency"] as const;

function factorName(f: any) {
  return String(f?.display_name || f?.roboflow_label || "").trim() || "—";
}

function formatFactorList(fs: any[], max: number) {
  return (fs || [])
    .slice(0, max)
    .map((f) => {
      const name = factorName(f);
      const c = Number(f?.contribution ?? 0);
      const sign = c >= 0 ? "+" : "−";
      return `${name} (${sign}${Math.abs(c).toFixed(1)})`;
    })
    .join(", ");
}

function shortExplanation(text: string) {
  const t = (text || "").trim();
  if (!t) return "";
  // Grab first 1–2 sentences for a TL;DR.
  const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ");
}

type ComparisonResult = {
  objective: CampaignObjective;
  audience_segment: AudienceSegment;
  variants: VariantAnalysis[];
  overall_winner: string;
  objective_winner: string;
  explanation: string;
  recommendations: string[];
  copy_mode?: "neutral" | "brain";
  narrative_source?: "template" | "llm";
  narrative_model?: string | null;
};

function scoreForObjective(scores: VariantScore, objective: CampaignObjective) {
  return scores[objective] ?? 0;
}

type AnalysisMode = "single" | "compare" | "batch";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function overallTenPoint(scores: VariantScore) {
  const avg = (scores.purchase + scores.engagement + scores.virality + scores.clarity) / 4;
  return clamp(avg / 10, 0, 10);
}

function scoreLabel(outOfTen: number, copyMode: "neutral" | "brain") {
  const isBrain = copyMode === "brain";
  if (outOfTen >= 8.5) return isBrain ? "Extremely strong brain engagement" : "Extremely noticeable";
  if (outOfTen >= 7) return isBrain ? "Strong brain engagement" : "Highly noticeable";
  if (outOfTen >= 5) return "Moderate — could be stronger";
  if (outOfTen >= 3) return isBrain ? "Low — brain barely notices this" : "Low — easy to miss";
  return isBrain ? "Almost invisible to the brain" : "Very easy to miss";
}

function scoreColor(outOfTen: number) {
  // PRD palette semantics (high=red, mid=amber, low=teal)
  if (outOfTen >= 7) return "bg-rose-500";
  if (outOfTen >= 5) return "bg-amber-400";
  return "bg-emerald-400";
}

function prettyLabel(s: string) {
  const map: Record<string, string> = {
    product: "Product",
    headline: "Headline",
    headline_text: "Headline text",
    cta: "Call to action",
    cta_button: "Call to action",
    logo: "Brand logo",
    brand_logo: "Brand logo",
    face: "Person / face",
    person: "Person / face",
    background: "Background",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

function segmentTitle(s: AdSegment) {
  return (s.display_label ?? "").trim() || prettyLabel(s.label);
}

const AUDIENCE_OPTIONS: Array<{ value: AudienceSegment; label: string; description: string }> = [
  { value: "budget_sensitive", label: "Budget sensitive", description: "Responds to value, savings, and clear offers." },
  { value: "social_proof_driven", label: "Social proof driven", description: "Trusts reviews, testimonials, and popularity cues." },
  { value: "viral_share_oriented", label: "Viral / share oriented", description: "Engages with novelty, humor, and shareability." },
  { value: "premium_brand_oriented", label: "Premium brand oriented", description: "Prefers quality, design, and brand credibility." },
];

function abFromVariantId(variantId: string) {
  if (variantId === "v1") return "A";
  if (variantId === "v2") return "B";
  return variantId.toUpperCase();
}

function AnalysisLoader() {
  const messages = useMemo(
    () => [
      "Scanning creative composition…",
      "Estimating attention + memory signals…",
      "Checking clarity vs friction…",
      "Comparing objective lift…",
      "Generating recommendations…",
    ],
    [],
  );
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % messages.length);
    }, 900);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <>
      <style jsx>{`
        @keyframes arcGlow {
          0% {
            filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.45))
              drop-shadow(0 0 18px rgba(6, 182, 212, 0.25));
            opacity: 0.9;
          }
          50% {
            filter: drop-shadow(0 0 18px rgba(34, 197, 94, 0.35))
              drop-shadow(0 0 30px rgba(6, 182, 212, 0.35));
            opacity: 1;
          }
          100% {
            filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.45))
              drop-shadow(0 0 18px rgba(6, 182, 212, 0.25));
            opacity: 0.9;
          }
        }

        @keyframes dash {
          0% {
            stroke-dashoffset: 120;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(62px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(62px) rotate(-360deg);
          }
        }

        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-md">
        <div className="pointer-events-auto w-[92%] max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/85 shadow-2xl">
          <div
            className="relative px-6 py-7"
            style={{
              background:
                "radial-gradient(1200px 400px at 30% 0%, rgba(168,85,247,0.20), transparent 55%), radial-gradient(900px 380px at 90% 20%, rgba(6,182,212,0.18), transparent 60%), radial-gradient(900px 420px at 50% 100%, rgba(34,197,94,0.12), transparent 60%)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-white">Arcanalytics Analysis</div>
              <div className="text-[11px] text-zinc-300">
                computing comparison
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-5">
              <div className="relative grid h-[120px] w-[120px] place-items-center">
                <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-fuchsia-500/25 via-sky-500/25 to-emerald-500/20 blur-xl" />
                <div className="absolute inset-3 rounded-[22px] bg-gradient-to-br from-fuchsia-500/20 via-sky-500/15 to-emerald-500/10 blur-md" />

                <div
                  className="relative h-[92px] w-[92px]"
                  style={{ animation: "float 1.8s ease-in-out infinite" }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400/90 shadow-[0_0_20px_rgba(168,85,247,0.7)]"
                    style={{ animation: "orbit 1.7s linear infinite" }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/90 shadow-[0_0_18px_rgba(6,182,212,0.6)]"
                    style={{ animation: "orbit 2.4s linear infinite reverse" }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/90 shadow-[0_0_16px_rgba(34,197,94,0.55)]"
                    style={{ animation: "orbit 3.1s linear infinite" }}
                  />

                  <svg
                    className="absolute inset-0 m-auto h-[92px] w-[92px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    style={{ animation: "arcGlow 1.2s ease-in-out infinite" }}
                  >
                    <defs>
                      <linearGradient
                        id="brainGradientAdv"
                        x1="0"
                        y1="0"
                        x2="24"
                        y2="24"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#a855f7" />
                        <stop offset="0.5" stopColor="#06b6d4" />
                        <stop offset="1" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>

                    <path
                      d="M9.2 5.2c-2 0-3.7 1.6-3.7 3.7 0 .6.1 1.1.3 1.6C4.7 11 4 12 4 13.2c0 1.5 1 2.8 2.4 3.2-.1.3-.1.6-.1.9 0 1.9 1.5 3.4 3.4 3.4h.8"
                      stroke="url(#brainGradientAdv)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="6 6"
                      style={{ animation: "dash 1.1s linear infinite" }}
                    />
                    <path
                      d="M14.8 5.2c2 0 3.7 1.6 3.7 3.7 0 .6-.1 1.1-.3 1.6 1.1.5 1.8 1.5 1.8 2.7 0 1.5-1 2.8-2.4 3.2.1.3.1.6.1.9 0 1.9-1.5 3.4-3.4 3.4h-.8"
                      stroke="url(#brainGradientAdv)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="6 6"
                      style={{ animation: "dash 1.1s linear infinite" }}
                    />
                    <path
                      d="M12 6v14"
                      stroke="url(#brainGradientAdv)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeDasharray="6 6"
                      style={{ animation: "dash 1.1s linear infinite" }}
                    />
                  </svg>
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-base font-semibold text-white">
                  Analyzing creatives…
                </div>
                <div className="mt-1 text-sm text-zinc-300">
                  <span className="inline-block min-h-[20px]">
                    {messages[msgIdx]}
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-2 w-[65%] rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(168,85,247,1), rgba(6,182,212,1), rgba(34,197,94,1))",
                      backgroundSize: "200% 200%",
                      animation: "shimmer 1.2s ease infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AnalyzePage() {
  const [mode, setMode] = useState<AnalysisMode>("compare");
  const [objective, setObjective] = useState<CampaignObjective>("purchase");
  const [audienceSegment, setAudienceSegment] =
    useState<AudienceSegment>("budget_sensitive");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";

  const minFiles = mode === "single" ? 1 : mode === "compare" ? 2 : 3;
  const maxFiles = mode === "single" ? 1 : mode === "compare" ? 2 : 5;

  const canSubmit = files.length >= minFiles && files.length <= maxFiles && !loading;

  const fileHelp = useMemo(() => {
    if (mode === "single") {
      if (files.length === 0) return "Choose 1 ad (image/video) to analyze.";
      if (files.length > 1) return "Single mode: 1 file only.";
      return "1 file ready.";
    }
    if (mode === "compare") {
      if (files.length === 0) return "Choose 2 ads to compare (A/B).";
      if (files.length < 2) return "Add 2 files.";
      if (files.length > 2) return "Compare mode: 2 files only.";
      return "2 files ready.";
    }
    // batch
    if (files.length === 0) return "Choose 3–5 variants to rank.";
    if (files.length < 3) return "Add at least 3 files.";
    if (files.length > 5) return "Max 5 files.";
    return `${files.length} file(s) ready.`;
  }, [files.length, mode]);

  function setPickedFiles(selected: File[]) {
    // Enforce mode limits in a friendly way.
    const limited = selected.slice(0, maxFiles);
    setFiles(limited);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (files.length < minFiles || files.length > maxFiles) {
      setError(`Please upload between ${minFiles} and ${maxFiles} file(s).`);
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("objective", objective);
      fd.append("audience_segment", audienceSegment);

      if (mode === "single") {
        const f = files[0];
        if (!f) throw new Error("No file selected.");
        fd.append("files", f);
      } else {
        for (const f of files) fd.append("files", f);
      }

      const res = await fetch(`${apiBase}/compare`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error (${res.status}): ${text || res.statusText}`);
      }

      const json = (await res.json()) as ComparisonResult;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const previews = useMemo(() => {
    return files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      kind: f.type.startsWith("video/") ? "video" : "image",
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-50">
      {loading ? <AnalysisLoader /> : null}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(1200px 500px at 12% -10%, rgba(168,85,247,0.16), transparent 55%), radial-gradient(1100px 520px at 88% 0%, rgba(6,182,212,0.12), transparent 55%), radial-gradient(1000px 560px at 50% 110%, rgba(34,197,94,0.08), transparent 60%)",
        }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-widest text-zinc-400">
                AD ANALYSIS
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Upload your ad. Understand what stands out.
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                New Analysis
              </span>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                History ↗
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-zinc-300">Analysis mode:</div>
            {([
              ["single", "Single Ad"],
              ["compare", "Compare Two Ads"],
              ["batch", "Batch"],
            ] as const).map(([value, label]) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setResult(null);
                    setError(null);
                    setFiles([]);
                  }}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold transition",
                    active
                      ? "bg-white text-zinc-900"
                      : "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          <section
            className={
              previews.length === 0
                ? "overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_70px_rgba(0,0,0,0.55)]"
                : "rounded-3xl"
            }
          >
            {previews.length === 0 ? (
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-white">Creative canvas</div>
                  <div className="text-xs text-zinc-300">
                    Works with images (JPG/PNG) and video (MP4/MOV).
                  </div>
                </div>
                <div className="text-xs text-zinc-400">
                  {files.length > 0 ? `${files.length} selected` : `Select ${minFiles}–${maxFiles}`}
                </div>
              </div>
            ) : null}

            {previews.length === 0 ? (
              <div className="p-5">
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    const dropped = Array.from(e.dataTransfer.files || []);
                    if (dropped.length) setPickedFiles(dropped);
                  }}
                  className={[
                    "rounded-3xl border border-dashed p-10 text-center transition",
                    isDragging
                      ? "border-white/40 bg-white/10"
                      : "border-white/15 bg-black/20 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="text-base font-semibold text-white">
                    Drop your ad here
                  </div>
                  <div className="mt-2 text-sm text-zinc-300">
                    or{" "}
                    <span className="font-semibold text-white">Browse Files</span>{" "}
                    (select {minFiles}–{maxFiles})
                  </div>
                  <div className="mt-5 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-100"
                    >
                      Browse Files
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-black/70 via-black/10 to-transparent" />
                <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-zinc-100 backdrop-blur hover:bg-black/55"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Change files
                  </button>
                </div>
                <div
                  className={
                    mode === "compare"
                      ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
                      : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  }
                >
                  {previews.map(({ file, url, kind }, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className={[
                        "relative overflow-hidden rounded-3xl border border-white/10 bg-black/30",
                        "shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
                      ].join(" ")}
                    >
                      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                        <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                          {mode === "compare" ? (idx === 0 ? "A" : "B") : `v${idx + 1}`}
                        </span>
                        {mode === "compare" ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-200 backdrop-blur">
                            {idx === 0 ? "Control" : "Variant"}
                          </span>
                        ) : null}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent px-4 pb-3 pt-10">
                        <div className="text-xs text-zinc-200 truncate">{file.name}</div>
                      </div>

                      <div
                        className={
                          mode === "compare"
                            ? "aspect-[16/9] bg-black/40"
                            : "aspect-video bg-black/40"
                        }
                      >
                        {kind === "video" ? (
                          <video
                            className="h-full w-full object-cover"
                            src={url}
                            controls
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="h-full w-full object-cover"
                            src={url}
                            alt={file.name}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single shared picker so we don't show two "choose file" controls */}
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="image/*,video/*"
              multiple={mode !== "single"}
              onChange={(e) => setPickedFiles(Array.from(e.target.files ?? []))}
            />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Compare settings</h2>
                <p className="mt-1 text-xs text-zinc-300">Plain language inputs. Structured outputs.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-zinc-300">
                /compare
              </div>
            </div>

            <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={onSubmit}>
              <label className="flex flex-col gap-1.5 text-xs font-semibold">
                Objective
                <select
                  className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as CampaignObjective)}
                >
                  <option value="purchase">purchase</option>
                  <option value="engagement">engagement</option>
                  <option value="virality">virality</option>
                  <option value="clarity">clarity</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold">
                Audience segment
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-3 pr-9 text-sm text-white outline-none ring-0 transition focus:border-white/20 focus:bg-black/40"
                    value={audienceSegment}
                    onChange={(e) => setAudienceSegment(e.target.value as AudienceSegment)}
                  >
                    {AUDIENCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-zinc-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M7 10l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <span className="text-[11px] font-normal text-zinc-300">
                  {AUDIENCE_OPTIONS.find((o) => o.value === audienceSegment)?.description}
                </span>
              </label>

              <div className="flex flex-col gap-1.5 text-xs font-semibold sm:col-span-2 lg:col-span-1">
                Files ({minFiles}–{maxFiles})
                <div className="flex h-10 items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3">
                  <div className="text-[11px] font-normal text-zinc-300">
                    {files.length > 0 ? `${files.length} selected` : "No files selected"}
                  </div>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Choose
                  </button>
                </div>
                <span className="text-[11px] font-normal text-zinc-300">{fileHelp}</span>
              </div>

              <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Analyzing…" : mode === "single" ? "Analyze ad" : "Compare variants"}
                </button>
              </div>

              {error ? (
                <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-white">Results</h2>
            {!result ? (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-300">
                Upload creatives to see what stands out in each variant.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {/* What this means */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-semibold text-white">💡 WHAT THIS MEANS</div>
                  <p className="mt-2 text-sm text-zinc-200 leading-6">
                    {shortExplanation(result.explanation)}
                  </p>
                  <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <summary className="cursor-pointer text-[11px] font-semibold text-zinc-200">
                      Show details
                    </summary>
                    <p className="mt-2 text-sm text-zinc-200 leading-6 whitespace-pre-wrap">
                      {result.explanation}
                    </p>
                  </details>
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-zinc-300">3 THINGS TO FIX</div>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-200">
                      {result.recommendations.slice(0, 3).map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {mode !== "single" ? (
                  <>
                    {/* PRD-style summary */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-zinc-300">VERDICT</div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 font-semibold",
                              result.narrative_source === "llm"
                                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                                : "border-white/15 bg-white/5 text-zinc-200",
                            ].join(" ")}
                          >
                            Narrative: {result.narrative_source === "llm" ? "AI" : "Standard"}
                          </span>
                          {result.narrative_source === "llm" && result.narrative_model ? (
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-zinc-300">
                              {result.narrative_model}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-white">
                        {`Version ${abFromVariantId(result.overall_winner)} is stronger overall for ${result.objective}.`}
                      </div>
                      <div className="mt-2 text-xs text-zinc-300">
                        Objective winner:{" "}
                        <span className="font-semibold text-white">
                          {abFromVariantId(result.objective_winner)}
                        </span>{" "}
                        • Overall winner:{" "}
                        <span className="font-semibold text-white">
                          {abFromVariantId(result.overall_winner)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}

                {/* What we found: element list from segments */}
                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        What we found
                      </div>
                      <div className="mt-1 text-xs text-zinc-300">
                        {mode === "single"
                          ? "Each stat below is tied to the creative you uploaded."
                          : "Each stat below is tied to the creative above (A/B)."}
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Objective: <span className="font-mono text-zinc-200">{result.objective}</span>
                    </div>
                  </div>

                  <div
                    className={
                      mode === "compare"
                        ? "mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"
                        : "mt-4 grid grid-cols-1 gap-4"
                    }
                  >
                    {(mode === "compare" ? result.variants.slice(0, 2) : result.variants.slice(0, 1)).map((v) => {
                      const overall = overallTenPoint(v.scores);
                      const obj = scoreForObjective(v.scores, result.objective);
                      const strongest = [...v.segments].sort((a, b) => b.visual_weight_pct - a.visual_weight_pct)[0];
                      const weakest = [...v.segments].sort((a, b) => a.visual_weight_pct - b.visual_weight_pct)[0];
                      const ab = mode === "compare" ? abFromVariantId(v.variant_id) : "Your ad";
                      const isOverallWinner = mode !== "single" && v.variant_id === result.overall_winner;
                      const isObjectiveWinner = mode !== "single" && v.variant_id === result.objective_winner;

                      return (
                        <div key={v.variant_id} className="rounded-3xl border border-white/10 bg-black/30 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white">
                                {mode === "compare" ? ab : "YOU"}
                              </span>
                              <span
                                className={[
                                  "rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  v.segments_source === "sam3"
                                    ? "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200"
                                    : "border-white/10 bg-white/5 text-zinc-200",
                                ].join(" ")}
                              >
                                Segments: {v.segments_source === "sam3" ? "SAM3" : "Mock"}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white">
                                  {mode === "compare" ? (ab === "A" ? "Control" : "Variant") : "Your creative"}
                                </div>
                                <div className="break-words text-[11px] text-zinc-300">
                                  {v.filename}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[11px]">
                              {isOverallWinner ? (
                                <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-200">
                                  Overall winner
                                </span>
                              ) : null}
                              {isObjectiveWinner ? (
                                <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 font-semibold text-sky-200">
                                  Objective winner
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                              <div className="text-[11px] font-semibold text-zinc-300">
                                Objective score
                              </div>
                              <div className="mt-1 flex items-baseline justify-between gap-2">
                                <div className="font-mono text-white">{obj.toFixed(1)}</div>
                                <div className="text-[11px] text-zinc-400">{result.objective}</div>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                              <div className="text-[11px] font-semibold text-zinc-300">
                                Overall (0–10)
                              </div>
                              <div className="mt-1 flex items-baseline justify-between gap-2">
                                <div className="font-mono text-white">{overall.toFixed(1)}/10</div>
                                <div className="text-[11px] text-zinc-400">avg</div>
                              </div>
                            </div>
                          </div>

                          {v.pillar_scores ? (
                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                              {PILLAR_ORDER.filter((p) => p in v.pillar_scores!).map((pillar) => {
                                const score = v.pillar_scores?.[pillar] ?? 0;
                                const bd = (v.pillar_breakdown?.[pillar] as any) || null;
                                const drivers = bd?.drivers || [];
                                const drags = bd?.drags || [];
                                const missing = bd?.missing || [];
                                return (
                                  <div
                                    key={`${v.variant_id}-pillar-${pillar}`}
                                    className="rounded-2xl border border-white/10 bg-black/20 p-3"
                                  >
                                    <div className="flex items-baseline justify-between gap-2">
                                      <div className="text-[11px] font-semibold text-zinc-200">
                                        {pillar}
                                      </div>
                                      <div className="font-mono text-white">{Number(score).toFixed(1)}/100</div>
                                    </div>
                                    {bd ? (
                                      <div className="mt-2 space-y-1 text-[11px] text-zinc-400">
                                        {drivers.length ? (
                                          <div>
                                            <span className="text-zinc-300">Helped:</span>{" "}
                                            {formatFactorList(drivers, 2)}
                                          </div>
                                        ) : null}
                                        {drags.length ? (
                                          <div>
                                            <span className="text-zinc-300">Hurt:</span>{" "}
                                            {formatFactorList(drags, 2)}
                                          </div>
                                        ) : null}
                                        {missing.length ? (
                                          <div>
                                            <span className="text-zinc-300">Missing:</span>{" "}
                                            {missing
                                              .slice(0, 2)
                                              .map((f: any) => factorName(f))
                                              .join(", ")}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          <div className="mt-3 text-xs text-zinc-300">
                            Strongest:{" "}
                            <span className="font-semibold text-white">
                              {strongest ? segmentTitle(strongest) : "—"}
                            </span>{" "}
                            • Weakest:{" "}
                            <span className="font-semibold text-white">
                              {weakest ? segmentTitle(weakest) : "—"}
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            {v.segments.map((s, idx) => {
                              const pseudoScore = clamp((s.visual_weight_pct / 100) * 10, 0, 10);
                              const copyMode = result.copy_mode === "brain" ? "brain" : "neutral";
                              return (
                                <div
                                  key={`${v.variant_id}-${s.label}-${idx}`}
                                  className="rounded-2xl border border-white/10 bg-black/20 p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs font-semibold text-white">
                                      {segmentTitle(s)}
                                    </div>
                                    <div className="text-xs text-zinc-300 font-mono">
                                      {pseudoScore.toFixed(1)}/10
                                    </div>
                                  </div>
                                  {(s.pillar || s.scoring_weight != null) ? (
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                                      {s.pillar ? (
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300">
                                          {s.pillar}
                                        </span>
                                      ) : null}
                                      {s.scoring_weight != null ? (
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono">
                                          w={s.scoring_weight}
                                        </span>
                                      ) : null}
                                      {s.impact_score != null ? (
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono">
                                          impact={s.impact_score.toFixed(1)}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className={`h-2 ${scoreColor(pseudoScore)}`}
                                      style={{ width: `${(pseudoScore / 10) * 100}%` }}
                                    />
                                  </div>
                                  <div className="mt-2 text-[11px] text-zinc-300">
                                    Takes up {s.visual_weight_pct.toFixed(0)}% •{" "}
                                    {scoreLabel(pseudoScore, copyMode)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Raw score card for debug/demo */}
                <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer text-xs font-semibold text-zinc-200">
                    View score card (debug)
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {result.variants.map((v) => (
                      <div key={v.variant_id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="text-sm font-semibold text-white">{v.variant_id}</div>
                        <div className="mt-1 text-xs text-zinc-300">{v.filename}</div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          {(["purchase", "engagement", "virality", "clarity"] as const).map((k) => (
                            <div key={k} className="rounded-xl border border-white/10 bg-black/20 p-2">
                              <div className="text-zinc-400">{k}</div>
                              <div className="font-mono text-white">{v.scores[k].toFixed(1)}</div>
                            </div>
                          ))}
                        </div>
                        {v.segments_source === "sam3" && v.roboflow_raw ? (
                          <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                            <summary className="cursor-pointer text-[11px] font-semibold text-zinc-200">
                              View Roboflow raw output
                            </summary>
                            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-5 text-zinc-200">
                              {JSON.stringify(v.roboflow_raw, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

