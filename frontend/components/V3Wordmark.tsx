export function V3Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        background: 'linear-gradient(135deg, oklch(0.55 0.08 180), oklch(0.65 0.13 200))',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 4px 12px oklch(0.55 0.08 180 / 0.25)',
        flexShrink: 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: 'white' }} />
      </div>
      <span style={{
        fontFamily: 'var(--v3-font-serif)',
        fontSize: 22,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        color: 'var(--v3-ink)',
      }}>
        Arcanalytics
      </span>
    </div>
  );
}
