import { describe, expect, it, vi } from 'vitest';
import { fetchTradingViewQuotes, TRADINGVIEW_SCAN_URL } from '../tradingview';

// Real response shape recorded from scanner.tradingview.com on 2026-09-17
const scanFixture = {
  totalCount: 5,
  data: [
    { s: 'BVB:TLV', d: [33.58, 'RON'] },
    { s: 'LSE:VOD', d: [131.55, 'GBX'] },
    { s: 'LSE:CSPX', d: [822.35, 'USD'] },
    { s: 'COINBASE:BTCUSD', d: [75941.29, 'USD'] },
    { s: 'BINANCE:ADAUSDT', d: [0.1986, 'USDT'] },
  ],
};

function fakeFetch(body: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({ ok, status, json: async () => body })) as unknown as typeof fetch;
}

describe('fetchTradingViewQuotes', () => {
  it('posts every candidate ticker in one request', async () => {
    const fetchFn = fakeFetch(scanFixture);
    await fetchTradingViewQuotes(['TLV.BVB', 'ADA.CRYPTO'], fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetchFn).mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TRADINGVIEW_SCAN_URL);
    expect(JSON.parse(init.body as string)).toEqual({
      symbols: { tickers: ['BVB:TLV', 'COINBASE:ADAUSD', 'BINANCE:ADAUSDT'] },
      columns: ['close', 'currency'],
    });
  });

  it('maps rows back to app symbols with normalised currency', async () => {
    const { quotes, errors } = await fetchTradingViewQuotes(
      ['TLV.BVB', 'VOD.L', 'CSPX.L', 'BTC.CRYPTO', 'ADA.CRYPTO'],
      fakeFetch(scanFixture)
    );
    expect(errors).toEqual([]);
    expect(quotes.map((q) => [q.symbol, q.price, q.currency])).toEqual([
      ['TLV.BVB', 33.58, 'RON'],
      ['VOD.L', 1.3155, 'GBP'],
      ['CSPX.L', 822.35, 'USD'],
      ['BTC.CRYPTO', 75941.29, 'USD'],
      ['ADA.CRYPTO', 0.1986, 'USD'],
    ]);
    expect(quotes.every((q) => q.source === 'tradingview' && q.fetchedAt > 0)).toBe(true);
  });

  it('reports symbols missing from the response as errors', async () => {
    const { quotes, errors } = await fetchTradingViewQuotes(['NOPE.BVB', 'TLV.BVB'], fakeFetch(scanFixture));
    expect(quotes.map((q) => q.symbol)).toEqual(['TLV.BVB']);
    expect(errors).toEqual([{ symbol: 'NOPE.BVB', reason: 'not found on TradingView' }]);
  });

  it('reports every symbol as an error when the request fails', async () => {
    const { quotes, errors } = await fetchTradingViewQuotes(['TLV.BVB'], fakeFetch({}, false, 503));
    expect(quotes).toEqual([]);
    expect(errors).toEqual([{ symbol: 'TLV.BVB', reason: 'TradingView HTTP 503' }]);
  });

  it('rejects malformed symbols without calling the network', async () => {
    const fetchFn = fakeFetch(scanFixture);
    const { errors } = await fetchTradingViewQuotes(['TLV'], fetchFn);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(errors[0].symbol).toBe('TLV');
  });
});
