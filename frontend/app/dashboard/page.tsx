"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-zinc-400">
              DASHBOARD
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Brand overview
            </h1>
          </div>
          <Link
            href="/analyze"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900"
          >
            New analysis
          </Link>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Hackathon note</div>
          <p className="mt-2 text-sm text-zinc-300">
            This page is a placeholder. The core MVP lives in{" "}
            <span className="font-mono">/analyze</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Your ads</div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="mt-1 text-xs text-zinc-300">
              Coming soon: stored analyses
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Industry avg</div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="mt-1 text-xs text-zinc-300">
              Coming soon: benchmarks
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-400">Top pattern</div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="mt-1 text-xs text-zinc-300">
              Coming soon: “what’s working”
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

