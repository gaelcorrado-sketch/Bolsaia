import type { Quote } from '@/lib/types';

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

export function StockHeader({ quote }: { quote: Quote }) {
  const positive = quote.change >= 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-5xl font-bold tabular-nums">
          ${quote.price.toFixed(2)}
        </span>
        <span
          className={`text-xl font-semibold ${positive ? 'text-emerald-500' : 'text-red-500'}`}
        >
          {positive ? '+' : ''}
          {quote.change.toFixed(2)} ({positive ? '+' : ''}
          {quote.changePercent.toFixed(2)}%)
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        {quote.marketCap > 0 && (
          <span>
            <span className="font-medium text-foreground">Cap:</span>{' '}
            {fmtMarketCap(quote.marketCap)}
          </span>
        )}
        <span>
          <span className="font-medium text-foreground">Vol:</span>{' '}
          {fmtVol(quote.volume)}
        </span>
        <span>
          <span className="font-medium text-foreground">Prev:</span> $
          {quote.previousClose.toFixed(2)}
        </span>
        {quote.high52w > 0 && (
          <span>
            <span className="font-medium text-foreground">52W:</span> $
            {quote.low52w.toFixed(2)} – ${quote.high52w.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
