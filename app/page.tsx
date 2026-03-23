'use client';
import { useState } from 'react';
import { StockSearch } from '@/components/StockSearch';
import { StockHeader } from '@/components/StockHeader';
import { PriceChart } from '@/components/PriceChart';
import { SignalBadge } from '@/components/SignalBadge';
import { AnalysisGrid } from '@/components/AnalysisGrid';
import { DualPredictionPanel } from '@/components/DualPredictionPanel';
import { MarketOverview } from '@/components/MarketOverview';
import { RiskFlags } from '@/components/RiskFlags';
import { AffiliateCard } from '@/components/AffiliateCard';
import { useQuote, useAnalysis, usePrediction, useMarketData, useWatchlist, useSignals } from '@/hooks/useStock';
import type { SignalItem } from '@/hooks/useStock';
import { CATEGORIES, getTickersByCategory } from '@/lib/stockNames';
import { computeCombinedSignal } from '@/lib/signal-utils';
import type { WatchlistItem } from '@/app/api/watchlist/route';
import type { FibonacciAnalysis, ElliottWaveAnalysis, Signal, Confidence, StockAnalysis, MarketContext, AIPrediction } from '@/lib/types';

// ── Custom watchlist (localStorage) ───────────────────────────────────────
const CUSTOM_KEY = 'stockai-custom-watchlist';

function useCustomWatchlist() {
  const [tickers, setTickers] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]'); } catch { return []; }
  });

  const toggle = (ticker: string) => {
    setTickers((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  const isFav = (ticker: string) => tickers.includes(ticker);
  return { tickers, toggle, isFav };
}

type Period = '1d' | '5d' | '1mo' | '3mo' | '1y';
const PERIODS: { key: Period; label: string }[] = [
  { key: '1d',  label: '1D' },
  { key: '5d',  label: '5D' },
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '1y',  label: '1A' },
];

// ── Mini skeleton ──────────────────────────────────────────────────────────
function Skel({ w = '100%', h = 20 }: { w?: string | number; h?: number }) {
  return <div className="skeleton rounded" style={{ width: w, height: h }} />;
}

// ── Change formatted ───────────────────────────────────────────────────────
function Change({ pct, size = 'sm' }: { pct: number; size?: 'xs' | 'sm' }) {
  const up = pct >= 0;
  const fs = size === 'xs' ? 10 : 11;
  return (
    <span
      className="font-data tabular-nums"
      style={{
        color: up ? 'var(--buy)' : 'var(--sell)',
        fontSize: fs,
        fontWeight: 600,
      }}
    >
      {up ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}


// ── Watchlist stock card ───────────────────────────────────────────────────
function StockCard({
  item,
  onClick,
  isFav,
  onToggleFav,
}: {
  item: WatchlistItem;
  onClick: () => void;
  isFav?: boolean;
  onToggleFav?: (ticker: string) => void;
}) {
  const up = item.changePercent >= 0;
  const cardClass = 'stock-card';

  return (
    <button
      onClick={onClick}
      className={`${cardClass} p-3 w-full text-left flex flex-col gap-1.5`}
      style={{ minHeight: 88 }}
      aria-label={`Analizar ${item.ticker} — ${item.name}`}
    >
      {/* Top row: ticker + star + signal dot */}
      <div className="flex items-center justify-between">
        <span className="font-data text-xs font-bold" style={{ color: 'var(--foreground)', letterSpacing: '0.06em' }}>
          {item.ticker}
        </span>
        <div className="flex items-center gap-1.5">
          {onToggleFav && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(item.ticker); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 11 }}
              title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <span style={{ color: isFav ? 'var(--hold)' : 'var(--text-tertiary)' }}>{isFav ? '★' : '☆'}</span>
            </button>
          )}
        </div>
      </div>
      {/* Name */}
      <span className="text-xs leading-tight" style={{ color: 'var(--text-secondary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </span>
      {/* Price + change */}
      <div className="flex items-baseline justify-between mt-auto">
        <span className="font-data text-sm font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
          {item.price > 0 ? (item.price >= 1 ? `$${item.price.toFixed(2)}` : `$${item.price.toFixed(4)}`) : '—'}
        </span>
        {item.price > 0 && (
          <span
            className="font-data tabular-nums"
            style={{ color: up ? 'var(--buy)' : 'var(--sell)', fontWeight: 600, fontSize: 11 }}
          >
            {up ? '+' : ''}{item.changePercent.toFixed(2)}%
          </span>
        )}
      </div>
    </button>
  );
}

// ── Loading grid ───────────────────────────────────────────────────────────
function WatchlistSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="terminal-card p-3 space-y-2" style={{ minHeight: 88 }}>
          <Skel w="50%" h={14} />
          <Skel w="75%" h={11} />
          <Skel w="55%" h={14} />
        </div>
      ))}
    </div>
  );
}

