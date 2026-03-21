'use client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
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
    <div className="bg-background border rounded-lg p-3 shadow-xl text-sm">
      <p className="text-muted-foreground mb-1">
        {label ? new Date(label).toLocaleDateString('es-AR', {
          day: '2-digit', month: 'short', year: 'numeric',
        }) : ''}
      </p>
      <p className="font-bold text-base">${payload[0].value.toFixed(2)}</p>
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

  if (data.length === 0) return (
    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
      No chart data available
    </div>
  );

  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;
  const firstPrice = prices[0] ?? 0;
  const lastPrice = prices[prices.length - 1] ?? 0;
  const isPositive = lastPrice >= firstPrice;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })
          }
          tick={{ fontSize: 11, fill: '#888' }}
          tickLine={false}
          axisLine={false}
          minTickGap={60}
        />
        <YAxis
          domain={[minPrice, maxPrice]}
          tick={{ fontSize: 11, fill: '#888' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={65}
        />
        <Tooltip content={<CustomTooltip />} />
        {ma200 && ma200 > 0 && (
          <ReferenceLine
            y={ma200}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'MA200', fontSize: 9, fill: '#3b82f6', position: 'right' }}
          />
        )}
        {ma50 && ma50 > 0 && (
          <ReferenceLine
            y={ma50}
            stroke="#8b5cf6"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'MA50', fontSize: 9, fill: '#8b5cf6', position: 'right' }}
          />
        )}
        {ma20 && ma20 > 0 && (
          <ReferenceLine
            y={ma20}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'MA20', fontSize: 9, fill: '#f59e0b', position: 'right' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="close"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
