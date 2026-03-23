'use client';
import { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import type { SearchResult } from '@/app/api/search/route';

const TYPE_COLOR: Record<string, string> = {
  Cripto:  'var(--hold)',
  ETF:     'var(--accent-blue)',
  Índice:  'var(--text-tertiary)',
  Fondo:   'var(--text-tertiary)',
};

export function StockSearch({ onSearch }: { onSearch: (ticker: string) => void }) {
  const [value, setValue]           = useState('');
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [focused, setFocused]       = useState(false);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const dropdownRef                 = useRef<HTMLDivElement>(null);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live search with 280 ms debounce ───────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 1) {
      debounceRef.current = setTimeout(() => search(value), 280);
    } else {
      setResults([]);
      setOpen(false);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, search]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current   && !inputRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setValue('');
    setResults([]);
    setOpen(false);
    onSearch(t);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // If there's exactly one result and it matches well, use it; otherwise use raw input
    const t = results.length === 1 ? results[0].ticker : value.trim();
    if (t) submit(t);
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          {/* Search icon or spinner */}
          {loading ? (
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none"
              style={{ color: 'var(--accent)' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: focused ? 'var(--accent-blue)' : 'var(--text-tertiary)', transition: 'color 0.15s' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          )}

          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
            onBlur={() => setFocused(false)}
            placeholder="Buscar cualquier acción, ETF o cripto... (ej: Apple, Bitcoin, QQQ)"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full pl-9 pr-3 py-2.5 font-data text-sm rounded-lg"
            style={{
              background: 'var(--surface-raised)',
              border: `1px solid ${focused ? 'rgba(59,130,246,0.5)' : 'var(--border)'}`,
              color: 'var(--foreground)',
              outline: 'none',
              fontSize: '14px',
              transition: 'border-color 0.15s',
              boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.08)' : 'none',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            background: value.trim() ? 'var(--accent-blue)' : 'var(--surface-raised)',
            color: value.trim() ? '#020617' : 'var(--text-tertiary)',
            border: '1px solid transparent',
            borderRadius: '8px',
            padding: '0 18px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: value.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            minHeight: '44px',
          }}
          onMouseEnter={(e) => { if (value.trim()) e.currentTarget.style.background = '#2563eb'; }}
          onMouseLeave={(e) => { if (value.trim()) e.currentTarget.style.background = 'var(--accent-blue)'; }}
        >
          Analizar
        </button>
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {results.map((r) => (
            <button
              key={r.ticker}
              onMouseDown={(e) => { e.preventDefault(); submit(r.ticker); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-overlay)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span
                className="font-data text-sm font-bold shrink-0"
                style={{ color: 'var(--foreground)', minWidth: 72 }}
              >
                {r.ticker}
              </span>
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                {r.name}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="label-caps px-1.5 py-0.5 rounded-sm"
                  style={{
                    fontSize: '0.52rem',
                    color: TYPE_COLOR[r.type] ?? 'var(--buy)',
                    background: `${TYPE_COLOR[r.type] ?? 'var(--buy)'}15`,
                    border: `1px solid ${TYPE_COLOR[r.type] ?? 'var(--buy)'}30`,
                  }}
                >
                  {r.type}
                </span>
                {r.exchange && (
                  <span className="label-caps" style={{ color: 'var(--text-tertiary)', fontSize: '0.52rem' }}>
                    {r.exchange}
                  </span>
                )}
              </div>
            </button>
          ))}
          <div
            className="px-4 py-1.5 label-caps border-t"
            style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)', fontSize: '0.52rem' }}
          >
            Resultados en tiempo real via Yahoo Finance · {results.length} encontrados
          </div>
        </div>
      )}
    </div>
  );
}
