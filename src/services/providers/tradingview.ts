/**
 * TradingView scanner provider (primary).
 *
 * One POST returns every requested ticker with close price and currency.
 * Unknown tickers are silently omitted from the response, so callers get an
 * error entry for anything that did not come back. BVB quotes are 15 minutes
 * delayed; LSE and crypto are streaming.
 *
 * Unofficial endpoint: fine for personal use, not for a commercial release.
 */

import { normalizePrice, toTradingViewTickers } from '../symbols';
import { FetchFn, FetchQuotesResult, Quote, QuoteError, USER_AGENT } from './types';

export const TRADINGVIEW_SCAN_URL = 'https://scanner.tradingview.com/global/scan';
const COLUMNS = ['close', 'currency'];

interface ScanRow {
  s: string;
  d: [number | null, string | null];
}

interface ScanResponse {
  totalCount: number;
  data: ScanRow[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function fetchTradingViewQuotes(
  symbols: string[],
  fetchFn: FetchFn = fetch
): Promise<FetchQuotesResult> {
  const errors: QuoteError[] = [];
  const tickersBySymbol = new Map<string, string[]>();

  for (const symbol of symbols) {
    try {
      tickersBySymbol.set(symbol, toTradingViewTickers(symbol));
    } catch (error) {
      errors.push({ symbol, reason: errorMessage(error) });
    }
  }

  if (tickersBySymbol.size === 0) {
    return { quotes: [], errors };
  }

  const tickers = Array.from(tickersBySymbol.values()).flat();
  let body: ScanResponse;
  try {
    const response = await fetchFn(TRADINGVIEW_SCAN_URL, {
      method: 'POST',
      // text/plain is a CORS "simple" content type: no preflight, so the web build can call this too.
      headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'User-Agent': USER_AGENT },
      body: JSON.stringify({ symbols: { tickers }, columns: COLUMNS }),
    });
    if (!response.ok) {
      throw new Error(`TradingView HTTP ${response.status}`);
    }
    body = (await response.json()) as ScanResponse;
  } catch (error) {
    const reason = errorMessage(error);
    for (const symbol of tickersBySymbol.keys()) {
      errors.push({ symbol, reason });
    }
    return { quotes: [], errors };
  }

  const rowsByTicker = new Map<string, ScanRow['d']>();
  for (const row of body.data ?? []) {
    rowsByTicker.set(row.s, row.d);
  }

  const fetchedAt = Date.now();
  const quotes: Quote[] = [];
  for (const [symbol, candidates] of tickersBySymbol) {
    const hit = candidates
      .map((ticker) => rowsByTicker.get(ticker))
      .find((d) => d && typeof d[0] === 'number' && d[0] > 0 && typeof d[1] === 'string');
    if (!hit) {
      errors.push({ symbol, reason: 'not found on TradingView' });
      continue;
    }
    const normalized = normalizePrice(hit[0] as number, hit[1] as string);
    quotes.push({
      symbol,
      price: normalized.price,
      currency: normalized.currency,
      fetchedAt,
      source: 'tradingview',
    });
  }

  return { quotes, errors };
}
