import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getChartData, getMarketContext } from '@/lib/yahoo-finance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const period = (request.nextUrl.searchParams.get('period') ?? '1mo') as
    | '1d'
    | '5d'
    | '1mo'
    | '3mo'
    | '1y';
  try {
    const [quote, chart, market] = await Promise.all([
      getQuote(ticker.toUpperCase()),
      getChartData(ticker.toUpperCase(), period),
      getMarketContext(),
    ]);
    return NextResponse.json({ quote, chart, market });
  } catch {
    return NextResponse.json(
      { error: `Could not fetch data for ${ticker}` },
      { status: 404 }
    );
  }
}
