import type { Quote } from '@/lib/types';

function fmtCap(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}
function fmtVol(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}

export function StockHeader({ quote }: { quote: Quote }) {
  const up = quote.change >= 0;
  const changeColor = up ? 'text-buy' : 'text-sell';

  return (
    <div className="space-y-3">
      {/* Big price */}
      <div className="flex items-baseline gap-4 flex-wrap">
        <span
          className="font-display text-6xl tracking-tight"
          style={{ color: 'var(--foreground)', lineHeight: 1 }}
        >
          ${quote.price.toFixed(2)}
        </span>
        <div className={`flex items-center gap-1.5 font-data text-xl font-semibold ${changeColor}`}>
          <span>{up ? '▲' : '▼'}</span>
          <span>{up ? '+' : ''}{quote.change.toFixed(2)}</span>
          <span className="text-base opacity-70">({up ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          { key: 'PREV CIERRE', val: `$${quote.previousClose.toFixed(2)}` },
          ...(quote.marketCap > 0 ? [{ key: 'CAP MERCADO', val: fmtCap(quote.marketCap) }] : []),
          { key: 'VOLUMEN', val: fmtVol(quote.volume) },
          ...(quote.high52w > 0 ? [
            { key: '52W MÁX', val: `$${quote.high52w.toFixed(2)}` },
            { key: '52W MÍN', val: `$${quote.low52w.toFixed(2)}` },
          ] : []),
        ].map(({ key, val }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="label-caps">{key}</span>
            <span className="font-data text-xs font-medium" style={{ color: 'var(--foreground)' }}>
              {val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
