import type { AIPrediction } from '@/lib/types';

const dirCfg = {
  UP:       { glow: 'var(--buy-glow)',  border: 'rgba(0,229,160,0.25)',   color: 'var(--buy)',  icon: '▲', label: 'SUBE' },
  DOWN:     { glow: 'var(--sell-glow)', border: 'rgba(255,61,87,0.25)',   color: 'var(--sell)', icon: '▼', label: 'BAJA' },
  SIDEWAYS: { glow: 'var(--hold-glow)', border: 'rgba(255,170,0,0.25)',   color: 'var(--hold)', icon: '→', label: 'LATERAL' },
};

export function PredictionPanel({
  prediction,
  currentPrice,
}: {
  prediction: AIPrediction;
  currentPrice: number;
}) {
  const cfg = dirCfg[prediction.direction];
  const mid = (prediction.targetLow + prediction.targetHigh) / 2;
  const midPct = ((mid - currentPrice) / currentPrice) * 100;
  const lowPct  = ((prediction.targetLow - currentPrice) / currentPrice) * 100;
  const highPct = ((prediction.targetHigh - currentPrice) / currentPrice) * 100;

  return (
    <div
      className="terminal-card p-5 space-y-5"
      style={{ borderColor: cfg.border, boxShadow: `0 0 30px rgba(0,0,0,0.4)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg tracking-widest" style={{ color: 'var(--foreground)' }}>
            PREDICCIÓN
          </span>
          <span className="label-caps" style={{ color: 'var(--text-tertiary)' }}>
            {prediction.isAI ? '30 DÍAS · CLAUDE AI' : '30 DÍAS · TÉCNICO'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!prediction.isAI && (
            <span
              className="font-data text-xs px-2 py-0.5 rounded"
              style={{ background: 'rgba(255,171,0,0.08)', color: 'var(--hold)', border: '1px solid rgba(255,171,0,0.2)' }}
            >
              SIN IA
            </span>
          )}
          <span
            className="font-data text-xs px-2 py-0.5 rounded"
            style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            EDUCATIVO
          </span>
        </div>
      </div>

      {/* Direction + probability row */}
      <div className="flex items-center gap-6">
        <div
          className="font-display text-5xl tracking-wider px-5 py-2 rounded"
          style={{
            color: cfg.color,
            background: `${cfg.color}10`,
            border: `1px solid ${cfg.border}`,
            boxShadow: cfg.glow,
            letterSpacing: '0.12em',
          }}
        >
          {cfg.icon} {cfg.label}
        </div>
        <div className="space-y-0.5">
          <div className="label-caps">PROBABILIDAD</div>
          <div
            className="font-display text-4xl"
            style={{ color: cfg.color, lineHeight: 1 }}
          >
            {prediction.probability}
            <span className="text-2xl opacity-60">%</span>
          </div>
        </div>
      </div>

      {/* Price target cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'MÍNIMO', price: prediction.targetLow, pct: lowPct },
          { label: 'CENTRAL', price: mid, pct: midPct, highlight: true },
          { label: 'MÁXIMO', price: prediction.targetHigh, pct: highPct },
        ].map(({ label, price, pct, highlight }) => (
          <div
            key={label}
            className="rounded p-3 text-center space-y-1"
            style={{
              background: highlight ? `${cfg.color}0d` : 'var(--surface-raised)',
              border: `1px solid ${highlight ? cfg.border : 'var(--border)'}`,
            }}
          >
            <div className="label-caps">{label}</div>
            <div
              className="font-data text-base font-bold tabular-nums"
              style={{ color: highlight ? cfg.color : 'var(--foreground)' }}
            >
              ${price.toFixed(2)}
            </div>
            <div
              className="font-data text-xs"
              style={{ color: pct >= 0 ? 'var(--buy)' : 'var(--sell)' }}
            >
              {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <div className="space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div className="label-caps">RAZONAMIENTO</div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {prediction.reasoning}
        </p>
      </div>

      {/* Factors + Risks side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="label-caps">FACTORES CLAVE</div>
          <ul className="space-y-1.5">
            {prediction.keyFactors.map((f, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: cfg.color, marginTop: 1 }}>▶</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <div className="label-caps">RIESGOS</div>
          <ul className="space-y-1.5">
            {prediction.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--hold)', marginTop: 1 }}>⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
