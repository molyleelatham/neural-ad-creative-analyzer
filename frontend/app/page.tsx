import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-3">
          <div className="text-xs font-semibold tracking-widest text-zinc-400">
            ARCANALYTICS
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Upload your ad. See what stands out. Beat your competitors.
          </h1>
          <p className="max-w-2xl text-sm text-zinc-300">
            Arcanalytics breaks down what your creative draws attention to — then gives
            plain-English fixes to improve performance.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/analyze"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-zinc-900"
          >
            Start analysis
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white/90 hover:bg-white/5"
          >
            Dashboard
          </Link>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Find what viewers notice</div>
            <div className="mt-1 text-xs text-zinc-300">
              Face, CTA, logo, headline — automatically surfaced.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Score engagement</div>
            <div className="mt-1 text-xs text-zinc-300">
              Structured output (Pydantic) for every variant.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">A/B compare fast</div>
            <div className="mt-1 text-xs text-zinc-300">
              Upload 2–5 variants and get a winner + recommendations.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
