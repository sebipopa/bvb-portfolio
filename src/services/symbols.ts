/**
 * Symbol mapping between the app's SYMBOL.EXCHANGE format and provider tickers,
 * plus price/currency normalisation. Pure TypeScript: shared with the Worker.
 */

import { parseSymbol } from './exchangeService';

/** TradingView tickers to try, in order of preference. */
export function toTradingViewTickers(appSymbol: string): string[] {
  const { symbol, exchange } = parseSymbol(appSymbol);
  switch (exchange) {
    case 'BVB':
      return [`BVB:${symbol}`];
    case 'L':
      return [`LSE:${symbol}`];
    case 'CRYPTO':
      return [`COINBASE:${symbol}USD`, `BINANCE:${symbol}USDT`];
  }
}

export function toYahooTicker(appSymbol: string): string {
  const { symbol, exchange } = parseSymbol(appSymbol);
  switch (exchange) {
    case 'BVB':
      return `${symbol}.RO`;
    case 'L':
      return `${symbol}.L`;
    case 'CRYPTO':
      return `${symbol}-USD`;
  }
}

/**
 * Normalise a raw provider price:
 * - pence (TradingView "GBX", Yahoo "GBp") become pounds
 * - Tether ("USDT") is reported as USD
 * - everything else is upper-cased
 */
export function normalizePrice(price: number, currency: string): { price: number; currency: string } {
  const upper = currency.toUpperCase();
  if (currency === 'GBp' || upper === 'GBX') {
    // toFixed removes the binary noise from the division (1.3155000000000001 -> 1.3155)
    return { price: Number((price / 100).toFixed(8)), currency: 'GBP' };
  }
  if (upper === 'USDT') {
    return { price, currency: 'USD' };
  }
  return { price, currency: upper };
}
