import YahooFinance from 'yahoo-finance2';
import type { Quote, ChartCandle, MarketContext, Fundamentals } from './types';

// v3 requires instantiation
const yf = new YahooFinance();

interface YFQuote {
  symbol: string;
  longName?: string | null;
  shortName?: string | null;
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  regularMarketVolume?: number | null;
  averageDailyVolume3Month?: number | null;
  marketCap?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  regularMarketPreviousClose?: number | null;
}

export async function getQuote(ticker: string): Promise<Quote> {
  const result = (await yf.quote(ticker)) as unknown as YFQuote;
  return {
    ticker: result.symbol ?? ticker,
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

interface YFChartQuote {
  date: Date | string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
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
    '1y': '1d',   // daily candles — gives ~252 pts, needed for Elliott Wave (was weekly = ~52 pts)
  };
  const result = await yf.chart(ticker, {
    period1: getPeriodStart(period),
    interval: intervalMap[period] ?? '1d',
  });
  const quotes = (result.quotes ?? []) as YFChartQuote[];
  return quotes
    .filter((q) => q.close != null && q.close > 0)
    .map((q) => ({
      date: new Date(q.date).toISOString(),
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      close: q.close ?? 0,
      volume: q.volume ?? 0,
    }));
}

export async function getMarketContext(): Promise<MarketContext> {
  const [vixData, spyData, qqqData, diaData, iwmData] = await Promise.all([
    yf.quote('^VIX') as unknown as Promise<YFQuote>,
    yf.quote('SPY') as unknown as Promise<YFQuote>,
    yf.quote('QQQ') as unknown as Promise<YFQuote>,
    yf.quote('DIA') as unknown as Promise<YFQuote>,
    yf.quote('IWM') as unknown as Promise<YFQuote>,
  ]);
  const vix = vixData.regularMarketPrice ?? 20;
  return {
    vix,
    spyChange: spyData.regularMarketChangePercent ?? 0,
    qqqChange: qqqData.regularMarketChangePercent ?? 0,
    diaChange: diaData.regularMarketChangePercent ?? 0,
    iwmChange: iwmData.regularMarketChangePercent ?? 0,
    regime: vix > 30 ? 'BEAR' : vix < 15 ? 'BULL' : 'NEUTRAL',
  };
}

export async function getFundamentals(ticker: string): Promise<Fundamentals | null> {
  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ['financialData', 'summaryDetail', 'defaultKeyStatistics'],
    }) as unknown as Record<string, Record<string, number | null | undefined>>;

    const fd = summary.financialData ?? {};
    const sd = summary.summaryDetail ?? {};

    return {
      recommendationMean: (fd.recommendationMean as number | null) ?? null,
      numberOfAnalysts:   (fd.numberOfAnalystOpinions as number | null) ?? null,
      targetMeanPrice:    (fd.targetMeanPrice as number | null) ?? null,
      targetHighPrice:    (fd.targetHighPrice as number | null) ?? null,
      targetLowPrice:     (fd.targetLowPrice as number | null) ?? null,
      trailingPE:         (sd.trailingPE as number | null) ?? null,
      forwardPE:          (sd.forwardPE as number | null) ?? null,
      revenueGrowth:      (fd.revenueGrowth as number | null) ?? null,
      grossMargins:       (fd.grossMargins as number | null) ?? null,
      operatingMargins:   (fd.operatingMargins as number | null) ?? null,
      profitMargins:      (fd.profitMargins as number | null) ?? null,
      beta:               (sd.beta as number | null) ?? null,
      totalDebtToEquity:  (fd.debtToEquity as number | null) ?? null,
    };
  } catch {
    return null;
  }
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
