'use client';
import type { AIPrediction, FibonacciAnalysis } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DIR_CFG = {
  UP:       { label: 'SUBE',    icon: '↑', color: 'var(--buy)',  bg: 'rgba(45,184,122,0.08)',  border: 'rgba(45,184,122,0.22)' },
  DOWN:     { label: 'BAJA',    icon: '↓', color: 'var(--sell)', bg: 'rgba(224,82,82,0.08)',   border: 'rgba(224,82,82,0.22)' },
  SIDEWAYS: { label: 'LATERAL', icon: '→', color: 'var(--hold)', bg: 'rgba(212,168,32,0.08)',  border: 'rgba(212,168,32,0.22)' },
};

function reliabilityLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Alta certeza',      color: 'var(--buy)' };
  if (score >= 55) return { label: 'Certeza moderada',  color: 'var(--hold)' };
  return              { label: 'Señal débil',           color: 'var(--sell)' };
}

/** Thin horizontal bar showing reliability 0–100 */
function ReliabilityBar({ score, color }: { score: number; color: string }) {
  const { label } = reliabilityLabel(score);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="label-caps" style={{ color: 'var(--text-tertiary)' }}>CONFIABILIDAD</span>
        <span className="font-data text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: 'var(--surface-overlay)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
        {/* Threshold markers */}
        <div className="absolute inset-y-0 w-px" style={{ left: '55%', background: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute inset-y-0 w-px" style={{ left: '75%', background: 'rgba(255,255,255,0.1)' }} />
      </div>
      <div className="label-caps" style={{ color, fontSize: '0.58rem' }}>{label}</div>
    </div>
  );
}

/** Plain-language key factors list (replaces abstract score for technical column) */
function KeyFactorsList({ factors, reliability, color }: { factors: string[]; reliability: number; color: string }) {
  const { label } = reliabilityLabel(reliability);
  // Strip technical prefix before ': ' to keep only the plain description
  const notes = factors.slice(0, 3).map((f) => {
    const idx = f.indexOf(': ');
    return idx >= 0 ? f.slice(idx + 2) : f;
  });
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="label-caps" style={{ color: 'var(--text-tertiary)' }}>QUÉ LO IMPULSA</span>
        <span className="label-caps" style={{ color, fontSize: '0.58rem' }}>{label}</span>
      </div>
      <div className="space-y-1.5">
        {notes.map((note, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="font-data text-xs font-bold mt-px" style={{ color: 'var(--accent)', flexShrink: 0, lineHeight: 1.5 }}>→</span>
            <span className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Price target row: min / central / max */
function Targets({
  low, high, current, color,
}: { low: number; high: number; current: number; color: string }) {
  const mid = (low + high) / 2;
  const items = [
    { label: 'MIN', price: low,  pct: (low  - current) / current * 100 },
    { label: 'MED', price: mid,  pct: (mid  - current) / current * 100, highlight: true },
    { label: 'MAX', price: high, pct: (high - current) / current * 100 },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map(({ label, price, pct, highlight }) => (
        <div
          key={label}
          className="rounded p-2 text-center"
          style={{
            background: highlight ? `${color}0d` : 'var(--surface)',
            border: `1px solid ${highlight ? color + '30' : 'var(--border)'}`,
          }}
        >
          <div className="label-caps mb-0.5" style={{ fontSize: '0.52rem' }}>{label}</div>
          <div className="font-data text-xs font-bold tabular-nums" style={{ color: highlight ? color : 'var(--foreground)' }}>
            ${price < 10 ? price.toFixed(3) : price.toFixed(2)}
          </div>
          <div className="font-data tabular-nums" style={{ fontSize: 9, color: pct >= 0 ? 'var(--buy)' : 'var(--sell)' }}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Derive a structured Fibonacci prediction from FibonacciAnalysis ──────────
function deriveFibPrediction(fib: FibonacciAnalysis, currentPrice: number): {
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  probability: number;
  targetLow: number;
  targetHigh: number;
} {
  const direction: 'UP' | 'DOWN' | 'SIDEWAYS' = fib.signal === 'BUY' ? 'UP' : fib.signal === 'SELL' ? 'DOWN' : 'SIDEWAYS';

  // Probability based on scenario quality
  const keySupport = fib.retracements.find(
    (l) => l.isSupport && l.proximity < 2 && [0.382, 0.5, 0.618].includes(l.ratio)
  );
  const keyResistance = fib.retracements.find(
    (l) => !l.isSupport && l.proximity < 2 && [0.236, 0.382].includes(l.ratio)
  );
  const ns = fib.nearestSupport;
  const nr = fib.nearestResistance;
  const rr = ns && nr && (currentPrice - ns.price) > 0
    ? (nr.price - currentPrice) / (currentPrice - ns.price)
    : 0;

  const probability =
    keySupport     ? 72 :
    keyResistance  ? 70 :
    rr >= 2        ? 65 :
    rr < 0.8       ? 55 : 58;

  // Price targets
  const nearestExt = fib.extensions
    .filter((l) => !l.isSupport)
    .sort((a, b) => a.proximity - b.proximity)[0];

  let targetLow: number;
  let targetHigh: number;

  if (direction === 'UP') {
    targetLow  = ns?.price ?? currentPrice * 0.96;
    targetHigh = nearestExt?.price ?? (nr?.price ?? currentPrice * 1.08);
  } else if (direction === 'DOWN') {
    targetLow  = ns?.price ?? currentPrice * 0.92;
    targetHigh = nr?.price ?? currentPrice * 1.04;
  } else {
    targetLow  = ns?.price ?? currentPrice * 0.95;
    targetHigh = nr?.price ?? currentPrice * 1.05;
  }

  // Ensure sensible ordering
  if (targetLow > currentPrice) targetLow = currentPrice * 0.95;
  if (targetHigh < currentPrice) targetHigh = currentPrice * 1.05;
  if (targetLow > targetHigh) [targetLow, targetHigh] = [targetHigh, targetLow];

  return { direction, probability, targetLow, targetHigh };
}

// ── Confluence verdict ────────────────────────────────────────────────────────
function ConfluenceVerdict({
  fibDir,
  facDir,
  fibRel,
  facRel,
}: {
  fibDir: 'UP' | 'DOWN' | 'SIDEWAYS';
  facDir: 'UP' | 'DOWN' | 'SIDEWAYS';
  fibRel: number;
  facRel: number;
}) {
  const agree = fibDir === facDir;
  const combined = Math.round(fibRel * 0.45 + facRel * 0.55);
  const { label: certLabel, color: certColor } = reliabilityLabel(combined);
  const winner = fibRel > facRel ? 'Fibonacci' : 'los factores técnicos';
  const dirLabel = (d: 'UP' | 'DOWN' | 'SIDEWAYS') =>
    d === 'UP' ? 'SUBE' : d === 'DOWN' ? 'BAJA' : 'LATERAL';

  if (agree) {
    return (
      <div
        className="rounded-lg px-4 py-3 space-y-1"
        style={{ background: `${certColor}08`, border: `1px solid ${certColor}25` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: certColor, fontSize: 15 }}>✓</span>
          <span className="font-data text-xs font-bold" style={{ color: certColor }}>
            Ambas señales coinciden — {dirLabel(fibDir)}
          </span>
          <span className="font-data text-xs font-bold ml-auto tabular-nums" style={{ color: certColor }}>
            {combined}/100
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Cuando Fibonacci y los factores técnicos apuntan en la misma dirección, la señal es más robusta.
          Confiabilidad combinada: <strong style={{ color: certColor }}>{certLabel}</strong>.
        </p>
      </div>
    );
  }

  // Disagreement
  return (
    <div
      className="rounded-lg px-4 py-3 space-y-1"
      style={{ background: 'rgba(212,168,32,0.06)', border: '1px solid rgba(212,168,32,0.22)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--hold)', fontSize: 14 }}>⚠</span>
        <span className="font-data text-xs font-bold" style={{ color: 'var(--hold)' }}>
          Señales contradictorias — precaución
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Fibonacci sugiere <strong style={{ color: DIR_CFG[fibDir].color }}>{dirLabel(fibDir)}</strong>{' '}
        y los factores técnicos sugieren{' '}
        <strong style={{ color: DIR_CFG[facDir].color }}>{dirLabel(facDir)}</strong>.{' '}
        En caso de señales contradictorias, la predicción más confiable es la de{' '}
        <strong style={{ color: 'var(--foreground)' }}>{winner}</strong> (score {Math.max(fibRel, facRel)}).
        Considerá esperar confirmación antes de operar.
      </p>
    </div>
  );
}

// ── Half panel (one prediction column) ───────────────────────────────────────
function PredictionColumn({
  title,
  badge,
  direction,
  probability,
  reliability,
  targetLow,
  targetHigh,
  currentPrice,
  explanation,
  explanationLabel,
  keyFactors,
}: {
  title: string;
  badge: string;
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  probability: number;
  reliability: number;
  targetLow: number;
  targetHigh: number;
  currentPrice: number;
  explanation: string;
  explanationLabel: string;
  keyFactors?: string[];
}) {
  const cfg = DIR_CFG[direction];
  const { color: relColor } = reliabilityLabel(reliability);

  return (
    <div className="space-y-3">
      {/* Title + badge */}
      <div className="flex items-center gap-2">
        <span className="font-data text-xs font-semibold" style={{ color: 'var(--foreground)', letterSpacing: '0.06em' }}>
          {title}
        </span>
        <span
          className="font-data px-1.5 py-0.5 rounded-sm"
          style={{ fontSize: 9, background: 'var(--surface-raised)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', letterSpacing: '0.06em' }}
        >
          {badge}
        </span>
      </div>

      {/* Direction + probability */}
      <div className="flex items-center gap-3">
        <div
          className="font-data text-sm font-bold px-3 py-1.5 rounded"
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, letterSpacing: '0.08em' }}
        >
          {cfg.icon} {cfg.label}
        </div>
        <div>
          <div className="label-caps" style={{ fontSize: '0.52rem' }}>PROBABILIDAD</div>
          <div className="font-display text-2xl font-bold" style={{ color: cfg.color, lineHeight: 1 }}>
            {probability}<span className="text-sm opacity-50">%</span>
          </div>
        </div>
      </div>

      {/* Reliability bar OR key factors list */}
      {keyFactors && keyFactors.length > 0
        ? <KeyFactorsList factors={keyFactors} reliability={reliability} color={relColor} />
        : <ReliabilityBar score={reliability} color={relColor} />
      }

      {/* Price targets */}
      <div>
        <div className="label-caps mb-1.5">OBJETIVOS 30 DÍAS</div>
        <Targets low={targetLow} high={targetHigh} current={currentPrice} color={cfg.color} />
      </div>

      {/* Explanation */}
      <div className="space-y-1">
        <div className="label-caps" style={{ color: 'var(--text-tertiary)' }}>{explanationLabel}</div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {explanation}
        </p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function DualPredictionPanel({
  fib,
  prediction,
  currentPrice,
}: {
  fib: FibonacciAnalysis;
  prediction: AIPrediction;
  currentPrice: number;
}) {
  const fibPred = deriveFibPrediction(fib, currentPrice);
  const fibRel  = fib.reliabilityScore;
  const facRel  = prediction.reliabilityScore ?? 50;

  // Fibonacci explanation: use fib.notes, enriched with R/R if available
  const ns = fib.nearestSupport;
  const nr = fib.nearestResistance;
  let fibExplanation = fib.notes;
  if (ns && nr) {
    const risk   = currentPrice - ns.price;
    const reward = nr.price - currentPrice;
    if (risk > 0) {
      const rr = reward / risk;
      fibExplanation += `. Riesgo/Recompensa: ${rr.toFixed(1)}x (soporte Fib ${ns.label} → resistencia Fib ${nr.label}).`;
    }
  }

  // Factor explanation: use prediction.reasoning (first sentence)
  const facExplanation = prediction.reasoning;

  return (
    <div className="terminal-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg tracking-widest" style={{ color: 'var(--foreground)' }}>
            SEÑALES CONFLUENTES
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-data text-xs px-2 py-0.5 rounded"
            style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            EDUCATIVO
          </span>
        </div>
      </div>

      {/* What this panel does */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        Compara dos métodos independientes: <strong style={{ color: 'var(--foreground)' }}>Fibonacci</strong> (niveles clave de soporte/resistencia y riesgo/recompensa)
        vs <strong style={{ color: 'var(--foreground)' }}>Factores técnicos</strong> (RSI, medias móviles, volumen, Elliott Wave, contexto de mercado).
        Cuando coinciden, la señal es más confiable. Cuando divergen, existe incertidumbre.
      </p>

      {/* Two-column predictions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        {/* Divider on desktop */}
        <PredictionColumn
          title="📐 FIBONACCI"
          badge={`Swing ${fib.trend === 'UP' ? '↑' : '↓'} · ${fib.swingLow.toFixed(0)}–${fib.swingHigh.toFixed(0)}`}
          direction={fibPred.direction}
          probability={fibPred.probability}
          reliability={fibRel}
          targetLow={fibPred.targetLow}
          targetHigh={fibPred.targetHigh}
          currentPrice={currentPrice}
          explanation={fibExplanation}
          explanationLabel="¿POR QUÉ?"
        />
        <div
          className="hidden sm:block absolute self-stretch"
          style={{ width: 1, background: 'var(--border)', position: 'relative', left: '50%' }}
        />
        <PredictionColumn
          title="📊 FACTORES TÉCNICOS"
          badge={prediction.isAI ? 'CLAUDE AI' : 'ANÁLISIS TÉCNICO'}
          direction={prediction.direction}
          probability={prediction.probability}
          reliability={facRel}
          targetLow={prediction.targetLow}
          targetHigh={prediction.targetHigh}
          currentPrice={currentPrice}
          explanation={facExplanation}
          explanationLabel="¿POR QUÉ?"
          keyFactors={prediction.keyFactors}
        />
      </div>

      {/* Confluence verdict */}
      <ConfluenceVerdict
        fibDir={fibPred.direction}
        facDir={prediction.direction}
        fibRel={fibRel}
        facRel={facRel}
      />

      {/* Disclaimer */}
      <p className="text-center label-caps" style={{ opacity: 0.3, fontSize: '0.52rem' }}>
        Solo fines educativos · No es asesoramiento financiero · Basado en datos históricos de precios
      </p>
    </div>
  );
}
