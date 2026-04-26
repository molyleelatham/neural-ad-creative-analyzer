"use client";

import Link from 'next/link';
import { V3Nav } from '@/components/V3Nav';
import { V3Aurora } from '@/components/V3Aurora';
import { BrainViz, ROITimeline } from '@/components/BrainViz';

const ACCENT = 'oklch(0.55 0.08 180)';

export default function HomePage() {
  return (
    <div style={{ background: 'var(--v3-bg)', fontFamily: 'var(--v3-font-sans)' }}>
      <V3Nav currentPage="home" />

      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: '72px 40px 100px', overflow: 'hidden' }}>
        <V3Aurora />
        <div style={{
          position: 'relative', maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 80, alignItems: 'center',
        }}>
          {/* Left copy */}
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px 6px 6px', borderRadius: 999,
              background: 'white', border: '1px solid oklch(0.92 0.005 90)',
              fontSize: 12, fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              marginBottom: 28,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'white',
                background: ACCENT, padding: '3px 8px', borderRadius: 999,
              }}>NEW</span>
              <span>TribeV2 brain encoder · live</span>
              <span style={{ color: 'var(--v3-ink-3)' }}>→</span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: 'var(--v3-font-serif)',
              fontSize: 'clamp(56px, 6.5vw, 88px)',
              lineHeight: 0.95,
              fontWeight: 400,
              letterSpacing: '-0.035em',
              margin: '0 0 32px',
              color: 'var(--v3-ink)',
            }}>
              Know what your<br />
              ad does to the<br />
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <em style={{
                  fontStyle: 'italic',
                  background: `linear-gradient(120deg, ${ACCENT} 0%, oklch(0.65 0.14 200) 50%, oklch(0.62 0.16 45) 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>brain</em>
                {/* Hand-drawn swoosh underline */}
                <svg
                  width="100%" height="14" viewBox="0 0 240 14"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', left: 0, bottom: -4, pointerEvents: 'none' }}
                >
                  <path
                    d="M2,10 Q60,2 120,8 T238,6"
                    stroke={ACCENT} strokeWidth="2" fill="none" strokeLinecap="round"
                  />
                </svg>
              </span>{' '}
              — before you spend.
            </h1>

            <p style={{
              fontSize: 18, lineHeight: 1.55, color: 'var(--v3-ink-2)',
              maxWidth: 480, margin: '0 0 36px', fontWeight: 400,
            }}>
              Upload an ad. Computer vision finds every element, our neural encoder predicts what
              the viewer's brain does next, and you get plain-English fixes ranked by lift.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 56 }}>
              <Link href="/analyze" className="v3-btn v3-btn-primary" style={{ fontSize: 14, padding: '14px 24px' }}>
                Analyze your first ad →
              </Link>
              <Link href="/analyze" className="v3-btn v3-btn-secondary" style={{ fontSize: 14, padding: '14px 22px' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: ACCENT, color: 'white',
                  display: 'grid', placeItems: 'center', fontSize: 9,
                }}>▶</span>
                Watch demo · 0:48
              </Link>
            </div>

            {/* Trust strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>TRUSTED BY MARKETERS AT</span>
              <div style={{ display: 'flex', gap: 28, alignItems: 'center', opacity: 0.5 }}>
                {['Acme', 'Lumen', 'Halo', 'Vertex', 'Northbeam'].map((n) => (
                  <span key={n} style={{
                    fontFamily: 'var(--v3-font-serif)',
                    fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em',
                  }}>{n}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — floating hero card */}
          <HeroCard />
        </div>
      </section>

      {/* ── Live preview ── */}
      <section style={{ padding: '24px 40px 80px', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <div>
              <span className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em' }}>● LIVE PREVIEW</span>
              <h2 style={{
                fontFamily: 'var(--v3-font-serif)',
                fontSize: 48, fontWeight: 400,
                margin: '6px 0 0', letterSpacing: '-0.02em',
                color: 'var(--v3-ink)',
              }}>
                A report, end to end.
              </h2>
            </div>
            <span style={{ fontSize: 13, color: 'var(--v3-ink-3)' }}>example · cosmetics campaign · 14s spot</span>
          </div>
          <ReportPreview />
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '60px 40px 100px', background: 'white', borderTop: '1px solid oklch(0.92 0.005 90)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em' }}>HOW IT WORKS</span>
            <h2 style={{
              fontFamily: 'var(--v3-font-serif)',
              fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 400,
              margin: '8px 0 0', letterSpacing: '-0.025em',
              color: 'var(--v3-ink)',
            }}>
              From upload to insight in{' '}
              <em style={{ color: ACCENT, fontStyle: 'italic' }}>under 30 seconds.</em>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { n: '01', t: 'Upload',  d: 'Drop an image or video. Single ad or A/B compare with two creatives.', icon: '↑' },
              { n: '02', t: 'Analyze', d: 'Computer vision segments every element. TribeV2 encodes 6 cortical regions.', icon: '◎' },
              { n: '03', t: 'Act',     d: 'Get a composite score, A/B winner, and ranked recommendations with projected lift.', icon: '→' },
            ].map((s) => (
              <div key={s.n} style={{
                position: 'relative', padding: 28, borderRadius: 20,
                background: 'oklch(0.985 0.003 90)',
                border: '1px solid oklch(0.93 0.005 90)',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: -20, right: -20,
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)`,
                  opacity: 0.08,
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)', fontWeight: 600 }}>STEP {s.n}</span>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'white', border: '1px solid oklch(0.92 0.005 90)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 16, color: ACCENT,
                  }}>{s.icon}</div>
                </div>
                <h3 style={{
                  fontFamily: 'var(--v3-font-serif)',
                  fontSize: 32, fontWeight: 400, margin: '0 0 8px', letterSpacing: '-0.015em',
                  color: 'var(--v3-ink)',
                }}>{s.t}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--v3-ink-2)', margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 40px', background: 'var(--v3-bg)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{
            fontFamily: 'var(--v3-font-serif)',
            fontSize: 'clamp(48px, 6vw, 72px)',
            fontWeight: 400, margin: 0, letterSpacing: '-0.03em', lineHeight: 1,
            color: 'var(--v3-ink)',
          }}>
            Stop guessing.<br />
            Start <em style={{ color: ACCENT, fontStyle: 'italic' }}>knowing.</em>
          </h2>
          <p style={{ fontSize: 18, color: 'var(--v3-ink-2)', maxWidth: 540, margin: '24px auto 36px' }}>
            Your first three reports are on us. No credit card.
          </p>
          <Link href="/analyze" className="v3-btn v3-btn-primary" style={{ fontSize: 15, padding: '16px 28px' }}>
            Upload your first ad →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '32px 40px', borderTop: '1px solid oklch(0.92 0.005 90)',
        background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center',
            background: `linear-gradient(135deg, ${ACCENT}, oklch(0.65 0.13 200))`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'white' }} />
          </div>
          <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 18, letterSpacing: '-0.02em' }}>Arcanalytics</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--v3-ink-3)' }}>© 2026 Arcanalytics · SAM3 · TribeV2 · Modal</span>
      </footer>
    </div>
  );
}

