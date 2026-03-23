import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getChartData, getMarketContext, getFundamentals } from '@/lib/yahoo-finance';
import { analyzeStock } from '@/lib/analysis-engine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  try {
    const [quote, candles, market, fundamentals] = await Promise.all([
      getQuote(ticker.toUpperCase()),
      getChartData(ticker.toUpperCase(), '1y'),
      getMarketContext(),
      getFundamentals(ticker.toUpperCase()),
    ]);
    const analysis = analyzeStock(quote, candles, market, fundamentals);
    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: `Analysis failed for ${ticker}: ${msg}` },
      { status: 500 }
    );
  }
}
