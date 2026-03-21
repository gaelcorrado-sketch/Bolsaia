import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getChartData, getMarketContext } from '@/lib/yahoo-finance';
import { analyzeStock } from '@/lib/analysis-engine';
import { generatePrediction } from '@/lib/claude-predictor';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  try {
    const [quote, candles, market] = await Promise.all([
      getQuote(ticker.toUpperCase()),
      getChartData(ticker.toUpperCase(), '1y'),
      getMarketContext(),
    ]);
    const analysis = analyzeStock(quote, candles, market);
    const prediction = await generatePrediction(quote, analysis, market);
    return NextResponse.json(prediction);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