// ── Signals Panel (BUY / HOLD / SELL grouping) ────────────────────────────
function SignalsPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {['BUY', 'HOLD', 'SELL'].map((s) => (
        <div key={s} className="signal-column">
          <div className="signal-column-header">
            <Skel w="60%" h={14} />
            <Skel w={24} h={18} />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="signal-row">
              <Skel w="40%" h={12} />
              <Skel w={40} h={12} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SignalRow({
  item, color, onSelect,
}: {
  item: SignalItem; color: string; onSelect: (t: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.ticker)}
      className="signal-row w-full text-left"
      style={{ borderLeftColor: color }}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-data text-xs font-bold" style={{ color: 'var(--foreground)', letterSpacing: '0.05em' }}>
            {item.ticker}
          </span>
          <Change pct={item.changePercent} size="xs" />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="label-caps truncate" style={{ color: 'var(--text-tertiary)', fontSize: '0.52rem' }}>
            {item.name}
          </span>
        </div>
        {/* Score bar */}
        <div className="mt-1.5 h-0.5 w-full rounded-full" style={{ background: 'var(--surface-overlay)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${item.compositeScore}%`, background: color, opacity: 0.7 }}
          />
        </div>
      </div>
      <span
        className="font-data text-xs font-bold tabular-nums ml-2 shrink-0"
        style={{ color, opacity: 0.85 }}
      >
        {item.compositeScore}
      </span>
    </button>
  );
}

function SignalsPanel({ onSelect }: { onSelect: (ticker: string) => void }) {
  const { buy, hold, sell, isLoading } = useSignals();

  if (isLoading) return <SignalsPanelSkeleton />;

  const MAX = 8;

  const cols: { label: string; subtitle: string; items: SignalItem[]; color: string; bg: string; borderTop: string }[] = [
    {
      label: 'COMPRAR',
      subtitle: 'Fib + momentum alcista',
      items: buy  as SignalItem[],
      color: 'var(--buy)',
      bg: 'rgba(0,230,118,0.05)',
      borderTop: 'rgba(0,230,118,0.40)',
    },
    {
      label: 'VENDER',
      subtitle: 'Fib + momentum bajista',
      items: sell as SignalItem[],
      color: 'var(--sell)',
      bg: 'rgba(255,23,68,0.05)',
      borderTop: 'rgba(255,23,68,0.40)',
    },
    {
      label: 'MANTENER',
      subtitle: 'Sin señal clara',
      items: hold as SignalItem[],
      color: 'var(--hold)',
      bg: 'rgba(255,171,0,0.05)',
      borderTop: 'rgba(255,171,0,0.40)',
    },
  ];

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
        style={{ background: 'rgba(200,169,110,0.04)', border: '1px solid rgba(200,169,110,0.12)' }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ color: 'var(--text-secondary)' }}>
          Señales basadas en <strong style={{ color: 'var(--foreground)' }}>Fibonacci 52s</strong> + momentum · Ordenadas por score (0–100) · Número a la derecha = convicción
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 slide-up">
        {cols.map(({ label, subtitle, items, color, bg, borderTop }) => (
          <div key={label} className="signal-column" style={{ borderTop: `2px solid ${borderTop}` }}>
            {/* Header */}
            <div className="signal-column-header" style={{ background: bg }}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="label-caps" style={{ color, letterSpacing: '0.12em' }}>{label}</span>
                  <span
                    className="font-data text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-sm"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}28`, fontSize: 9 }}
                  >
                    {items.length}
                  </span>
                </div>
                <span className="label-caps mt-0.5" style={{ color: 'var(--text-tertiary)', fontSize: '0.52rem' }}>{subtitle}</span>
              </div>
            </div>

            {/* Rows */}
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center label-caps" style={{ color: 'var(--text-tertiary)' }}>
                Sin señales
              </div>
            ) : (
              <>
                {items.slice(0, MAX).map((item) => (
                  <SignalRow key={item.ticker} item={item} color={color} onSelect={onSelect} />
                ))}
                {items.length > MAX && (
                  <div className="px-4 py-2 label-caps" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
                    +{items.length - MAX} más
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Watchlist panel ─────────────────────────────────────────────────────────
const FAV_CATEGORY = '⭐ FAVORITOS';

function WatchlistPanel({ onSelect }: { onSelect: (ticker: string) => void }) {
  const [activeCategory, setActiveCategory] = useState<string>('MEGA TECH');
  const { tickers: favTickers, toggle: toggleFav, isFav } = useCustomWatchlist();

  const allCategories = [FAV_CATEGORY, ...CATEGORIES];
  const isCustom = activeCategory === FAV_CATEGORY;
  const tickers = isCustom ? favTickers : getTickersByCategory(activeCategory).map((t) => t.ticker);
  const { items, isLoading } = useWatchlist(tickers);

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`cat-tab${activeCategory === cat ? ' cat-tab-active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stock grid */}
      {isLoading ? (
        <WatchlistSkeleton />
      ) : isCustom && items.length === 0 ? (
        <div className="py-12 text-center space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-2xl">☆</div>
          <div className="font-data text-sm">Todavía no tenés favoritos</div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Hacé clic en ☆ en cualquier acción para agregarla aquí
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 slide-up">
          {items.map((item) => (
            <StockCard
              key={item.ticker}
              item={item}
              onClick={() => onSelect(item.ticker)}
              isFav={isFav(item.ticker)}
              onToggleFav={toggleFav}
            />
          ))}
          {items.length === 0 && !isCustom && (
            <div className="col-span-full py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
              <div className="font-data text-sm">Sin datos — reintentando...</div>
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="flex items-center gap-2 pt-1" style={{ color: 'var(--text-tertiary)' }}>
        <div className="live-dot-wrap"><div className="live-dot" /></div>
        <span className="font-data text-xs">Tiempo real · 30s · ☆ para guardar en favoritos · clic para análisis completo</span>
      </div>
    </div>
  );
}

// ── Market index pill ──────────────────────────────────────────────────────
function MarketPill({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div className="market-pill" style={{ borderLeftColor: val >= 0 ? 'var(--buy)' : 'var(--sell)' }}>
      <span className="font-data" style={{ color: 'var(--text-secondary)', fontSize: 10, letterSpacing: '0.06em' }}>{label}</span>
      <span className="font-data font-bold tabular-nums" style={{ color, fontSize: 11 }}>
        {val >= 0 ? '+' : ''}{val.toFixed(2)}%
      </span>
    </div>
  );
}

// ── Elliott Wave Panel ─────────────────────────────────────────────────────
function ElliottWavePanel({ wave }: { wave: ElliottWaveAnalysis }) {
  const phaseColor = wave.phase === 'IMPULSE' ? 'var(--buy)' : wave.phase === 'CORRECTIVE' ? 'var(--hold)' : 'var(--text-tertiary)';
  const confidenceLabel = { HIGH: 'ALTA', MEDIUM: 'MEDIA', LOW: 'BAJA' }[wave.confidence];

  return (
    <div className="terminal-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={phaseColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12 Q5 6 8 12 Q11 18 14 12 Q17 6 20 12 Q21.5 15 22 12" />
          </svg>
          <span className="font-display text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Ondas de Elliott</span>
        </div>
        <span className="label-caps px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>
          {wave.phase !== 'UNKNOWN' ? wave.phase : 'SIN DATOS'}
        </span>
      </div>

      {/* Current wave + target */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Onda actual', val: wave.currentWave, sub: 'posición en el ciclo', color: phaseColor },
          { label: 'Confianza', val: confidenceLabel, sub: 'reglas Elliott verificadas', color: wave.confidence === 'HIGH' ? 'var(--buy)' : wave.confidence === 'MEDIUM' ? 'var(--hold)' : 'var(--text-secondary)' },
          { label: 'Objetivo', val: wave.targetPrice ? `$${wave.targetPrice.toFixed(2)}` : '—', sub: 'precio proyectado', color: 'var(--foreground)' },
        ].map(({ label, val, sub, color }) => (
          <div key={label} className="terminal-card-raised p-3 text-center rounded-md">
            <div className="label-caps mb-1">{label}</div>
            <div className="font-data text-base font-bold" style={{ color }}>{val}</div>
            <div className="label-caps mt-0.5" style={{ color: 'var(--text-tertiary)', fontSize: '0.52rem' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Pivot sequence */}
      {wave.pivots.length >= 3 && (
        <div className="space-y-1.5">
          <div className="label-caps">Pivotes identificados</div>
          <div className="flex items-end gap-2 overflow-x-auto no-scrollbar py-1">
            {wave.pivots.map((p, i) => (
              <div key={i} className="flex flex-col items-center shrink-0">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: p.type === 'HIGH' ? 'var(--sell)' : 'var(--buy)' }}
                />
                <div className="font-data tabular-nums mt-1" style={{ fontSize: 9, color: p.type === 'HIGH' ? 'var(--sell)' : 'var(--buy)' }}>
                  ${p.price.toFixed(0)}
                </div>
                <div className="label-caps mt-0.5" style={{ fontSize: 8 }}>
                  {p.type === 'HIGH' ? 'MAX' : 'MIN'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invalidation */}
      {wave.invalidationPrice && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm"
          style={{ background: 'rgba(255,23,68,0.06)', border: '1px solid rgba(255,23,68,0.18)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sell)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Invalidación por debajo de{' '}
            <span className="font-data font-bold" style={{ color: 'var(--sell)' }}>
              ${wave.invalidationPrice.toFixed(2)}
            </span>
          </span>
        </div>
      )}

      <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{wave.notes}</p>

      {/* Wave glossary */}
      {wave.phase !== 'UNKNOWN' && (
        <div className="px-3 py-3 rounded-md space-y-2" style={{ background: 'rgba(200,169,110,0.04)', border: '1px solid rgba(200,169,110,0.12)' }}>
          <div className="label-caps mb-2" style={{ color: 'var(--accent-blue)' }}>¿Qué significa cada onda?</div>
          {wave.phase === 'IMPULSE' ? (
            <div className="space-y-1" style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div><span style={{ color: 'var(--buy)', fontWeight: 700 }}>Onda 1</span> — Primer movimiento alcista. Suele pasar desapercibida; el mercado aún no reconoce la tendencia.</div>
              <div><span style={{ color: 'var(--sell)', fontWeight: 700 }}>Onda 2</span> — Corrección. Retrocede parte de la Onda 1, pero nunca puede bajar por debajo de su inicio.</div>
              <div><span style={{ color: 'var(--buy)', fontWeight: 700 }}>Onda 3</span> — La más fuerte y extensa. Es donde el mercado confirma la tendencia. No puede ser la más corta de las ondas impulsivas.</div>
              <div><span style={{ color: 'var(--sell)', fontWeight: 700 }}>Onda 4</span> — Segunda corrección. No puede solaparse con el rango de precios de la Onda 1.</div>
              <div><span style={{ color: 'var(--buy)', fontWeight: 700 }}>Onda 5</span> — Último impulso antes de la corrección mayor (A-B-C). Suele ser más débil que la Onda 3.</div>
            </div>
          ) : (
            <div className="space-y-1" style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div><span style={{ color: 'var(--sell)', fontWeight: 700 }}>Onda A</span> — Primera caída en la corrección. Muchos la confunden con una pausa temporal.</div>
              <div><span style={{ color: 'var(--buy)', fontWeight: 700 }}>Onda B</span> — Rebote dentro de la corrección. No indica recuperación real — puede ser una trampa alcista.</div>
              <div><span style={{ color: 'var(--sell)', fontWeight: 700 }}>Onda C</span> — Caída final de la corrección. Si hay soporte fuerte, puede ser zona de entrada para compras.</div>
            </div>
          )}
        </div>
      )}

      {/* Limitations note */}
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
        Las Ondas de Elliott son un método <strong style={{ color: 'var(--foreground)' }}>interpretativo</strong> — analistas distintos pueden llegar a conteos diferentes con el mismo gráfico. La confianza indica cuántas de las 5 reglas estrictas de Elliott fueron verificadas en los pivotes detectados ({wave.confidence === 'HIGH' ? '5/5' : wave.confidence === 'MEDIUM' ? '4/5' : '≤3/5'}). No usar como único criterio de decisión.
      </p>
    </div>
  );
}


// ── Timing computation ─────────────────────────────────────────────────────
interface TimingResult {
  urgency: 'now' | 'wait' | 'condition';
  urgencyLabel: string;
  primaryZone: string;
  condition: string;
  stopOrWatch: string;
  elliottContext: string;
  aiReasoning?: string;
}

function computeTiming(
  analysis: StockAnalysis,
  currentPrice: number,
  signal: Signal,
  prediction?: AIPrediction
): TimingResult {
  const { fibonacci: fib, elliottWave, rsi, ma50, ma200 } = analysis;
  const ns = fib.nearestSupport;
  const nr = fib.nearestResistance;

  const isOverbought = rsi > 65;
  const isOversold   = rsi < 35;
  const rsiNeutral   = !isOverbought && !isOversold;
  const above50      = currentPrice > ma50;
  const above200     = currentPrice > ma200;

  const waveMap: Partial<Record<string, string>> = {
    'Wave 1': 'Wave 1 — inicio del ciclo alcista (entrada temprana)',
    'Wave 2': 'Wave 2 — corrección transitoria, zona de acumulación',
    'Wave 3': 'Wave 3 — fase más fuerte del ciclo alcista',
    'Wave 4': 'Wave 4 — corrección antes del último impulso',
    'Wave 5': 'Wave 5 — último impulso del ciclo (fase tardía)',
    'Wave A': 'Wave A — inicio de corrección bajista',
    'Wave B': 'Wave B — rebote temporal dentro de corrección',
    'Wave C': 'Wave C — corrección final, posible zona de compra',
  };
  const elliottContext = (elliottWave.phase !== 'UNKNOWN' && waveMap[elliottWave.currentWave])
    ? waveMap[elliottWave.currentWave]!
    : 'Ciclo: patrón en análisis';

  const aiReasoning = prediction?.reasoning
    ? prediction.reasoning.split('.')[0] + '.'
    : undefined;

  const lateWave     = ['Wave 5', 'Wave B'].includes(elliottWave.currentWave);
  const earlyBullWave = ['Wave 1', 'Wave 2', 'Wave 3'].includes(elliottWave.currentWave) && elliottWave.phase === 'IMPULSE';

  if (signal === 'BUY') {
    const stopLoss      = ns ? ns.price * 0.974 : currentPrice * 0.95;
    const target        = nr?.price ?? prediction?.targetHigh ?? currentPrice * 1.08;
    const isNearSupport = ns && currentPrice <= ns.price * 1.025;
    const maContext     = above50 && above200 ? 'Contexto alcista en todos los plazos'
                        : above50             ? 'Tendencia de mediano plazo positiva'
                        :                       'Confirmar recuperación de tendencias';

    if (isOverbought && !earlyBullWave) {
      return {
        urgency: 'wait', urgencyLabel: 'ESPERAR CORRECCIÓN',
        primaryZone: ns
          ? `Al retroceder a $${ns.price.toFixed(2)} – $${(ns.price * 1.015).toFixed(2)} (soporte Fib ${ns.label})`
          : 'Esperar retroceso hacia soporte antes de entrar',
        condition: 'El precio subió sin pausa — conviene esperar corrección para mejor relación riesgo/recompensa',
        stopOrWatch: `Si corrige a soporte, evaluar entrada con stop bajo $${stopLoss.toFixed(2)} · Objetivo: $${target.toFixed(2)}`,
        elliottContext, aiReasoning,
      };
    }
    if (lateWave) {
      return {
        urgency: 'wait', urgencyLabel: 'FASE TARDÍA — CAUTELA',
        primaryZone: ns
          ? `Si corrige a $${ns.price.toFixed(2)} (soporte Fib ${ns.label}), puede ser zona de entrada`
          : 'El mayor movimiento del ciclo ya ocurrió',
        condition: `${elliottWave.currentWave}: el ciclo está en etapa avanzada — mayor riesgo de corrección próxima`,
        stopOrWatch: `Entrada solo con corrección clara · Stop bajo $${stopLoss.toFixed(2)}`,
        elliottContext, aiReasoning,
      };
    }
    if (isNearSupport) {
      return {
        urgency: 'now', urgencyLabel: 'ZONA DE ENTRADA',
        primaryZone: `$${(ns!.price * 0.998).toFixed(2)} – $${(ns!.price * 1.012).toFixed(2)} (soporte Fibonacci ${ns!.label})`,
        condition: `Precio en soporte clave · ${maContext} · ${rsiNeutral ? 'RSI en zona favorable' : isOversold ? 'RSI sobrevendido — rebote probable' : 'RSI elevado — entrada parcial'}`,
        stopOrWatch: `Stop-loss: cierre bajo $${stopLoss.toFixed(2)} · Objetivo: $${target.toFixed(2)}`,
        elliottContext, aiReasoning,
      };
    }
    return {
      urgency: 'condition', urgencyLabel: 'CON CONFIRMACIÓN',
      primaryZone: ns
        ? `Al retroceder a $${ns.price.toFixed(2)} – $${(ns.price * 1.02).toFixed(2)}, o en apertura con volumen alto`
        : 'Entrada escalonada o al confirmar soporte con volumen',
      condition: `${rsiNeutral ? 'RSI en zona favorable' : 'RSI con margen'} · ${maContext}`,
      stopOrWatch: `Stop-loss: $${stopLoss.toFixed(2)} · Objetivo primario: $${target.toFixed(2)}`,
      elliottContext, aiReasoning,
    };
  }

  if (signal === 'SELL') {
    const stopAbove        = nr ? nr.price * 1.025 : currentPrice * 1.05;
    const target           = ns?.price ?? prediction?.targetLow ?? currentPrice * 0.92;
    const isNearResistance = nr && currentPrice >= nr.price * 0.985;

    if (isOversold) {
      return {
        urgency: 'wait', urgencyLabel: 'ESPERAR REBOTE',
        primaryZone: nr
          ? `Zona de venta al rebotar hacia $${nr.price.toFixed(2)} – $${(nr.price * 1.01).toFixed(2)}`
          : 'Esperar rebote para mejor precio de salida',
        condition: 'El precio cayó mucho sin pausa — puede haber rebote temporal antes de continuar',
        stopOrWatch: `Alerta si supera $${stopAbove.toFixed(2)} — señal bajista podría invalidarse`,
        elliottContext, aiReasoning,
      };
    }
    if (isNearResistance) {
      return {
        urgency: 'now', urgencyLabel: 'ZONA DE VENTA',
        primaryZone: `$${nr!.price.toFixed(2)} – $${(nr!.price * 1.015).toFixed(2)} (resistencia Fibonacci ${nr!.label})`,
        condition: `Precio en resistencia clave · ${isOverbought ? 'Impulso sobrecomprado — frágil' : 'Señales bajistas activas'}`,
        stopOrWatch: `Alerta si supera $${stopAbove.toFixed(2)} · Objetivo bajista: $${target.toFixed(2)}`,
        elliottContext, aiReasoning,
      };
    }
    return {
      urgency: 'condition', urgencyLabel: 'CON CONFIRMACIÓN',
      primaryZone: nr
        ? `Venta si pierde soporte, o al rebotar a resistencia $${nr.price.toFixed(2)}`
        : 'Confirmar ruptura bajista antes de actuar',
      condition: `${isOverbought ? 'RSI sobrecomprado — vulnerable' : 'RSI: confirmar divergencia bajista'} · Esperar señal clara de inversión`,
      stopOrWatch: `Alerta si supera $${stopAbove.toFixed(2)}`,
      elliottContext, aiReasoning,
    };
  }

  // HOLD
  const buyTrigger  = nr ? `supera $${nr.price.toFixed(2)} con volumen` : 'señal alcista confirmada';
  const sellTrigger = ns ? `rompe soporte $${ns.price.toFixed(2)}` : 'señal bajista confirmada';
  return {
    urgency: 'wait', urgencyLabel: 'ESPERAR SEÑAL',
    primaryZone: `Rango de consolidación: $${(ns?.price ?? currentPrice * 0.95).toFixed(2)} – $${(nr?.price ?? currentPrice * 1.05).toFixed(2)}`,
    condition: `Señales contradictorias entre los 3 análisis · ${rsiNeutral ? 'RSI en zona neutral' : isOverbought ? 'RSI sobrecomprado — posible corrección' : 'RSI sobrevendido — posible rebote'}`,
    stopOrWatch: `Pasarse a COMPRAR si: ${buyTrigger} · Reducir si: ${sellTrigger}`,
    elliottContext, aiReasoning,
  };
}

// ── Timing section component ───────────────────────────────────────────────
function TimingSection({ signal, timing }: { signal: Signal; timing: TimingResult }) {
  const URGENCY_STYLE = {
    now:       { bg: 'rgba(0,230,118,0.06)',    border: 'rgba(0,230,118,0.22)',    color: 'var(--buy)' },
    wait:      { bg: 'rgba(255,171,0,0.05)',    border: 'rgba(255,171,0,0.22)',    color: 'var(--hold)' },
    condition: { bg: 'rgba(100,180,255,0.05)', border: 'rgba(100,180,255,0.22)', color: 'var(--accent-blue)' },
  } as const;
  const TITLE = { BUY: 'CUÁNDO COMPRAR', SELL: 'CUÁNDO VENDER', HOLD: 'QUÉ ESPERAR' } as const;
  const style = URGENCY_STYLE[timing.urgency];

  return (
    <div className="rounded-lg space-y-2.5 px-4 py-3" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="label-caps" style={{ color: style.color, letterSpacing: '0.1em' }}>
          {TITLE[signal]}
        </span>
        <span
          className="font-data text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: `${style.color}18`, color: style.color, letterSpacing: '0.08em' }}
        >
          {timing.urgencyLabel}
        </span>
      </div>

      {/* Primary zone */}
      <div className="flex items-start gap-2">
        <span className="font-data text-xs font-bold shrink-0 mt-0.5" style={{ color: style.color }}>→</span>
        <div>
          <div className="font-data text-sm font-bold leading-snug" style={{ color: 'var(--foreground)' }}>
            {timing.primaryZone}
          </div>
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {timing.condition}
          </div>
        </div>
      </div>

      {/* Stop / watch */}
      <div className="flex items-start gap-2">
        <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>⚑</span>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {timing.stopOrWatch}
        </div>
      </div>

      {/* Elliott context */}
      <div className="flex items-start gap-2">
        <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--accent-blue)' }}>∿</span>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {timing.elliottContext}
        </div>
      </div>

      {/* AI reasoning */}
      {timing.aiReasoning && (
        <div className="flex items-start gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: 'var(--accent-blue)' }}>✦</span>
          <div className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <strong style={{ color: 'var(--accent-blue)' }}>IA:</strong> {timing.aiReasoning}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Combined Verdict Banner ────────────────────────────────────────────────
function CombinedVerdictBanner({
  analysis, market, currentPrice, prediction,
}: {
  analysis: StockAnalysis;
  market: MarketContext;
  currentPrice?: number;
  prediction?: AIPrediction;
}) {
  const cs = computeCombinedSignal(analysis, market);
  const { signal, confidence, agreementCount, weightedScore, sources, veto } = cs;

  const SIG_CFG = {
    BUY:  { label: 'COMPRAR',  icon: '▲', color: 'var(--buy)',  bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.25)' },
    HOLD: { label: 'MANTENER', icon: '■', color: 'var(--hold)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)' },
    SELL: { label: 'VENDER',   icon: '▼', color: 'var(--sell)', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.25)' },
  } as const;
  const SIG_ICON  = { BUY: '↑', SELL: '↓', HOLD: '→' } as const;

  const cfg = SIG_CFG[signal];

  const summaryText =
    agreementCount === 3 ? 'Los tres métodos de análisis coinciden. La señal es sólida.' :
    agreementCount === 2 ? 'Dos de los tres métodos coinciden. La señal tiene respaldo moderado.' :
    'Los tres métodos discrepan. Alta incertidumbre — conviene esperar confirmación.';

  const pct = Math.round(Math.abs(weightedScore) * 100);

  return (
    <div
      className="terminal-card p-5 space-y-4"
      style={{ borderColor: cfg.border.replace('0.25', '0.35') }}
    >
      {/* Main verdict */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div
            className="font-display text-3xl font-bold px-5 py-3 rounded-xl"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, letterSpacing: '0.06em' }}
          >
            {cfg.icon} {cfg.label}
          </div>
          <div className="space-y-0.5">
            <div className="label-caps" style={{ color: 'var(--text-tertiary)' }}>
              {agreementCount}/3 métodos coinciden · {pct}% de convicción
            </div>
          </div>
        </div>
        <div className="label-caps px-2 py-1 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)', fontSize: '0.55rem' }}>
          CONCLUSIÓN FINAL
        </div>
      </div>

      {/* Veto warning — shown when the technical signal was overridden */}
      {veto.vetoed && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.28)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--hold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-xs font-medium leading-snug" style={{ color: 'var(--hold)' }}>
            {veto.label}
          </span>
          <span className="label-caps ml-auto shrink-0" style={{ color: 'var(--text-tertiary)', fontSize: '0.50rem' }}>
            sin ajuste: {veto.originalSignal === 'BUY' ? 'COMPRAR' : veto.originalSignal === 'SELL' ? 'VENDER' : 'MANTENER'}
          </span>
        </div>
      )}

      {/* Summary text */}
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {summaryText}
      </p>

      {/* Timing — cuándo conviene actuar */}
      {currentPrice !== undefined && (
        <TimingSection
          signal={signal}
          timing={computeTiming(analysis, currentPrice, signal, prediction)}
        />
      )}

      {/* Source pills */}
      <div className="flex flex-wrap gap-2">
        {sources.map(({ name, signal: sig, weight }) => {
          const sc = { BUY: 'var(--buy)', SELL: 'var(--sell)', HOLD: 'var(--hold)' }[sig];
          const pct = Math.round(weight * 100);
          return (
            <div
              key={name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: sc + '10', border: `1px solid ${sc}28` }}
            >
              <span className="font-data text-xs font-bold" style={{ color: sc }}>{SIG_ICON[sig]}</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{name}</span>
              <span className="label-caps" style={{ color: 'var(--text-tertiary)', fontSize: '0.50rem' }}>{pct}%</span>
            </div>
          );
        })}
      </div>

      <p className="label-caps text-center" style={{ opacity: 0.3, fontSize: '0.50rem' }}>
        Solo fines educativos · No es asesoramiento financiero · Basado en análisis técnico
      </p>
    </div>
  );
}

// ── Scenario Card (shared sub-component) ──────────────────────────────────
function ScenarioCard({
  trigger, icon, color, bg, title, body, action, actionColor,
}: {
  trigger: string; icon: string; color: string; bg: string;
  title: string; body: string; action: string; actionColor: string;
}) {
  return (
    <div className="rounded-md" style={{ background: bg, border: `1px solid ${color}28` }}>
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2.5">
        <span className="font-data text-sm font-bold shrink-0 mt-0.5" style={{ color }}>{icon}</span>
        <div className="space-y-1 min-w-0">
          <div className="label-caps" style={{ color, fontSize: '0.58rem', letterSpacing: '0.08em' }}>{trigger}</div>
          <div className="font-display text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</p>
          <div className="flex items-start gap-1.5 pt-0.5">
            <span className="font-data text-xs font-bold shrink-0" style={{ color: actionColor }}>→</span>
            <span style={{ fontSize: 12, color: actionColor, fontWeight: 600, lineHeight: 1.4 }}>{action}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Interpretation Panel ───────────────────────────────────────────────────
function InterpretationPanel({ analysis, currentPrice }: { analysis: StockAnalysis; currentPrice: number }) {
  const { signal: combinedSignal, agreementCount, sources } = computeCombinedSignal(analysis);
  const { score, confidence, signal, rsi, ma20, ma50, ma200, fibonacci, elliottWave } = analysis;

  const sColor = (s: Signal) => s === 'BUY' ? 'var(--buy)' : s === 'SELL' ? 'var(--sell)' : 'var(--hold)';
  const sLabel = (s: Signal) => s === 'BUY' ? '▲ COMPRA' : s === 'SELL' ? '▼ VENDE' : '■ NEUTRAL';
  const signalWord: Record<Signal, string> = { BUY: 'COMPRAR', SELL: 'VENDER', HOLD: 'MANTENER' };

  // === CONCLUSIÓN NARRATIVA ===
  const parts: string[] = [];

  // 1. Señal técnica (lenguaje claro)
  const techQuality = score >= 70 ? 'sólida' : score >= 55 ? 'moderada' : 'débil';
  const techDir = signal === 'BUY' ? 'compra' : signal === 'SELL' ? 'venta' : 'neutral';
  const confWord = confidence === 'HIGH' ? 'alta convicción' : confidence === 'MEDIUM' ? 'convicción media' : 'baja convicción';
  parts.push(`El análisis técnico muestra una señal de ${techDir} ${techQuality} (${confWord}, puntuación ${score}/100).`);

  // 2. Momentum/impulso (sin mencionar "RSI")
  if (rsi > 72) {
    parts.push(`El precio viene subiendo con mucha fuerza — hay muchos compradores que ya entraron, lo que puede hacer que las próximas zonas de precio techo sean más difíciles de superar.`);
  } else if (rsi < 28) {
    parts.push(`El precio viene cayendo fuerte y el impulso vendedor se está agotando — esto puede generar rebotes pronunciados cuando llegue a una zona de soporte histórico.`);
  } else if (rsi >= 58) {
    parts.push(`El impulso comprador es activo y tiene margen para continuar.`);
  } else if (rsi <= 42) {
    parts.push(`El impulso vendedor predomina levemente, sin agotamiento extremo.`);
  }

  // 3. Tendencia general (sin mencionar "medias móviles")
  const above20 = currentPrice > ma20;
  const above50 = currentPrice > ma50;
  const above200 = currentPrice > ma200;
  const aboveCnt = [above20, above50, above200].filter(Boolean).length;
  if (aboveCnt === 3) {
    parts.push(`El precio está por encima de sus tendencias de referencia en el corto, mediano y largo plazo — contexto alcista alineado en todos los horizontes.`);
  } else if (aboveCnt === 0) {
    parts.push(`El precio está por debajo de sus tendencias de referencia en todos los horizontes — contexto bajista consolidado.`);
  } else if (!above200 && above50) {
    parts.push(`La tendencia de corto plazo es positiva, pero en el horizonte anual el precio aún está en zona de recuperación.`);
  } else if (!above50 && above200) {
    parts.push(`La tendencia anual es positiva, pero el precio está en una corrección de mediano plazo.`);
  }

  // 4. Fibonacci (soporte/resistencia más cercanos)
  const ns = fibonacci.nearestSupport;
  const nr = fibonacci.nearestResistance;
  if (ns && nr) {
    const dS = ((currentPrice - ns.price) / currentPrice * 100).toFixed(1);
    const dR = ((nr.price - currentPrice) / currentPrice * 100).toFixed(1);
    parts.push(`Los niveles históricos de precio muestran soporte en $${ns.price.toFixed(2)} (${dS}% abajo) y resistencia en $${nr.price.toFixed(2)} (${dR}% arriba).`);
  } else if (ns) {
    parts.push(`El soporte histórico más cercano está en $${ns.price.toFixed(2)}.`);
  } else if (nr) {
    parts.push(`La resistencia histórica más próxima está en $${nr.price.toFixed(2)}.`);
  }

  // 5. Ondas de Elliott (en lenguaje simple)
  const waveLabels: Partial<Record<string, string>> = {
    'Wave 1': 'en el primer impulso del ciclo alcista — la tendencia está comenzando',
    'Wave 2': 'en una corrección del primer impulso — no significa cambio de tendencia',
    'Wave 3': 'en la fase más fuerte del ciclo alcista — donde se generan los mayores movimientos',
    'Wave 4': 'en una corrección intermedia antes del último empuje alcista',
    'Wave 5': 'en el último impulso del ciclo — después suele venir una corrección importante',
    'Wave A': 'iniciando una corrección a la baja',
    'Wave B': 'en un rebote dentro de una corrección mayor — puede confundirse con recuperación',
    'Wave C': 'en la fase final de la corrección bajista — si aguanta soporte, puede ser zona de compra',
  };
  if (elliottWave.phase !== 'UNKNOWN' && elliottWave.currentWave !== 'Unknown') {
    const wl = waveLabels[elliottWave.currentWave];
    if (wl) {
      parts.push(`El análisis de ciclos indica que el precio está ${wl}${elliottWave.targetPrice ? `, con objetivo proyectado en $${elliottWave.targetPrice.toFixed(2)}` : ''}.`);
    }
  }

  // 6. Conclusión sintética
  const combWord = combinedSignal === 'BUY' ? 'alcista' : combinedSignal === 'SELL' ? 'bajista' : 'neutral';
  const agreeDesc =
    agreementCount === 3 ? 'con alta convergencia entre los tres análisis' :
    agreementCount === 2 ? 'con convergencia moderada (un método discrepa)' :
    'pero con señales contradictorias — se recomienda cautela y esperar mayor claridad';
  parts.push(`En síntesis: perspectiva ${combWord} ${agreeDesc}.`);

  // === ESCENARIOS ===
  const isOverbought = rsi > 68;
  const isOversold = rsi < 32;
  const ewTarget = elliottWave.targetPrice;
  const ewInvalidation = elliottWave.invalidationPrice;
  const isBullish = combinedSignal !== 'SELL';

  // ── Unified level system: Fibonacci + MA levels + swing extremes ──────────
  type Level = { price: number; label: string; isKey: boolean; source: 'fib' | 'ma' | 'swing' };

  const keyRatios = [0.236, 0.382, 0.5, 0.618, 0.786];
  const fibBelow = fibonacci.retracements
    .filter(l => keyRatios.includes(l.ratio) && l.price < currentPrice)
    .sort((a, b) => b.price - a.price);
  const fibAbove = fibonacci.retracements
    .filter(l => keyRatios.includes(l.ratio) && l.price > currentPrice)
    .sort((a, b) => a.price - b.price);

  const allSupports: Level[] = fibBelow.map(s => ({
    price: s.price,
    label: `nivel histórico ${s.label}`,
    isKey: [0.5, 0.618].includes(s.ratio),
    source: 'fib',
  }));
  const allResistances: Level[] = fibAbove.map(r => ({
    price: r.price,
    label: `nivel histórico ${r.label}`,
    isKey: [0.382, 0.5, 0.618].includes(r.ratio),
    source: 'fib',
  }));

  // Supplement with MA levels (plain language labels)
  const maLevels: Array<{ price: number; label: string; isKey: boolean }> = [
    { price: ma20,  label: 'tendencia de corto plazo (últimas 3 semanas)', isKey: false },
    { price: ma50,  label: 'tendencia de mediano plazo (últimos 2 meses)', isKey: true  },
    { price: ma200, label: 'tendencia de largo plazo (último año)',          isKey: true  },
  ].filter(m => m.price > 0);

  for (const m of maLevels) {
    const tooClose = (list: Level[]) => list.some(l => Math.abs(l.price - m.price) / m.price < 0.012);
    if (m.price < currentPrice && !tooClose(allSupports)) {
      allSupports.push({ price: m.price, label: m.label, isKey: m.isKey, source: 'ma' });
    }
    if (m.price > currentPrice && !tooClose(allResistances)) {
      allResistances.push({ price: m.price, label: m.label, isKey: m.isKey, source: 'ma' });
    }
  }

  // Supplement with swing low/high if still short on levels
  if (allSupports.length < 2 && fibonacci.swingLow > 0 && fibonacci.swingLow < currentPrice) {
    if (!allSupports.some(l => Math.abs(l.price - fibonacci.swingLow) / fibonacci.swingLow < 0.015)) {
      allSupports.push({ price: fibonacci.swingLow, label: 'mínimo del período analizado (6 meses)', isKey: true, source: 'swing' });
    }
  }
  if (allResistances.length < 2 && fibonacci.swingHigh > 0 && fibonacci.swingHigh > currentPrice) {
    if (!allResistances.some(l => Math.abs(l.price - fibonacci.swingHigh) / fibonacci.swingHigh < 0.015)) {
      allResistances.push({ price: fibonacci.swingHigh, label: 'máximo del período analizado (6 meses)', isKey: true, source: 'swing' });
    }
  }

  // Sort and cap
  allSupports.sort((a, b) => b.price - a.price);   // nearest first (highest price)
  allResistances.sort((a, b) => a.price - b.price); // nearest first (lowest price)
  const supports = allSupports.slice(0, 4);
  const resistances = allResistances.slice(0, 3);

  const sourceBody = (src: Level['source'], price: number, isKey: boolean) => {
    if (src === 'fib') return `Esta zona actuó históricamente como ${isKey ? 'uno de los soportes más importantes' : 'un nivel de soporte'} del precio. ${isOversold ? 'Con el impulso vendedor agotado, los rebotes desde aquí tienen más probabilidad.' : ''}`;
    if (src === 'ma')  return `Este nivel es donde se encuentra el promedio del precio del período. Los inversores suelen comprar (o vender) cuando el precio toca estas referencias de tendencia. ${isKey ? 'Es un nivel de referencia muy observado.' : ''}`;
    return `Este es el extremo del rango analizado. Llegar aquí representa un movimiento importante desde el nivel actual.`;
  };
  const sourceBodyRes = (src: Level['source'], isKey: boolean) => {
    if (src === 'fib') return `Esta zona actuó históricamente como techo del precio. ${isOverbought ? 'Atención: el precio ya viene subiendo sin pausa — verificar que el movimiento sea sostenido.' : ''} ${isKey ? 'Es uno de los niveles de resistencia más relevantes.' : ''}`;
    if (src === 'ma')  return `Este nivel es el promedio del precio del período. Cuando el precio sube hasta donde está su promedio histórico, los que compraron barato suelen vender para asegurar ganancias. ${isKey ? 'Es un nivel de referencia muy vigilado.' : ''}`;
    return `Este es el máximo histórico del período analizado. Superar este nivel implicaría que el precio está en territorio de máximos recientes.`;
  };

  type SC = { trigger: string; icon: string; color: string; bg: string; title: string; body: string; action: string; actionColor: string };
  const upCards: SC[] = [];
  const downCards: SC[] = [];

  // ── SUBIDA ──
  resistances.forEach((r, i) => {
    const ewNear = ewTarget && Math.abs(ewTarget - r.price) / r.price < 0.025;
    const posLabel = i === 0 ? 'primera zona a superar' : i === 1 ? 'zona intermedia' : 'zona más lejana';
    upCards.push({
      trigger: `Supera $${r.price.toFixed(2)}${ewNear ? ' — coincide con objetivo del ciclo' : ` (${posLabel})`}`,
      icon: i === 0 ? '↑' : '↑↑',
      color: isBullish ? 'var(--buy)' : 'var(--hold)',
      bg: isBullish ? 'rgba(0,230,118,0.06)' : 'rgba(255,171,0,0.05)',
      title: isBullish
        ? `Ruptura de ${r.label}${r.isKey ? ' — nivel clave' : ''}`
        : `Avance con señal técnica mixta`,
      body: isBullish
        ? `${sourceBodyRes(r.source, r.isKey)} Si supera esta zona con fuerza (no solo la roza), confirma que los compradores están dominando. ${resistances[i+1] ? `Siguiente nivel a vigilar: $${resistances[i+1].price.toFixed(2)} (${resistances[i+1].label}).` : 'No hay más referencias por encima — el movimiento puede acelerarse.'}`
        : `El precio avanza pero el análisis técnico general es bajista — puede ser un rebote temporal.`,
      action: isBullish
        ? `Si el precio cierra el día por encima de $${r.price.toFixed(2)}, puede confirmar continuidad alcista.`
        : `No actuar solo por la subida — esperar que el contexto técnico también mejore.`,
      actionColor: isBullish ? 'var(--buy)' : 'var(--hold)',
    });
  });

  // EW target (si no coincide con ninguna resistencia)
  if (ewTarget && ewTarget > currentPrice && !resistances.some(r => Math.abs(r.price - ewTarget) / ewTarget < 0.02)) {
    upCards.push({
      trigger: `Alcanza $${ewTarget.toFixed(2)} — objetivo proyectado del ciclo de ondas`,
      icon: '🎯',
      color: 'var(--accent-blue)',
      bg: 'rgba(200,169,110,0.07)',
      title: `Objetivo del ciclo alcanzado`,
      body: `Este precio es el objetivo calculado por el análisis de ciclos. Si llega aquí, el patrón se cumplió según lo proyectado.`,
      action: elliottWave.currentWave === 'Wave 5'
        ? `Zona de toma de ganancias: después de este objetivo suele venir una corrección. No conviene entrar nuevo aquí.`
        : `Observar el comportamiento al llegar. Si aparecen señales de pausa, considerar reducir exposición.`,
      actionColor: 'var(--accent-blue)',
    });
  }

  if (isOverbought) {
    upCards.push({
      trigger: `El precio sigue subiendo sin pausas ni correcciones`,
      icon: '⚡',
      color: 'var(--hold)',
      bg: 'rgba(255,171,0,0.05)',
      title: `Precaución: subida extendida sin corrección`,
      body: `El precio subió mucho en poco tiempo. Cuando esto pasa, cada zona de techo se vuelve más difícil de superar porque los que compraron barato aprovechan para vender. Las subidas fuertes sin pausa suelen terminar en una corrección o pausa.`,
      action: `Si ya tenés posición, revisá si tus objetivos fueron alcanzados. Si querés entrar, puede ser más conveniente esperar un retroceso a soporte.`,
      actionColor: 'var(--hold)',
    });
  }

  // ── BAJADA ──
  supports.forEach((s, i) => {
    const ewNear = ewInvalidation && Math.abs(ewInvalidation - s.price) / s.price < 0.025;
    const nextS = supports[i + 1];

    downCards.push({
      trigger: `Baja hasta $${s.price.toFixed(2)} y rebota`,
      icon: i === 0 ? '↘↗' : '↓↗',
      color: 'var(--buy)',
      bg: 'rgba(0,230,118,0.05)',
      title: `Rebote en ${s.label}${s.isKey ? ' — nivel clave' : ''}`,
      body: `${sourceBody(s.source, s.price, s.isKey)} Si el precio llega aquí y el día cierra hacia arriba, el nivel está aguantando. ${ewNear ? 'Coincide aproximadamente con la zona de invalidación del ciclo de ondas — doble importancia.' : ''}`,
      action: `Zona donde puede tener sentido evaluar una entrada, con stop-loss por debajo de $${s.price.toFixed(2)}. Si el precio cierra por debajo, el nivel falló.`,
      actionColor: 'var(--buy)',
    });

    downCards.push({
      trigger: `Rompe por debajo de $${s.price.toFixed(2)}`,
      icon: i === 0 ? '↓' : '↓↓',
      color: 'var(--sell)',
      bg: 'rgba(255,23,68,0.05)',
      title: `${s.label.charAt(0).toUpperCase() + s.label.slice(1)} roto — presión bajista continúa`,
      body: `Cuando este nivel cede, quienes compraron ahí tienen pérdidas y muchos venden para limitarlas — esto empuja el precio más abajo. ${nextS ? `El siguiente nivel a vigilar está en $${nextS.price.toFixed(2)} (${nextS.label}).` : 'No hay referencias cercanas por debajo — la caída puede extenderse más.'}`,
      action: `Evitar entrar nuevo hasta que el precio encuentre y confirme un nuevo soporte. Si ya tenés posición, considerar reducir para limitar pérdidas.`,
      actionColor: 'var(--sell)',
    });
  });

  // Invalidación de Elliott
  if (ewInvalidation && ewInvalidation < currentPrice && !supports.some(s => Math.abs(s.price - ewInvalidation) / ewInvalidation < 0.02)) {
    downCards.push({
      trigger: `Cae por debajo de $${ewInvalidation.toFixed(2)} — nivel de invalidación del ciclo`,
      icon: '✗',
      color: 'var(--sell)',
      bg: 'rgba(255,23,68,0.07)',
      title: `El análisis de ciclos queda invalidado`,
      body: `Por debajo de este precio, el patrón de ciclo identificado pierde validez. No significa que el precio no pueda recuperar, sino que el escenario proyectado se descarta y hay que reanalizar desde cero.`,
      action: `Señal de alerta. Los escenarios positivos del análisis de ciclos deben descartarse hasta nuevo análisis.`,
      actionColor: 'var(--sell)',
    });
  }

  if (isOversold) {
    downCards.push({
      trigger: `El precio sigue cayendo sin rebote`,
      icon: '⚡',
      color: 'var(--hold)',
      bg: 'rgba(255,171,0,0.05)',
      title: `El precio viene cayendo mucho sin pausa`,
      body: `El precio bajó mucho en poco tiempo. Cuando cae tanto sin rebote, los vendedores se van agotando y empiezan a aparecer compradores que buscan precios bajos. Esto no garantiza recuperación inmediata, pero los soportes ganan fuerza como zonas de rebote potencial.`,
      action: `No tomar decisiones apresuradas. Si el precio llega a un soporte histórico y muestra estabilización, puede ser oportunidad con riesgo controlado.`,
      actionColor: 'var(--hold)',
    });
  }

  const agreeCol = agreementCount === 3 ? 'var(--buy)' : agreementCount === 2 ? 'var(--hold)' : 'var(--text-tertiary)';
  const agreeLabel = agreementCount === 3 ? 'Alta convergencia' : agreementCount === 2 ? 'Convergencia moderada' : 'Señales contradictorias';

  return (
    <div className="terminal-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round">
          <path d="M2 20h20M6 20V10M12 20V4M18 20v-8"/>
        </svg>
        <span className="font-display text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Escenarios de precio</span>
        <span className="label-caps px-1.5 py-0.5 rounded-sm ml-1" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)', fontSize: '0.50rem' }}>
          basado en los 3 análisis
        </span>
      </div>

      {/* Conclusión narrativa */}
      <div className="px-4 py-3 rounded-lg" style={{ background: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.18)' }}>
        <div className="label-caps mb-2" style={{ color: 'var(--accent-blue)' }}>Conclusión del análisis conjunto</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{parts.join(' ')}</p>
      </div>

      {/* Escenarios si sube */}
      {upCards.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: 'rgba(0,230,118,0.25)' }} />
            <div className="label-caps px-2" style={{ color: 'var(--buy)' }}>Si el precio sube</div>
            <div className="h-px flex-1" style={{ background: 'rgba(0,230,118,0.25)' }} />
          </div>
          {upCards.map((sc, i) => <ScenarioCard key={i} {...sc} />)}
        </div>
      )}

      {/* Escenarios si baja */}
      {downCards.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: 'rgba(255,23,68,0.25)' }} />
            <div className="label-caps px-2" style={{ color: 'var(--sell)' }}>Si el precio baja</div>
            <div className="h-px flex-1" style={{ background: 'rgba(255,23,68,0.25)' }} />
          </div>
          {downCards.map((sc, i) => <ScenarioCard key={i} {...sc} />)}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
        Análisis educativo basado en métodos técnicos históricos. La efectividad combinada de estos métodos es de aproximadamente 55–65%. Los niveles de precio cambian con el tiempo — revisá periódicamente. No constituye asesoramiento financiero.
      </p>
    </div>
  );
}

// ── Fibonacci Panel ─────────────────────────────────────────────────────────
function FibRow({
  label, price, current, color, isKey, note,
}: {
  label: string; price: number; current: number; color: string; isKey: boolean; note?: string;
}) {
  const pct = (price - current) / current * 100;
  const isNear = Math.abs(pct) < 2;
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        background: isNear ? color + '10' : 'transparent',
        border: isNear ? `1px solid ${color}28` : '1px solid transparent',
      }}
    >
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          {isNear && <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
          <span className="font-data text-xs" style={{ color: isKey ? color : 'var(--text-secondary)', fontWeight: isKey ? 700 : 400 }}>
            Fib {label}
          </span>
          {isNear && <span className="label-caps" style={{ color, fontSize: '0.52rem' }}>PRECIO AQUÍ</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-data text-xs tabular-nums" style={{ color: 'var(--foreground)' }}>${price.toFixed(2)}</span>
          <span className="font-data tabular-nums" style={{ fontSize: 10, color: isNear ? color : 'var(--text-tertiary)', minWidth: 38, textAlign: 'right' }}>
            {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
          </span>
        </div>
      </div>
      {note && (
        <div className="px-3 pb-1.5">
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{note}</span>
        </div>
      )}
    </div>
  );
}

// Explanatory notes per Fibonacci level
const FIB_RESISTANCE_NOTES: Record<string, string> = {
  '23.6%': 'Primer obstáculo — corrección mínima. Si lo supera, el precio retoma fuerza.',
  '38.2%': 'Resistencia moderada — zona de decisión. Muchos inversores venden aquí para asegurar ganancias.',
  '50.0%': 'Nivel psicológico clave — mitad del movimiento. Alta probabilidad de rechazo o pausa.',
  '61.8%': 'La "razón de oro" — la resistencia más respetada en análisis técnico. Zona de alta confluencia.',
  '78.6%': 'Resistencia fuerte — si la supera, puede volver al máximo anterior.',
};

function FibonacciPanel({ fib, currentPrice }: { fib: FibonacciAnalysis; currentPrice: number }) {
  const keyRatios = [0.236, 0.382, 0.5, 0.618, 0.786];
  const supports    = fib.retracements.filter(l => keyRatios.includes(l.ratio) && l.price < currentPrice).sort((a, b) => b.price - a.price);
  const resistances = fib.retracements.filter(l => keyRatios.includes(l.ratio) && l.price > currentPrice).sort((a, b) => a.price - b.price);
  const upTargets   = fib.extensions.filter(l => l.price > currentPrice).sort((a, b) => a.price - b.price).slice(0, 3);

  const nearestSupport    = supports[0] ?? null;
  const nearestResistance = resistances[0] ?? null;
  const distToSupport    = nearestSupport    ? (currentPrice - nearestSupport.price)    / currentPrice * 100 : 100;
  const distToResistance = nearestResistance ? (nearestResistance.price - currentPrice) / currentPrice * 100 : 0;
  const rr = distToSupport > 0 ? distToResistance / distToSupport : 0;

  return (
    <div className="terminal-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <span className="font-display text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Fibonacci — Niveles Clave</span>
      </div>

      {/* Educational intro */}
      <div className="px-3 py-2.5 rounded-md" style={{ background: 'rgba(200,169,110,0.04)', border: '1px solid rgba(200,169,110,0.12)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Los <strong style={{ color: 'var(--foreground)' }}>niveles Fibonacci</strong> se calculan desde el máximo ({fib.swingHighDate}) y mínimo ({fib.swingLowDate}) de los últimos 6 meses. Son zonas donde el precio históricamente tiende a frenarse, rebotar o romper — pero <em>no predicen el futuro</em>. Efectividad histórica como soporte/resistencia: ~55–65%.
        </p>
      </div>

      {/* R/R metrics (informational only — no verdict) */}
      {nearestSupport && nearestResistance && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Soporte cercano', val: `$${nearestSupport.price.toFixed(2)}`, sub: `Fib ${nearestSupport.label} · ${distToSupport.toFixed(1)}% abajo`, color: 'var(--buy)' },
            { label: 'Ratio R/R', val: `${rr.toFixed(1)} : 1`, sub: rr >= 2 ? 'Favorable' : rr >= 1 ? 'Neutral' : 'Desfavorable', color: rr >= 2 ? 'var(--buy)' : rr >= 1 ? 'var(--hold)' : 'var(--sell)' },
            { label: 'Resistencia cercana', val: `$${nearestResistance.price.toFixed(2)}`, sub: `Fib ${nearestResistance.label} · ${distToResistance.toFixed(1)}% arriba`, color: 'var(--sell)' },
          ].map(({ label, val, sub, color }) => (
            <div key={label} className="terminal-card-raised p-3 text-center rounded-md">
              <div className="label-caps mb-1">{label}</div>
              <div className="font-data text-sm font-bold" style={{ color }}>{val}</div>
              <div className="label-caps mt-0.5" style={{ color: 'var(--text-tertiary)', fontSize: '0.55rem' }}>{sub}</div>
            </div>
          ))}
        </div>
      )}
      {nearestSupport && nearestResistance && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          El <strong style={{ color: 'var(--foreground)' }}>Ratio Riesgo/Recompensa (R/R)</strong> compara el recorrido potencial hasta la próxima resistencia contra el recorrido de riesgo hasta el próximo soporte. Valor informativo — no es una recomendación de compra o venta.
        </p>
      )}

      {/* ¿Qué es una resistencia? — inline explainer */}
      <div
        className="px-3 py-2.5 rounded-md"
        style={{ background: 'rgba(200,169,110,0.04)', border: '1px solid rgba(200,169,110,0.12)' }}
      >
        <div className="label-caps mb-1" style={{ color: 'var(--accent-blue)' }}>¿Qué es una resistencia Fibonacci?</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Una <strong style={{ color: 'var(--foreground)' }}>resistencia</strong> es un nivel de precio donde hay más vendedores que compradores — el precio tiende a frenarse o retroceder cuando llega ahí. Los niveles Fibonacci se calculan en base a los máximos y mínimos de los últimos 6 meses, y son zonas donde históricamente se concentra la actividad de trading.
        </p>
      </div>

      {/* Price position ruler */}
      <div className="space-y-1.5">
        <div className="flex justify-between label-caps">
          <span style={{ color: 'var(--text-tertiary)' }}>Mín 6m ${fib.swingLow.toFixed(2)}</span>
          <span style={{ color: 'var(--accent-blue)' }}>Precio ${currentPrice.toFixed(2)}</span>
          <span style={{ color: 'var(--text-tertiary)' }}>Máx 6m ${fib.swingHigh.toFixed(2)}</span>
        </div>
        <div className="relative h-3 rounded-sm overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
          {/* Green-to-red gradient */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,230,118,0.14) 0%, rgba(255,171,0,0.06) 50%, rgba(255,23,68,0.14) 100%)' }} />
          {[0.236, 0.382, 0.5, 0.618, 0.786].map(r => {
            const isResNear = nearestResistance && Math.abs(r - (nearestResistance.price - fib.swingLow) / (fib.swingHigh - fib.swingLow)) < 0.02;
            return (
              <div key={r} className="absolute inset-y-0 w-px" style={{ left: `${r * 100}%`, background: isResNear ? 'rgba(255,171,0,0.5)' : 'rgba(255,255,255,0.15)' }} />
            );
          })}
          {(() => {
            const range = fib.swingHigh - fib.swingLow;
            const pos = range > 0 ? Math.max(2, Math.min(97, (currentPrice - fib.swingLow) / range * 100)) : 50;
            return (
              <div
                className="absolute inset-y-0 w-2 rounded-sm"
                style={{ left: `${pos}%`, background: 'var(--accent-blue)', transform: 'translateX(-50%)' }}
              />
            );
          })()}
        </div>
        <div className="flex justify-between label-caps" style={{ opacity: 0.4, fontSize: '0.52rem' }}>
          <span>0%</span><span>23.6</span><span>38.2</span><span>50</span><span>61.8</span><span>78.6</span><span>100%</span>
        </div>
      </div>

      {/* Supports & resistances */}
      <div className="grid grid-cols-2 gap-4">
        {supports.length > 0 && (
          <div className="space-y-1">
            <div className="label-caps mb-2" style={{ color: 'var(--buy)' }}>↓ Soportes (si cae)</div>
            {supports.slice(0, 3).map(l => (
              <FibRow
                key={l.label} label={l.label} price={l.price} current={currentPrice}
                color="var(--buy)" isKey={[0.382, 0.5, 0.618].includes(l.ratio)}
              />
            ))}
          </div>
        )}
        {resistances.length > 0 && (
          <div className="space-y-1">
            <div className="label-caps mb-2" style={{ color: 'var(--sell)' }}>↑ Resistencias (si sube)</div>
            {resistances.slice(0, 3).map(l => (
              <FibRow
                key={l.label} label={l.label} price={l.price} current={currentPrice}
                color="var(--sell)" isKey={[0.236, 0.382].includes(l.ratio)}
                note={FIB_RESISTANCE_NOTES[l.label]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Extension targets */}
      {upTargets.length > 0 && (
        <div className="space-y-1" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <div className="label-caps mb-2" style={{ color: 'var(--accent-blue)' }}>→ Objetivos si supera resistencias</div>
          {upTargets.map(l => (
            <FibRow key={l.label} label={l.label} price={l.price} current={currentPrice} color="var(--accent-blue)" isKey={[1.618].includes(l.ratio)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stock detail loading ───────────────────────────────────────────────────
function StockLoading() {
  return (
    <div className="space-y-5 slide-up">
      <div className="flex justify-between">
        <div className="space-y-2"><Skel w={200} h={18} /><Skel w={280} h={48} /></div>
        <Skel w={120} h={48} />
      </div>
      <Skel w="100%" h={260} />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4"><Skel w="100%" h={220} /><Skel w="100%" h={160} /></div>
        <div className="space-y-4"><Skel w="100%" h={180} /><Skel w="100%" h={160} /></div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [ticker, setTicker] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('1mo');

  const { market: globalMarket } = useMarketData();
  const { data: quoteData, isLoading: qLoading, error: qError } = useQuote(ticker, period);
  const { data: analysis, isLoading: aLoading } = useAnalysis(ticker);
  const { data: prediction, isLoading: pLoading } = usePrediction(ticker);

  const isLoading = qLoading || aLoading;
  const hasError = qError || quoteData?.error;

  const goHome = () => setTicker(null);
  const analyze = (t: string) => { setTicker(t); setPeriod('1mo'); };

  const m = globalMarket ?? quoteData?.market;

  return (
    <div className="min-h-dvh flex flex-col" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 header-blur" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">

          {/* Top bar: logo + search */}
          <div className="flex items-center gap-3">
            {/* Logo — Syne display font */}
            <button
              onClick={goHome}
              className="flex items-center gap-2.5 shrink-0"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Volver al inicio"
            >
              {/* Cyan accent line */}
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-7 rounded-full" style={{ background: 'var(--accent-blue)' }} />
                <div className="flex flex-col leading-none">
                  <span
                    className="font-display font-bold hidden sm:block"
                    style={{ color: 'var(--foreground)', letterSpacing: '0.04em', fontSize: 17, lineHeight: 1 }}
                  >
                    STOCK
                  </span>
                  <span
                    className="font-display font-bold hidden sm:block"
                    style={{ color: 'var(--accent-blue)', letterSpacing: '0.04em', fontSize: 17, lineHeight: 1 }}
                  >
                    AI
                  </span>
                </div>
              </div>
            </button>

            {/* Search — full width */}
            <div className="flex-1">
              <StockSearch onSearch={analyze} />
            </div>
          </div>

          {/* Market ticker bar */}
          {m && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <div className="flex items-center gap-1.5 shrink-0 mr-1">
                <div className="live-dot-wrap"><div className="live-dot" /></div>
                <span className="font-data" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em', fontSize: 9, textTransform: 'uppercase' }}>EN VIVO</span>
              </div>
              {[
                { label: 'S&P 500',    val: m.spyChange },
                { label: 'NASDAQ',     val: m.qqqChange },
                { label: 'DOW',        val: m.diaChange },
                { label: 'RUSSELL 2K', val: m.iwmChange },
              ].map(({ label, val }) => (
                <MarketPill key={label} label={label} val={val} color={val >= 0 ? 'var(--buy)' : 'var(--sell)'} />
              ))}
              {/* VIX */}
              <div className="market-pill" style={{ borderLeftColor: m.vix > 30 ? 'var(--sell)' : m.vix < 15 ? 'var(--buy)' : 'var(--hold)' }}>
                <span className="font-data" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>VIX</span>
                <span className="font-data font-bold tabular-nums" style={{ fontSize: 11, color: m.vix > 30 ? 'var(--sell)' : m.vix < 15 ? 'var(--buy)' : 'var(--hold)' }}>
                  {m.vix.toFixed(1)}
                </span>
              </div>
              {/* Regime */}
              <div
                className="market-pill"
                style={{
                  borderLeftColor: m.regime === 'BULL' ? 'var(--buy)' : m.regime === 'BEAR' ? 'var(--sell)' : 'var(--hold)',
                }}
              >
                <span className="font-data font-bold" style={{
                  fontSize: 10, letterSpacing: '0.06em',
                  color: m.regime === 'BULL' ? 'var(--buy)' : m.regime === 'BEAR' ? 'var(--sell)' : 'var(--hold)',
                }}>
                  {m.regime === 'BULL' ? '▲ ALCISTA' : m.regime === 'BEAR' ? '▼ BAJISTA' : '— NEUTRAL'}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">

        {/* ── Home view (default) ──────────────────────────────────────── */}
        {!ticker ? (
          <div className="space-y-8">

            {/* Hero heading */}
            <div>
              <h1
                className="font-display font-extrabold"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  letterSpacing: '-0.03em',
                  color: 'var(--foreground)',
                  lineHeight: 1.05,
                }}
              >
                MERCADO<br />
                <span style={{ color: 'var(--accent-blue)' }}>EN VIVO</span>
              </h1>
              <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Datos actualizados cada 30s · Clic en una acción para análisis técnico completo
              </p>
            </div>

            {/* Signals section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-base" style={{ color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                  Señales del mercado hoy
                </h2>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <div className="live-dot-wrap"><div className="live-dot" /></div>
              </div>
              <SignalsPanel onSelect={analyze} />
            </div>

            {/* Watchlist section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-base" style={{ color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
                  Explorar por sector
                </h2>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <WatchlistPanel onSelect={analyze} />
            </div>
            <AffiliateCard />
          </div>

        ) : (

          /* ── Stock detail view ──────────────────────────────────────── */
          <div className="space-y-5">

            {/* Back button */}
            <button
              onClick={goHome}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                minHeight: 44,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(200,169,110,0.4)';
                e.currentTarget.style.color = 'var(--foreground)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              <span className="font-medium">Volver al mercado</span>
            </button>

            {/* Loading / error / content */}
            {isLoading ? (
              <StockLoading />
            ) : hasError ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.3)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sell)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div>
                  <div className="font-display font-bold text-lg" style={{ color: 'var(--foreground)' }}>Ticker no encontrado</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    No se encontró <strong>{ticker}</strong>. Verificá que sea un símbolo válido.
                  </div>
                </div>
                <button
                  onClick={goHome}
                  className="px-4 py-2 rounded-md text-sm font-medium"
                  style={{ background: 'var(--accent-blue)', color: '#060608', cursor: 'pointer', minHeight: 44 }}
                >
                  Volver al mercado
                </button>
              </div>
            ) : quoteData && analysis ? (
              <div className="space-y-5 slide-up">

                {/* Stock header row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="ticker-badge">{ticker}</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{quoteData.quote.name}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="live-dot-wrap"><div className="live-dot" /></div>
                        <span className="font-data text-xs" style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>30S</span>
                      </div>
                    </div>
                    <StockHeader quote={quoteData.quote} />
                  </div>
                </div>

                {/* Chart */}
                <div className="terminal-card p-4 space-y-3">
                  <div className="flex items-center gap-1.5">
                    {PERIODS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setPeriod(key)}
                        className="font-data text-xs px-3 py-1.5 rounded-sm transition-all"
                        style={{
                          background: period === key ? 'var(--accent-blue)' : 'var(--surface-raised)',
                          color: period === key ? '#060608' : 'var(--text-secondary)',
                          border: `1px solid ${period === key ? 'transparent' : 'var(--border)'}`,
                          fontWeight: period === key ? 700 : 400,
                          cursor: 'pointer',
                          minHeight: 32,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <span className="ml-auto label-caps" style={{ opacity: 0.35 }}>MA20 · MA50 · MA200</span>
                  </div>
                  <PriceChart
                    candles={quoteData.chart}
                    ma20={period !== '1d' ? analysis.ma20 : undefined}
                    ma50={period !== '1d' && period !== '5d' ? analysis.ma50 : undefined}
                    ma200={period === '1y' ? analysis.ma200 : undefined}
                  />
                </div>

                {/* Combined verdict banner — single conclusion for the whole page */}
                <CombinedVerdictBanner
                  analysis={analysis}
                  market={quoteData.market}
                  currentPrice={quoteData.quote.price}
                  prediction={prediction ?? undefined}
                />

                {/* Content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Left: analysis + prediction + risks */}
                  <div className="lg:col-span-2 space-y-4">
                    <AnalysisGrid analysis={analysis} />
                    <ElliottWavePanel wave={analysis.elliottWave} />
                    <FibonacciPanel fib={analysis.fibonacci} currentPrice={quoteData.quote.price} />

                    {/* ── Accuracy disclaimer ── */}
                    <div
                      className="px-4 py-3 rounded-lg"
                      style={{ background: 'rgba(255,171,0,0.05)', border: '1px solid rgba(255,171,0,0.20)' }}
                    >
                      <div className="flex items-start gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--hold)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div className="space-y-1">
                          <div className="label-caps" style={{ color: 'var(--hold)' }}>Precisión real de los métodos utilizados</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <strong style={{ color: 'var(--foreground)' }}>Fibonacci:</strong> ~55–65% de efectividad histórica como soporte/resistencia en acciones del S&P500.{' '}
                            <strong style={{ color: 'var(--foreground)' }}>RSI / Medias móviles:</strong> ~55–60% individualmente; combinados mejoran ligeramente.{' '}
                            <strong style={{ color: 'var(--foreground)' }}>Ondas de Elliott:</strong> altamente subjetivo — no existen estudios académicos que confirmen su efectividad predictiva sistemática.{' '}
                            Este análisis es <strong style={{ color: 'var(--foreground)' }}>educativo e informativo únicamente</strong> — no constituye asesoramiento financiero.
                          </div>
                        </div>
                      </div>
                    </div>

                    {pLoading ? (
                      <div className="terminal-card p-5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
                          <span className="font-data text-sm" style={{ color: 'var(--text-secondary)' }}>Calculando predicción...</span>
                        </div>
                        <Skel w="75%" h={14} /><Skel w="50%" h={14} />
                      </div>
                    ) : prediction && !('error' in prediction) ? (
                      <DualPredictionPanel
                        fib={analysis.fibonacci}
                        prediction={prediction}
                        currentPrice={quoteData.quote.price}
                      />
                    ) : (
                      <div className="terminal-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(255,171,0,0.2)' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--hold)" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Predicción IA no disponible · Configurá <code className="font-data" style={{ color: 'var(--hold)' }}>ANTHROPIC_API_KEY</code> en <code className="font-data">.env.local</code>
                        </span>
                      </div>
                    )}

                    <InterpretationPanel analysis={analysis} currentPrice={quoteData.quote.price} />
                    <AffiliateCard ticker={ticker ?? undefined} signal={computeCombinedSignal(analysis).signal} />
                    <RiskFlags risks={analysis.risks} />
                  </div>

                  {/* Right: market + indicators */}
                  <div className="space-y-4">
                    <MarketOverview market={quoteData.market} />

                    {/* Indicators card */}
                    <div className="terminal-card p-4 space-y-4">
                      <span className="font-display text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        Indicadores técnicos
                      </span>

                      {/* Moving averages */}
                      <div className="space-y-2.5" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                        {[
                          { label: 'MA 20',  val: analysis.ma20,  color: '#fbbf24' },
                          { label: 'MA 50',  val: analysis.ma50,  color: 'var(--accent-purple)' },
                          { label: 'MA 200', val: analysis.ma200, color: 'var(--accent-blue)' },
                        ].map(({ label, val, color }) => {
                          const above = quoteData.quote.price >= val;
                          const pct = val > 0 ? ((quoteData.quote.price - val) / val) * 100 : 0;
                          return (
                            <div key={label} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-px" style={{ background: color, opacity: 0.8 }} />
                                <span className="label-caps">{label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-data text-xs tabular-nums" style={{ color: 'var(--foreground)' }}>
                                  {val > 0 ? `$${val.toFixed(2)}` : '—'}
                                </span>
                                <span className="font-data text-xs font-bold tabular-nums" style={{ color: above ? 'var(--buy)' : 'var(--sell)', minWidth: 48, textAlign: 'right' }}>
                                  {val > 0 ? `${above ? '+' : ''}${pct.toFixed(1)}%` : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* RSI */}
                      <div className="space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                        <div className="flex justify-between items-center">
                          <span className="label-caps">RSI (14)</span>
                          <div className="flex items-center gap-2">
                            <span
                              className="font-data text-sm font-bold tabular-nums"
                              style={{ color: analysis.rsi > 70 ? 'var(--sell)' : analysis.rsi < 30 ? 'var(--buy)' : 'var(--foreground)' }}
                            >
                              {analysis.rsi.toFixed(1)}
                            </span>
                            {analysis.rsi > 70 && <span className="label-caps" style={{ color: 'var(--sell)' }}>SOBRECOMPRADO</span>}
                            {analysis.rsi < 30 && <span className="label-caps" style={{ color: 'var(--buy)' }}>SOBREVENDIDO</span>}
                          </div>
                        </div>
                        <div className="relative h-1.5 rounded-sm" style={{ background: 'var(--surface-raised)' }}>
                          <div
                            className="h-full rounded-sm transition-all duration-700"
                            style={{ width: `${analysis.rsi}%`, background: analysis.rsi > 70 ? 'var(--sell)' : analysis.rsi < 30 ? 'var(--buy)' : 'var(--hold)' }}
                          />
                          <div className="absolute inset-y-0 w-px" style={{ left: '30%', background: 'rgba(255,255,255,0.12)' }} />
                          <div className="absolute inset-y-0 w-px" style={{ left: '70%', background: 'rgba(255,255,255,0.12)' }} />
                        </div>
                        <div className="flex justify-between label-caps" style={{ opacity: 0.35 }}>
                          <span>Sobrevendido</span><span>Neutral</span><span>Sobrecomprado</span>
                        </div>
                      </div>

                      {/* Volume ratio */}
                      <div className="flex justify-between items-center pt-1">
                        <span className="label-caps">Volumen / Promedio</span>
                        <span className="font-data text-sm font-bold" style={{ color: analysis.volumeRatio > 1.5 ? 'var(--buy)' : 'var(--foreground)' }}>
                          {analysis.volumeRatio.toFixed(1)}×
                        </span>
                      </div>
                    </div>

                    <div className="label-caps text-center" style={{ opacity: 0.25 }}>
                      Precio ↻ 30s · Análisis ↻ 60s
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
        <p className="font-data text-xs" style={{ letterSpacing: '0.08em' }}>
          Solo fines educativos · No es asesoramiento financiero · Datos via Yahoo Finance
        </p>
      </footer>
    </div>
  );
}
