# Stock Analysis Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured stock analysis web dashboard with real-time data, technical analysis, AI-powered predictions, and portfolio tracking.

**Architecture:** Next.js 15 App Router with TypeScript. API routes fetch financial data via `yahoo-finance2` (Node.js). Claude AI via Vercel AI SDK generates predictions and trading signals. Client uses SWR for polling + Recharts for interactive charts.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts, yahoo-finance2, Vercel AI SDK, Claude claude-sonnet-4-6, SWR, Zod

---

## File Map

```
stock-dashboard/
├── app/
│   ├── layout.tsx                      # Root layout, fonts, providers
│   ├── page.tsx                        # Main dashboard page
│   ├── globals.css                     # Tailwind base + custom vars
│   └── api/
│       ├── quote/[ticker]/route.ts     # Real-time quote + chart data
│       ├── analysis/[ticker]/route.ts  # Full technical analysis
│       └── predict/[ticker]/route.ts   # Claude AI prediction (streaming)
├── components/
│   ├── StockSearch.tsx                 # Ticker search input
│   ├── StockHeader.tsx                 # Price, change, market cap header
│   ├── PriceChart.tsx                  # Recharts candlestick/line chart
│   ├── SignalBadge.tsx                 # BUY/HOLD/SELL colored badge
│   ├── AnalysisGrid.tsx                # 8-dimension score grid
│   ├── PredictionPanel.tsx             # Claude AI prediction display
│   ├── MarketOverview.tsx              # VIX, SPY, QQQ sidebar
│   ├── RiskFlags.tsx                   # Caveats and warnings
│   └── Portfolio.tsx                   # Portfolio P&L tracker
├── lib/
│   ├── yahoo-finance.ts                # yahoo-finance2 wrappers
│   ├── analysis-engine.ts             # Technical analysis logic (RSI, MA, signals)
│   ├── claude-predictor.ts             # Vercel AI SDK streaming call
│   └── types.ts                        # Shared TypeScript types
└── hooks/
    └── useStock.ts                     # SWR hooks for all API routes
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Init Next.js project**

```bash
cd /Users/gaelcorrado/Desktop/stock-dashboard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install yahoo-finance2 ai @ai-sdk/anthropic recharts swr zod
npx shadcn@latest init --yes --defaults
npx shadcn@latest add card badge button input skeleton tabs separator scroll-area
```

- [ ] **Step 3: Set env vars**

Create `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: bootstrap Next.js stock dashboard"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write types**

```typescript
// lib/types.ts
export interface Quote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  high52w: number;
  low52w: number;
  previousClose: number;
}

export interface ChartCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Signal = 'BUY' | 'HOLD' | 'SELL';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AnalysisDimension {
  name: string;
  score: number; // 0-100
  weight: number;
  signal: Signal;
  notes: string;
}

export interface StockAnalysis {
  ticker: string;
  signal: Signal;
  confidence: Confidence;
  score: number; // weighted 0-100
  dimensions: AnalysisDimension[];
  rsi: number;
  ma20: number;
  ma50: number;
  ma200: number;
  volumeRatio: number; // current / avg
  priceVsHigh52w: number; // percent from 52w high
  priceVsLow52w: number;  // percent above 52w low
  risks: string[];
}

export interface AIPrediction {
  ticker: string;
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  targetLow: number;
  targetHigh: number;
  targetDays: number;
  probability: number; // 0-100
  reasoning: string;
  keyFactors: string[];
  risks: string[];
}

export interface MarketContext {
  vix: number;
  spyChange: number;
  qqqChange: number;
  regime: 'BULL' | 'BEAR' | 'NEUTRAL';
}

export interface PortfolioEntry {
  ticker: string;
  quantity: number;
  avgCost: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts && git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Yahoo Finance API Wrapper

**Files:**
- Create: `lib/yahoo-finance.ts`
- Create: `app/api/quote/[ticker]/route.ts`

- [ ] **Step 1: Write Yahoo Finance wrapper**

```typescript
// lib/yahoo-finance.ts
import yahooFinance from 'yahoo-finance2';
import type { Quote, ChartCandle, MarketContext } from './types';

