'use client';
import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const POPULAR_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'BAC'];
const POPULAR_CRYPTO = ['BTC-USD', 'ETH-USD', 'SOL-USD'];

export function StockSearch({ onSearch }: { onSearch: (ticker: string) => void }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toUpperCase();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleQuickPick = (ticker: string) => {
    setValue(ticker);
    onSearch(ticker);
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="Ticker (ej: AAPL, BTC-USD)"
          className="font-mono"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" disabled={!value.trim()}>
          Analizar
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-muted-foreground">Acciones:</span>
        {POPULAR_STOCKS.map((t) => (
          <button
            key={t}
            onClick={() => handleQuickPick(t)}
            className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-accent font-mono transition-colors"
          >
            {t}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-1">Crypto:</span>
        {POPULAR_CRYPTO.map((t) => (
          <button
            key={t}
            onClick={() => handleQuickPick(t)}
            className="text-xs px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 font-mono text-blue-400 transition-colors"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
