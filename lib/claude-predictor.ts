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

  return { ticker: quote.ticker, ...object };
}
