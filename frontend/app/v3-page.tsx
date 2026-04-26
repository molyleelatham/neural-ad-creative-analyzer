"use client";

import Link from 'next/link';
import { V3Aurora } from '@/components/V3Aurora';
import { V3Nav } from '@/components/V3Nav';

export default function V3Landing() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Aurora Background */}
      <V3Aurora />
      
      {/* Navigation */}
      <V3Nav currentPage="home" />

      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        zIndex: 1,
        padding: '120px 0 80px'
      }}>
        <div className="v3-container">
          <div className="v3-grid-2" style={{ alignItems: 'center' }}>
            {/* Left Content */}
            <div>
              <div style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 16px',
                borderRadius: '20px',
                background: 'oklch(0.55 0.18 180 / 0.1)',
                color: 'oklch(0.55 0.18 180)',
                fontFamily: 'var(--v3-font-sans)',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '24px'
              }}>
                NEW · TribeV2 brain encoder
              </div>

              <h1 style={{
                fontFamily: 'var(--v3-font-serif)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 500,
                lineHeight: 1.1,
                color: 'var(--v3-ink)',
                marginBottom: '24px',
                maxWidth: '500px'
              }}>
                Stop guessing.{' '}
                <span className="v3-gradient-text">
                  Start knowing.
                </span>
              </h1>

              <p style={{
                fontFamily: 'var(--v3-font-sans)',
                fontSize: '18px',
                lineHeight: 1.6,
                color: 'var(--v3-ink-2)',
                marginBottom: '32px',
                maxWidth: '400px'
              }}>
                AI-powered ad analysis that predicts customer brain response. 
                Upload your creative and get actionable insights in seconds.
              </p>

              <div style={{ 
                display: 'flex', 
                gap: '16px',
                marginBottom: '48px',
                flexWrap: 'wrap'
              }}>
                <Link
                  href="/analyze"
                  className="v3-btn v3-btn-primary"
                  style={{ 
                    padding: '12px 24px',
                    fontSize: '16px'
                  }}
                >
                  Analyze your ad
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <button
                  className="v3-btn v3-btn-secondary"
                  style={{ 
                    padding: '12px 24px',
                    fontSize: '16px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Watch demo
                </button>
              </div>

              {/* Trust Strip */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '24px',
                color: 'var(--v3-ink-3)',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    display: 'flex',
                    transform: 'translateX(-8px)'
                  }}>
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--v3-surface-3)',
                          border: '2px solid var(--v3-surface)',
                          marginLeft: i > 1 ? '-8px' : '0'
                        }}
                      />
                    ))}
                  </div>
                  <span>500+ marketers trust Arcanalytics</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="oklch(0.75 0.15 60)">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>

            {/* Right - Hero Card */}
            <div style={{ position: 'relative' }}>
              <div className="v3-card-lg" style={{ 
                padding: '32px',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                {/* Report Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--v3-ink-3)',
                      marginBottom: '4px'
                    }}>
                      SAMPLE REPORT
                    </div>
                    <div style={{ 
                      fontFamily: 'var(--v3-font-sans)',
                      fontWeight: 500,
                      color: 'var(--v3-ink)'
                    }}>
                      Summer_Campaign_A.jpg
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: 'oklch(0.55 0.18 180 / 0.1)',
                    color: 'oklch(0.55 0.18 180)',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    78.4 composite
                  </div>
                </div>

                {/* Brain Visualization Placeholder */}
                <div style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, oklch(0.55 0.18 180 / 0.1), oklch(0.75 0.15 60 / 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  border: '1px solid var(--v3-surface-3)'
                }}>
                  <div style={{ textAlign: 'center', color: 'var(--v3-ink-2)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🧠</div>
                    <div style={{ fontSize: '12px' }}>Brain activation heatmap</div>
                  </div>
                </div>

                {/* Timeline Placeholder */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--v3-ink-3)',
                    marginBottom: '8px'
                  }}>
                    P(Convert) timeline
                  </div>
                  <div style={{
                    height: '40px',
                    borderRadius: '8px',
                    background: 'var(--v3-surface-2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '10%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '20px',
                      background: 'var(--v3-accent)',
                      borderRadius: '2px'
                    }} />
                    <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                      <path
                        d="M 0,30 Q 50,10 100,20 T 200,15 T 300,25"
                        stroke="var(--v3-accent)"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </div>
                </div>

                {/* Objective Scores */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--v3-ink-3)',
                    marginBottom: '12px'
                  }}>
                    Objective scores
                  </div>
                  <div className="v3-grid-2" style={{ gap: '12px' }}>
                    {[
                      { label: 'Purchase', score: 82, delta: '+5%' },
                      { label: 'Engagement', score: 76, delta: '+12%' },
                      { label: 'Virality', score: 71, delta: '-3%' },
                      { label: 'Clarity', score: 85, delta: '+8%' }
                    ].map((item, i) => (
                      <div key={i} style={{
                        background: 'var(--v3-surface-2)',
                        padding: '12px',
                        borderRadius: '8px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px'
                        }}>
                          <span style={{ 
                            fontSize: '12px', 
                            color: 'var(--v3-ink-2)' 
                          }}>
                            {item.label}
                          </span>
                          <span style={{ 
                            fontSize: '12px', 
                            color: item.delta.startsWith('+') ? 'oklch(0.55 0.18 180)' : 'oklch(0.65 0.15 30)',
                            fontWeight: 500
                          }}>
                            {item.delta}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 500,
                          color: 'var(--v3-ink)'
                        }}>
                          {item.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{
                  background: 'oklch(0.75 0.15 60 / 0.1)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid oklch(0.75 0.15 60 / 0.2)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'oklch(0.75 0.15 60)',
                    fontWeight: 500,
                    marginBottom: '4px'
                  }}>
                    RECOMMENDED ACTION
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: 'var(--v3-ink)',
                    marginBottom: '8px'
                  }}>
                    Increase CTA button size by 15%
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--v3-ink-2)' 
                  }}>
                    Projected lift: +18% conversion rate
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'oklch(0.55 0.18 180 / 0.1)',
                animation: 'v3-float 6s ease-in-out infinite'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-30px',
                left: '-30px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'oklch(0.75 0.15 60 / 0.08)',
                animation: 'v3-float 8s ease-in-out infinite reverse'
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* Live Preview Section */}
      <section style={{ 
        background: 'var(--v3-surface)',
        position: 'relative',
        zIndex: 1,
        padding: '80px 0'
      }}>
        <div className="v3-container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontFamily: 'var(--v3-font-serif)',
              fontSize: '36px',
              fontWeight: 500,
              color: 'var(--v3-ink)',
              marginBottom: '16px'
            }}>
              See your full report
            </h2>
            <p style={{
              fontSize: '18px',
              color: 'var(--v3-ink-2)',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              Get detailed insights across visual analysis, brain activation, and AI-powered recommendations
            </p>
          </div>

          <div className="v3-grid-3" style={{ gap: '24px' }}>
            {/* Creative Preview */}
            <div className="v3-card" style={{ padding: '24px' }}>
              <div style={{
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                background: 'var(--v3-surface-2)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ textAlign: 'center', color: 'var(--v3-ink-3)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
                  <div style={{ fontSize: '12px' }}>Your creative</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v3-ink)' }}>
                Creative analysis
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v3-ink-2)', marginTop: '4px' }}>
                Visual elements & composition
              </div>
            </div>

            {/* Brain Heatmap */}
            <div className="v3-card" style={{ padding: '24px' }}>
              <div style={{
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, oklch(0.55 0.18 180 / 0.2), oklch(0.75 0.15 60 / 0.1))',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ textAlign: 'center', color: 'var(--v3-ink-2)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧠</div>
                  <div style={{ fontSize: '12px' }}>Brain heatmap</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v3-ink)' }}>
                Neural activation
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v3-ink-2)', marginTop: '4px' }}>
                ROI engagement patterns
              </div>
            </div>

            {/* Recommendations */}
            <div className="v3-card" style={{ padding: '24px' }}>
              <div style={{
                width: '100%',
                height: '200px',
                borderRadius: '8px',
                background: 'var(--v3-surface-2)',
                marginBottom: '16px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--v3-ink-3)', marginBottom: '12px' }}>
                  TOP RECOMMENDATIONS
                </div>
                {[
                  'Increase CTA visibility',
                  'Optimize color contrast',
                  'Strengthen brand presence'
                ].map((rec, i) => (
                  <div key={i} style={{
                    padding: '8px 0',
                    borderBottom: i < 2 ? '1px solid var(--v3-surface-3)' : 'none',
                    fontSize: '12px',
                    color: 'var(--v3-ink-2)'
                  }}>
                    {i + 1}. {rec}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v3-ink)' }}>
                AI recommendations
              </div>
              <div style={{ fontSize: '12px', color: 'var(--v3-ink-2)', marginTop: '4px' }}>
                Actionable insights to improve
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ 
        position: 'relative', 
        zIndex: 1,
        padding: '80px 0'
      }}>
        <div className="v3-container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontFamily: 'var(--v3-font-serif)',
              fontSize: '36px',
              fontWeight: 500,
              color: 'var(--v3-ink)',
              marginBottom: '16px'
            }}>
              How it works
            </h2>
            <p style={{
              fontSize: '18px',
              color: 'var(--v3-ink-2)',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              Three simple steps to optimize your creative
            </p>
          </div>

          <div className="v3-grid-3" style={{ gap: '32px' }}>
            {[
              {
                step: '01',
                title: 'Upload',
                description: 'Drag and drop your creative. We accept all major image and video formats.',
                gradient: 'oklch(0.55 0.18 180 / 0.05)'
              },
              {
                step: '02',
                title: 'Analyze',
                description: 'Our AI scans visual elements and predicts brain response across multiple objectives.',
                gradient: 'oklch(0.75 0.15 60 / 0.05)'
              },
              {
                step: '03',
                title: 'Optimize',
                description: 'Get actionable recommendations with projected lift to improve performance.',
                gradient: 'oklch(0.55 0.18 180 / 0.05)'
              }
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: item.gradient,
                  border: '1px solid var(--v3-surface-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontFamily: 'var(--v3-font-sans)',
                  fontWeight: 500,
                  fontSize: '18px',
                  color: 'var(--v3-ink)'
                }}>
                  {item.step}
                </div>
                <h3 style={{
                  fontFamily: 'var(--v3-font-sans)',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: 'var(--v3-ink)',
                  marginBottom: '12px'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--v3-ink-2)'
                }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ 
        background: 'var(--v3-ink)',
        color: 'var(--v3-surface)',
        position: 'relative',
        zIndex: 1,
        padding: '80px 0'
      }}>
        <div className="v3-container" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--v3-font-serif)',
            fontSize: '36px',
            fontWeight: 500,
            marginBottom: '16px'
          }}>
            Stop guessing. Start knowing.
          </h2>
          <p style={{
            fontSize: '18px',
            opacity: 0.8,
            marginBottom: '32px',
            maxWidth: '400px',
            margin: '0 auto 32px'
          }}>
            Join hundreds of marketers using AI to optimize their creative performance.
          </p>
          <Link
            href="/analyze"
            className="v3-btn"
            style={{
              background: 'var(--v3-surface)',
              color: 'var(--v3-ink)',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 500
            }}
          >
            Start your free analysis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        background: 'var(--v3-surface)',
        borderTop: '1px solid var(--v3-surface-3)',
        position: 'relative',
        zIndex: 1,
        padding: '48px 0'
      }}>
        <div className="v3-container">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, oklch(0.55 0.18 180), oklch(0.75 0.15 60))'
                }}
              />
              <span style={{ 
                fontFamily: 'var(--v3-font-sans)',
                fontWeight: 500,
                fontSize: '16px',
                color: 'var(--v3-ink)'
              }}>
                Arcanalytics
              </span>
            </div>
            <div style={{ 
              fontSize: '14px',
              color: 'var(--v3-ink-2)'
            }}>
              © 2024 Arcanalytics. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}