/* ── Hero card — floating glassy product mockup ── */
function HeroCard() {
  return (
    <div style={{ position: 'relative' }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: -40,
        background: `radial-gradient(circle at 50% 50%, ${ACCENT} 0%, transparent 60%)`,
        opacity: 0.15, filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative', background: 'white', borderRadius: 24,
        border: '1px solid oklch(0.92 0.005 90)',
        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset',
        overflow: 'hidden',
      }}>
        {/* Mac chrome */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px',
          borderBottom: '1px solid oklch(0.94 0.005 90)',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'oklch(0.85 0.05 30)' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'oklch(0.88 0.05 80)' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'oklch(0.85 0.06 145)' }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', marginLeft: 12 }}>
            arcanalytics.app/analyze/0428
          </span>
        </div>

        <div style={{ padding: 28, display: 'grid', gap: 20 }}>
          {/* Score + mini brain */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em' }}>
                COMPOSITE SCORE
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                <span style={{
                  fontFamily: 'var(--v3-font-serif)',
                  fontSize: 64, fontWeight: 400, lineHeight: 0.9, letterSpacing: '-0.03em',
                }}>
                  78<span style={{ color: 'var(--v3-ink-3)', fontSize: 28 }}>.4</span>
                </span>
                <span style={{
                  background: 'oklch(0.94 0.06 155)', color: 'oklch(0.4 0.13 155)',
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                }}>↑ 84th pctile</span>
              </div>
            </div>
            <div style={{ width: 100, height: 80 }}>
              <BrainViz size={100} showLabels={false} />
            </div>
          </div>

          {/* ROI timeline */}
          <div style={{
            padding: 14, background: 'oklch(0.985 0.003 90)',
            borderRadius: 12, border: '1px solid oklch(0.94 0.005 90)',
          }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 6 }}>
              P(CONVERT) · 14.0s
            </div>
            <ROITimeline height={44} />
          </div>

          {/* Objective bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[['Purchase', 82], ['Engagement', 76], ['Virality', 68], ['Clarity', 88]].map(([k, v]) => (
              <div key={k} style={{ padding: 10, background: 'oklch(0.985 0.003 90)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--v3-ink-3)', marginBottom: 4 }}>{k}</div>
                <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 22, fontWeight: 500 }}>{v}</span>
                <div style={{
                  height: 3, background: 'oklch(0.94 0.005 90)',
                  borderRadius: 999, marginTop: 6, overflow: 'hidden',
                }}>
                  <div style={{ width: `${v}%`, height: '100%', background: ACCENT, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation chip */}
          <div style={{
            padding: '12px 14px',
            background: `linear-gradient(120deg, oklch(0.95 0.05 180 / 0.4), oklch(0.97 0.03 45 / 0.3))`,
            border: '1px solid oklch(0.9 0.04 180)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'white', border: '1px solid oklch(0.9 0.04 180)',
              display: 'grid', placeItems: 'center',
              fontSize: 14, color: ACCENT, fontWeight: 600,
            }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-ink)' }}>Tighten the cut at 7–9s</div>
              <div style={{ fontSize: 11, color: 'var(--v3-ink-2)' }}>
                Projected lift: <span style={{ fontWeight: 600, color: ACCENT }}>+4.1 pts</span>
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--v3-ink-3)' }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Report preview — 3-col card ── */
function ReportPreview() {
  return (
    <div style={{
      background: 'white', borderRadius: 20,
      border: '1px solid oklch(0.92 0.005 90)',
      boxShadow: '0 12px 32px -8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '300px 1fr 1fr',
    }}>
      {/* Creative col */}
      <div style={{ padding: 24, borderRight: '1px solid oklch(0.94 0.005 90)' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 12 }}>CREATIVE</div>
        <div style={{
          aspectRatio: '4/5', borderRadius: 12,
          background: `linear-gradient(135deg, oklch(0.94 0.04 30) 0%, oklch(0.92 0.04 350) 100%)`,
          display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>[ ad preview ]</span>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--v3-ink-2)' }}>
          <div style={{ fontWeight: 500 }}>hero_v3_final.mp4</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', marginTop: 2 }}>4.2MB · 14.0s · 1080×1350</div>
        </div>
      </div>

      {/* Brain col */}
      <div style={{ padding: 28, borderRight: '1px solid oklch(0.94 0.005 90)' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em' }}>CORTICAL ACTIVATION</div>
        <div style={{ marginTop: 12, aspectRatio: '1/1' }}>
          <BrainViz size={320} />
        </div>
      </div>

      {/* Recommendations col */}
      <div style={{ padding: 28 }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 12 }}>
          RECOMMENDATIONS
        </div>
        {[
          ['Tighten the cut at 7–9s', '+4.1', 'attention'],
          ['Boost CTA contrast +60%', '+3.2', 'clarity'],
          ['Move logo to opening frame', '+2.9', 'memory'],
        ].map(([t, lift, tag], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr auto',
            gap: 10, padding: '14px 0', alignItems: 'center',
            borderTop: i === 0 ? 'none' : '1px solid oklch(0.95 0.005 90)',
          }}>
            <span className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v3-ink)' }}>{t}</div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', textTransform: 'uppercase' }}>{tag}</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
              background: 'oklch(0.94 0.06 155)', color: 'oklch(0.4 0.13 155)',
            }}>{lift}</span>
          </div>
        ))}

        <div style={{
          marginTop: 16, padding: 16, borderRadius: 12,
          background: `linear-gradient(135deg, oklch(0.96 0.04 180), oklch(0.97 0.03 200))`,
        }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em' }}>PROJECTED LIFT</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 36, fontWeight: 400 }}>+10.2</span>
            <span style={{ fontSize: 12, color: 'var(--v3-ink-2)' }}>composite points · 78.4 → 88.6</span>
          </div>
        </div>
      </div>
    </div>
  );
}
