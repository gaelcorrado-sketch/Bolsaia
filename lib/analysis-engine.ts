import type {
  StockAnalysis,
  AnalysisDimension,
  Signal,
  Confidence,
  ChartCandle,
  Quote,
  MarketContext,
  FibonacciAnalysis,
  FibonacciLevel,
  ElliottWaveAnalysis,
  ElliottWavePosition,
  Fundamentals,
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

// ── Pivot detection ──────────────────────────────────────────────────────────
function findPivots(
  candles: ChartCandle[],
  lookback = 5
): Array<{ date: string; price: number; type: 'HIGH' | 'LOW'; idx: number }> {
  const pivots: Array<{ date: string; price: number; type: 'HIGH' | 'LOW'; idx: number }> = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const highs = slice.map((c) => c.high);
    const lows  = slice.map((c) => c.low);
    const maxH = Math.max(...highs);
    const minL = Math.min(...lows);
    if (candles[i].high === maxH) {
      pivots.push({ date: candles[i].date, price: candles[i].high, type: 'HIGH', idx: i });
    } else if (candles[i].low === minL) {
      pivots.push({ date: candles[i].date, price: candles[i].low, type: 'LOW', idx: i });
    }
  }
  // Deduplicate consecutive same-type pivots, keeping the extreme
  const deduped: typeof pivots = [];
  for (const p of pivots) {
    const last = deduped[deduped.length - 1];
    if (!last || last.type !== p.type) {
      deduped.push(p);
    } else if (p.type === 'HIGH' && p.price > last.price) {
      deduped[deduped.length - 1] = p;
    } else if (p.type === 'LOW' && p.price < last.price) {
      deduped[deduped.length - 1] = p;
    }
  }
  return deduped;
}

// ── Fibonacci Analysis ────────────────────────────────────────────────────────
const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_EXT_RATIOS = [1.272, 1.618, 2.0, 2.618];

