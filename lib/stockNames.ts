/** Maps common company names, aliases, and partial terms → Yahoo Finance ticker */
export const NAME_TO_TICKER: Record<string, string> = {
  // Mega Tech
  'APPLE': 'AAPL', 'MICROSOFT': 'MSFT', 'GOOGLE': 'GOOGL', 'ALPHABET': 'GOOGL',
  'AMAZON': 'AMZN', 'TESLA': 'TSLA', 'NVIDIA': 'NVDA', 'NVDA': 'NVDA',
  'META': 'META', 'FACEBOOK': 'META', 'ORACLE': 'ORCL', 'ADOBE': 'ADBE',
  'BROADCOM': 'AVGO',
  // Semis
  'AMD': 'AMD', 'INTEL': 'INTC', 'QUALCOMM': 'QCOM', 'MICRON': 'MU',
  'APPLIED MATERIALS': 'AMAT', 'LAM RESEARCH': 'LRCX', 'TEXAS INSTRUMENTS': 'TXN',
  'MARVELL': 'MRVL', 'ON SEMICONDUCTOR': 'ON',
  // Software / Cloud
  'SALESFORCE': 'CRM', 'SERVICENOW': 'NOW', 'INTUIT': 'INTU',
  'PALO ALTO': 'PANW', 'CROWDSTRIKE': 'CRWD', 'SNOWFLAKE': 'SNOW',
  'PALANTIR': 'PLTR', 'DATADOG': 'DDOG', 'CLOUDFLARE': 'NET',
  'ZSCALER': 'ZS', 'FORTINET': 'FTNT', 'UBER': 'UBER', 'AIRBNB': 'ABNB',
  'NETFLIX': 'NFLX',
  // Finance
  'JPMORGAN': 'JPM', 'JP MORGAN': 'JPM', 'BANK OF AMERICA': 'BAC',
  'WELLS FARGO': 'WFC', 'GOLDMAN SACHS': 'GS', 'GOLDMAN': 'GS',
  'MORGAN STANLEY': 'MS', 'CITIGROUP': 'C', 'CITI': 'C',
  'BERKSHIRE': 'BRK-B', 'BERKSHIRE HATHAWAY': 'BRK-B',
  'VISA': 'V', 'MASTERCARD': 'MA', 'AMERICAN EXPRESS': 'AXP', 'AMEX': 'AXP',
  'BLACKROCK': 'BLK', 'CHARLES SCHWAB': 'SCHW', 'CME GROUP': 'CME',
  'ICE': 'ICE',
  // Healthcare
  'UNITEDHEALTH': 'UNH', 'ELI LILLY': 'LLY', 'LILLY': 'LLY',
  'JOHNSON': 'JNJ', 'ABBVIE': 'ABBV', 'MERCK': 'MRK', 'PFIZER': 'PFE',
  'CVS': 'CVS', 'AMGEN': 'AMGN', 'GILEAD': 'GILD', 'REGENERON': 'REGN',
  'INTUITIVE SURGICAL': 'ISRG', 'STRYKER': 'SYK', 'DANAHER': 'DHR',
  'BRISTOL MYERS': 'BMY',
  // Energy
  'EXXON': 'XOM', 'EXXONMOBIL': 'XOM', 'CHEVRON': 'CVX',
  'CONOCOPHILLIPS': 'COP', 'CONOCO': 'COP', 'SCHLUMBERGER': 'SLB',
  'SLB': 'SLB', 'MARATHON': 'MPC', 'VALERO': 'VLO', 'OCCIDENTAL': 'OXY',
  // Consumer
  'WALMART': 'WMT', 'COSTCO': 'COST', 'HOME DEPOT': 'HD',
  'NIKE': 'NKE', 'MCDONALDS': 'MCD', "MCDONALD'S": 'MCD',
  'STARBUCKS': 'SBUX', 'TARGET': 'TGT', 'DISNEY': 'DIS',
  'COCA COLA': 'KO', 'COCACOLA': 'KO', 'PEPSI': 'PEP', 'PEPSICO': 'PEP',
  'LOWES': 'LOW', "LOWE'S": 'LOW', 'TJX': 'TJX',
  // Industrial
  'BOEING': 'BA', 'CATERPILLAR': 'CAT', 'HONEYWELL': 'HON',
  'RAYTHEON': 'RTX', 'GE': 'GE', 'GENERAL ELECTRIC': 'GE',
  'JOHN DEERE': 'DE', 'DEERE': 'DE', 'UPS': 'UPS', 'FEDEX': 'FDX',
  'LOCKHEED': 'LMT', 'NORTHROP': 'NOC',
  // ETFs / Indices
  'SP500': 'SPY', 'S&P': 'SPY', 'S&P500': 'SPY', 'S&P 500': 'SPY',
  'NASDAQ': 'QQQ', 'DOW': 'DIA', 'DOW JONES': 'DIA', 'RUSSELL': 'IWM',
  'GOLD': 'GLD', 'SILVER': 'SLV', 'TREASURY': 'TLT', 'BONDS': 'TLT',
  'ARK': 'ARKK',
  // Crypto
  'BITCOIN': 'BTC-USD', 'BTC': 'BTC-USD',
  'ETHEREUM': 'ETH-USD', 'ETH': 'ETH-USD',
  'SOLANA': 'SOL-USD', 'SOL': 'SOL-USD',
  'BINANCE': 'BNB-USD', 'BNB': 'BNB-USD',
  'RIPPLE': 'XRP-USD', 'XRP': 'XRP-USD',
  'CARDANO': 'ADA-USD', 'ADA': 'ADA-USD',
  'DOGECOIN': 'DOGE-USD', 'DOGE': 'DOGE-USD',
  'AVALANCHE': 'AVAX-USD', 'AVAX': 'AVAX-USD',
  'POLKADOT': 'DOT-USD', 'DOT': 'DOT-USD',
};

