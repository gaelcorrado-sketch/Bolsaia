import type { StockAnalysis, Signal, Confidence } from './types';

/**
 * Compute combined signal using majority voting across 3 methods:
 * Technical, Fibonacci, Elliott Wave.
 *
 * - 2/3 or 3/3 agreement → that signal wins (majority always wins)
 * - 1-1-1 tie → weighted score as tiebreaker
 */
export function computeSignalFromAnalysis(
  analysis: StockAnalysis
): { signal: Signal; confidence: Confidence; agreementCount: number } {
  const sources: Signal[] = [
    analysis.signal,              // Technical
    analysis.fibonacci.signal,    // Fibonacci
    analysis.elliottWave.signal,  // Elliott Wave
  ];

  const voteCounts: Record<Signal, number> = { BUY: 0, SELL: 0, HOLD: 0 };
  for (const s of sources) voteCounts[s]++;
  const maxVotes = Math.max(...Object.values(voteCounts));

  let signal: Signal;
  if (maxVotes >= 2) {
    signal = (Object.entries(voteCounts) as [Signal, number][]).find(([, v]) => v === maxVotes)![0];
  } else {
    // 1-1-1 tie: use technical score as tiebreaker (normalized to -1..1)
    const score = (analysis.score - 50) / 50; // 0-100 → -1..1
    signal = score >= 0.15 ? 'BUY' : score <= -0.15 ? 'SELL' : 'HOLD';
  }

  const agreementCount = sources.filter(s => s === signal).length;
  const confidence: Confidence = agreementCount === 3 ? 'HIGH' : agreementCount === 2 ? 'MEDIUM' : 'LOW';

  return { signal, confidence, agreementCount };
}
