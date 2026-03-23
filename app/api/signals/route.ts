import { NextResponse } from 'next/server';
import { getQuote, getChartData, getMarketContext } from '@/lib/yahoo-finance';
import { analyzeStock } from '@/lib/analysis-engine';
import { ALL_TICKERS } from '@/lib/stockNames';
import type { Quote, ChartCandle } from '@/lib/types';
import type { WatchlistItem } from '@/app/api/watchlist/route';

export interface SignalItem extends WatchlistItem {
  compositeScore: number;
}

export interface SignalsResponse {
  buy:  SignalItem[];
  hold: SignalItem[];
  sell: SignalItem[];
}

function scoreToSignal(score: number): 'BUY' | 'HOLD' | 'SELL' {
  if (score >= 60) return 'BUY';
  if (score <= 40) return 'SELL';
  return 'HOLD';
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const BATCH = 20;

type Pair = { quote: Quote; candles: ChartCandle[] };

export async function GET() {
  const tickers = ALL_TICKERS.map((t) => t.ticker);

  // Fetch market context once — shared across all tickers
  const market = await getMarketContext().catch(() => ({
    vix: 20,
    spyChange: 0,
    qqqChange: 0,
    diaChange: 0,
    iwmChange: 0,
    regime: 'NEUTRAL' as const,
  }));

  // Fetch quote + 3mo chart per ticker in parallel batches of 20
  // 3mo gives ~63 daily bars → enough for RSI(14), MA20, MA50
  const batches = chunk(tickers, BATCH);

  const batchResults = await Promise.allSettled(
    batches.map(async (batch) => {
      const results = await Promise.allSettled(
        batch.map(async (ticker): Promise<Pair> => {
          const [quote, candles] = await Promise.all([
            getQuote(ticker),
            getChartData(ticker, '3mo'),
          ]);
          return { quote, candles };
        })
      );
      return results
        .filter((r): r is PromiseFulfilledResult<Pair> => r.status === 'fulfilled')
        .map((r) => r.value);
    })
  );

  const all: SignalItem[] = batchResults
    .filter((r): r is PromiseFulfilledResult<Pair[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter(({ quote }) => quote.price > 0)
    .map(({ quote, candles }) => {
      // Use the same analyzeStock() as the full detail view — signals are consistent
      const analysis = analyzeStock(quote, candles, market);
      return {
        ticker:        quote.ticker,
        name:          quote.name,
        price:         quote.price,
        change:        quote.change,
        changePercent: quote.changePercent,
        volume:        quote.volume,
        marketCap:     quote.marketCap,
        high52w:       quote.high52w,
        low52w:        quote.low52w,
        compositeScore: analysis.score,
      } satisfies SignalItem;
    });

  const buy  = all.filter((i) => scoreToSignal(i.compositeScore) === 'BUY' ).sort((a, b) => b.compositeScore - a.compositeScore);
  const sell = all.filter((i) => scoreToSignal(i.compositeScore) === 'SELL').sort((a, b) => a.compositeScore - b.compositeScore);
  const hold = all.filter((i) => scoreToSignal(i.compositeScore) === 'HOLD').sort((a, b) => b.compositeScore - a.compositeScore);

  return NextResponse.json({ buy, hold, sell } satisfies SignalsResponse, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  });
}
