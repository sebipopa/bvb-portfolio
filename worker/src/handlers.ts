/**
 * Request and cron handlers for the price cache Worker.
 *
 * Plain functions that take `env` and `deps` so tests can pass an in-memory
 * KV and a fake fetchQuotes. KV layout is deliberately two keys:
 *   quotes  -> JSON map  { "TLV.BVB": Quote, ... }
 *   symbols -> JSON list [ "TLV.BVB", ... ]   (what the cron refreshes)
 * One blob per write keeps us far below the free tier's 1000 KV writes/day.
 */

import { isValidSymbolFormat } from '../../src/services/exchangeService';
import { fetchQuotes, normalizeSymbols } from '../../src/services/providers';
import type { FetchQuotesResult, Quote, QuoteError } from '../../src/services/providers';

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface PriceEnv {
  PRICES: KVLike;
}

export interface Deps {
  fetchQuotes: (symbols: string[]) => Promise<FetchQuotesResult>;
}

export const QUOTES_KEY = 'quotes';
export const SYMBOLS_KEY = 'symbols';
export const MAX_SYMBOLS = 50;

type QuoteMap = Record<string, Quote>;

const defaultDeps: Deps = { fetchQuotes: (symbols) => fetchQuotes(symbols) };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
    },
  });
}

async function readJson<T>(kv: KVLike, key: string, fallback: T): Promise<T> {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseSymbolsParam(raw: string | null): { symbols: string[]; invalid: string[] } {
  const symbols = normalizeSymbols((raw ?? '').split(','));
  const invalid = symbols.filter((s) => !isValidSymbolFormat(s));
  return { symbols, invalid };
}

async function trackSymbols(kv: KVLike, newSymbols: string[]): Promise<void> {
  const tracked = await readJson<string[]>(kv, SYMBOLS_KEY, []);
  const set = new Set(tracked);
  let changed = false;
  for (const symbol of newSymbols) {
    if (!set.has(symbol)) {
      set.add(symbol);
      changed = true;
    }
  }
  if (changed) {
    await kv.put(SYMBOLS_KEY, JSON.stringify(Array.from(set)));
  }
}

export async function handlePrices(request: Request, env: PriceEnv, deps: Deps = defaultDeps): Promise<Response> {
  const url = new URL(request.url);
  const { symbols, invalid } = parseSymbolsParam(url.searchParams.get('symbols'));
  if (symbols.length === 0) {
    return json({ error: 'symbols query param required, e.g. ?symbols=TLV.BVB,CSPX.L' }, 400);
  }
  if (invalid.length > 0) {
    return json({ error: `invalid symbols: ${invalid.join(', ')}` }, 400);
  }
  if (symbols.length > MAX_SYMBOLS) {
    return json({ error: `at most ${MAX_SYMBOLS} symbols per request` }, 400);
  }

  const quoteMap = await readJson<QuoteMap>(env.PRICES, QUOTES_KEY, {});
  const missing = symbols.filter((symbol) => !quoteMap[symbol]);
  let errors: QuoteError[] = [];

  if (missing.length > 0) {
    const result = await deps.fetchQuotes(missing);
    for (const quote of result.quotes) {
      quoteMap[quote.symbol] = quote;
    }
    errors = result.errors;
    if (result.quotes.length > 0) {
      await env.PRICES.put(QUOTES_KEY, JSON.stringify(quoteMap));
    }
    await trackSymbols(env.PRICES, missing);
  }

  const quotes = symbols.map((symbol) => quoteMap[symbol]).filter((q): q is Quote => Boolean(q));
  return json({ quotes, errors });
}

export async function refreshAll(
  env: PriceEnv,
  deps: Deps = defaultDeps
): Promise<{ refreshed: number; errors: QuoteError[] }> {
  const tracked = await readJson<string[]>(env.PRICES, SYMBOLS_KEY, []);
  if (tracked.length === 0) {
    return { refreshed: 0, errors: [] };
  }

  const result = await deps.fetchQuotes(tracked);
  const quoteMap = await readJson<QuoteMap>(env.PRICES, QUOTES_KEY, {});
  for (const quote of result.quotes) {
    quoteMap[quote.symbol] = quote;
  }
  if (result.quotes.length > 0) {
    await env.PRICES.put(QUOTES_KEY, JSON.stringify(quoteMap));
  }
  return { refreshed: result.quotes.length, errors: result.errors };
}
