'use client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ChartCandle } from '@/lib/types';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="font-data text-xs"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '8px 12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: '0.65rem', letterSpacing: '0.08em' }}>
        {label ? new Date(label).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
      </div>
      <div style={{ color: 'var(--foreground)', fontSize: '1rem', fontWeight: 600 }}>
        ${(payload[0]?.value ?? 0).toFixed(2)}
      </div>
    </div>
  );
}

interface PriceChartProps {
  candles: ChartCandle[];
  ma20?: number;
  ma50?: number;
  ma200?: number;
}

export function PriceChart({ candles, ma20, ma50, ma200 }: PriceChartProps) {
  const data = candles
    .filter((c) => c.close > 0)
    .map((c) => ({ date: c.date, close: c.close }));

  if (data.length === 0) {
    return (
      <div
        className="h-[280px] flex items-center justify-center font-data text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        SIN DATOS DE GRÁFICO
      </div>
    );
  }

  const prices = data.map((d) => d.close);
  const minP = Math.min(...prices) * 0.975;
  const maxP = Math.max(...prices) * 1.025;
  const isUp = (prices[prices.length - 1] ?? 0) >= (prices[0] ?? 0);

  const strokeColor = isUp ? 'var(--buy)' : 'var(--sell)';
  const fillId = isUp ? 'gradient-buy' : 'gradient-sell';
  const fillStart = isUp ? 'rgba(0,229,160,0.25)' : 'rgba(255,61,87,0.25)';
  const fillEnd = 'rgba(0,0,0,0)';

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillStart} />
            <stop offset="100%" stopColor={fillEnd} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })
          }
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-data)' }}
          tickLine={false}
          axisLine={false}
          minTickGap={60}
        />
        <YAxis
          domain={[minP, maxP]}
          tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-data)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* MA lines */}
        {ma200 && ma200 > 0 && (
          <ReferenceLine
            y={ma200}
            stroke="var(--accent-blue)"
            strokeDasharray="5 4"
            strokeWidth={1}
            strokeOpacity={0.6}
            label={{ value: '200', fontSize: 9, fill: 'var(--accent-blue)', position: 'insideTopRight' }}
          />
        )}
        {ma50 && ma50 > 0 && (
          <ReferenceLine
            y={ma50}
            stroke="var(--accent-purple)"
            strokeDasharray="5 4"
            strokeWidth={1}
            strokeOpacity={0.6}
            label={{ value: '50', fontSize: 9, fill: 'var(--accent-purple)', position: 'insideTopRight' }}
          />
        )}
        {ma20 && ma20 > 0 && (
          <ReferenceLine
            y={ma20}
            stroke="var(--hold)"
            strokeDasharray="5 4"
            strokeWidth={1}
            strokeOpacity={0.6}
            label={{ value: '20', fontSize: 9, fill: 'var(--hold)', position: 'insideTopRight' }}
          />
        )}

        <Area
          type="monotone"
          dataKey="close"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
