import type { StockAnalysis, Signal, Confidence, MarketContext } from './types';

export interface VetoInfo {
  vetoed: boolean;
  originalSignal: Signal;
  finalSignal: Signal;
  reasons: string[];
  label: string;
}

/**
 * Apply hard veto rules to a voted BUY signal.
 * When conditions indicate the entry is too risky, BUY is overridden to HOLD.
 * Returns the signal unchanged if no vetoes fire (or if signal is not BUY).
 */
export function applySignalVetoes(
  signal: Signal,
  _confidence: Confidence,
  analysis: StockAnalysis,
  market?: MarketContext
): VetoInfo {
  const noVeto: VetoInfo = {
    vetoed: false, originalSignal: signal, finalSignal: signal, reasons: [], label: '',
  };
  if (signal !== 'BUY') return noVeto;

  const { rsi, priceVsHigh52w, fibonacci, elliottWave, fundamentals, risks } = analysis;
  const triggered: string[] = [];

  // Veto 1: RSI overbought >= 70 (standard definition — always fires)
  // Only exception: Wave 3 IMPULSE with HIGH Elliott confidence (strongest bull wave, RSI expected high)
  const isWave3High =
    elliottWave.phase === 'IMPULSE' &&
    elliottWave.currentWave === 'Wave 3' &&
    elliottWave.confidence === 'HIGH';
  if (rsi >= 70 && !isWave3High) {
    triggered.push(`RSI sobrecomprado (${rsi.toFixed(0)})`);
  }

  // Veto 2: Price within 5% of 52-week high without Fibonacci confirming further extension
  if (priceVsHigh52w > -5 && fibonacci.signal !== 'BUY') {
    const gap = Math.max(0, -priceVsHigh52w).toFixed(1);
    triggered.push(`cerca del máximo anual (${gap}% del techo)`);
  }

  // Veto 3: Long-term downtrend — price below MA200
  if (risks.some(r => r.includes('MA200'))) {
    triggered.push('precio bajo la tendencia de largo plazo (MA200)');
  }

  // Veto 4: Bearish moving average cross — MA20 below MA50
  if (risks.some(r => r.includes('MA20 bajo MA50'))) {
    triggered.push('cruce bajista de medias móviles (MA20 < MA50)');
  }

  // Veto 5: Bear market regime + elevated VIX
  if (market?.regime === 'BEAR' && (market.vix ?? 0) >= 25) {
    triggered.push(`régimen bajista (VIX ${(market.vix ?? 0).toFixed(0)})`);
  }

  // Veto 6: Analyst consensus negative (>= 3.5 on 1=Strong Buy … 5=Strong Sell, 3+ analysts)
  const recMean = fundamentals?.recommendationMean ?? null;
  const numAnalysts = fundamentals?.numberOfAnalysts ?? null;
  if (recMean !== null && numAnalysts !== null && recMean >= 3.5 && numAnalysts >= 3) {
    triggered.push(`consenso de analistas negativo (${recMean.toFixed(1)}/5.0)`);
  }

  // Veto 7: Fibonacci resistance with moderate-to-high reliability (>= 50)
  if (fibonacci.signal === 'SELL' && fibonacci.reliabilityScore >= 50) {
    triggered.push('resistencia Fibonacci confirmada');
  }

  if (triggered.length === 0) return noVeto;

  const label =
    triggered.length === 1
      ? `Señal ajustada: ${triggered[0]}`
      : `Señal ajustada: ${triggered[0]} (+${triggered.length - 1} más)`;

  return { vetoed: true, originalSignal: 'BUY', finalSignal: 'HOLD', reasons: triggered, label };
}

/**
 * Compute combined signal using majority voting across 3 methods.
 * Unreliable sources abstain (vote HOLD) instead of polluting the majority:
 *   - Fibonacci reliabilityScore < 35 → abstain
 *   - Elliott Wave LOW confidence → abstain
 *
 * Used by the signals API for server-side bucketing.
 */
