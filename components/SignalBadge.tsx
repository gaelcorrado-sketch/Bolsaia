import { Badge } from '@/components/ui/badge';
import type { Signal, Confidence } from '@/lib/types';

const colors: Record<Signal, string> = {
  BUY: 'bg-emerald-500 hover:bg-emerald-600 text-white border-0',
  HOLD: 'bg-amber-500 hover:bg-amber-600 text-white border-0',
  SELL: 'bg-red-500 hover:bg-red-600 text-white border-0',
};

const icons: Record<Signal, string> = {
  BUY: '↑',
  HOLD: '→',
  SELL: '↓',
};

export function SignalBadge({
  signal,
  confidence,
  size = 'lg',
}: {
  signal: Signal;
  confidence?: Confidence;
  size?: 'sm' | 'lg';
}) {
  return (
    <div className="flex items-center gap-2">
      <Badge
        className={`font-bold ${colors[signal]} ${
          size === 'lg' ? 'text-xl px-5 py-2' : 'text-sm px-3 py-1'
        }`}
      >
        {icons[signal]} {signal}
      </Badge>
      {confidence && (
        <span className="text-sm text-muted-foreground">{confidence} confidence</span>
      )}
    </div>
  );
}
