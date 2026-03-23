export function RiskFlags({ risks }: { risks: string[] }) {
  if (!risks.length) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded"
        style={{
          background: 'rgba(0,229,160,0.06)',
          border: '1px solid rgba(0,229,160,0.2)',
        }}
      >
        <span style={{ color: 'var(--buy)', fontSize: '1rem' }}>✓</span>
        <span className="font-data text-xs font-medium" style={{ color: 'var(--buy)' }}>
          SIN ALERTAS DE RIESGO DETECTADAS
        </span>
      </div>
    );
  }

  return (
    <div
      className="terminal-card p-4 space-y-3"
      style={{ borderColor: 'rgba(255,170,0,0.3)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--hold)' }}>⚠</span>
        <span className="font-display text-sm tracking-widest" style={{ color: 'var(--hold)' }}>
          ALERTAS DE RIESGO · {risks.length}
        </span>
      </div>
      <ul className="space-y-2">
        {risks.map((r, i) => (
          <li key={i} className="flex gap-2.5 items-start text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-data font-bold mt-0.5" style={{ color: 'var(--hold)', minWidth: 16 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
