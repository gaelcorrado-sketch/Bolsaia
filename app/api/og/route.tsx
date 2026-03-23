import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0a0908',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Top: logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '4px',
              height: '48px',
              background: '#c8a96e',
              borderRadius: '2px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: '#f2ece0', fontSize: '28px', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>
              STOCK
            </span>
            <span style={{ color: '#c8a96e', fontSize: '28px', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>
              AI
            </span>
          </div>
        </div>

        {/* Center: main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: '80px',
              fontWeight: 700,
              color: '#f2ece0',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            ANÁLISIS DE
          </div>
          <div
            style={{
              fontSize: '80px',
              fontWeight: 700,
              color: '#c8a96e',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            MERCADO
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#9a8e78',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: '8px',
            }}
          >
            Fibonacci · Elliott Waves · IA · Tiempo Real
          </div>
        </div>

        {/* Bottom: signal chips */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {[
            { label: 'COMPRAR', color: '#2db87a', bg: 'rgba(45,184,122,0.12)', border: 'rgba(45,184,122,0.3)' },
            { label: 'MANTENER', color: '#d4a820', bg: 'rgba(212,168,32,0.12)', border: 'rgba(212,168,32,0.3)' },
            { label: 'VENDER', color: '#e05252', bg: 'rgba(224,82,82,0.12)', border: 'rgba(224,82,82,0.3)' },
          ].map(({ label, color, bg, border }) => (
            <div
              key={label}
              style={{
                padding: '10px 20px',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '6px',
                color,
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                fontFamily: 'monospace',
              }}
            >
              {label}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ color: '#9a8e78', fontSize: '14px', letterSpacing: '0.06em' }}>
            stockai.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
