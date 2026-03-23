import useSWR from 'swr';
import type { Quote, ChartCandle, MarketContext, StockAnalysis, AIPrediction } from '@/lib/types';
import type { WatchlistItem } from '@/app/api/watchlist/route';
import type { SignalsResponse, SignalItem } from '@/app/api/signals/route';
export type { SignalItem };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Period = '1d' | '5d' | '1mo' | '3mo' | '1y';

// Always-on market data — runs independently of any stock search
export function useMarketData() {
  const { data, error } = useSWR<MarketContext>(
    '/api/market',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
  return { market: data, marketError: error };
}

export interface QuoteResponse {
  quote: Quote;
  chart: ChartCandle[];
  market: MarketContext;
  error?: string;
}

export function useQuote(ticker: string | null, period: Period = '1mo') {
  const { data, error, isLoading } = useSWR<QuoteResponse>(
    ticker ? `/api/quote/${ticker}?period=${period}` : null,
    fetcher,
    { refreshInterval: 30_000 } // refresh every 30s during market hours
  );
  return { data, error, isLoading };
}

export function useAnalysis(ticker: string | null) {
  const { data, error, isLoading } = useSWR<StockAnalysis>(
    ticker ? `/api/analysis/${ticker}` : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
  return { data, error, isLoading };
}

/** Live watchlist: batch quotes for a category, refreshes every 30s */
export function useWatchlist(tickers: string[]) {
  const key = tickers.length > 0 ? `/api/watchlist?tickers=${tickers.join(',')}` : null;
  const { data, error, isLoading } = useSWR<WatchlistItem[]>(key, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });
  return { items: data ?? [], error, isLoading };
}

/** All-tickers signal grouping — refreshes every 60s */
export function useSignals() {
  const { data, error, isLoading } = useSWR<SignalsResponse>(
    '/api/signals',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );
  return {
    buy:  data?.buy  ?? [],
    hold: data?.hold ?? [],
    sell: data?.sell ?? [],
    isLoading,
    error,
  };
}

export function usePrediction(ticker: string | null) {
  const { data, error, isLoading } = useSWR<AIPrediction>(
    ticker ? `/api/predict/${ticker}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000, // cache AI predictions for 5 minutes
      refreshInterval: 300_000,  // auto-refresh every 5 min
    }
  );
  return { data, error, isLoading };
}