export function calcFibonacci(candles: ChartCandle[], currentPrice: number): FibonacciAnalysis {
  if (candles.length < 20) {
    return {
      swingHigh: currentPrice, swingLow: currentPrice,
      swingHighDate: '', swingLowDate: '',
      trend: 'UP', retracements: [], extensions: [],
      nearestSupport: null, nearestResistance: null,
      signal: 'HOLD', notes: 'Datos insuficientes para análisis Fibonacci',
      reliabilityScore: 10,
    };
  }

  // Use last 6 months of data (≈126 trading days)
  const window = candles.slice(-Math.min(candles.length, 126));
  let highIdx = 0, lowIdx = 0;
  for (let i = 0; i < window.length; i++) {
    if (window[i].high > window[highIdx].high) highIdx = i;
    if (window[i].low < window[lowIdx].low)   lowIdx = i;
  }

  const swingHigh = window[highIdx].high;
  const swingLow  = window[lowIdx].low;
  const trend: 'UP' | 'DOWN' = highIdx > lowIdx ? 'DOWN' : 'UP';
  const range = swingHigh - swingLow;

  // For retracements: from HIGH to LOW (in downtrend) or LOW to HIGH (in uptrend)
  const retracements: FibonacciLevel[] = FIB_RATIOS.map((ratio) => {
    const price = trend === 'UP'
      ? swingHigh - ratio * range      // retrace down from high
      : swingLow  + ratio * range;     // retrace up from low
    const proximity = Math.abs((price - currentPrice) / currentPrice) * 100;
    const isSupport  = price < currentPrice;
    return {
      ratio, label: `${(ratio * 100).toFixed(1)}%`, price,
      type: 'retracement', isSupport,
      proximity, isNear: proximity < 1.5,
    };
  });

  // Extensions (price targets)
  const extensions: FibonacciLevel[] = FIB_EXT_RATIOS.map((ratio) => {
    const price = trend === 'UP'
      ? swingLow + ratio * range
      : swingHigh - ratio * range;
    const proximity = Math.abs((price - currentPrice) / currentPrice) * 100;
    const isSupport = price < currentPrice;
    return {
      ratio, label: `${(ratio * 100).toFixed(1)}%`, price,
      type: 'extension', isSupport,
      proximity, isNear: proximity < 1.5,
    };
  });

  const allLevels = [...retracements, ...extensions];
  const supports    = allLevels.filter((l) => l.isSupport).sort((a, b) => a.proximity - b.proximity);
  const resistances = allLevels.filter((l) => !l.isSupport).sort((a, b) => a.proximity - b.proximity);

  const nearestSupport    = supports[0] ?? null;
  const nearestResistance = resistances[0] ?? null;

  // Signal: if price is at key support (38.2%, 61.8%) → BUY; at key resistance → SELL
  const keySupport = retracements.find(
    (l) => l.isSupport && l.isNear && [0.382, 0.5, 0.618].includes(l.ratio)
  );
  const keyResistance = retracements.find(
    (l) => !l.isSupport && l.isNear && [0.236, 0.382].includes(l.ratio)
  );

  let signal: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  let notes = '';

  if (keySupport) {
    signal = 'BUY';
    notes = `Precio en soporte Fibonacci ${keySupport.label} — zona de rebote`;
  } else if (keyResistance) {
    signal = 'SELL';
    notes = `Precio en resistencia Fibonacci ${keyResistance.label} — posible rechazo`;
  } else if (nearestSupport && nearestResistance) {
    const risk   = currentPrice - nearestSupport.price;
    const reward = nearestResistance.price - currentPrice;
    const rr = risk > 0 ? reward / risk : 0;
    if (rr >= 2) { signal = 'BUY'; notes = `R/R favorable: ${rr.toFixed(1)}x — objetivo ${nearestResistance.label}`; }
    else if (rr < 0.8) { signal = 'SELL'; notes = `R/R desfavorable: ${rr.toFixed(1)}x — riesgo mayor que recompensa`; }
    else notes = `Entre soporte ${nearestSupport.label} y resistencia ${nearestResistance.label}`;
  } else {
    notes = `Tendencia ${trend === 'UP' ? 'alcista' : 'bajista'} — sin niveles clave cercanos`;
  }

  // ── Reliability score ─────────────────────────────────────────────────────
  // How confident we are in the Fibonacci signal right now (0–95)
  let fibReliability = 25;

  // Factor 1: Proximity to a key Fibonacci level
  const keyRatios = [0.382, 0.5, 0.618];
  const keyLevels = retracements.filter((l) => keyRatios.includes(l.ratio));
  const nearKey  = keyLevels.find((l) => l.proximity < 1.5);
  const closeKey = keyLevels.find((l) => l.proximity < 3);
  const okKey    = keyLevels.find((l) => l.proximity < 7);
  if      (nearKey)  fibReliability += 30;
  else if (closeKey) fibReliability += 20;
  else if (okKey)    fibReliability += 10;

  // Factor 2: Strength of the nearest relevant level
  const sortedAll = [...retracements, ...extensions].sort((a, b) => a.proximity - b.proximity);
  const closest = sortedAll[0];
  if (closest) {
    if ([0.618, 0.382, 0.5].includes(closest.ratio))      fibReliability += 15;
    else if ([1.618].includes(closest.ratio))              fibReliability += 10;
    else if ([0.236, 0.786].includes(closest.ratio))       fibReliability += 5;
  }

  // Factor 3: Risk/Reward quality
  if (nearestSupport && nearestResistance) {
    const risk   = currentPrice - nearestSupport.price;
    const reward = nearestResistance.price - currentPrice;
    const rr = risk > 0 ? reward / risk : 0;
    if      (rr >= 3)   fibReliability += 15;
    else if (rr >= 2)   fibReliability += 10;
    else if (rr >= 1)   fibReliability += 5;
    else if (rr < 0.8)  fibReliability -= 5;
  }

  // Factor 4: Trend alignment with signal
  if ((signal === 'BUY' && trend === 'UP') || (signal === 'SELL' && trend === 'DOWN'))  fibReliability += 10;
  else if ((signal === 'BUY' && trend === 'DOWN') || (signal === 'SELL' && trend === 'UP')) fibReliability -= 5;

  const reliabilityScore = Math.min(Math.max(fibReliability, 10), 95);

  return {
    swingHigh, swingLow,
    swingHighDate: window[highIdx].date,
    swingLowDate:  window[lowIdx].date,
    trend, retracements, extensions,
    nearestSupport, nearestResistance,
    signal, notes, reliabilityScore,
  };
}

