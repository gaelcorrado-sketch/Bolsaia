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
  fibonacci: FibonacciAnalysis;
  elliottWave: ElliottWaveAnalysis;
  fundamentals?: Fundamentals | null;
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
  isAI?: boolean;            // true = Claude-generated, false/undefined = rule-based
  reliabilityScore?: number; // 0-100: confiabilidad del análisis de factores
}

export interface FibonacciLevel {
  ratio: number;      // e.g. 0.382
  label: string;      // e.g. "38.2%"
  price: number;      // actual price at this level
  type: 'retracement' | 'extension';
  isSupport: boolean; // true = support, false = resistance
  proximity: number;  // % distance from current price (absolute)
  isNear: boolean;    // within 1.5% of current price
}

export interface FibonacciAnalysis {
  swingHigh: number;
  swingLow: number;
  swingHighDate: string;
  swingLowDate: string;
  trend: 'UP' | 'DOWN';
  retracements: FibonacciLevel[];
  extensions: FibonacciLevel[];
  nearestSupport: FibonacciLevel | null;
  nearestResistance: FibonacciLevel | null;
  signal: 'BUY' | 'HOLD' | 'SELL';
  notes: string;
  reliabilityScore: number; // 0-100: qué tan confiable es la señal Fibonacci actual
}

export type ElliottWavePhase = 'IMPULSE' | 'CORRECTIVE' | 'UNKNOWN';
export type ElliottWavePosition =
  | 'Wave 1' | 'Wave 2' | 'Wave 3' | 'Wave 4' | 'Wave 5'
  | 'Wave A' | 'Wave B' | 'Wave C' | 'Unknown';

export interface ElliottWaveAnalysis {
  phase: ElliottWavePhase;
  currentWave: ElliottWavePosition;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  pivots: Array<{ date: string; price: number; type: 'HIGH' | 'LOW' }>;
  signal: 'BUY' | 'HOLD' | 'SELL';
  targetPrice: number | null;   // projected end of current wave
  invalidationPrice: number | null; // level that invalidates the count
  notes: string;
}

export interface MarketContext {
  vix: number;
  spyChange: number;
  qqqChange: number;
  diaChange: number;
  iwmChange: number;
  regime: 'BULL' | 'BEAR' | 'NEUTRAL';
}

export interface PortfolioEntry {
  ticker: string;
  quantity: number;
  avgCost: number;
}

export interface Fundamentals {
  // Analyst consensus
  recommendationMean: number | null;   // 1.0 (Strong Buy) – 5.0 (Strong Sell)
  numberOfAnalysts: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  // Valuation
  trailingPE: number | null;
  forwardPE: number | null;
  // Growth & profitability
  revenueGrowth: number | null;        // YoY, e.g. 0.12 = 12%
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  // Risk
  beta: number | null;
  totalDebtToEquity: number | null;
}
