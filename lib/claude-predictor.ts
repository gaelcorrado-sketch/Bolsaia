import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { StockAnalysis, Quote, MarketContext, AIPrediction } from './types';

const PredictionSchema = z.object({
  direction: z.enum(['UP', 'DOWN', 'SIDEWAYS']),
  targetLow: z.number(),
  targetHigh: z.number(),
  targetDays: z.number(),
  probability: z.number().min(0).max(100),
  reasoning: z.string(),
  keyFactors: z.array(z.string()),
  risks: z.array(z.string()),
});

/** Rule-based prediction — no API key required. Derived from StockAnalysis data. */
export function generateRuleBasedPrediction(
  quote: Quote,
  analysis: StockAnalysis,
  market: MarketContext
): AIPrediction {
  const { score, confidence, signal, rsi, dimensions, risks } = analysis;
  const price = quote.price;

  // Direction
  let direction: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
  if (score >= 65 && (confidence === 'HIGH' || confidence === 'MEDIUM')) direction = 'UP';
  else if (score <= 35 && (confidence === 'HIGH' || confidence === 'MEDIUM')) direction = 'DOWN';

  // Probability — rule-based caps at 80
  const rawProb = Math.round(Math.abs(score - 50) * 1.6 + 35);
  const probability = Math.min(rawProb, 80);

  // Expected monthly move from 52w range volatility
  const range = Math.max(quote.high52w - quote.low52w, price * 0.05);
  const dailyVol = range / (Math.max(quote.low52w, price * 0.5) * Math.sqrt(252));
  const monthlyMove = price * dailyVol * Math.sqrt(30);

  let targetLow: number;
  let targetHigh: number;
  if (direction === 'UP') {
    targetLow  = Math.round(price * 0.97 * 100) / 100;
    targetHigh = Math.round((price + monthlyMove * 1.2) * 100) / 100;
  } else if (direction === 'DOWN') {
    targetLow  = Math.round((price - monthlyMove * 1.2) * 100) / 100;
    targetHigh = Math.round(price * 1.03 * 100) / 100;
  } else {
    targetLow  = Math.round((price - monthlyMove * 0.6) * 100) / 100;
    targetHigh = Math.round((price + monthlyMove * 0.6) * 100) / 100;
  }

  // Key factors: top 3 dimension notes sorted by weight descending
  const sorted = [...dimensions].sort((a, b) => b.weight - a.weight);
  const keyFactors = sorted.slice(0, 3).map((d) => `${d.name}: ${d.notes}`);

  // Reasoning
  const signalLabel = signal === 'BUY' ? 'alcista' : signal === 'SELL' ? 'bajista' : 'neutral';
  const regimeLabel = market.regime === 'BULL' ? 'alcista' : market.regime === 'BEAR' ? 'bajista' : 'neutral';
  const rsiDesc = rsi > 65 ? 'sobrecomprado' : rsi < 35 ? 'sobrevendido' : 'en zona neutral';
  const reasoning =
    `El análisis técnico sugiere una perspectiva ${signalLabel} con puntuación ${score}/100 ` +
    `(confianza ${confidence === 'HIGH' ? 'alta' : confidence === 'MEDIUM' ? 'media' : 'baja'}). ` +
    `RSI en ${rsi.toFixed(0)} (${rsiDesc}) en un mercado ${regimeLabel} con VIX en ${market.vix.toFixed(0)}.`;

  // Risks: use existing risk flags or generic ones
  const riskList = risks.length > 0
    ? risks.slice(0, 3)
    : ['Volatilidad de mercado imprevista', 'Cambio en condiciones macroeconómicas', 'Análisis basado solo en datos técnicos — sin factores fundamentales'];

  // Reliability: how confident is the factor-based prediction
  let reliability = 30;
  if (confidence === 'HIGH')        reliability += 25;
  else if (confidence === 'MEDIUM') reliability += 15;
  else                              reliability += 5;
  // Dimension agreement (how many of 7 dimensions agree with final signal)
  const agreeing = dimensions.filter((d) => d.signal === signal).length;
  reliability += Math.round((agreeing / Math.max(dimensions.length, 1)) * 20);
  // Score extremity (farther from 50 = more decisive)
  const extremity = Math.abs(score - 50);
  if      (extremity > 20) reliability += 10;
  else if (extremity > 10) reliability += 5;
  const reliabilityScore = Math.min(reliability, 85);

  return {
    ticker: quote.ticker,
    direction,
    targetLow,
    targetHigh,
    targetDays: 30,
    probability,
    reasoning,
    keyFactors,
    risks: riskList,
    isAI: false,
    reliabilityScore,
  };
}

export async function generatePrediction(
  quote: Quote,
  analysis: StockAnalysis,
  market: MarketContext
): Promise<AIPrediction> {
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const dimensionSummary = analysis.dimensions
    .map((d) => `  - ${d.name}: ${d.score}/100 (${d.signal}) — ${d.notes}`)
    .join('\n');

  const prompt = `You are a quantitative analyst. Analyze this stock and provide a structured 30-day price prediction.

STOCK DATA:
- Ticker: ${quote.ticker} (${quote.name})
- Current Price: $${quote.price.toFixed(2)}
- Today's Change: ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%
- 52W Range: $${quote.low52w.toFixed(2)} – $${quote.high52w.toFixed(2)}
- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B
- Volume vs Avg: ${analysis.volumeRatio.toFixed(1)}x

TECHNICAL SIGNAL: ${analysis.signal} (score: ${analysis.score}/100, confidence: ${analysis.confidence})
- RSI(14): ${analysis.rsi.toFixed(1)}
- MA20: $${analysis.ma20.toFixed(2)} | MA50: $${analysis.ma50.toFixed(2)} | MA200: $${analysis.ma200.toFixed(2)}
- Price vs 52W High: ${analysis.priceVsHigh52w.toFixed(1)}%
- Price vs 52W Low: +${analysis.priceVsLow52w.toFixed(1)}%

ANALYSIS DIMENSIONS:
${dimensionSummary}

MARKET CONTEXT:
- VIX: ${market.vix.toFixed(1)} (${market.regime} regime)
- SPY today: ${market.spyChange >= 0 ? '+' : ''}${market.spyChange.toFixed(2)}%
- QQQ today: ${market.qqqChange >= 0 ? '+' : ''}${market.qqqChange.toFixed(2)}%

RISK FLAGS: ${analysis.risks.length > 0 ? analysis.risks.join('; ') : 'None detected'}

Based on this data, provide a 30-day price prediction with:
- direction: UP, DOWN, or SIDEWAYS
- targetLow: realistic lower bound of price range in 30 days
- targetHigh: realistic upper bound of price range in 30 days
- targetDays: 30
- probability: confidence percentage (0-100) that direction is correct
- reasoning: 2-3 sentences explaining the prediction
- keyFactors: exactly 3-4 bullet points driving the prediction
- risks: exactly 2-3 main risks that could invalidate the prediction

Be realistic and data-driven. Base the price range on historical volatility implied by the 52W range.`;

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: PredictionSchema,
    prompt,
  });

  // AI reliability: slightly above its own stated probability (AI expresses confidence directly)
  const reliabilityScore = Math.min(Math.round(object.probability * 0.9 + 5), 90);
  return { ticker: quote.ticker, ...object, isAI: true, reliabilityScore };
}