export async function getQuote(ticker: string): Promise<Quote> {
  const result = await yahooFinance.quote(ticker);
  return {
    ticker: result.symbol,
    name: result.longName ?? result.shortName ?? ticker,
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    volume: result.regularMarketVolume ?? 0,
    avgVolume: result.averageDailyVolume3Month ?? 0,
    marketCap: result.marketCap ?? 0,
    high52w: result.fiftyTwoWeekHigh ?? 0,
    low52w: result.fiftyTwoWeekLow ?? 0,
    previousClose: result.regularMarketPreviousClose ?? 0,
  };
}

export async function getChartData(
  ticker: string,
  period: '1d' | '5d' | '1mo' | '3mo' | '1y' = '1mo'
): Promise<ChartCandle[]> {
  const intervalMap = {
    '1d': '5m' as const,
    '5d': '15m' as const,
    '1mo': '1d' as const,
    '3mo': '1d' as const,
    '1y': '1wk' as const,
  };
  const result = await yahooFinance.chart(ticker, {
    period1: getPeriodStart(period),
    interval: intervalMap[period],
  });
  return (result.quotes ?? []).map((q) => ({
    date: new Date(q.date).toISOString(),
    open: q.open ?? 0,
    high: q.high ?? 0,
    low: q.low ?? 0,
    close: q.close ?? 0,
    volume: q.volume ?? 0,
  }));
}

