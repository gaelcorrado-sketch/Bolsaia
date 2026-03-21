import useSWR from 'swr';
import type { Quote, ChartCandle, MarketContext, StockAnalysis, AIPrediction } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Period = '1d' | '5d' | '1mo' | '3mo' | '1y';

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

export function usePrediction(ticker: string | null) {
  const { data, error, isLoading } = useSWR<AIPrediction>(
    ticker ? `/api/predict/${ticker}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000, // cache AI predictions for 5 minutes
    }
  );
  return { data, error, isLoading };
}
