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
  summary: string;
};

type ComparisonResult = {
  objective: CampaignObjective;
  audience_segment: AudienceSegment;
  variants: VariantAnalysis[];
  overall_winner: string;
  objective_winner: string;
  explanation: string;
  recommendations: string[];
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

function scoreLabel(outOfTen: number) {
  if (outOfTen >= 8.5) return "Extremely strong brain engagement";
  if (outOfTen >= 7) return "Strong brain engagement";
  if (outOfTen >= 5) return "Moderate — could be stronger";
  if (outOfTen >= 3) return "Low — brain barely notices this";
  return "Almost invisible to the brain";
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
    cta: "Call to action",
    logo: "Brand logo",
    face: "Person / face",
    background: "Background",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

function abFromVariantId(variantId: string) {
  if (variantId === "v1") return "A";
  if (variantId === "v2") return "B";
  return variantId.toUpperCase();
}

function BrainLoader() {
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
              <div className="text-sm font-semibold text-white">
                Arcanalytics Brain
              </div>
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

      // Backend contract is 2–5 files. For SINGLE, send the same file twice.
      if (mode === "single") {
        const f = files[0];
        if (!f) throw new Error("No file selected.");
        fd.append("files", f);
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
      {loading ? <BrainLoader /> : null}
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
                Upload your ad. Understand your brain.
              </h1>
              <p className="mt-1 text-xs text-zinc-400">
                Backend: <span className="font-mono">{apiBase}</span>
              </p>
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
                <select
                  className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white"
                  value={audienceSegment}
                  onChange={(e) =>
                    setAudienceSegment(e.target.value as AudienceSegment)
                  }
                >
                  <option value="budget_sensitive">budget_sensitive</option>
                  <option value="social_proof_driven">social_proof_driven</option>
                  <option value="viral_share_oriented">viral_share_oriented</option>
                  <option value="premium_brand_oriented">premium_brand_oriented</option>
                </select>
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
                Upload creatives to see a brain engagement breakdown.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
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
                    {mode === "single"
                      ? "Here’s what the brain notices most in your ad — and what to fix."
                      : `Version ${abFromVariantId(result.overall_winner)} is stronger overall for ${result.objective}.`}
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

                {/* What we found: element list from segments */}
                <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        What we found
                      </div>
                      <div className="mt-1 text-xs text-zinc-300">
                        Each stat below is tied to the creative above (A/B).
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
                      const isOverallWinner = v.variant_id === result.overall_winner;
                      const isObjectiveWinner = v.variant_id === result.objective_winner;

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
                                <div className="truncate text-sm font-semibold text-white">
                                  {mode === "compare" ? (ab === "A" ? "Control" : "Variant") : "Your creative"}
                                </div>
                                <div className="truncate text-[11px] text-zinc-300">
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

                          <div className="mt-3 text-xs text-zinc-300">
                            Strongest:{" "}
                            <span className="font-semibold text-white">
                              {prettyLabel(strongest?.label ?? "—")}
                            </span>{" "}
                            • Weakest:{" "}
                            <span className="font-semibold text-white">
                              {prettyLabel(weakest?.label ?? "—")}
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            {v.segments.map((s, idx) => {
                              const pseudoScore = clamp((s.visual_weight_pct / 100) * 10, 0, 10);
                              return (
                                <div
                                  key={`${v.variant_id}-${s.label}-${idx}`}
                                  className="rounded-2xl border border-white/10 bg-black/20 p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs font-semibold text-white">
                                      {prettyLabel(s.label)}
                                    </div>
                                    <div className="text-xs text-zinc-300 font-mono">
                                      {pseudoScore.toFixed(1)}/10
                                    </div>
                                  </div>
                                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className={`h-2 ${scoreColor(pseudoScore)}`}
                                      style={{ width: `${(pseudoScore / 10) * 100}%` }}
                                    />
                                  </div>
                                  <div className="mt-2 text-[11px] text-zinc-300">
                                    Takes up {s.visual_weight_pct.toFixed(0)}% •{" "}
                                    {scoreLabel(pseudoScore)}
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

                {/* What this means */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-semibold text-white">💡 WHAT THIS MEANS</div>
                  <p className="mt-2 text-sm text-zinc-200 leading-6">{result.explanation}</p>
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-zinc-300">3 THINGS TO FIX</div>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-200">
                      {result.recommendations.slice(0, 3).map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ol>
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

