/**
 * Yahoo Finance chart provider (fallback).
 *
 * One GET per symbol. Covers BVB (.RO), LSE (.L) and crypto (-USD).
 * Yahoo rate-limits aggressively per IP (HTTP 429), which is why it is only
 * used for symbols TradingView could not resolve. Unofficial endpoint.
 */

import { normalizePrice, toYahooTicker } from '../symbols';
import { FetchFn, FetchQuotesResult, Quote, QuoteError, USER_AGENT } from './types';

export const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

interface ChartResponse {
  chart?: {
    result?: { meta?: { currency?: string; regularMarketPrice?: number } }[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

export async function fetchYahooQuote(symbol: string, fetchFn: FetchFn = fetch): Promise<Quote> {
  const ticker = toYahooTicker(symbol);
  const response = await fetchFn(`${YAHOO_CHART_URL}${encodeURIComponent(ticker)}?range=1d&interval=1d`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  // Yahoo answers 404 + JSON error for unknown tickers and 429 + text when rate limited.
  const body = (await response.json().catch(() => null)) as ChartResponse | null;
  const description = body?.chart?.error?.description;
  if (!response.ok) {
    throw new Error(description ?? `Yahoo HTTP ${response.status}`);
  }
  const meta = body?.chart?.result?.[0]?.meta;
  if (!meta) {
    throw new Error(description ?? 'No data in Yahoo response');
  }
  if (typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0 || !meta.currency) {
    throw new Error('No price in Yahoo response');
  }
  const normalized = normalizePrice(meta.regularMarketPrice, meta.currency);
  return {
    symbol,
    price: normalized.price,
    currency: normalized.currency,
    fetchedAt: Date.now(),
    source: 'yahoo',
  };
}

export async function fetchYahooQuotes(symbols: string[], fetchFn: FetchFn = fetch): Promise<FetchQuotesResult> {
  const settled = await Promise.allSettled(symbols.map((symbol) => fetchYahooQuote(symbol, fetchFn)));
  const quotes: Quote[] = [];
  const errors: QuoteError[] = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      quotes.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ symbol: symbols[index], reason });
    }
  });
  return { quotes, errors };
}