export async function getMarketContext(): Promise<MarketContext> {
  const [vixData, spyData, qqqData] = await Promise.all([
    yahooFinance.quote('^VIX'),
    yahooFinance.quote('SPY'),
    yahooFinance.quote('QQQ'),
  ]);
  const vix = vixData.regularMarketPrice ?? 20;
  return {
    vix,
    spyChange: spyData.regularMarketChangePercent ?? 0,
    qqqChange: qqqData.regularMarketChangePercent ?? 0,
    regime: vix > 30 ? 'BEAR' : vix < 15 ? 'BULL' : 'NEUTRAL',
  };
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  const map: Record<string, number> = {
    '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '1y': 365,
  };
  const days = map[period] ?? 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
```

- [ ] **Step 2: Write quote API route**

```typescript
// app/api/quote/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getChartData, getMarketContext } from '@/lib/yahoo-finance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const period = (request.nextUrl.searchParams.get('period') ?? '1mo') as '1d'|'5d'|'1mo'|'3mo'|'1y';
  try {
    const [quote, chart, market] = await Promise.all([
      getQuote(ticker.toUpperCase()),
      getChartData(ticker.toUpperCase(), period),
      getMarketContext(),
    ]);
    return NextResponse.json({ quote, chart, market });
  } catch (e) {
    return NextResponse.json({ error: `Could not fetch ${ticker}` }, { status: 404 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/yahoo-finance.ts app/api/quote/ && git commit -m "feat: add Yahoo Finance API wrapper and quote route"
```

---

## Task 4: Analysis Engine

**Files:**
- Create: `lib/analysis-engine.ts`
- Create: `app/api/analysis/[ticker]/route.ts`

- [ ] **Step 1: Write analysis engine**

```typescript
// lib/analysis-engine.ts
import type { StockAnalysis, AnalysisDimension, Signal, Confidence, ChartCandle, Quote, MarketContext } from './types';

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  let gains = 0, losses = 0;
  changes.slice(-period).forEach((c) => {
    if (c > 0) gains += c; else losses += Math.abs(c);
  });
  const rs = gains / (losses || 0.001);
  return 100 - 100 / (1 + rs);
}

function sma(data: number[], period: number): number {
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function scoreToSignal(score: number): Signal {
  if (score >= 60) return 'BUY';
  if (score <= 40) return 'SELL';
  return 'HOLD';
}

export function analyzeStock(
  quote: Quote,
  candles: ChartCandle[],
  market: MarketContext
): StockAnalysis {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const rsi = calcRSI(closes);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const price = quote.price;
  const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const volumeRatio = quote.volume / (avgVol || 1);
  const priceVsHigh52w = ((price - quote.high52w) / quote.high52w) * 100;
  const priceVsLow52w = ((price - quote.low52w) / quote.low52w) * 100;

  // Momentum dimension (RSI + price vs MAs)
  const momentumScore = (() => {
    let s = 50;
    if (rsi < 30) s += 20; // oversold = bullish
    else if (rsi > 70) s -= 20; // overbought = bearish
    if (price > ma20) s += 10;
    if (price > ma50) s += 10;
    if (price > ma200) s += 10;
    return Math.max(0, Math.min(100, s));
  })();

  // Volume dimension
  const volumeScore = (() => {
    let s = 50;
    if (volumeRatio > 1.5 && quote.change > 0) s += 20;
    if (volumeRatio > 1.5 && quote.change < 0) s -= 20;
    if (volumeRatio < 0.5) s -= 10; // low conviction
    return Math.max(0, Math.min(100, s));
  })();

  // 52-week range dimension
  const rangeScore = (() => {
    const pos = (price - quote.low52w) / ((quote.high52w - quote.low52w) || 1);
    // Sweet spot: 20-70% of range (not near top, not collapsing)
    if (pos < 0.2) return 35;
    if (pos > 0.85) return 40;
    return 65;
  })();

  // Market context dimension
  const marketScore = (() => {
    let s = 50;
    if (market.regime === 'BULL') s += 15;
    if (market.regime === 'BEAR') s -= 20;
    if (market.vix > 30) s -= 10;
    if (market.spyChange > 0.5) s += 5;
    if (market.spyChange < -1) s -= 10;
    return Math.max(0, Math.min(100, s));
  })();

  // Trend alignment dimension
  const trendScore = (() => {
    const aboveMa20 = price > ma20 ? 1 : 0;
    const aboveMa50 = price > ma50 ? 1 : 0;
    const aboveMa200 = price > ma200 ? 1 : 0;
    const maUptrend = ma20 > ma50 ? 1 : 0;
    return (aboveMa20 + aboveMa50 + aboveMa200 + maUptrend) * 20 + 10;
  })();

  const dimensions: AnalysisDimension[] = [
    { name: 'Momentum (RSI)', score: momentumScore, weight: 0.25, signal: scoreToSignal(momentumScore), notes: `RSI: ${rsi.toFixed(1)}` },
    { name: 'Volume', score: volumeScore, weight: 0.15, signal: scoreToSignal(volumeScore), notes: `${volumeRatio.toFixed(1)}x avg` },
    { name: '52W Position', score: rangeScore, weight: 0.15, signal: scoreToSignal(rangeScore), notes: `${priceVsLow52w.toFixed(1)}% above low` },
    { name: 'Market Context', score: marketScore, weight: 0.20, signal: scoreToSignal(marketScore), notes: `VIX: ${market.vix.toFixed(1)}` },
    { name: 'Trend Alignment', score: trendScore, weight: 0.25, signal: scoreToSignal(trendScore), notes: `MA20/50/200` },
  ];

  const weightedScore = dimensions.reduce((acc, d) => acc + d.score * d.weight, 0);

  const risks: string[] = [];
  if (rsi > 70) risks.push('Overbought — RSI > 70');
  if (rsi < 30) risks.push('Oversold — potential bounce or further drop');
  if (market.vix > 30) risks.push('High VIX — elevated market fear');
  if (market.regime === 'BEAR') risks.push('Bear market conditions');
  if (priceVsHigh52w > -5) risks.push('Near 52-week high — limited upside');
  if (volumeRatio < 0.5) risks.push('Low volume — weak conviction');

  const signal = scoreToSignal(weightedScore);
  const confidence: Confidence =
    weightedScore > 70 || weightedScore < 30 ? 'HIGH' :
    weightedScore > 60 || weightedScore < 40 ? 'MEDIUM' : 'LOW';

  return {
    ticker: quote.ticker,
    signal,
    confidence,
    score: Math.round(weightedScore),
    dimensions,
    rsi,
    ma20,
    ma50,
    ma200,
    volumeRatio,
    priceVsHigh52w,
    priceVsLow52w,
    risks,
  };
}
```

- [ ] **Step 2: Write analysis API route**

```typescript
// app/api/analysis/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getChartData, getMarketContext } from '@/lib/yahoo-finance';
import { analyzeStock } from '@/lib/analysis-engine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  try {
    const [quote, candles, market] = await Promise.all([
      getQuote(ticker.toUpperCase()),
      getChartData(ticker.toUpperCase(), '1y'),
      getMarketContext(),
    ]);
    const analysis = analyzeStock(quote, candles, market);
    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json({ error: `Analysis failed for ${ticker}` }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/analysis-engine.ts app/api/analysis/ && git commit -m "feat: add technical analysis engine and API route"
```

---

## Task 5: Claude AI Prediction Route

**Files:**
- Create: `lib/claude-predictor.ts`
- Create: `app/api/predict/[ticker]/route.ts`

- [ ] **Step 1: Write Claude predictor**

```typescript
// lib/claude-predictor.ts
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { StockAnalysis, Quote, MarketContext, AIPrediction } from './types';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PredictionSchema = z.object({
  direction: z.enum(['UP', 'DOWN', 'SIDEWAYS']),
  targetLow: z.number(),
  targetHigh: z.number(),
  targetDays: z.number(),
  probability: z.number().min(0).max(100),
  reasoning: z.string(),
  keyFactors: z.array(z.string()),
  risks: z.array(z.string()),
});

export async function generatePrediction(
  quote: Quote,
  analysis: StockAnalysis,
  market: MarketContext
): Promise<AIPrediction> {
  const prompt = `You are a quantitative analyst. Analyze this stock and provide a 30-day price prediction.

Stock: ${quote.ticker} (${quote.name})
Current Price: $${quote.price.toFixed(2)}
Today's Change: ${quote.changePercent.toFixed(2)}%
52W High: $${quote.high52w} | 52W Low: $${quote.low52w}
Volume vs Avg: ${analysis.volumeRatio.toFixed(1)}x

Technical Signal: ${analysis.signal} (score: ${analysis.score}/100, confidence: ${analysis.confidence})
RSI: ${analysis.rsi.toFixed(1)}
MA20: $${analysis.ma20.toFixed(2)} | MA50: $${analysis.ma50.toFixed(2)} | MA200: $${analysis.ma200.toFixed(2)}

Dimensions:
${analysis.dimensions.map(d => `- ${d.name}: ${d.score}/100 (${d.signal}) — ${d.notes}`).join('\n')}

Market Context:
- VIX: ${market.vix.toFixed(1)} (${market.regime} regime)
- SPY today: ${market.spyChange.toFixed(2)}%
- QQQ today: ${market.qqqChange.toFixed(2)}%

Risk Flags: ${analysis.risks.join('; ') || 'None'}

Provide a 30-day price prediction with:
1. direction (UP/DOWN/SIDEWAYS)
2. targetLow and targetHigh price range (realistic, based on volatility)
3. probability (0-100) of the direction being correct
4. reasoning (2-3 sentences)
5. keyFactors (3-4 bullet points driving the prediction)
6. risks (2-3 main risks to the prediction)

IMPORTANT: This is for educational analysis only. Be realistic and balanced.`;

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: PredictionSchema,
    prompt,
  });

  return { ticker: quote.ticker, ...object };
}
```

- [ ] **Step 2: Write predict API route**

```typescript
// app/api/predict/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getMarketContext } from '@/lib/yahoo-finance';
import { getChartData } from '@/lib/yahoo-finance';
import { analyzeStock } from '@/lib/analysis-engine';
import { generatePrediction } from '@/lib/claude-predictor';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  try {
    const [quote, candles, market] = await Promise.all([
      getQuote(ticker.toUpperCase()),
      getChartData(ticker.toUpperCase(), '1y'),
      getMarketContext(),
    ]);
    const analysis = analyzeStock(quote, candles, market);
    const prediction = await generatePrediction(quote, analysis, market);
    return NextResponse.json(prediction);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/claude-predictor.ts app/api/predict/ && git commit -m "feat: add Claude AI prediction engine"
```

---

## Task 6: SWR Hooks

**Files:**
- Create: `hooks/useStock.ts`

- [ ] **Step 1: Write hooks**

```typescript
// hooks/useStock.ts
import useSWR from 'swr';
import type { Quote, ChartCandle, MarketContext, StockAnalysis, AIPrediction } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Period = '1d' | '5d' | '1mo' | '3mo' | '1y';

interface QuoteResponse {
  quote: Quote;
  chart: ChartCandle[];
  market: MarketContext;
}

export function useQuote(ticker: string | null, period: Period = '1mo') {
  const { data, error, isLoading } = useSWR<QuoteResponse>(
    ticker ? `/api/quote/${ticker}?period=${period}` : null,
    fetcher,
    { refreshInterval: 30000 } // refresh every 30s
  );
  return { data, error, isLoading };
}

export function useAnalysis(ticker: string | null) {
  const { data, error, isLoading } = useSWR<StockAnalysis>(
    ticker ? `/api/analysis/${ticker}` : null,
    fetcher,
    { refreshInterval: 60000 }
  );
  return { data, error, isLoading };
}

export function usePrediction(ticker: string | null) {
  const { data, error, isLoading } = useSWR<AIPrediction>(
    ticker ? `/api/predict/${ticker}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 } // cache 5min
  );
  return { data, error, isLoading };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useStock.ts && git commit -m "feat: add SWR data-fetching hooks"
```

---

## Task 7: UI Components

**Files:**
- Create: `components/SignalBadge.tsx`
- Create: `components/StockHeader.tsx`
- Create: `components/PriceChart.tsx`
- Create: `components/AnalysisGrid.tsx`
- Create: `components/PredictionPanel.tsx`
- Create: `components/MarketOverview.tsx`
- Create: `components/RiskFlags.tsx`
- Create: `components/StockSearch.tsx`

- [ ] **Step 1: SignalBadge**

```tsx
// components/SignalBadge.tsx
import { Badge } from '@/components/ui/badge';
import type { Signal, Confidence } from '@/lib/types';

const colors: Record<Signal, string> = {
  BUY: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  HOLD: 'bg-amber-500 hover:bg-amber-600 text-white',
  SELL: 'bg-red-500 hover:bg-red-600 text-white',
};

export function SignalBadge({ signal, confidence }: { signal: Signal; confidence?: Confidence }) {
  return (
    <div className="flex items-center gap-2">
      <Badge className={`text-lg font-bold px-4 py-1 ${colors[signal]}`}>{signal}</Badge>
      {confidence && (
        <span className="text-sm text-muted-foreground">
          {confidence} confidence
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: StockHeader**

```tsx
// components/StockHeader.tsx
import type { Quote } from '@/lib/types';

function fmt(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

export function StockHeader({ quote }: { quote: Quote }) {
  const positive = quote.change >= 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold">${quote.price.toFixed(2)}</span>
        <span className={`text-2xl font-semibold ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
          {positive ? '+' : ''}{quote.change.toFixed(2)} ({positive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
        </span>
      </div>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>Market Cap: {fmt(quote.marketCap)}</span>
        <span>Vol: {(quote.volume / 1e6).toFixed(1)}M</span>
        <span>52W: ${quote.low52w.toFixed(2)} – ${quote.high52w.toFixed(2)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: PriceChart**

```tsx
// components/PriceChart.tsx
'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { ChartCandle } from '@/lib/types';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
      <p className="text-muted-foreground mb-1">{new Date(label).toLocaleDateString()}</p>
      <p className="font-semibold">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export function PriceChart({ candles, ma20, ma50 }: { candles: ChartCandle[]; ma20?: number; ma50?: number }) {
  const data = candles.map(c => ({
    date: c.date,
    close: c.close,
  }));

  const prices = data.map(d => d.close);
  const min = Math.min(...prices) * 0.99;
  const max = Math.max(...prices) * 1.01;
  const first = prices[0];
  const isPositive = (prices[prices.length - 1] ?? 0) >= first;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={50}
        />
        <YAxis
          domain={[min, max]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        {ma20 && <ReferenceLine y={ma20} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'MA20', fontSize: 10, fill: '#f59e0b' }} />}
        {ma50 && <ReferenceLine y={ma50} stroke="#8b5cf6" strokeDasharray="3 3" label={{ value: 'MA50', fontSize: 10, fill: '#8b5cf6' }} />}
        <Line
          type="monotone"
          dataKey="close"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: AnalysisGrid**

```tsx
// components/AnalysisGrid.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StockAnalysis } from '@/lib/types';

const signalColor = { BUY: 'text-emerald-500', HOLD: 'text-amber-500', SELL: 'text-red-500' };
const barColor = { BUY: 'bg-emerald-500', HOLD: 'bg-amber-500', SELL: 'bg-red-500' };

export function AnalysisGrid({ analysis }: { analysis: StockAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Technical Analysis — {analysis.dimensions.length} Dimensions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis.dimensions.map((d) => (
          <div key={d.name} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{d.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">{d.notes}</span>
                <span className={`font-bold text-xs ${signalColor[d.signal]}`}>{d.signal}</span>
                <span className="font-mono text-xs w-8 text-right">{d.score}</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor[d.signal]} transition-all duration-500`}
                style={{ width: `${d.score}%` }}
              />
            </div>
          </div>
        ))}
        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm font-semibold">
            <span>Overall Score</span>
            <span>{analysis.score}/100</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${analysis.score}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: PredictionPanel**

```tsx
// components/PredictionPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AIPrediction } from '@/lib/types';

const dirColor = { UP: 'text-emerald-500', DOWN: 'text-red-500', SIDEWAYS: 'text-amber-500' };
const dirIcon = { UP: '↑', DOWN: '↓', SIDEWAYS: '→' };

export function PredictionPanel({ prediction, currentPrice }: { prediction: AIPrediction; currentPrice: number }) {
  const targetMid = (prediction.targetLow + prediction.targetHigh) / 2;
  const upside = ((targetMid - currentPrice) / currentPrice * 100).toFixed(1);

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>🤖 Claude AI Prediction — 30 days</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <span className={`text-4xl font-bold ${dirColor[prediction.direction]}`}>
            {dirIcon[prediction.direction]} {prediction.direction}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Probability</p>
            <p className="text-2xl font-bold">{prediction.probability}%</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Target Low</p>
            <p className="font-bold">${prediction.targetLow.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Target Mid</p>
            <p className="font-bold text-blue-600">${targetMid.toFixed(2)}</p>
            <p className={`text-xs ${parseFloat(upside) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {parseFloat(upside) >= 0 ? '+' : ''}{upside}%
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Target High</p>
            <p className="font-bold">${prediction.targetHigh.toFixed(2)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Reasoning</p>
          <p className="text-sm text-muted-foreground">{prediction.reasoning}</p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Key Factors</p>
          <ul className="space-y-1">
            {prediction.keyFactors.map((f, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-blue-500">•</span>{f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground border-t pt-2">
          ⚠️ Not financial advice. AI-generated predictions are educational only.
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: MarketOverview**

```tsx
// components/MarketOverview.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MarketContext } from '@/lib/types';

const regimeColor = { BULL: 'text-emerald-500', BEAR: 'text-red-500', NEUTRAL: 'text-amber-500' };

export function MarketOverview({ market }: { market: MarketContext }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Market Context</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Regime</span>
          <span className={`text-sm font-bold ${regimeColor[market.regime]}`}>{market.regime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">VIX (Fear)</span>
          <span className={`text-sm font-bold ${market.vix > 25 ? 'text-red-500' : market.vix < 15 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {market.vix.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">SPY</span>
          <span className={`text-sm font-bold ${market.spyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {market.spyChange >= 0 ? '+' : ''}{market.spyChange.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">QQQ</span>
          <span className={`text-sm font-bold ${market.qqqChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {market.qqqChange >= 0 ? '+' : ''}{market.qqqChange.toFixed(2)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: RiskFlags**

```tsx
// components/RiskFlags.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RiskFlags({ risks }: { risks: string[] }) {
  if (!risks.length) return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-emerald-500 font-medium">✓ No major risk flags detected</p>
      </CardContent>
    </Card>
  );
  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader><CardTitle className="text-base text-amber-600">⚠️ Risk Flags</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {risks.map((r, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-amber-500">•</span>{r}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8: StockSearch**

```tsx
// components/StockSearch.tsx
'use client';
import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const POPULAR = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BTC-USD', 'ETH-USD'];

export function StockSearch({ onSearch }: { onSearch: (ticker: string) => void }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim().toUpperCase());
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter ticker (e.g. AAPL, BTC-USD)"
          className="font-mono uppercase"
        />
        <Button type="submit" disabled={!value.trim()}>Analyze</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {POPULAR.map(t => (
          <button
            key={t}
            onClick={() => { setValue(t); onSearch(t); }}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 font-mono transition-colors"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Commit all components**

```bash
git add components/ && git commit -m "feat: add all UI components"
```

---

## Task 8: Main Dashboard Page

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write layout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stock Analysis Dashboard',
  description: 'AI-powered stock analysis and predictions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write main page**

```tsx
// app/page.tsx
'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-[300px] w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [ticker, setTicker] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('1mo');

  const { data: quoteData, isLoading: quoteLoading } = useQuote(ticker, period);
  const { data: analysis, isLoading: analysisLoading } = useAnalysis(ticker);
  const { data: prediction, isLoading: predLoading } = usePrediction(ticker);

  const isLoading = quoteLoading || analysisLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-xl font-bold">StockAI</h1>
          </div>
          <div className="flex-1 max-w-xl">
            <StockSearch onSearch={setTicker} />
          </div>
          {quoteData?.market && (
            <div className="hidden lg:flex items-center gap-4 text-sm">
              <span className={quoteData.market.spyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                SPY {quoteData.market.spyChange >= 0 ? '+' : ''}{quoteData.market.spyChange.toFixed(2)}%
              </span>
              <span className={quoteData.market.qqqChange >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                QQQ {quoteData.market.qqqChange >= 0 ? '+' : ''}{quoteData.market.qqqChange.toFixed(2)}%
              </span>
              <span className="text-muted-foreground">VIX {quoteData.market.vix.toFixed(1)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!ticker ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <span className="text-6xl">📊</span>
            <h2 className="text-3xl font-bold">Stock Analysis Dashboard</h2>
            <p className="text-muted-foreground max-w-md">
              Enter any ticker above to get real-time analysis, technical signals, and AI-powered predictions.
            </p>
            <div className="text-sm text-muted-foreground">Powered by Yahoo Finance + Claude AI</div>
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : quoteData && analysis ? (
          <div className="space-y-6">
            {/* Stock Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{ticker}</h2>
                  <span className="text-muted-foreground">{quoteData.quote.name}</span>
                </div>
                <StockHeader quote={quoteData.quote} />
              </div>
              <SignalBadge signal={analysis.signal} confidence={analysis.confidence} />
            </div>

            {/* Chart with period selector */}
            <div className="space-y-2">
              <div className="flex gap-2">
                {(['1d', '5d', '1mo', '3mo', '1y'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`text-xs px-3 py-1 rounded font-mono transition-colors ${
                      period === p ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <PriceChart
                candles={quoteData.chart}
                ma20={analysis.ma20}
                ma50={analysis.ma50}
              />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column — analysis + prediction */}
              <div className="lg:col-span-2 space-y-4">
                <AnalysisGrid analysis={analysis} />
                {predLoading ? (
                  <Skeleton className="h-64" />
                ) : prediction ? (
                  <PredictionPanel prediction={prediction} currentPrice={quoteData.quote.price} />
                ) : null}
                <RiskFlags risks={analysis.risks} />
              </div>

              {/* Right column — market context + MA table */}
              <div className="space-y-4">
                <MarketOverview market={quoteData.market} />
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Moving Averages</h3>
                  {[
                    { label: 'MA 20', value: analysis.ma20, color: '#f59e0b' },
                    { label: 'MA 50', value: analysis.ma50, color: '#8b5cf6' },
                    { label: 'MA 200', value: analysis.ma200, color: '#3b82f6' },
                  ].map(({ label, value, color }) => {
                    const aboveMA = quoteData.quote.price > value;
                    return (
                      <div key={label} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5" style={{ backgroundColor: color }} />
                          <span className="text-muted-foreground">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">${value.toFixed(2)}</span>
                          <span className={aboveMA ? 'text-emerald-500 text-xs' : 'text-red-500 text-xs'}>
                            {aboveMA ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">RSI (14)</span>
                    <span className={`font-mono font-bold ${analysis.rsi > 70 ? 'text-red-500' : analysis.rsi < 30 ? 'text-emerald-500' : 'text-foreground'}`}>
                      {analysis.rsi.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            Could not find ticker "{ticker}". Try a valid US stock symbol.
          </div>
        )}
      </main>

      <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
        ⚠️ Not financial advice. For educational purposes only. Data from Yahoo Finance, predictions from Claude AI.
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/ && git commit -m "feat: add main dashboard page"
```

---

## Task 9: Run & Verify

- [ ] **Step 1: Add ANTHROPIC_API_KEY to .env.local**

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test the app**

Open http://localhost:3000 — search AAPL, verify:
- Price loads
- Chart renders
- Analysis grid shows scores
- AI prediction loads (takes ~5s)
- Risk flags display

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat: complete stock analysis dashboard v1.0"
```
