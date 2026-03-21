import type {
  StockAnalysis,
  AnalysisDimension,
  Signal,
  Confidence,
  ChartCandle,
  Quote,
  MarketContext,
} from './types';

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  let gains = 0;
  let losses = 0;
  changes.slice(-period).forEach((c) => {
    if (c > 0) gains += c;
    else losses += Math.abs(c);
  });
  const rs = gains / (losses || 0.001);
  return 100 - 100 / (1 + rs);
}

function sma(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const slice = data.slice(-Math.min(period, data.length));
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
  const closes = candles.map((c) => c.close).filter((v) => v > 0);
  const volumes = candles.map((c) => c.volume).filter((v) => v > 0);

  const rsi = calcRSI(closes);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const price = quote.price;
  const avgVol = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 1;
  const volumeRatio = quote.volume / (avgVol || 1);

  const high52 = quote.high52w || Math.max(...closes);
  const low52 = quote.low52w || Math.min(...closes);
  const priceVsHigh52w = high52 > 0 ? ((price - high52) / high52) * 100 : 0;
  const priceVsLow52w = low52 > 0 ? ((price - low52) / low52) * 100 : 0;

  // Momentum dimension (RSI + price vs MAs)
  const momentumScore = (() => {
    let s = 50;
    if (rsi < 30) s += 20; // oversold = bullish signal
    else if (rsi > 70) s -= 20; // overbought = bearish
    else if (rsi < 45) s += 10;
    else if (rsi > 60) s -= 5;
    if (price > ma20) s += 10;
    if (price > ma50) s += 10;
    if (price > ma200) s += 10;
    return Math.max(0, Math.min(100, s));
  })();

  // Volume dimension
  const volumeScore = (() => {
    let s = 50;
    if (volumeRatio > 1.5 && quote.change > 0) s += 20;
    else if (volumeRatio > 1.5 && quote.change < 0) s -= 20;
    else if (volumeRatio > 1.2) s += 10;
    if (volumeRatio < 0.5) s -= 10;
    return Math.max(0, Math.min(100, s));
  })();

  // 52-week range dimension
  const rangeScore = (() => {
    const range = high52 - low52;
    const pos = range > 0 ? (price - low52) / range : 0.5;
    if (pos < 0.15) return 30; // near 52w low — risk
    if (pos > 0.9) return 35; // near 52w high — limited upside
    if (pos > 0.4 && pos < 0.75) return 70; // sweet spot
    return 55;
  })();

  // Market context dimension
  const marketScore = (() => {
    let s = 50;
    if (market.regime === 'BULL') s += 15;
    else if (market.regime === 'BEAR') s -= 20;
    if (market.vix > 30) s -= 10;
    else if (market.vix < 15) s += 5;
    if (market.spyChange > 0.5) s += 5;
    else if (market.spyChange < -1) s -= 10;
    return Math.max(0, Math.min(100, s));
  })();

  // Trend alignment dimension
  const trendScore = (() => {
    const aboveMa20 = price > ma20 ? 1 : 0;
    const aboveMa50 = price > ma50 ? 1 : 0;
    const aboveMa200 = price > ma200 ? 1 : 0;
    const maUptrend = ma20 > ma50 ? 1 : 0;
    const goldenCross = ma50 > ma200 ? 1 : 0;
    return (aboveMa20 + aboveMa50 + aboveMa200 + maUptrend + goldenCross) * 18 + 10;
  })();

  const dimensions: AnalysisDimension[] = [
    {
      name: 'Momentum (RSI)',
      score: momentumScore,
      weight: 0.25,
      signal: scoreToSignal(momentumScore),
      notes: `RSI: ${rsi.toFixed(1)}`,
    },
    {
      name: 'Volume Pressure',
      score: volumeScore,
      weight: 0.15,
      signal: scoreToSignal(volumeScore),
      notes: `${volumeRatio.toFixed(1)}x avg vol`,
    },
    {
      name: '52W Position',
      score: rangeScore,
      weight: 0.15,
      signal: scoreToSignal(rangeScore),
      notes: `${priceVsLow52w.toFixed(1)}% above low`,
    },
    {
      name: 'Market Context',
      score: marketScore,
      weight: 0.20,
      signal: scoreToSignal(marketScore),
      notes: `VIX ${market.vix.toFixed(1)} · ${market.regime}`,
    },
    {
      name: 'Trend Alignment',
      score: trendScore,
      weight: 0.25,
      signal: scoreToSignal(trendScore),
      notes: `MA20/50/200`,
    },
  ];

  const weightedScore = dimensions.reduce((acc, d) => acc + d.score * d.weight, 0);

  const risks: string[] = [];
  if (rsi > 70) risks.push('Sobrecomprado — RSI > 70, posible corrección');
  if (rsi < 30) risks.push('Sobrevendido — RSI < 30, rebote o caída adicional');
  if (market.vix > 30) risks.push('VIX elevado — mercado en modo de miedo extremo');
  if (market.regime === 'BEAR') risks.push('Mercado bajista — sesgo vendedor general');
  if (priceVsHigh52w > -3) risks.push('Cerca del máximo de 52 semanas — upside limitado');
  if (volumeRatio < 0.5) risks.push('Volumen bajo — poca convicción en el movimiento');
  if (price < ma200) risks.push('Precio bajo la MA200 — tendencia de largo plazo bajista');
  if (ma20 < ma50) risks.push('MA20 bajo MA50 — cruce bajista activo');

  const signal = scoreToSignal(weightedScore);
  const confidence: Confidence =
    weightedScore > 72 || weightedScore < 28
      ? 'HIGH'
      : weightedScore > 62 || weightedScore < 38
        ? 'MEDIUM'
        : 'LOW';

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
