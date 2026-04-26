"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Types for dashboard data
type DashboardStats = {
  totalAnalyses: number;
  avgPerformance: number;
  attentionScore: number;
  avgEngagement: number;
  recentAnalyses: Array<{
    id: string;
    filename: string;
    score: number;
    analyzedAt: string;
    objective: string;
  }>;
  insights: Array<{
    type: "positive" | "warning" | "info";
    title: string;
    description: string;
  }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      // For now, use mock data until we implement a proper dashboard endpoint
      // TODO: Replace with real API call to /api/dashboard when available
      const mockData: DashboardStats = {
        totalAnalyses: 24,
        avgPerformance: 78.5,
        attentionScore: 92.3,
        avgEngagement: 2.4,
        recentAnalyses: [
          { id: "1", filename: "campaign_ad_1.jpg", score: 85, analyzedAt: "2 days ago", objective: "engagement" },
          { id: "2", filename: "product_launch.png", score: 78, analyzedAt: "3 days ago", objective: "purchase" },
          { id: "3", filename: "brand_awareness.jpg", score: 92, analyzedAt: "5 days ago", objective: "clarity" },
        ],
        insights: [
          { type: "positive", title: "Strong CTA Performance", description: "Your call-to-action buttons are performing 23% above average" },
          { type: "warning", title: "Logo Visibility Issue", description: "Consider increasing brand logo size by 15%" },
          { type: "info", title: "Emotional Connection", description: "Face detection shows strong emotional engagement" },
        ],
      };
      
      setStats(mockData);
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }
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
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        ) : stats ? (
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
              <div className="text-2xl font-bold text-gray-900">{stats.totalAnalyses}</div>
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
              <div className="text-2xl font-bold text-gray-900">{stats.avgPerformance}%</div>
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
              <div className="text-2xl font-bold text-gray-900">{stats.attentionScore}%</div>
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
              <div className="text-2xl font-bold text-gray-900">{stats.avgEngagement}s</div>
              <div className="text-sm text-gray-600">Avg. Engagement</div>
            </div>
          </div>
        ) : null}

        {/* Recent Analyses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Analyses</h2>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                            <div className="h-2 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  {stats.recentAnalyses.map((analysis) => (
                    <div key={analysis.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{analysis.score}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{analysis.filename}</div>
                          <div className="text-sm text-gray-600">Analyzed {analysis.analyzedAt}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all" 
                                style={{ width: `${analysis.score}%` }} 
                              />
                            </div>
                            <span className="text-xs text-gray-600">{analysis.score}% score</span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                              {analysis.objective}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/analyze`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View Details →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}
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
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-200 rounded-full mt-2" />
                        <div className="space-y-1">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-40"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  {stats.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        insight.type === 'positive' ? 'bg-green-500' :
                        insight.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{insight.title}</div>
                        <div className="text-xs text-gray-600">{insight.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-800">Backend Integration Ready</h3>
              <p className="text-sm text-blue-700 mt-1">
                This dashboard displays mock data and is ready for backend integration. The core analytics functionality with SAM3 visual analysis and TribeV2 neural encoding is fully operational in the{" "}
                <Link href="/analyze" className="font-mono text-blue-800 underline">/analyze</Link> section.
              </p>
              <p className="text-sm text-blue-600 mt-2">
                <strong>Backend endpoints:</strong> <code className="bg-blue-100 px-1 rounded">/analyze-full</code>, <code className="bg-blue-100 px-1 rounded">/compare</code>, <code className="bg-blue-100 px-1 rounded">/health</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}