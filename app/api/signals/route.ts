import { NextResponse } from 'next/server';
import { getQuote, getChartData, getMarketContext, getFundamentals } from '@/lib/yahoo-finance';
import { analyzeStock } from '@/lib/analysis-engine';
import { computeCombinedSignal } from '@/lib/signal-utils';
import { ALL_TICKERS } from '@/lib/stockNames';
import type { Quote, ChartCandle, Signal } from '@/lib/types';
import type { WatchlistItem } from '@/app/api/watchlist/route';

export interface SignalItem extends WatchlistItem {
  compositeScore: number;
}

export interface SignalsResponse {
  buy:  SignalItem[];
  hold: SignalItem[];
  sell: SignalItem[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const BATCH = 20;

type AnalysisData = { quote: Quote; candles: ChartCandle[]; fundamentals: Awaited<ReturnType<typeof getFundamentals>> };

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

  // Fetch quote + 1y chart + fundamentals per ticker in parallel batches of 20
  // 1y gives ~252 daily bars — same as /api/analysis/[ticker] → consistent signals
  const batches = chunk(tickers, BATCH);

  const batchResults = await Promise.allSettled(
    batches.map(async (batch) => {
      const results = await Promise.allSettled(
        batch.map(async (ticker): Promise<AnalysisData> => {
          const [quote, candles, fundamentals] = await Promise.all([
            getQuote(ticker),
            getChartData(ticker, '1y'),
            getFundamentals(ticker),
          ]);
          return { quote, candles, fundamentals };
        })
      );
      return results
        .filter((r): r is PromiseFulfilledResult<AnalysisData> => r.status === 'fulfilled')
        .map((r) => r.value);
    })
  );

  type AllItem = SignalItem & { _signal: Signal };

  const all: AllItem[] = batchResults
    .filter((r): r is PromiseFulfilledResult<AnalysisData[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter(({ quote }) => quote.price > 0)
    .map(({ quote, candles, fundamentals }) => {
      // Same inputs as /api/analysis/[ticker] → signals always match the detail page
      const analysis = analyzeStock(quote, candles, market, fundamentals);
      const { veto } = computeCombinedSignal(analysis, market);
      const signal = veto.finalSignal;
      return {
        ticker:         quote.ticker,
        name:           quote.name,
        price:          quote.price,
        change:         quote.change,
        changePercent:  quote.changePercent,
        volume:         quote.volume,
        marketCap:      quote.marketCap,
        high52w:        quote.high52w,
        low52w:         quote.low52w,
        compositeScore: analysis.score,
        _signal:        signal,
      };
    });

  // Strip internal _signal field before returning
  const toItem = ({ _signal: _, ...item }: AllItem): SignalItem => item;

  const buy  = all.filter((i) => i._signal === 'BUY' ).sort((a, b) => b.compositeScore - a.compositeScore).map(toItem);
  const sell = all.filter((i) => i._signal === 'SELL').sort((a, b) => a.compositeScore - b.compositeScore).map(toItem);
  const hold = all.filter((i) => i._signal === 'HOLD').sort((a, b) => b.compositeScore - a.compositeScore).map(toItem);

  return NextResponse.json({ buy, hold, sell } satisfies SignalsResponse, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  });
}
