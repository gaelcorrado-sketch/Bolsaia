import type { StockAnalysis } from '@/lib/types';

const WEIGHT: Record<string, string> = {
  'Consenso de analistas':      '14%',
  'Momento (RSI)':              '17%',
  'Tendencia (medias móviles)': '17%',
  'Contexto de mercado':        '12%',
  'Fibonacci':                  '11%',
  'Presión de volumen':         '10%',
  'Fundamentos':                '10%',
  'Ondas de Elliott':           '8%',
  'Rango anual':                '7%',
};

// Map score 0–100 to a color on the green–red spectrum
function scoreColor(score: number): string {
  if (score >= 65) return 'var(--buy)';
  if (score <= 35) return 'var(--sell)';
  return 'var(--hold)';
}

export function AnalysisGrid({ analysis }: { analysis: StockAnalysis }) {
  // Sort dimensions by weight descending (most influential first)
  const sorted = [...analysis.dimensions].sort((a, b) => {
    const wa = parseFloat(WEIGHT[a.name] ?? '0');
    const wb = parseFloat(WEIGHT[b.name] ?? '0');
    return wb - wa;
  });

  return (
    <div className="terminal-card p-5 space-y-4">
      <div className="label-caps" style={{ color: 'var(--text-tertiary)' }}>
        Factores del análisis técnico — mayor peso primero
      </div>

      {sorted.map((d, i) => {
        const color = scoreColor(d.score);
        const weight = WEIGHT[d.name] ?? '';
        return (
          <div
            key={d.name}
            className={`rounded-lg p-3 space-y-2 slide-up-${Math.min(i + 1, 5)}`}
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
          >
            {/* Factor name + weight + score value */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                  {d.name}
                </span>
                {weight && (
                  <span className="label-caps shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {weight}
                  </span>
                )}
              </div>
              <span
                className="font-data text-sm font-bold tabular-nums shrink-0"
                style={{ color }}
              >
                {d.score}<span className="text-xs font-normal opacity-40">/100</span>
              </span>
            </div>

            {/* Intensity bar (no verdict label) */}
            <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--surface-overlay)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${d.score}%`, background: color }}
              />
            </div>

            {/* Plain-language explanation */}
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {d.notes}
            </p>
          </div>
        );
      })}
    </div>
  );
}
