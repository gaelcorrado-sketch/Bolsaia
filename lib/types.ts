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
  volumeRatio: number;
  priceVsHigh52w: number;
  priceVsLow52w: number;
  risks: string[];
}

export interface AIPrediction {
  ticker: string;
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  targetLow: number;
  targetHigh: number;
  targetDays: number;
  probability: number;
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
