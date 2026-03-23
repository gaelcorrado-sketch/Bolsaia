import { NextResponse } from 'next/server';
import { getMarketContext } from '@/lib/yahoo-finance';

export async function GET() {
  try {
    const market = await getMarketContext();
    return NextResponse.json(market, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not fetch market data' },
      { status: 500 }
    );
  }
}