export interface TickerMeta {
  ticker: string;
  name: string;
  category: string;
}

export const ALL_TICKERS: TickerMeta[] = [
  // Mega Tech
  { ticker: 'AAPL',  name: 'Apple',             category: 'MEGA TECH' },
  { ticker: 'MSFT',  name: 'Microsoft',          category: 'MEGA TECH' },
  { ticker: 'NVDA',  name: 'NVIDIA',             category: 'MEGA TECH' },
  { ticker: 'GOOGL', name: 'Alphabet / Google',  category: 'MEGA TECH' },
  { ticker: 'AMZN',  name: 'Amazon',             category: 'MEGA TECH' },
  { ticker: 'META',  name: 'Meta / Facebook',    category: 'MEGA TECH' },
  { ticker: 'TSLA',  name: 'Tesla',              category: 'MEGA TECH' },
  { ticker: 'AVGO',  name: 'Broadcom',           category: 'MEGA TECH' },
  { ticker: 'ORCL',  name: 'Oracle',             category: 'MEGA TECH' },
  { ticker: 'ADBE',  name: 'Adobe',              category: 'MEGA TECH' },
  // Semis
  { ticker: 'AMD',   name: 'Advanced Micro Devices', category: 'SEMIS' },
  { ticker: 'INTC',  name: 'Intel',              category: 'SEMIS' },
  { ticker: 'QCOM',  name: 'Qualcomm',           category: 'SEMIS' },
  { ticker: 'MU',    name: 'Micron Technology',  category: 'SEMIS' },
  { ticker: 'AMAT',  name: 'Applied Materials',  category: 'SEMIS' },
  { ticker: 'LRCX',  name: 'Lam Research',       category: 'SEMIS' },
  { ticker: 'TXN',   name: 'Texas Instruments',  category: 'SEMIS' },
  { ticker: 'MRVL',  name: 'Marvell Technology', category: 'SEMIS' },
  // Software / Cloud
  { ticker: 'CRM',   name: 'Salesforce',         category: 'SOFTWARE' },
  { ticker: 'NOW',   name: 'ServiceNow',         category: 'SOFTWARE' },
  { ticker: 'INTU',  name: 'Intuit',             category: 'SOFTWARE' },
  { ticker: 'PANW',  name: 'Palo Alto Networks', category: 'SOFTWARE' },
  { ticker: 'CRWD',  name: 'CrowdStrike',        category: 'SOFTWARE' },
  { ticker: 'SNOW',  name: 'Snowflake',          category: 'SOFTWARE' },
  { ticker: 'PLTR',  name: 'Palantir',           category: 'SOFTWARE' },
  { ticker: 'DDOG',  name: 'Datadog',            category: 'SOFTWARE' },
  { ticker: 'NET',   name: 'Cloudflare',         category: 'SOFTWARE' },
  { ticker: 'UBER',  name: 'Uber',               category: 'SOFTWARE' },
  { ticker: 'ABNB',  name: 'Airbnb',             category: 'SOFTWARE' },
  // Finance
  { ticker: 'JPM',   name: 'JPMorgan Chase',      category: 'FINANZAS' },
  { ticker: 'BAC',   name: 'Bank of America',     category: 'FINANZAS' },
  { ticker: 'WFC',   name: 'Wells Fargo',         category: 'FINANZAS' },
  { ticker: 'GS',    name: 'Goldman Sachs',       category: 'FINANZAS' },
  { ticker: 'MS',    name: 'Morgan Stanley',      category: 'FINANZAS' },
  { ticker: 'C',     name: 'Citigroup',           category: 'FINANZAS' },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway',  category: 'FINANZAS' },
  { ticker: 'V',     name: 'Visa',                category: 'FINANZAS' },
  { ticker: 'MA',    name: 'Mastercard',          category: 'FINANZAS' },
  { ticker: 'AXP',   name: 'American Express',    category: 'FINANZAS' },
  { ticker: 'BLK',   name: 'BlackRock',           category: 'FINANZAS' },
  { ticker: 'SCHW',  name: 'Charles Schwab',      category: 'FINANZAS' },
  // Healthcare
  { ticker: 'UNH',   name: 'UnitedHealth Group', category: 'SALUD' },
  { ticker: 'LLY',   name: 'Eli Lilly',          category: 'SALUD' },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',  category: 'SALUD' },
  { ticker: 'ABBV',  name: 'AbbVie',             category: 'SALUD' },
  { ticker: 'MRK',   name: 'Merck',              category: 'SALUD' },
  { ticker: 'PFE',   name: 'Pfizer',             category: 'SALUD' },
  { ticker: 'AMGN',  name: 'Amgen',              category: 'SALUD' },
  { ticker: 'GILD',  name: 'Gilead Sciences',    category: 'SALUD' },
  { ticker: 'REGN',  name: 'Regeneron',          category: 'SALUD' },
  { ticker: 'ISRG',  name: 'Intuitive Surgical', category: 'SALUD' },
  { ticker: 'SYK',   name: 'Stryker',            category: 'SALUD' },
  // Energy
  { ticker: 'XOM',   name: 'ExxonMobil',          category: 'ENERGÍA' },
  { ticker: 'CVX',   name: 'Chevron',             category: 'ENERGÍA' },
  { ticker: 'COP',   name: 'ConocoPhillips',      category: 'ENERGÍA' },
  { ticker: 'EOG',   name: 'EOG Resources',       category: 'ENERGÍA' },
  { ticker: 'SLB',   name: 'SLB (Schlumberger)',  category: 'ENERGÍA' },
  { ticker: 'OXY',   name: 'Occidental Petroleum',category: 'ENERGÍA' },
  { ticker: 'MPC',   name: 'Marathon Petroleum',  category: 'ENERGÍA' },
  { ticker: 'VLO',   name: 'Valero Energy',       category: 'ENERGÍA' },
  // Consumer
  { ticker: 'WMT',   name: 'Walmart',    category: 'CONSUMO' },
  { ticker: 'COST',  name: 'Costco',     category: 'CONSUMO' },
  { ticker: 'HD',    name: 'Home Depot', category: 'CONSUMO' },
  { ticker: 'NKE',   name: 'Nike',       category: 'CONSUMO' },
  { ticker: 'MCD',   name: "McDonald's", category: 'CONSUMO' },
  { ticker: 'SBUX',  name: 'Starbucks',  category: 'CONSUMO' },
  { ticker: 'TGT',   name: 'Target',     category: 'CONSUMO' },
  { ticker: 'DIS',   name: 'Disney',     category: 'CONSUMO' },
  { ticker: 'NFLX',  name: 'Netflix',    category: 'CONSUMO' },
  { ticker: 'KO',    name: 'Coca-Cola',  category: 'CONSUMO' },
  { ticker: 'PEP',   name: 'PepsiCo',   category: 'CONSUMO' },
  // Industrial
  { ticker: 'BA',    name: 'Boeing',           category: 'INDUSTRIAL' },
  { ticker: 'CAT',   name: 'Caterpillar',      category: 'INDUSTRIAL' },
  { ticker: 'HON',   name: 'Honeywell',        category: 'INDUSTRIAL' },
  { ticker: 'RTX',   name: 'RTX Corporation',  category: 'INDUSTRIAL' },
  { ticker: 'GE',    name: 'GE Aerospace',     category: 'INDUSTRIAL' },
  { ticker: 'DE',    name: 'John Deere',       category: 'INDUSTRIAL' },
  { ticker: 'UPS',   name: 'UPS',              category: 'INDUSTRIAL' },
  { ticker: 'FDX',   name: 'FedEx',            category: 'INDUSTRIAL' },
  { ticker: 'LMT',   name: 'Lockheed Martin',  category: 'INDUSTRIAL' },
  // ETFs
  { ticker: 'SPY',   name: 'S&P 500 ETF',         category: 'ETFs' },
  { ticker: 'QQQ',   name: 'NASDAQ 100 ETF',       category: 'ETFs' },
  { ticker: 'DIA',   name: 'Dow Jones ETF',         category: 'ETFs' },
  { ticker: 'IWM',   name: 'Russell 2000 ETF',      category: 'ETFs' },
  { ticker: 'VTI',   name: 'Total Market ETF',      category: 'ETFs' },
  { ticker: 'GLD',   name: 'Gold ETF',              category: 'ETFs' },
  { ticker: 'SLV',   name: 'Silver ETF',            category: 'ETFs' },
  { ticker: 'TLT',   name: 'Long-Term Bonds ETF',   category: 'ETFs' },
  { ticker: 'XLK',   name: 'Tech Sector ETF',       category: 'ETFs' },
  { ticker: 'XLF',   name: 'Finance Sector ETF',    category: 'ETFs' },
  { ticker: 'ARKK',  name: 'ARK Innovation ETF',    category: 'ETFs' },
  // Crypto
  { ticker: 'BTC-USD',  name: 'Bitcoin',     category: 'CRYPTO' },
  { ticker: 'ETH-USD',  name: 'Ethereum',    category: 'CRYPTO' },
  { ticker: 'SOL-USD',  name: 'Solana',      category: 'CRYPTO' },
  { ticker: 'BNB-USD',  name: 'Binance Coin',category: 'CRYPTO' },
  { ticker: 'XRP-USD',  name: 'Ripple',      category: 'CRYPTO' },
  { ticker: 'ADA-USD',  name: 'Cardano',     category: 'CRYPTO' },
  { ticker: 'AVAX-USD', name: 'Avalanche',   category: 'CRYPTO' },
  { ticker: 'DOGE-USD', name: 'Dogecoin',    category: 'CRYPTO' },
  { ticker: 'DOT-USD',  name: 'Polkadot',    category: 'CRYPTO' },
];

/** Resolve a search query (name, alias, or ticker) to the correct Yahoo Finance ticker */
export function resolveToTicker(query: string): string {
  const q = query.trim().toUpperCase();
  const mapped = NAME_TO_TICKER[q];
  if (mapped) return mapped;
  // Exact ticker match in master list
  const exact = ALL_TICKERS.find((t) => t.ticker === q);
  if (exact) return exact.ticker;
  return q;
}

/** Return autocomplete suggestions for a query (matches ticker or company name) */
export function searchTickers(query: string): TickerMeta[] {
  if (!query || query.length < 1) return [];
  const q = query.trim().toUpperCase();
  return ALL_TICKERS.filter((t) =>
    t.ticker.includes(q) ||
    t.name.toUpperCase().includes(q)
  ).slice(0, 8);
}

/** Get all tickers for a given category */
export function getTickersByCategory(category: string): TickerMeta[] {
  return ALL_TICKERS.filter((t) => t.category === category);
}

export const CATEGORIES = [
  'MEGA TECH', 'SEMIS', 'SOFTWARE', 'FINANZAS', 'SALUD',
  'ENERGÍA', 'CONSUMO', 'INDUSTRIAL', 'ETFs', 'CRYPTO',
] as const;
