/**
 * Price providers entry point.
 *
 * fetchQuotes() asks TradingView for everything in one request and falls back
 * to Yahoo for whatever TradingView could not resolve. Shared by the app and
 * the Cloudflare Worker, so keep this file free of React Native imports.
 */

import { fetchTradingViewQuotes } from './tradingview';
import { FetchFn, FetchQuotesResult } from './types';
import { fetchYahooQuotes } from './yahoo';

export type { FetchFn, FetchQuotesResult, ProviderName, Quote, QuoteError } from './types';

/** Trim, upper-case, drop empties and duplicates while preserving first-seen order. */
export function normalizeSymbols(symbols: string[]): string[] {
  return Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0)));
}

export async function fetchQuotes(symbols: string[], fetchFn: FetchFn = fetch): Promise<FetchQuotesResult> {
  const unique = normalizeSymbols(symbols);
  if (unique.length === 0) {
    return { quotes: [], errors: [] };
  }

  const primary = await fetchTradingViewQuotes(unique, fetchFn);
  if (primary.errors.length === 0) {
    return primary;
  }

  const primaryReasons = new Map(primary.errors.map((e) => [e.symbol, e.reason]));
  const fallback = await fetchYahooQuotes(Array.from(primaryReasons.keys()), fetchFn);

  return {
    quotes: [...primary.quotes, ...fallback.quotes],
    errors: fallback.errors.map((e) => ({
      symbol: e.symbol,
      reason: `tradingview: ${primaryReasons.get(e.symbol)}; yahoo: ${e.reason}`,
    })),
  };
}
