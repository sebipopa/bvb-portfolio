import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchQuotes } from '../providers';
import { clearPriceCache, getCachedTimestamp, getStockPrice, getStockPrices } from '../marketDataApi';

// vitest hoists vi.mock above the imports, so the modules under test see the fakes.
vi.mock('../providers', () => ({ fetchQuotes: vi.fn() }));

const direct = vi.mocked(fetchQuotes);
const q = (symbol: string, price: number, currency = 'RON') => ({
  symbol,
  price,
  currency,
  fetchedAt: 1234,
  source: 'tradingview' as const,
});

beforeEach(() => {
  clearPriceCache();
  direct.mockReset();
  delete process.env.EXPO_PUBLIC_PRICE_API_URL;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getStockPrices (direct mode)', () => {
  it('fetches all symbols in one call and preserves input order', async () => {
    direct.mockResolvedValue({ quotes: [q('CSPX.L', 800, 'USD'), q('TLV.BVB', 33)], errors: [] });
    const result = await getStockPrices(['TLV.BVB', 'CSPX.L']);
    expect(direct).toHaveBeenCalledTimes(1);
    expect(direct.mock.calls[0][0]).toEqual(['TLV.BVB', 'CSPX.L']);
    expect(result).toEqual([
      { symbol: 'TLV.BVB', currentPrice: 33, currency: 'RON', lastUpdate: 1234 },
      { symbol: 'CSPX.L', currentPrice: 800, currency: 'USD', lastUpdate: 1234 },
    ]);
  });

  it('serves cached prices without refetching', async () => {
    direct.mockResolvedValue({ quotes: [q('TLV.BVB', 33)], errors: [] });
    await getStockPrices(['TLV.BVB']);
    await getStockPrice('tlv.bvb');
    expect(direct).toHaveBeenCalledTimes(1);
    expect(getCachedTimestamp('TLV.BVB')).toBeGreaterThan(0);
  });

  it('returns a zero price with the exchange fallback currency for failures', async () => {
    direct.mockResolvedValue({ quotes: [], errors: [{ symbol: 'NOPE.L', reason: 'x' }] });
    const [result] = await getStockPrices(['NOPE.L']);
    expect(result).toMatchObject({ symbol: 'NOPE.L', currentPrice: 0, currency: 'GBP' });
    expect(getCachedTimestamp('NOPE.L')).toBeNull();
  });

  it('keeps the previous price when a refresh fails', async () => {
    direct.mockResolvedValueOnce({ quotes: [q('TLV.BVB', 33)], errors: [] });
    await getStockPrices(['TLV.BVB']);
    clearPriceCache('TLV.BVB');
    direct.mockResolvedValueOnce({ quotes: [], errors: [{ symbol: 'TLV.BVB', reason: 'down' }] });
    const [result] = await getStockPrices(['TLV.BVB']);
    expect(direct).toHaveBeenCalledTimes(2);
    expect(result.currentPrice).toBe(33);
  });

  it('does not throw on malformed symbols', async () => {
    direct.mockResolvedValue({ quotes: [], errors: [] });
    const [result] = await getStockPrices(['BAD']);
    expect(result).toMatchObject({ symbol: 'BAD', currentPrice: 0 });
    expect(direct).not.toHaveBeenCalled();
  });
});

describe('getStockPrices (worker mode)', () => {
  it('calls the worker once and does not use providers', async () => {
    process.env.EXPO_PUBLIC_PRICE_API_URL = 'https://prices.example/';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ quotes: [q('TLV.BVB', 34)], errors: [] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const [result] = await getStockPrices(['TLV.BVB']);
    expect(fetchMock).toHaveBeenCalledWith('https://prices.example/prices?symbols=TLV.BVB', expect.anything());
    expect(direct).not.toHaveBeenCalled();
    expect(result.currentPrice).toBe(34);
  });

  it('falls back to direct providers when the worker fails', async () => {
    process.env.EXPO_PUBLIC_PRICE_API_URL = 'https://prices.example';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) })));
    direct.mockResolvedValue({ quotes: [q('TLV.BVB', 35)], errors: [] });
    const [result] = await getStockPrices(['TLV.BVB']);
    expect(result.currentPrice).toBe(35);
  });
});
