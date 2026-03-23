import type { Signal, Confidence } from '@/lib/types';

const cfg: Record<Signal, { cls: string; icon: string; label: string }> = {
  BUY:  { cls: 'signal-buy',  icon: '▲', label: 'COMPRAR' },
  HOLD: { cls: 'signal-hold', icon: '■', label: 'MANTENER' },
  SELL: { cls: 'signal-sell', icon: '▼', label: 'VENDER'  },
};

const confLabel: Record<Confidence, string> = {
  HIGH:   'ALTA',
  MEDIUM: 'MEDIA',
  LOW:    'BAJA',
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
  const { cls, icon, label } = cfg[signal];

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-data text-xs font-bold ${cls}`}>
        {icon} {signal}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className={`flex items-center gap-2.5 px-6 py-3 rounded font-display text-3xl tracking-widest ${cls}`}>
        {icon} {label}
      </div>
      {confidence && (
        <div className="flex items-center gap-2 label-caps">
          <span className="text-tertiary">CONFIANZA</span>
          <span style={{ color: 'var(--foreground)' }}>{confLabel[confidence]}</span>
        </div>
      )}
    </div>
  );
}
