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

      {/* Hero */}
      <section style={{ position: 'relative', padding: '80px 40px 100px', overflow: 'hidden' }}>
        <V3Aurora />
        <div style={{
          position: 'relative', maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 80, alignItems: 'center',
        }}>
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 12px 5px 6px', borderRadius: 999,
              background: 'white', border: '1px solid oklch(0.92 0.005 90)',
              fontSize: 12, fontWeight: 500, marginBottom: 28,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'white',
                background: ACCENT, padding: '3px 8px', borderRadius: 999,
              }}>NEW</span>
              <span style={{ color: 'var(--v3-ink-2)' }}>TribeV2 brain encoder · live</span>
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
                <svg
                  width="100%" height="14" viewBox="0 0 240 14"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', left: 0, bottom: -4, pointerEvents: 'none' }}
                >
                  <path d="M2,10 Q60,2 120,8 T238,6" stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round" />
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

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/analyze" className="v3-btn v3-btn-primary" style={{ fontSize: 14, padding: '14px 24px' }}>
                Analyze your first ad
              </Link>
            </div>
          </div>

          <HeroCard />
        </div>
      </section>

      {/* Live preview */}
      <section style={{ padding: '24px 40px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <div>
              <span className="mono" style={{ fontSize: 11, color: ACCENT, fontWeight: 600, letterSpacing: '0.1em' }}>LIVE PREVIEW</span>
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

      {/* How it works */}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'oklch(0.92 0.005 90)' }}>
            {[
              { n: '01', t: 'Upload',  d: 'Drop an image or video. Single ad or A/B compare with two creatives.' },
              { n: '02', t: 'Analyze', d: 'Computer vision segments every element. TribeV2 encodes 6 cortical regions.' },
              { n: '03', t: 'Act',     d: 'Get a composite score, A/B winner, and ranked recommendations with projected lift.' },
            ].map((s) => (
              <div key={s.n} style={{
                padding: 36, background: 'white',
              }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)', fontWeight: 600, display: 'block', marginBottom: 20 }}>STEP {s.n}</span>
                <h3 style={{
                  fontFamily: 'var(--v3-font-serif)',
                  fontSize: 32, fontWeight: 400, margin: '0 0 10px', letterSpacing: '-0.015em',
                  color: 'var(--v3-ink)',
                }}>{s.t}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--v3-ink-2)', margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', background: 'var(--v3-bg)', borderTop: '1px solid oklch(0.92 0.005 90)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--v3-font-serif)',
            fontSize: 'clamp(48px, 6vw, 72px)',
            fontWeight: 400, margin: 0, letterSpacing: '-0.03em', lineHeight: 1,
            color: 'var(--v3-ink)',
          }}>
            Stop guessing.<br />
            Start <em style={{ color: ACCENT, fontStyle: 'italic' }}>knowing.</em>
          </h2>
          <Link href="/analyze" className="v3-btn v3-btn-primary" style={{ fontSize: 15, padding: '16px 28px', marginTop: 36 }}>
            Upload your first ad
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '28px 40px', borderTop: '1px solid oklch(0.92 0.005 90)',
        background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center',
            background: `linear-gradient(135deg, ${ACCENT}, oklch(0.65 0.13 200))`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'white' }} />
          </div>
          <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 17, letterSpacing: '-0.02em' }}>Arcanalytics</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--v3-ink-3)' }}>2026 Arcanalytics · Custom ISM · TribeV2 · Modal</span>
      </footer>
    </div>
  );
}

