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
  const intervalMap: Record<string, '5m' | '15m' | '1d' | '1wk'> = {
    '1d': '5m',
    '5d': '15m',
    '1mo': '1d',
    '3mo': '1d',
    '1y': '1wk',
  };
  const result = await yahooFinance.chart(ticker, {
    period1: getPeriodStart(period),
    interval: intervalMap[period] ?? '1d',
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
    '1d': 1,
    '5d': 5,
    '1mo': 30,
    '3mo': 90,
    '1y': 365,
  };
  const days = map[period] ?? 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