export function computeSignalFromAnalysis(
  analysis: StockAnalysis
): { signal: Signal; confidence: Confidence; agreementCount: number } {
  const fibVote: Signal =
    analysis.fibonacci.reliabilityScore >= 35 ? analysis.fibonacci.signal : 'HOLD';
  const elliottVote: Signal =
    analysis.elliottWave.confidence !== 'LOW' ? analysis.elliottWave.signal : 'HOLD';

  const votes: Signal[] = [analysis.signal, fibVote, elliottVote];
  const voteCounts: Record<Signal, number> = { BUY: 0, SELL: 0, HOLD: 0 };
  for (const v of votes) voteCounts[v]++;
  const maxVotes = Math.max(...Object.values(voteCounts));

  let rawSignal: Signal;
  if (maxVotes >= 2) {
    rawSignal = (Object.entries(voteCounts) as [Signal, number][]).find(([, v]) => v === maxVotes)![0];
  } else {
    const score = (analysis.score - 50) / 50; // normalize 0–100 → -1..1
    rawSignal = score >= 0.15 ? 'BUY' : score <= -0.15 ? 'SELL' : 'HOLD';
  }

  // agreementCount uses the original (pre-abstain) signals for display accuracy
  const origSources: Signal[] = [
    analysis.signal,
    analysis.fibonacci.signal,
    analysis.elliottWave.signal,
  ];
  const agreementCount = origSources.filter(s => s === rawSignal).length;
  const confidence: Confidence =
    agreementCount === 3 ? 'HIGH' : agreementCount === 2 ? 'MEDIUM' : 'LOW';

  return { signal: rawSignal, confidence, agreementCount };
}

/**
 * Full combined signal computation — the canonical function used by the
 * detail page banner AND the signals API.
 *
 * Features:
 * - Confidence-weighted majority voting
 * - Abstentions for unreliable Fibonacci / LOW-confidence Elliott
 * - Post-vote veto layer that overrides BUY → HOLD on risky conditions
 * - Returns veto info for UI transparency
 */
export function computeCombinedSignal(
  analysis: StockAnalysis,
  market?: MarketContext
): {
  signal: Signal;
  confidence: Confidence;
  agreementCount: number;
  weightedScore: number;
  sources: Array<{ name: string; signal: Signal; confidence: Confidence; weight: number }>;
  veto: VetoInfo;
} {
  const sv = (s: Signal) => s === 'BUY' ? 1 : s === 'SELL' ? -1 : 0;
  const confMult = (c: Confidence) => c === 'HIGH' ? 1.0 : c === 'MEDIUM' ? 0.75 : 0.40;

  // Abstain unreliable sources — they cast a neutral HOLD vote
  const fibVote: Signal =
    analysis.fibonacci.reliabilityScore >= 35 ? analysis.fibonacci.signal : 'HOLD';
  const elliottVote: Signal =
    analysis.elliottWave.confidence !== 'LOW' ? analysis.elliottWave.signal : 'HOLD';

  const voteSources = [
    { signal: analysis.signal, confidence: analysis.confidence,              baseWeight: 0.50 },
    { signal: fibVote,          confidence: 'MEDIUM' as Confidence,          baseWeight: 0.30 },
    { signal: elliottVote,      confidence: analysis.elliottWave.confidence, baseWeight: 0.20 },
  ].map(s => ({ ...s, weight: s.baseWeight * confMult(s.confidence) }));

  const totalWeight = voteSources.reduce((a, s) => a + s.weight, 0);
  const weightedScore = voteSources.reduce((a, s) => a + sv(s.signal) * s.weight, 0) / totalWeight;

  const voteCounts: Record<Signal, number> = { BUY: 0, SELL: 0, HOLD: 0 };
  for (const s of voteSources) voteCounts[s.signal]++;
  const maxVotes = Math.max(...Object.values(voteCounts));

  let votedSignal: Signal;
  if (maxVotes >= 2) {
    votedSignal = (Object.entries(voteCounts) as [Signal, number][]).find(([, v]) => v === maxVotes)![0];
  } else {
    // 1-1-1 tie: stricter threshold in BEAR + high VIX environments
    const threshold = (market?.regime === 'BEAR' && (market?.vix ?? 0) > 35) ? 0.30 : 0.15;
    votedSignal = weightedScore >= threshold ? 'BUY' : weightedScore <= -threshold ? 'SELL' : 'HOLD';
  }

  // Display sources always use the original (non-abstained) signals so the user
  // sees what each method actually computed, not the abstained HOLD
  const displaySources = [
    { name: 'Técnico',          signal: analysis.signal,             confidence: analysis.confidence,              weight: voteSources[0].weight },
    { name: 'Fibonacci',        signal: analysis.fibonacci.signal,   confidence: 'MEDIUM' as Confidence,          weight: voteSources[1].weight },
    { name: 'Ondas de Elliott', signal: analysis.elliottWave.signal, confidence: analysis.elliottWave.confidence, weight: voteSources[2].weight },
  ];

  // agreementCount / confidence based on original signals for display ("2/3 métodos coinciden")
  const agreementCount = displaySources.filter(s => s.signal === votedSignal).length;
  const confidence: Confidence =
    agreementCount === 3 ? 'HIGH' : agreementCount === 2 ? 'MEDIUM' : 'LOW';

  // Apply vetoes — may override votedSignal → HOLD
  const veto = applySignalVetoes(votedSignal, confidence, analysis, market);

  return {
    signal: veto.finalSignal,
    confidence,
    agreementCount,
    weightedScore,
    sources: displaySources,
    veto,
  };
}