/* Hero card */
function HeroCard() {
  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: '1px solid oklch(0.92 0.005 90)',
      overflow: 'hidden',
    }}>
      {/* Mac chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px',
        borderBottom: '1px solid oklch(0.94 0.005 90)',
        background: 'oklch(0.985 0.003 90)',
      }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(0.85 0.05 30)' }} />
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(0.88 0.05 80)' }} />
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'oklch(0.85 0.06 145)' }} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', marginLeft: 10 }}>
          arcanalytics.app/analyze/0428
        </span>
      </div>

      <div style={{ padding: 24, display: 'grid', gap: 16 }}>
        {/* Score + mini brain */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em' }}>COMPOSITE SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <span style={{
                fontFamily: 'var(--v3-font-serif)',
                fontSize: 60, fontWeight: 400, lineHeight: 0.9, letterSpacing: '-0.03em',
              }}>
                78<span style={{ color: 'var(--v3-ink-3)', fontSize: 26 }}>.4</span>
              </span>
              <span style={{
                background: 'oklch(0.94 0.06 155)', color: 'oklch(0.38 0.13 155)',
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
              }}>84th pctile</span>
            </div>
          </div>
          <div style={{ width: 90, height: 72 }}>
            <BrainViz size={90} showLabels={false} />
          </div>
        </div>

        {/* ROI timeline */}
        <div style={{
          padding: 12, background: 'oklch(0.985 0.003 90)',
          borderRadius: 8, border: '1px solid oklch(0.94 0.005 90)',
        }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 6 }}>P(CONVERT) · 14.0s</div>
          <ROITimeline height={40} />
        </div>

        {/* Objective bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[['Purchase', 82], ['Engagement', 76], ['Virality', 68], ['Clarity', 88]].map(([k, v]) => (
            <div key={k} style={{ padding: 10, background: 'oklch(0.985 0.003 90)', borderRadius: 8, border: '1px solid oklch(0.94 0.005 90)' }}>
              <div style={{ fontSize: 10, color: 'var(--v3-ink-3)', marginBottom: 4 }}>{k}</div>
              <span style={{ fontFamily: 'var(--v3-font-serif)', fontSize: 20, fontWeight: 500 }}>{v}</span>
              <div style={{
                height: 2, background: 'oklch(0.94 0.005 90)',
                borderRadius: 999, marginTop: 6, overflow: 'hidden',
              }}>
                <div style={{ width: `${v}%`, height: '100%', background: ACCENT, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top recommendation */}
        <div style={{
          padding: '11px 14px',
          background: 'oklch(0.97 0.02 180)',
          border: '1px solid oklch(0.9 0.04 180)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-ink)' }}>Tighten the cut at 7–9s</div>
            <div style={{ fontSize: 11, color: 'var(--v3-ink-2)', marginTop: 1 }}>
              Projected lift: <span style={{ fontWeight: 600, color: ACCENT }}>+4.1 pts</span>
            </div>
          </div>
          <span style={{ fontSize: 13, color: 'var(--v3-ink-3)' }}>01 / 03</span>
        </div>
      </div>
    </div>
  );
}

/* Report preview */
function ReportPreview() {
  return (
    <div style={{
      background: 'white',
      border: '1px solid oklch(0.92 0.005 90)',
      borderRadius: 16,
      overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '280px 1fr 1fr',
    }}>
      {/* Creative col */}
      <div style={{ padding: 24, borderRight: '1px solid oklch(0.94 0.005 90)' }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 12 }}>CREATIVE</div>
        <div style={{
          aspectRatio: '4/5', borderRadius: 8,
          background: `linear-gradient(135deg, oklch(0.94 0.04 30) 0%, oklch(0.92 0.04 350) 100%)`,
          display: 'grid', placeItems: 'center',
        }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--v3-ink-3)' }}>ad preview</span>
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
        <div className="mono" style={{ fontSize: 10, color: 'var(--v3-ink-3)', letterSpacing: '0.1em', marginBottom: 12 }}>RECOMMENDATIONS</div>
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
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              background: 'oklch(0.94 0.06 155)', color: 'oklch(0.38 0.13 155)',
            }}>{lift}</span>
          </div>
        ))}

        <div style={{
          marginTop: 16, padding: 16, borderRadius: 10,
          background: 'oklch(0.97 0.02 180)',
          border: '1px solid oklch(0.91 0.04 180)',
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
