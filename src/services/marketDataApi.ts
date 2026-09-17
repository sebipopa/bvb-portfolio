/**
 * Market Data API Service
 *
 * Resolves current prices for app symbols (SYMBOL.EXCHANGE, see exchangeService).
 * - If EXPO_PUBLIC_PRICE_API_URL is set, asks the Cloudflare Worker in worker/.
 * - Otherwise calls the shared providers directly (TradingView, then Yahoo).
 *
 * Keeps a 15-minute in-memory cache. Entries are never deleted, only marked
 * stale, so a failed refresh still shows the last known price instead of 0.
 */

import { StockMarketData } from '../types/Stock';
import { getExchangeInfo, parseSymbol } from './exchangeService';
import { fetchQuotes, FetchQuotesResult, Quote } from './providers';

export const PRICE_CACHE_DURATION_MS = 15 * 60 * 1000;

interface CacheEntry {
  price: StockMarketData;
  timestamp: number;
  fresh: boolean;
}

const priceCache = new Map<string, CacheEntry>();

/** Base URL of the price worker, or undefined to fetch directly from the providers. */
export function getPriceApiUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_PRICE_API_URL;
  return url && url.trim().length > 0 ? url.trim().replace(/\/+$/, '') : undefined;
}

async function fetchFromWorker(symbols: string[], baseUrl: string): Promise<FetchQuotesResult> {
  const response = await fetch(`${baseUrl}/prices?symbols=${encodeURIComponent(symbols.join(','))}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Price API HTTP ${response.status}`);
  }
  return (await response.json()) as FetchQuotesResult;
}

async function fetchLiveQuotes(symbols: string[]): Promise<FetchQuotesResult> {
  const workerUrl = getPriceApiUrl();
  if (workerUrl) {
    try {
      return await fetchFromWorker(symbols, workerUrl);
    } catch (error) {
      console.warn('⚠️ Price worker failed, falling back to direct providers:', error);
    }
  }
  return fetchQuotes(symbols);
}

function toMarketData(quote: Quote): StockMarketData {
  return { symbol: quote.symbol, currentPrice: quote.price, currency: quote.currency, lastUpdate: quote.fetchedAt };
}

function zeroPrice(symbol: string): StockMarketData {
  let currency = 'RON';
  try {
    currency = getExchangeInfo(parseSymbol(symbol).exchange).currency;
  } catch {
    // unknown format: keep RON
  }
  return { symbol, currentPrice: 0, currency, lastUpdate: Date.now() };
}

/**
 * Fetch prices for many symbols with ONE upstream request for everything
 * that is not freshly cached. Result order matches the input order.
 */
export async function getStockPrices(symbols: string[]): Promise<StockMarketData[]> {
  const now = Date.now();
  const keyBySymbol = new Map<string, string>();
  const toFetch: string[] = [];

  for (const symbol of symbols) {
    try {
      const key = parseSymbol(symbol).fullSymbol;
      keyBySymbol.set(symbol, key);
      const cached = priceCache.get(key);
      const isFresh = cached && cached.fresh && now - cached.timestamp < PRICE_CACHE_DURATION_MS;
      if (!isFresh && !toFetch.includes(key)) {
        toFetch.push(key);
      }
    } catch (error) {
      console.warn(`⚠️ Skipping invalid symbol "${symbol}":`, error);
    }
  }

  if (toFetch.length > 0) {
    console.log(`🌐 Fetching prices for ${toFetch.length} symbols: ${toFetch.join(', ')}`);
    const result = await fetchLiveQuotes(toFetch);
    for (const quote of result.quotes) {
      if (quote.price > 0) {
        priceCache.set(quote.symbol, { price: toMarketData(quote), timestamp: now, fresh: true });
      }
    }
    for (const error of result.errors) {
      console.warn(`⚠️ No price for ${error.symbol}: ${error.reason}`);
    }
  }

  return symbols.map((symbol) => {
    const key = keyBySymbol.get(symbol);
    const cached = key ? priceCache.get(key) : undefined;
    return cached ? cached.price : zeroPrice(symbol);
  });
}

export async function getStockPrice(fullSymbol: string): Promise<StockMarketData> {
  const [price] = await getStockPrices([fullSymbol]);
  return price;
}

/** When the symbol's price was last fetched, or null if never. */
export function getCachedTimestamp(fullSymbol: string): number | null {
  try {
    const cached = priceCache.get(parseSymbol(fullSymbol).fullSymbol);
    return cached ? cached.timestamp : null;
  } catch {
    return null;
  }
}

/**
 * Mark one symbol as stale so the next read refetches it (the last known price
 * is kept as fallback), or drop the whole cache when called without arguments.
 */
export function clearPriceCache(fullSymbol?: string): void {
  if (fullSymbol) {
    try {
      const entry = priceCache.get(parseSymbol(fullSymbol).fullSymbol);
      if (entry) entry.fresh = false;
    } catch (error) {
      console.error(`Error clearing cache for ${fullSymbol}:`, error);
    }
    return;
  }
  priceCache.clear();
}
