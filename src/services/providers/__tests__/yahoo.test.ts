import { describe, expect, it, vi } from 'vitest';
import { fetchYahooQuote, fetchYahooQuotes, YAHOO_CHART_URL } from '../yahoo';

// Shapes recorded from query1.finance.yahoo.com on 2026-09-17
const ok = (meta: Record<string, unknown>) => ({
  chart: { result: [{ meta }], error: null },
});
const notFound = {
  chart: { result: null, error: { code: 'Not Found', description: 'No data found, symbol may be delisted' } },
};

function fetchByUrl(routes: Record<string, { status?: number; body: unknown }>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    const route = key ? routes[key] : { status: 404, body: notFound };
    const status = route.status ?? 200;
    return { ok: status < 400, status, json: async () => route.body };
  }) as unknown as typeof fetch;
}

describe('fetchYahooQuote', () => {
  it('reads price and currency from chart meta', async () => {
    const fetchFn = fetchByUrl({
      'TLV.RO': { body: ok({ currency: 'RON', symbol: 'TLV.RO', regularMarketPrice: 33.5 }) },
    });
    const quote = await fetchYahooQuote('TLV.BVB', fetchFn);
    expect(quote).toMatchObject({ symbol: 'TLV.BVB', price: 33.5, currency: 'RON', source: 'yahoo' });
    expect(vi.mocked(fetchFn).mock.calls[0][0]).toBe(`${YAHOO_CHART_URL}TLV.RO?range=1d&interval=1d`);
  });

  it('converts GBp pence quotes to GBP', async () => {
    const fetchFn = fetchByUrl({ 'VOD.L': { body: ok({ currency: 'GBp', regularMarketPrice: 131.55 }) } });
    expect(await fetchYahooQuote('VOD.L', fetchFn)).toMatchObject({ price: 1.3155, currency: 'GBP' });
  });

  it('throws with the Yahoo description when the symbol is unknown', async () => {
    await expect(fetchYahooQuote('NOPE.BVB', fetchByUrl({}))).rejects.toThrow(/No data found/);
  });

  it('throws on HTTP errors such as 429', async () => {
    const fetchFn = fetchByUrl({ 'TLV.RO': { status: 429, body: 'Too Many Requests' } });
    await expect(fetchYahooQuote('TLV.BVB', fetchFn)).rejects.toThrow('Yahoo HTTP 429');
  });
});

describe('fetchYahooQuotes', () => {
  it('collects successes and failures per symbol', async () => {
    const fetchFn = fetchByUrl({ 'BTC-USD': { body: ok({ currency: 'USD', regularMarketPrice: 76000 }) } });
    const { quotes, errors } = await fetchYahooQuotes(['BTC.CRYPTO', 'NOPE.L'], fetchFn);
    expect(quotes.map((q) => q.symbol)).toEqual(['BTC.CRYPTO']);
    expect(errors).toEqual([{ symbol: 'NOPE.L', reason: 'No data found, symbol may be delisted' }]);
  });
});
