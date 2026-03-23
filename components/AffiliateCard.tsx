'use client';

// ── Broker affiliate data ─────────────────────────────────────────────────────
// Replace the `url` values with your personal affiliate links once you register:
//   eToro Partners:  https://partners.etoro.com/
//   XTB Partners:    https://partners.xtb.com/
const BROKERS = [
  {
    name: 'eToro',
    tagline: '+35M usuarios · Social trading',
    url: 'https://www.etoro.com/', // ← replace with your affiliate link
    badge: 'CFDs · Comisión $0',
  },
  {
    name: 'XTB',
    tagline: 'Broker europeo regulado · Sin comisión',
    url: 'https://www.xtb.com/es/', // ← replace with your affiliate link
    badge: 'FCA · KNF · CySEC',
  },
];

const SIGNAL_LABEL: Record<string, string> = {
  BUY:  'COMPRA',
  SELL: 'VENTA',
  HOLD: 'MANTENER',
};

const SIGNAL_COLOR: Record<string, string> = {
  BUY:  'var(--buy)',
  SELL: 'var(--sell)',
  HOLD: 'var(--hold)',
};

// ── Component ─────────────────────────────────────────────────────────────────
export function AffiliateCard({
  ticker,
  signal,
}: {
  ticker?: string;
  signal?: 'BUY' | 'SELL' | 'HOLD';
}) {
  const isContextual = !!ticker && !!signal;
  const signalColor = signal ? SIGNAL_COLOR[signal] : 'var(--accent)';
  const signalLabel = signal ? SIGNAL_LABEL[signal] : null;

  return (
    <div
      className="terminal-card p-4 space-y-3"
      style={{ borderColor: 'rgba(200,169,110,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          {isContextual ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                  ¿Querés operar{' '}
                  <span style={{ color: signalColor }}>{ticker}</span>?
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Señal actual:{' '}
                <strong style={{ color: signalColor }}>{signalLabel}</strong>.
                Estos brokers regulados te permiten invertir en esta acción.
              </p>
            </>
          ) : (
            <>
              <span className="font-display text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                ¿Pensás en invertir?
              </span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Estos brokers regulados te permiten operar las acciones analizadas en esta plataforma.
              </p>
            </>
          )}
        </div>
        <span
          className="label-caps flex-shrink-0 px-1.5 py-0.5 rounded-sm"
          style={{
            fontSize: '0.52rem',
            background: 'rgba(200,169,110,0.08)',
            color: 'var(--accent)',
            border: '1px solid rgba(200,169,110,0.2)',
          }}
        >
          PATROCINADO
        </span>
      </div>

      {/* Broker rows */}
      <div className="space-y-2">
        {BROKERS.map((broker) => (
          <a
            key={broker.name}
            href={broker.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center justify-between gap-3 rounded px-3 py-2.5 transition-colors"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,110,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            <div className="flex items-center gap-3">
              {/* Broker logo placeholder */}
              <div
                className="font-data text-xs font-bold rounded px-2 py-1 flex-shrink-0"
                style={{
                  background: 'rgba(200,169,110,0.1)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(200,169,110,0.25)',
                  minWidth: 44,
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                }}
              >
                {broker.name}
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                  {broker.tagline}
                </div>
                <div className="label-caps mt-0.5" style={{ fontSize: '0.52rem', color: 'var(--text-tertiary)' }}>
                  {broker.badge}
                </div>
              </div>
            </div>
            <div
              className="font-data text-xs font-semibold flex-shrink-0 flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              Abrir cuenta
              <span style={{ fontSize: 10 }}>→</span>
            </div>
          </a>
        ))}
      </div>

      {/* Legal disclaimer — required for regulated financial advertising */}
      <p
        className="text-center"
        style={{
          fontSize: '0.56rem',
          color: 'var(--text-tertiary)',
          opacity: 0.7,
          lineHeight: 1.5,
        }}
      >
        Los CFDs son instrumentos complejos con alto riesgo de perder dinero. Invertir implica riesgo de pérdida.
        Solo fines informativos · No es asesoramiento financiero · Enlace de afiliado
      </p>
    </div>
  );
}
