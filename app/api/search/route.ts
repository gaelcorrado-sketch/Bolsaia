import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export interface SearchResult {
  ticker: string;
  name: string;
  type: string;
  exchange: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    const url =
      `https://query2.finance.yahoo.com/v1/finance/search` +
      `?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0` +
      `&enableFuzzyQuery=false&enableCb=false&enableNavLinks=false`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; stockbot/1.0)',
        Accept: 'application/json',
      },
      // Cache for 60 s at the edge — search results are stable
      next: { revalidate: 60 },
    });

    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const quotes: Array<Record<string, string>> = data.quotes ?? [];

    const TYPE_MAP: Record<string, string> = {
      EQUITY: 'Acción',
      ETF: 'ETF',
      MUTUALFUND: 'Fondo',
      CRYPTOCURRENCY: 'Cripto',
      INDEX: 'Índice',
      FUTURE: 'Futuro',
      CURRENCY: 'Divisa',
    };

    const results: SearchResult[] = quotes
      // Keep US-listed equities, ETFs, crypto, indices — skip pure international tickers (contain '.')
      // Crypto uses '-' (BTC-USD) so we keep those explicitly
      .filter((q) => {
        if (!q.symbol) return false;
        const type = (q.quoteType ?? '').toUpperCase();
        if (type === 'CRYPTOCURRENCY') return true; // always include crypto
        if (type === 'INDEX') return true;          // always include indices
        // For equities and ETFs, prefer symbols without dots (US) but allow BRK.B style (single dot, US)
        const dotCount = (q.symbol.match(/\./g) ?? []).length;
        if (dotCount >= 2) return false; // e.g. AAPL.MX.something — skip
        return true;
      })
      .slice(0, 8)
      .map((q) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: TYPE_MAP[(q.quoteType ?? '').toUpperCase()] ?? q.typeDisp ?? 'Acción',
        exchange: q.exchDisp ?? q.exchange ?? '',
      }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
