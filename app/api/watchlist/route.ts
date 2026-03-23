import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

interface YFQuote {
  symbol: string;
  longName?: string | null;
  shortName?: string | null;
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  regularMarketVolume?: number | null;
  marketCap?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high52w: number;
  low52w: number;
}

export async function GET(request: NextRequest) {
  const tickersParam = request.nextUrl.searchParams.get('tickers');
  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers param required' }, { status: 400 });
  }
  const tickers = tickersParam.split(',').slice(0, 20); // cap at 20

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const raw = (await yf.quote(ticker.trim())) as unknown as YFQuote;
      return {
        ticker: raw.symbol ?? ticker,
        name: raw.longName ?? raw.shortName ?? ticker,
        price: raw.regularMarketPrice ?? 0,
        change: raw.regularMarketChange ?? 0,
        changePercent: raw.regularMarketChangePercent ?? 0,
        volume: raw.regularMarketVolume ?? 0,
        marketCap: raw.marketCap ?? 0,
        high52w: raw.fiftyTwoWeekHigh ?? 0,
        low52w: raw.fiftyTwoWeekLow ?? 0,
      } satisfies WatchlistItem;
    })
  );

  const items = results
    .filter((r): r is PromiseFulfilledResult<WatchlistItem> => r.status === 'fulfilled')
    .map((r) => r.value);

  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
