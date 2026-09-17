/**
 * Shared quote types used by the price providers, the Cloudflare Worker and the app.
 * This file must stay free of React Native / Expo imports.
 */

export type ProviderName = 'tradingview' | 'yahoo';

export interface Quote {
  symbol: string; // app symbol, e.g. "TLV.BVB"
  price: number; // in `currency`, pence already converted to pounds
  currency: string; // ISO code: RON, GBP, USD, EUR
  fetchedAt: number; // ms epoch when the provider answered
  source: ProviderName;
}

export interface QuoteError {
  symbol: string;
  reason: string;
}

export interface FetchQuotesResult {
  quotes: Quote[];
  errors: QuoteError[];
}

export type FetchFn = typeof fetch;

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
