"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
              <span className="text-lg font-bold text-gray-900">ArcAnalytics</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/analyze" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Analyze
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-blue-600">
                Dashboard
              </Link>
              <Link
                href="/analyze"
                className="btn-primary"
              >
                New Analysis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                Dashboard
              </div>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Brand Overview
              </h1>
              <p className="mt-2 text-gray-600">
                Track your ad performance and discover insights to optimize your marketing strategy
              </p>
            </div>
            <Link
              href="/analyze"
              className="btn-primary"
            >
              New Analysis
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-hover bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-semibold">+12%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">24</div>
            <div className="text-sm text-gray-600">Total Analyses</div>
          </div>

          <div className="card-hover bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-semibold">+8%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">78.5%</div>
            <div className="text-sm text-gray-600">Avg. Performance</div>
          </div>

          <div className="card-hover bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-semibold">+15%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">92.3%</div>
            <div className="text-sm text-gray-600">Attention Score</div>
          </div>

          <div className="card-hover bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-green-600 font-semibold">+5%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">2.4s</div>
            <div className="text-sm text-gray-600">Avg. Engagement</div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Analyses</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                      <div>
                        <div className="font-semibold text-gray-900">Campaign Ad {i}</div>
                        <div className="text-sm text-gray-600">Analyzed 2 days ago</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${75 + i * 5}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{75 + i * 5}% score</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/analyze`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View Details →
                    </Link>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/analyze" className="btn-secondary">
                  Start New Analysis
                </Link>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Insights</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Strong CTA Performance</div>
                    <div className="text-xs text-gray-600">Your call-to-action buttons are performing 23% above average</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Logo Visibility Issue</div>
                    <div className="text-xs text-gray-600">Consider increasing brand logo size by 15%</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Emotional Connection</div>
                    <div className="text-xs text-gray-600">Face detection shows strong emotional engagement</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Upgrade to Pro</h3>
              <p className="text-sm text-blue-100 mb-4">
                Get unlimited analyses, advanced insights, and team collaboration features.
              </p>
              <button className="w-full bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>

        {/* Development Notice */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-800">Development Version</h3>
              <p className="text-sm text-amber-700 mt-1">
                This dashboard is currently showing demo data. The core analytics functionality is available in the{" "}
                <Link href="/analyze" className="font-mono text-amber-800 underline">/analyze</Link> section.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}