// ── Elliott Wave Analysis ─────────────────────────────────────────────────────
// Filter pivots that are too small to matter (noise)
function filterSignificantPivots(
  pivots: Array<{ date: string; price: number; type: 'HIGH' | 'LOW'; idx: number }>,
  minSwingPct: number
): Array<{ date: string; price: number; type: 'HIGH' | 'LOW'; idx: number }> {
  const result: typeof pivots = [];
  for (const p of pivots) {
    if (result.length === 0) { result.push(p); continue; }
    const last = result[result.length - 1];
    const move = Math.abs(p.price - last.price) / last.price;
    if (move >= minSwingPct) {
      result.push(p);
    } else if (p.type === last.type) {
      // Replace with more extreme pivot of same type
      if (p.type === 'HIGH' && p.price > last.price) result[result.length - 1] = p;
      if (p.type === 'LOW'  && p.price < last.price) result[result.length - 1] = p;
    }
  }
  return result;
}

export function calcElliottWave(
  candles: ChartCandle[],
  currentPrice: number
): ElliottWaveAnalysis {
  const noData: ElliottWaveAnalysis = {
    phase: 'UNKNOWN', currentWave: 'Unknown', confidence: 'LOW',
    pivots: [], signal: 'HOLD',
    targetPrice: null, invalidationPrice: null,
    notes: 'Datos insuficientes — se necesitan al menos 60 velas para el análisis',
  };

  if (candles.length < 60) return noData;

  // Use up to 1 year of daily data
  const data = candles.slice(-Math.min(candles.length, 252));

  // Step 1: find raw pivots with lookback=4 (more sensitive)
  const rawPivots = findPivots(data, 4);

  // Step 2: filter out micro-swings smaller than 2% to keep only meaningful turns
  const pivots = filterSignificantPivots(rawPivots, 0.02);

  if (pivots.length < 5) {
    return {
      ...noData,
      notes: `Solo ${pivots.length} pivotes significativos — mercado sin estructura clara de Ondas de Elliott`,
    };
  }

  // Step 3: take the last 7 pivots (enough to identify waves 1–5 or A–B–C)
  const recent = pivots.slice(-7);
  const displayPivots = recent.map((p) => ({ date: p.date, price: p.price, type: p.type }));

  // Step 4: verify strict alternation (HIGH-LOW-HIGH-LOW or LOW-HIGH-LOW-HIGH…)
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].type === recent[i - 1].type) {
      return {
        phase: 'UNKNOWN', currentWave: 'Unknown', confidence: 'LOW',
        pivots: displayPivots, signal: 'HOLD',
        targetPrice: null, invalidationPrice: null,
        notes: 'Pivotes no alternantes correctamente — estructura Elliott no válida en datos actuales',
      };
    }
  }

  const p = recent;
  const overallUp = p[p.length - 1].price > p[0].price;

  let phase: 'IMPULSE' | 'CORRECTIVE' | 'UNKNOWN' = 'UNKNOWN';
  let currentWave: ElliottWavePosition = 'Unknown';
  let signal: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  let targetPrice: number | null = null;
  let invalidationPrice: number | null = null;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let notes = '';

  // ── Try UPTREND IMPULSE: sequence LOW-HIGH-LOW-HIGH-LOW-HIGH-LOW ─────────
  if (p[0].type === 'LOW' && p.length >= 5) {
    const w1 = p[1].price - p[0].price;   // Wave 1 size (up)
    const w2 = p[1].price - p[2].price;   // Wave 2 retrace (down)
    const w3 = p[3].price - p[2].price;   // Wave 3 size (up)
    const w2Pct  = w1 > 0 ? w2 / w1 : 1;
    const w3Mult = w1 > 0 ? w3 / w1 : 0;

    // Strict Elliott Rules:
    // R1: Wave 2 retraces 23.6%–99.9% of Wave 1 (can't exceed Wave 1 start)
    const ruleR1 = w2Pct > 0.236 && w2Pct < 1.0;
    // R2: Wave 3 must be at least 100% of Wave 1 in a typical impulse
    const ruleR2 = w3Mult >= 1.0;
    // R3: Wave 4 low must stay ABOVE Wave 1 high (no overlap rule)
    const ruleR3 = p.length < 5 || p[4].price > p[1].price;
    // R4: Wave 2 low must stay ABOVE Wave 1 start (Wave 0)
    const ruleR4 = p[2].price > p[0].price;
    // R5 (when Wave 5 exists): Wave 3 must NOT be the shortest impulse wave
    const w5 = p.length >= 7 ? p[6].price - p[4].price : null;  // Wave 5 if available
    const ruleR5 = w5 === null || !(w3 < w1 && w3 < w5);

    const rulesVerified = [ruleR1, ruleR2, ruleR3, ruleR4, ruleR5].filter(Boolean).length;
    const totalRules = w5 !== null ? 5 : 4;
    const impulseValid = ruleR1 && ruleR2 && ruleR3 && ruleR4;

    if (impulseValid) {
      phase = 'IMPULSE';
      confidence = rulesVerified >= 5 ? 'HIGH' : rulesVerified >= 4 ? 'MEDIUM' : 'LOW';

      if (p.length === 5) {
        // LOW-HIGH-LOW-HIGH-LOW: waves 1–4 done, in Wave 5
        currentWave = 'Wave 5';
        signal = 'BUY';
        // Wave 5 target: conservative = Wave 1 length, extension = Wave 1 × 1.618
        const w5Target = p[4].price + w1;
        const w5Ext    = p[4].price + w1 * 1.618;
        targetPrice    = Math.round(w5Target * 100) / 100;
        invalidationPrice = Math.round(p[4].price * 0.995 * 100) / 100; // must hold Wave 4 low
        notes = `Ondas 1–4 alcistas confirmadas (${rulesVerified}/${totalRules} reglas OK). Onda 5 en curso. Objetivo conservador: $${targetPrice.toFixed(2)}, extensión 1.618: $${w5Ext.toFixed(2)}. Invalidación si pierde $${invalidationPrice.toFixed(2)} (mínimo Onda 4).`;
      } else if (p.length === 6) {
        currentWave = 'Wave 5';
        signal = 'HOLD';
        notes = `Impulso alcista de 5 ondas completado (${rulesVerified}/${totalRules} reglas OK). Próxima fase: corrección ABC (3 ondas a la baja). Evitar nuevas compras — esperar soporte.`;
      } else if (p.length === 7) {
        const w5Actual = p[6].price - p[4].price;
        const w3Shortest = w3 < w1 && (w5 !== null && w3 < w5);
        currentWave = 'Wave B';
        signal = 'HOLD';
        notes = `Posible corrección ABC tras 5 ondas alcistas${!ruleR5 ? ' [Onda 3 más corta — patrón menos confiable]' : ''}. Si el precio rebota sobre $${p[5].price.toFixed(2)}, posible inicio de nuevo impulso.`;
      }
    }
  }

  // ── Try DOWNTREND IMPULSE: sequence HIGH-LOW-HIGH-LOW-HIGH-LOW-HIGH ──────
  if (phase === 'UNKNOWN' && p[0].type === 'HIGH' && p.length >= 5) {
    const w1 = p[0].price - p[1].price;   // Wave 1 size (down)
    const w2 = p[2].price - p[1].price;   // Wave 2 retrace (up)
    const w3 = p[2].price - p[3].price;   // Wave 3 size (down)
    const w2Pct  = w1 > 0 ? w2 / w1 : 1;
    const w3Mult = w1 > 0 ? w3 / w1 : 0;

    const ruleR1 = w2Pct > 0.236 && w2Pct < 1.0;
    const ruleR2 = w3Mult >= 1.0;
    const ruleR3 = p.length < 5 || p[4].price < p[1].price; // Wave 4 high below Wave 1 low
    const ruleR4 = p[2].price < p[0].price; // Wave 2 high below Wave 1 start
    const w5d = p.length >= 7 ? p[4].price - p[6].price : null;
    const ruleR5 = w5d === null || !(w3 < w1 && w3 < w5d);

    const rulesVerified = [ruleR1, ruleR2, ruleR3, ruleR4, ruleR5].filter(Boolean).length;
    const totalRules = w5d !== null ? 5 : 4;
    const impulseValid = ruleR1 && ruleR2 && ruleR3 && ruleR4;

    if (impulseValid) {
      phase = 'IMPULSE';
      confidence = rulesVerified >= 5 ? 'HIGH' : rulesVerified >= 4 ? 'MEDIUM' : 'LOW';

      if (p.length === 5) {
        currentWave = 'Wave 5';
        signal = 'SELL';
        const w5Target = p[4].price - w1;
        targetPrice = Math.round(w5Target * 100) / 100;
        invalidationPrice = Math.round(p[4].price * 1.005 * 100) / 100;
        notes = `Ondas 1–4 bajistas confirmadas (${rulesVerified}/${totalRules} reglas OK). Onda 5 bajista en curso. Objetivo: $${targetPrice.toFixed(2)}. Invalidación si sube sobre $${invalidationPrice.toFixed(2)} (máximo Onda 4).`;
      } else if (p.length === 6) {
        currentWave = 'Wave 5';
        signal = 'HOLD';
        notes = `Impulso bajista de 5 ondas completado (${rulesVerified}/${totalRules} reglas OK). Próxima fase: rebote ABC. Evitar ventas nuevas — esperar resistencia.`;
      } else if (p.length === 7) {
        currentWave = 'Wave B';
        signal = 'SELL';
        notes = `Corrección ABC bajista en curso. Onda B (rebote) en progreso. Posible continuación a la baja (Onda C). No confundir el rebote con un cambio de tendencia.`;
      }
    }
  }

  // ── If no clear impulse: identify ABC corrective structure ─────────────────
  if (phase === 'UNKNOWN' && p.length >= 3) {
    phase = 'CORRECTIVE';
    const lastP = p[p.length - 1];
    const firstP = p[0];

    if (lastP.type === 'LOW' && !overallUp) {
      // Downward correction ending at a low → potential reversal / buy
      currentWave = 'Wave C';
      signal = 'BUY';
      confidence = 'LOW';
      invalidationPrice = lastP.price * 0.97;
      const prevHigh = p.find(x => x.type === 'HIGH')?.price ?? currentPrice * 1.1;
      targetPrice = prevHigh;
      notes = `Posible fin de corrección ABC en soporte $${lastP.price.toFixed(2)}. Si aguanta, objetivo de rebote: ~$${prevHigh.toFixed(2)}. Invalida si pierde $${invalidationPrice.toFixed(2)}.`;
    } else if (lastP.type === 'HIGH' && overallUp) {
      // Upward correction ending at a high → watch for C wave down
      currentWave = 'Wave B';
      signal = 'SELL';
      confidence = 'LOW';
      const prevLow = p.find(x => x.type === 'LOW')?.price ?? currentPrice * 0.9;
      notes = `Rebote de Onda B — posible continuación bajista (Onda C). Posible caída hacia $${prevLow.toFixed(2)}.`;
    } else if (lastP.type === 'LOW') {
      currentWave = 'Wave C';
      signal = 'BUY';
      confidence = 'LOW';
      invalidationPrice = lastP.price * 0.97;
      notes = `Zona de soporte tras corrección — vigilar si el precio mantiene $${lastP.price.toFixed(2)} para confirmar reversión.`;
    } else {
      currentWave = 'Wave B';
      signal = 'HOLD';
      confidence = 'LOW';
      notes = 'Estructura correctiva en curso — esperar confirmación de dirección antes de operar.';
    }
  }

  if (!notes) notes = 'Estructura en formación — continuar monitoreando.';

  return {
    phase,
    currentWave: currentWave as ElliottWavePosition,
    confidence,
    pivots: displayPivots,
    signal,
    targetPrice,
    invalidationPrice,
    notes,
  };
}

