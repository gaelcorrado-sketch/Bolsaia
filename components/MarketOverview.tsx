import type { MarketContext } from '@/lib/types';

const regimeCfg = {
  BULL:    { color: 'var(--buy)',  label: 'ALCISTA', icon: '🐂' },
  BEAR:    { color: 'var(--sell)', label: 'BAJISTA',  icon: '🐻' },
  NEUTRAL: { color: 'var(--hold)', label: 'NEUTRAL',  icon: '⚖' },
};

export function MarketOverview({ market }: { market: MarketContext }) {
  const rc = regimeCfg[market.regime];
  const vixColor =
    market.vix > 30 ? 'var(--sell)' : market.vix > 20 ? 'var(--hold)' : 'var(--buy)';

  return (
    <div className="terminal-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-base tracking-widest" style={{ color: 'var(--foreground)' }}>
          MERCADO
        </span>
        <span className="font-data text-sm font-bold" style={{ color: rc.color }}>
          {rc.icon} {rc.label}
        </span>
      </div>

      {/* VIX gauge */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <div className="label-caps">VIX · ÍNDICE DE MIEDO</div>
          <span className="font-data text-lg font-bold" style={{ color: vixColor }}>
            {market.vix.toFixed(1)}
          </span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--surface-raised)' }}>
          {/* VIX scale: 10 low, 50 high → normalize */}
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, ((market.vix - 10) / 40) * 100)}%`,
              background: `linear-gradient(90deg, var(--buy), var(--hold), var(--sell))`,
            }}
          />
        </div>
        <div className="flex justify-between label-caps opacity-50">
          <span>CALMA</span>
          <span>PÁNICO</span>
        </div>
      </div>

      {/* SPY / QQQ / DIA / IWM */}
      <div className="space-y-2.5" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        {[
          { symbol: 'SPY', label: 'S&P 500',    val: market.spyChange },
          { symbol: 'QQQ', label: 'NASDAQ 100', val: market.qqqChange },
          { symbol: 'DIA', label: 'DOW JONES',  val: market.diaChange },
          { symbol: 'IWM', label: 'RUSSELL 2K', val: market.iwmChange },
        ].map(({ symbol, label, val }) => {
          const up = val >= 0;
          return (
            <div key={symbol} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-data text-xs font-bold" style={{ color: 'var(--foreground)' }}>{symbol}</span>
                <span className="label-caps">{label}</span>
              </div>
              <span
                className="font-data text-sm font-bold tabular-nums"
                style={{ color: up ? 'var(--buy)' : 'var(--sell)' }}
              >
                {up ? '+' : ''}{val.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
