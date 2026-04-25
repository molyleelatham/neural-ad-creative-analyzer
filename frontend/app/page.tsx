/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useMemo, useState } from "react";

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
};

function scoreForObjective(scores: VariantScore, objective: CampaignObjective) {
  return scores[objective] ?? 0;
}

export default function Home() {
  const [objective, setObjective] = useState<CampaignObjective>("purchase");
  const [audienceSegment, setAudienceSegment] =
    useState<AudienceSegment>("budget_sensitive");
  const [files, setFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";

  const canSubmit = files.length >= 2 && files.length <= 5 && !loading;

  const fileHelp = useMemo(() => {
    if (files.length === 0) return "Choose 2–5 ad variants to compare.";
    if (files.length < 2) return "Add at least 2 files.";
    if (files.length > 5) return "Max 5 files.";
    return `${files.length} file(s) ready.`;
  }, [files.length]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (files.length < 2 || files.length > 5) {
      setError("Please upload between 2 and 5 files.");
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("objective", objective);
      fd.append("audience_segment", audienceSegment);
      for (const f of files) fd.append("files", f);

      const res = await fetch(`${apiBase}/compare`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Backend error (${res.status}): ${text || res.statusText}`,
        );
      }

      const json = (await res.json()) as ComparisonResult;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Arcanalytics
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Compare 2–5 ad variants. Backend:{" "}
            <span className="font-mono">{apiBase}</span>
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Compare</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Upload creatives and get structured scores from the FastAPI backend.
            </p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Objective
                  <select
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={objective}
                    onChange={(e) =>
                      setObjective(e.target.value as CampaignObjective)
                    }
                  >
                    <option value="purchase">purchase</option>
                    <option value="engagement">engagement</option>
                    <option value="virality">virality</option>
                    <option value="clarity">clarity</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium">
                  Audience segment
                  <select
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={audienceSegment}
                    onChange={(e) =>
                      setAudienceSegment(e.target.value as AudienceSegment)
                    }
                  >
                    <option value="budget_sensitive">budget_sensitive</option>
                    <option value="social_proof_driven">
                      social_proof_driven
                    </option>
                    <option value="viral_share_oriented">
                      viral_share_oriented
                    </option>
                    <option value="premium_brand_oriented">
                      premium_brand_oriented
                    </option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Files (2–5)
                <input
                  className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:file:bg-zinc-50 dark:file:text-zinc-900 dark:hover:file:bg-white"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) =>
                    setFiles(Array.from(e.target.files ?? []))
                  }
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {fileHelp}
                </span>
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                {loading ? "Comparing…" : "Compare variants"}
              </button>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              ) : null}
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold">Result</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Winners and per-variant scores (Pydantic-typed response).
            </p>

            {!result ? (
              <div className="mt-6 rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                Run a comparison to see results here.
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Overall winner
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {result.overall_winner}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Objective winner
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {result.objective_winner}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Explanation
                  </div>
                  <p className="mt-2 leading-6">{result.explanation}</p>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Recommendations
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {result.recommendations.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Variants
                  </div>
                  <div className="mt-3 space-y-3">
                    {result.variants.map((v) => (
                      <div
                        key={v.variant_id}
                        className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">
                              {v.variant_id}{" "}
                              <span className="font-normal text-zinc-600 dark:text-zinc-400">
                                {v.filename}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Objective score:{" "}
                              <span className="font-mono">
                                {scoreForObjective(v.scores, result.objective).toFixed(
                                  2,
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            attention{" "}
                            <span className="font-mono">
                              {v.neural_features.attention_score.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                            <div className="text-zinc-500">purchase</div>
                            <div className="font-mono">
                              {v.scores.purchase.toFixed(2)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                            <div className="text-zinc-500">engagement</div>
                            <div className="font-mono">
                              {v.scores.engagement.toFixed(2)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                            <div className="text-zinc-500">virality</div>
                            <div className="font-mono">
                              {v.scores.virality.toFixed(2)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                            <div className="text-zinc-500">clarity</div>
                            <div className="font-mono">
                              {v.scores.clarity.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <details className="mt-3 text-sm">
                          <summary className="cursor-pointer text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                            See mock segments
                          </summary>
                          <ul className="mt-2 space-y-2">
                            {v.segments.map((s, idx) => (
                              <li
                                key={`${v.variant_id}-${s.label}-${idx}`}
                                className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">{s.label}</span>
                                  <span className="font-mono text-zinc-500 dark:text-zinc-400">
                                    conf {s.confidence.toFixed(2)} •{" "}
                                    {s.visual_weight_pct.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                                  {s.reasoning}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="text-xs text-zinc-500 dark:text-zinc-400">
          Tip: set <span className="font-mono">NEXT_PUBLIC_API_BASE</span> in{" "}
          <span className="font-mono">frontend/.env.local</span> if your backend
          isn’t on <span className="font-mono">127.0.0.1:8000</span>.
        </footer>
      </div>
    </div>
  );
}