export function analyzeStock(
  quote: Quote,
  candles: ChartCandle[],
  market: MarketContext,
  fundamentals?: Fundamentals | null
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

  // Plain-language notes per dimension
  const rsiNote = (() => {
    if (rsi > 70) return `RSI ${rsi.toFixed(0)} — mercado muy caliente, riesgo de caída`;
    if (rsi > 60) return `RSI ${rsi.toFixed(0)} — impulso positivo, tendencia sana`;
    if (rsi < 30) return `RSI ${rsi.toFixed(0)} — sobrevendido, posible rebote`;
    if (rsi < 40) return `RSI ${rsi.toFixed(0)} — presión bajista, precaución`;
    return `RSI ${rsi.toFixed(0)} — zona neutral, sin señal clara`;
  })();

  const volNote = (() => {
    if (volumeRatio > 1.5 && quote.change > 0) return `Volumen ${volumeRatio.toFixed(1)}× el promedio — gran interés comprador`;
    if (volumeRatio > 1.5 && quote.change < 0) return `Volumen ${volumeRatio.toFixed(1)}× el promedio — fuerte presión vendedora`;
    if (volumeRatio > 1.2) return `Volumen ${volumeRatio.toFixed(1)}× por encima de lo normal`;
    if (volumeRatio < 0.5) return `Volumen muy bajo — movimiento sin convicción`;
    return `Volumen ${volumeRatio.toFixed(1)}× — actividad normal`;
  })();

  const rangeNote = (() => {
    const range = high52 - low52;
    const pos = range > 0 ? (price - low52) / range : 0.5;
    const pct = (pos * 100).toFixed(0);
    if (pos < 0.15) return `En el ${pct}% del rango anual — cerca del mínimo de 52 semanas`;
    if (pos > 0.9)  return `En el ${pct}% del rango anual — cerca del máximo histórico`;
    if (pos > 0.4 && pos < 0.75) return `En el ${pct}% del rango anual — zona de momentum saludable`;
    return `En el ${pct}% del rango entre máximo y mínimo de 1 año`;
  })();

  const marketNote = (() => {
    const parts: string[] = [];
    if (market.regime === 'BULL') parts.push('Mercado alcista general');
    else if (market.regime === 'BEAR') parts.push('Mercado bajista — viento en contra');
    else parts.push('Mercado neutral');
    if (market.vix > 30) parts.push(`VIX ${market.vix.toFixed(0)} — miedo extremo`);
    else if (market.vix > 20) parts.push(`VIX ${market.vix.toFixed(0)} — volatilidad elevada`);
    else parts.push(`VIX ${market.vix.toFixed(0)} — calma relativa`);
    return parts.join(' · ');
  })();

  const trendNote = (() => {
    const above = [price > ma20, price > ma50, price > ma200].filter(Boolean).length;
    if (above === 3) return 'Precio sobre MA20, MA50 y MA200 — tendencia alcista confirmada';
    if (above === 2) return `Precio sobre ${price > ma200 ? 'MA20 y MA50' : price > ma50 ? 'MA50 y MA200' : 'MA20 y MA200'} — tendencia parcialmente alcista`;
    if (above === 1) return 'Solo sobre una media móvil — señal débil';
    return 'Precio bajo las 3 medias móviles — tendencia bajista';
  })();

  // Compute Fibonacci and Elliott Wave first so they can feed into dimensions
  const fibonacci = calcFibonacci(candles, price);
  const elliottWave = calcElliottWave(candles, price);

  // Fibonacci score — based on price position relative to key levels and R/R
  const fibScore = (() => {
    if (fibonacci.signal === 'BUY') {
      const nearKeySupport = fibonacci.retracements.find(
        (l) => l.isNear && [0.382, 0.5, 0.618].includes(l.ratio)
      );
      return nearKeySupport ? 83 : 68;
    }
    if (fibonacci.signal === 'SELL') {
      const nearKeyRes = fibonacci.retracements.find(
        (l) => l.isNear && [0.236, 0.382].includes(l.ratio)
      );
      return nearKeyRes ? 17 : 32;
    }
    // HOLD: evaluate R/R
    const ns = fibonacci.nearestSupport;
    const nr = fibonacci.nearestResistance;
    if (ns && nr) {
      const risk   = (price - ns.price) / price * 100;
      const reward = (nr.price - price) / price * 100;
      const rr = risk > 0 ? reward / risk : 1;
      if (rr >= 2) return 65;
      if (rr < 0.8) return 35;
    }
    return 50;
  })();

  // Elliott Wave score — scaled by confidence
  const ewScore = (() => {
    const confMult = elliottWave.confidence === 'HIGH' ? 1.0
      : elliottWave.confidence === 'MEDIUM' ? 0.65 : 0.35;
    if (elliottWave.signal === 'BUY')  return Math.round(50 + 30 * confMult);
    if (elliottWave.signal === 'SELL') return Math.round(50 - 30 * confMult);
    return 50;
  })();

  // ── Analyst Sentiment (from fundamentals) ─────────────────────────────────
  const analystScore = (() => {
    if (!fundamentals) return null;
    const { recommendationMean, numberOfAnalysts, targetMeanPrice } = fundamentals;
    // Need at least 2 analysts for this to be meaningful
    if (!recommendationMean || !numberOfAnalysts || numberOfAnalysts < 2) return null;
    // recommendationMean: 1.0 = Strong Buy, 5.0 = Strong Sell → map to 0-100
    const meanScore = Math.round((5 - recommendationMean) / 4 * 100);
    // Price target upside
    const upsideScore = (() => {
      if (!targetMeanPrice || price <= 0) return 50;
      const upside = (targetMeanPrice - price) / price * 100;
      if (upside > 20) return 82;
      if (upside > 10) return 70;
      if (upside > 5)  return 62;
      if (upside > 0)  return 55;
      if (upside > -5) return 45;
      return 30;
    })();
    return Math.round(meanScore * 0.60 + upsideScore * 0.40);
  })();

  const analystNote = (() => {
    if (!fundamentals) return null;
    const { recommendationMean, numberOfAnalysts, targetMeanPrice, targetHighPrice, targetLowPrice } = fundamentals;
    if (!recommendationMean || !numberOfAnalysts || numberOfAnalysts < 2) return null;
    const labels: Record<number, string> = { 1: 'Compra fuerte', 2: 'Comprar', 3: 'Mantener', 4: 'Vender', 5: 'Venta fuerte' };
    const rounded = Math.round(recommendationMean);
    const label = labels[rounded] ?? 'Neutral';
    const parts: string[] = [`${numberOfAnalysts} analistas: ${label} (${recommendationMean.toFixed(1)}/5.0)`];
    if (targetMeanPrice && price > 0) {
      const upside = ((targetMeanPrice - price) / price * 100).toFixed(1);
      const sign = Number(upside) >= 0 ? '+' : '';
      parts.push(`Precio objetivo: $${targetMeanPrice.toFixed(2)} (${sign}${upside}%)`);
      if (targetHighPrice && targetLowPrice) {
        parts.push(`Rango: $${targetLowPrice.toFixed(2)} – $${targetHighPrice.toFixed(2)}`);
      }
    }
    return parts.join(' · ');
  })();

  // ── Fundamentals score ────────────────────────────────────────────────────
  const fundamentalsScore = (() => {
    if (!fundamentals) return null;
    const { trailingPE, forwardPE, revenueGrowth, operatingMargins, profitMargins, totalDebtToEquity } = fundamentals;
    // Need at least some data to score
    if (trailingPE === null && revenueGrowth === null && operatingMargins === null) return null;
    let s = 50;
    // Valuation (P/E)
    const pe = forwardPE ?? trailingPE;
    if (pe !== null) {
      if (pe < 0)  s -= 15; // negative earnings
      else if (pe < 12) s += 12; // cheap
      else if (pe < 20) s += 8;  // fair value
      else if (pe < 30) s += 3;  // slightly elevated
      else if (pe > 60) s -= 12; // very expensive
      else if (pe > 40) s -= 7;
    }
    // Revenue growth
    if (revenueGrowth !== null) {
      if (revenueGrowth > 0.30) s += 15;
      else if (revenueGrowth > 0.15) s += 10;
      else if (revenueGrowth > 0.05) s += 5;
      else if (revenueGrowth < -0.10) s -= 12;
      else if (revenueGrowth < 0) s -= 6;
    }
    // Profitability
    const margins = operatingMargins ?? profitMargins;
    if (margins !== null) {
      if (margins > 0.25) s += 10;
      else if (margins > 0.15) s += 6;
      else if (margins > 0.05) s += 2;
      else if (margins < 0) s -= 10;
      else if (margins < 0.03) s -= 5;
    }
    // Debt
    if (totalDebtToEquity !== null) {
      if (totalDebtToEquity > 300) s -= 8;
      else if (totalDebtToEquity > 150) s -= 4;
    }
    return Math.max(0, Math.min(100, s));
  })();

  const fundamentalsNote = (() => {
    if (!fundamentals) return null;
    const { trailingPE, forwardPE, revenueGrowth, operatingMargins, profitMargins } = fundamentals;
    if (trailingPE === null && revenueGrowth === null && operatingMargins === null) return null;
    const parts: string[] = [];
    const pe = forwardPE ?? trailingPE;
    if (pe !== null) {
      if (pe < 0) parts.push('P/E negativo — empresa sin ganancias');
      else if (pe < 15) parts.push(`P/E ${pe.toFixed(1)} — valoración atractiva`);
      else if (pe < 30) parts.push(`P/E ${pe.toFixed(1)} — valoración razonable`);
      else parts.push(`P/E ${pe.toFixed(1)} — valoración elevada`);
    }
    if (revenueGrowth !== null) {
      const pct = (revenueGrowth * 100).toFixed(1);
      if (revenueGrowth > 0.15) parts.push(`Ingresos +${pct}% — crecimiento fuerte`);
      else if (revenueGrowth > 0) parts.push(`Ingresos +${pct}% — crecimiento moderado`);
      else parts.push(`Ingresos ${pct}% — ventas en contracción`);
    }
    const margins = operatingMargins ?? profitMargins;
    if (margins !== null) {
      const pct = (margins * 100).toFixed(1);
      if (margins > 0.20) parts.push(`Margen operativo ${pct}% — rentabilidad excelente`);
      else if (margins > 0.10) parts.push(`Margen operativo ${pct}% — rentabilidad sana`);
      else if (margins < 0) parts.push(`Margen operativo ${pct}% — empresa perdiendo dinero`);
      else parts.push(`Margen operativo ${pct}% — rentabilidad ajustada`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  })();

  // Base dimensions (always present). Weights sum to 0.75 to leave room for
  // optional fundamental/analyst dimensions (up to 0.25 more).
  const baseDimensions: AnalysisDimension[] = [
    {
      name: 'Momento (RSI)',
      score: momentumScore,
      weight: 0.17,
      signal: scoreToSignal(momentumScore),
      notes: rsiNote,
    },
    {
      name: 'Tendencia (medias móviles)',
      score: trendScore,
      weight: 0.17,
      signal: scoreToSignal(trendScore),
      notes: trendNote,
    },
    {
      name: 'Fibonacci',
      score: fibScore,
      weight: 0.11,
      signal: scoreToSignal(fibScore),
      notes: fibonacci.notes,
    },
    {
      name: 'Contexto de mercado',
      score: marketScore,
      weight: 0.12,
      signal: scoreToSignal(marketScore),
      notes: marketNote,
    },
    {
      name: 'Ondas de Elliott',
      score: ewScore,
      weight: 0.08,
      signal: scoreToSignal(ewScore),
      notes: elliottWave.notes,
    },
    {
      name: 'Presión de volumen',
      score: volumeScore,
      weight: 0.10,
      signal: scoreToSignal(volumeScore),
      notes: volNote,
    },
    {
      name: 'Rango anual',
      score: rangeScore,
      weight: 0.07,
      signal: scoreToSignal(rangeScore),
      notes: rangeNote,
    },
  ];

  // Optional dimensions: only added when data is available
  const optionalDimensions: AnalysisDimension[] = [];
  if (analystScore !== null && analystNote !== null) {
    optionalDimensions.push({
      name: 'Consenso de analistas',
      score: analystScore,
      weight: 0.14,
      signal: scoreToSignal(analystScore),
      notes: analystNote,
    });
  }
  if (fundamentalsScore !== null && fundamentalsNote !== null) {
    optionalDimensions.push({
      name: 'Fundamentos',
      score: fundamentalsScore,
      weight: 0.10,
      signal: scoreToSignal(fundamentalsScore),
      notes: fundamentalsNote,
    });
  }

  // Normalize weights so they always sum to 1.0
  const allDimensions = [...baseDimensions, ...optionalDimensions];
  const totalWeight = allDimensions.reduce((a, d) => a + d.weight, 0);
  const dimensions: AnalysisDimension[] = allDimensions.map((d) => ({
    ...d,
    weight: d.weight / totalWeight,
  }));

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
  if (fibonacci.signal === 'SELL') risks.push('Fibonacci: precio en zona de resistencia — posible rechazo');
  if (elliottWave.invalidationPrice && price < elliottWave.invalidationPrice * 1.02)
    risks.push(`Elliott Wave: cerca del nivel de invalidación $${elliottWave.invalidationPrice.toFixed(2)}`);
  if (fundamentals?.totalDebtToEquity && fundamentals.totalDebtToEquity > 200)
    risks.push(`Deuda elevada (D/E ${fundamentals.totalDebtToEquity.toFixed(0)}%) — riesgo financiero`);
  if (fundamentals?.recommendationMean && fundamentals.recommendationMean > 3.5)
    risks.push('Analistas mayoritariamente negativos — consenso vender/mantener');

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
    fibonacci,
    elliottWave,
    fundamentals: fundamentals ?? null,
  };
}
