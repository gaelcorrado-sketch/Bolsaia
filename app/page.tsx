'use client';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StockSearch } from '@/components/StockSearch';
import { StockHeader } from '@/components/StockHeader';
import { PriceChart } from '@/components/PriceChart';
import { SignalBadge } from '@/components/SignalBadge';
import { AnalysisGrid } from '@/components/AnalysisGrid';
import { PredictionPanel } from '@/components/PredictionPanel';
import { MarketOverview } from '@/components/MarketOverview';
import { RiskFlags } from '@/components/RiskFlags';
import { useQuote, useAnalysis, usePrediction } from '@/hooks/useStock';

type Period = '1d' | '5d' | '1mo' | '3mo' | '1y';

const PERIOD_LABELS: Record<Period, string> = {
  '1d': '1D',
  '5d': '5D',
  '1mo': '1M',
  '3mo': '3M',
  '1y': '1A',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between">
        <Skeleton className="h-20 w-64" />
        <Skeleton className="h-12 w-32" />
      </div>
      <Skeleton className="h-[300px] w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-72" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [ticker, setTicker] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('1mo');

  const { data: quoteData, isLoading: quoteLoading, error: quoteError } = useQuote(ticker, period);
  const { data: analysis, isLoading: analysisLoading } = useAnalysis(ticker);
  const { data: prediction, isLoading: predLoading } = usePrediction(ticker);

  const isLoading = quoteLoading || analysisLoading;
  const hasError = quoteError || quoteData?.error;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xl">📈</span>
              <span className="font-bold text-lg hidden sm:inline">StockAI</span>
            </div>
            <div className="flex-1">
              <StockSearch onSearch={(t) => { setTicker(t); setPeriod('1mo'); }} />
            </div>
          </div>
          {/* Market bar */}
          {quoteData?.market && (
            <div className="flex items-center gap-4 text-xs overflow-x-auto pb-0.5">
              <span className="text-muted-foreground shrink-0">Mercado:</span>
              <span
                className={`font-medium shrink-0 ${quoteData.market.spyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
              >
                SPY {quoteData.market.spyChange >= 0 ? '+' : ''}
                {quoteData.market.spyChange.toFixed(2)}%
              </span>
              <span
                className={`font-medium shrink-0 ${quoteData.market.qqqChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
              >
                QQQ {quoteData.market.qqqChange >= 0 ? '+' : ''}
                {quoteData.market.qqqChange.toFixed(2)}%
              </span>
              <span className="text-muted-foreground shrink-0">
                VIX{' '}
                <span
                  className={
                    quoteData.market.vix > 30
                      ? 'text-red-500 font-medium'
                      : quoteData.market.vix < 15
                        ? 'text-emerald-500 font-medium'
                        : 'text-amber-500 font-medium'
                  }
                >
                  {quoteData.market.vix.toFixed(1)}
                </span>
              </span>
              <span
                className={`font-medium shrink-0 ${
                  quoteData.market.regime === 'BULL'
                    ? 'text-emerald-500'
                    : quoteData.market.regime === 'BEAR'
                      ? 'text-red-500'
                      : 'text-amber-500'
                }`}
              >
                {quoteData.market.regime === 'BULL'
                  ? '🐂 Alcista'
                  : quoteData.market.regime === 'BEAR'
                    ? '🐻 Bajista'
                    : '⚖️ Neutral'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {!ticker ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-6">
            <div className="text-7xl">📊</div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold">StockAI</h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                Análisis técnico completo + predicciones de IA para cualquier acción o criptomoneda
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm max-w-2xl w-full mt-4">
              {[
                { icon: '📉', title: 'Señales', desc: 'BUY / HOLD / SELL con score 0-100' },
                { icon: '🤖', title: 'IA Predictiva', desc: 'Claude analiza 30 días de movimiento' },
                { icon: '⚡', title: 'Tiempo Real', desc: 'Datos de Yahoo Finance + VIX + SPY' },
              ].map((f) => (
                <div key={f.title} className="bg-muted/50 rounded-xl p-4 text-left">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-muted-foreground text-xs mt-1">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3 text-center">
            <div className="text-5xl">❌</div>
            <p className="text-lg font-medium">No se encontró &quot;{ticker}&quot;</p>
            <p className="text-muted-foreground text-sm">
              Verificá que sea un ticker válido (ej: AAPL, MSFT, BTC-USD)
            </p>
          </div>
        ) : quoteData && analysis ? (
          <div className="space-y-6">
            {/* Stock header row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-bold font-mono">{ticker}</h2>
                  <span className="text-muted-foreground text-lg">{quoteData.quote.name}</span>
                </div>
                <StockHeader quote={quoteData.quote} />
              </div>
              <div className="sm:text-right">
                <SignalBadge signal={analysis.signal} confidence={analysis.confidence} />
              </div>
            </div>

            {/* Period selector + chart */}
            <div className="space-y-2">
              <div className="flex gap-1.5 items-center">
                <span className="text-xs text-muted-foreground mr-1">Período:</span>
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-mono font-medium transition-colors ${
                      period === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70 text-muted-foreground'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
              <div className="border rounded-xl p-4 bg-card">
                <PriceChart
                  candles={quoteData.chart}
                  ma20={period !== '1d' ? analysis.ma20 : undefined}
                  ma50={period !== '1d' && period !== '5d' ? analysis.ma50 : undefined}
                  ma200={period === '1y' ? analysis.ma200 : undefined}
                />
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: analysis + prediction + risks */}
              <div className="lg:col-span-2 space-y-4">
                <AnalysisGrid analysis={analysis} />

                {predLoading ? (
                  <div className="border rounded-xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="animate-spin">⟳</span>
                      <span>Claude está analizando y generando predicción...</span>
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : prediction && !('error' in prediction) ? (
                  <PredictionPanel
                    prediction={prediction}
                    currentPrice={quoteData.quote.price}
                  />
                ) : (
                  <div className="border rounded-xl p-4 text-sm text-muted-foreground">
                    No se pudo generar predicción. Verificá que ANTHROPIC_API_KEY esté configurada.
                  </div>
                )}

                <RiskFlags risks={analysis.risks} />
              </div>

              {/* Right: market + MA table */}
              <div className="space-y-4">
                <MarketOverview market={quoteData.market} />

                {/* Moving averages card */}
                <div className="border rounded-xl p-4 space-y-3 bg-card">
                  <h3 className="text-sm font-semibold">Medias Móviles</h3>
                  {[
                    { label: 'MA 20', value: analysis.ma20, color: '#f59e0b' },
                    { label: 'MA 50', value: analysis.ma50, color: '#8b5cf6' },
                    { label: 'MA 200', value: analysis.ma200, color: '#3b82f6' },
                  ].map(({ label, value, color }) => {
                    const above = quoteData.quote.price >= value;
                    const pct =
                      value > 0
                        ? ((quoteData.quote.price - value) / value) * 100
                        : 0;
                    return (
                      <div key={label} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-0.5 rounded"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-muted-foreground font-mono">{label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="font-mono">${value.toFixed(2)}</span>
                          <span
                            className={`text-xs font-medium ${above ? 'text-emerald-500' : 'text-red-500'}`}
                          >
                            {above ? '+' : ''}
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">RSI (14)</span>
                      <span
                        className={`font-mono font-bold ${
                          analysis.rsi > 70
                            ? 'text-red-500'
                            : analysis.rsi < 30
                              ? 'text-emerald-500'
                              : 'text-foreground'
                        }`}
                      >
                        {analysis.rsi.toFixed(1)}
                        {analysis.rsi > 70
                          ? ' ⚠ SC'
                          : analysis.rsi < 30
                            ? ' ⚠ SV'
                            : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-muted-foreground">Vol/Avg</span>
                      <span
                        className={`font-mono font-bold ${
                          analysis.volumeRatio > 1.5 ? 'text-emerald-500' : 'text-foreground'
                        }`}
                      >
                        {analysis.volumeRatio.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto-refresh info */}
                <p className="text-xs text-muted-foreground text-center">
                  Datos se actualizan cada 30s · Predicción IA cada 5min
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        ⚠️ No es asesoramiento financiero · Solo con fines educativos · Yahoo Finance + Claude AI
      </footer>
    </div>
  );
}
