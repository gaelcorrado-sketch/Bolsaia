import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MarketContext } from '@/lib/types';

const regimeConfig = {
  BULL: { color: 'text-emerald-500', label: 'ALCISTA 🐂' },
  BEAR: { color: 'text-red-500', label: 'BAJISTA 🐻' },
  NEUTRAL: { color: 'text-amber-500', label: 'NEUTRAL' },
};

function VixBar({ vix }: { vix: number }) {
  // VIX typically 10-50
  const pct = Math.min(100, ((vix - 10) / 40) * 100);
  const color = vix > 30 ? 'bg-red-500' : vix > 20 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Bajo miedo</span>
        <span>Alto miedo</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MarketOverview({ market }: { market: MarketContext }) {
  const cfg = regimeConfig[market.regime];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Contexto de Mercado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Régimen</span>
          <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">VIX (Miedo)</span>
            <span
              className={`text-sm font-bold tabular-nums ${
                market.vix > 30
                  ? 'text-red-500'
                  : market.vix > 20
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              }`}
            >
              {market.vix.toFixed(1)}
            </span>
          </div>
          <VixBar vix={market.vix} />
        </div>

        <div className="space-y-2 pt-1 border-t">
          {[
            { label: 'SPY (S&P 500)', value: market.spyChange },
            { label: 'QQQ (Nasdaq)', value: market.qqqChange },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  value >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {value >= 0 ? '+' : ''}
                {value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
