import { describe, expect, it, vi } from 'vitest';
import { handlePrices, KVLike, QUOTES_KEY, refreshAll, SYMBOLS_KEY } from '../src/handlers';

class FakeKV implements KVLike {
  store = new Map<string, string>();
  writes = 0;
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.writes += 1;
    this.store.set(key, value);
  }
}

const quote = (symbol: string, price = 1) => ({
  symbol,
  price,
  currency: 'RON',
  fetchedAt: 1000,
  source: 'tradingview' as const,
});
const req = (qs: string) => new Request(`https://w.example/prices${qs}`);

describe('handlePrices', () => {
  it('400s on missing, malformed or too many symbols', async () => {
    const env = { PRICES: new FakeKV() };
    const deps = { fetchQuotes: vi.fn() };
    expect((await handlePrices(req(''), env, deps)).status).toBe(400);
    expect((await handlePrices(req('?symbols=TLV'), env, deps)).status).toBe(400);
    const tooMany = Array.from({ length: 51 }, (_, i) => `S${i}.BVB`).join(',');
    expect((await handlePrices(req(`?symbols=${tooMany}`), env, deps)).status).toBe(400);
    expect(deps.fetchQuotes).not.toHaveBeenCalled();
  });

  it('fetches uncached symbols, stores them in one blob and tracks them', async () => {
    const kv = new FakeKV();
    const deps = {
      fetchQuotes: vi.fn().mockResolvedValue({
        quotes: [quote('TLV.BVB', 33.58)],
        errors: [{ symbol: 'NOPE.BVB', reason: 'nope' }],
      }),
    };
    const res = await handlePrices(req('?symbols=tlv.bvb,NOPE.BVB'), { PRICES: kv }, deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const body = await res.json();
    expect(body.quotes).toEqual([quote('TLV.BVB', 33.58)]);
    expect(body.errors).toEqual([{ symbol: 'NOPE.BVB', reason: 'nope' }]);
    expect(deps.fetchQuotes).toHaveBeenCalledWith(['TLV.BVB', 'NOPE.BVB']);
    expect(JSON.parse(kv.store.get(QUOTES_KEY)!)).toEqual({ 'TLV.BVB': quote('TLV.BVB', 33.58) });
    expect(JSON.parse(kv.store.get(SYMBOLS_KEY)!)).toEqual(['TLV.BVB', 'NOPE.BVB']);
    expect(kv.writes).toBe(2);
  });

  it('serves cached quotes without touching providers', async () => {
    const kv = new FakeKV();
    kv.store.set(QUOTES_KEY, JSON.stringify({ 'TLV.BVB': quote('TLV.BVB'), 'CSPX.L': quote('CSPX.L') }));
    kv.store.set(SYMBOLS_KEY, JSON.stringify(['TLV.BVB', 'CSPX.L']));
    const deps = { fetchQuotes: vi.fn() };
    const body = await (await handlePrices(req('?symbols=CSPX.L,TLV.BVB'), { PRICES: kv }, deps)).json();
    expect(body.quotes.map((q: { symbol: string }) => q.symbol)).toEqual(['CSPX.L', 'TLV.BVB']);
    expect(deps.fetchQuotes).not.toHaveBeenCalled();
    expect(kv.writes).toBe(0);
  });

  it('only fetches the symbols that are missing from the cache', async () => {
    const kv = new FakeKV();
    kv.store.set(QUOTES_KEY, JSON.stringify({ 'TLV.BVB': quote('TLV.BVB') }));
    kv.store.set(SYMBOLS_KEY, JSON.stringify(['TLV.BVB']));
    const deps = { fetchQuotes: vi.fn().mockResolvedValue({ quotes: [quote('BTC.CRYPTO', 5)], errors: [] }) };
    const body = await (await handlePrices(req('?symbols=TLV.BVB,BTC.CRYPTO'), { PRICES: kv }, deps)).json();
    expect(deps.fetchQuotes).toHaveBeenCalledWith(['BTC.CRYPTO']);
    expect(body.quotes.map((q: { symbol: string }) => q.symbol)).toEqual(['TLV.BVB', 'BTC.CRYPTO']);
    expect(JSON.parse(kv.store.get(SYMBOLS_KEY)!)).toEqual(['TLV.BVB', 'BTC.CRYPTO']);
  });
});

describe('refreshAll', () => {
  it('refreshes every tracked symbol and keeps old quotes on failure', async () => {
    const kv = new FakeKV();
    kv.store.set(QUOTES_KEY, JSON.stringify({ 'TLV.BVB': quote('TLV.BVB', 1), 'CSPX.L': quote('CSPX.L', 2) }));
    kv.store.set(SYMBOLS_KEY, JSON.stringify(['TLV.BVB', 'CSPX.L']));
    const deps = {
      fetchQuotes: vi.fn().mockResolvedValue({
        quotes: [quote('TLV.BVB', 9)],
        errors: [{ symbol: 'CSPX.L', reason: 'down' }],
      }),
    };
    const result = await refreshAll({ PRICES: kv }, deps);
    expect(deps.fetchQuotes).toHaveBeenCalledWith(['TLV.BVB', 'CSPX.L']);
    expect(result).toEqual({ refreshed: 1, errors: [{ symbol: 'CSPX.L', reason: 'down' }] });
    const stored = JSON.parse(kv.store.get(QUOTES_KEY)!);
    expect(stored['TLV.BVB'].price).toBe(9);
    expect(stored['CSPX.L'].price).toBe(2);
  });

  it('does nothing when no symbols are tracked', async () => {
    const deps = { fetchQuotes: vi.fn() };
    expect(await refreshAll({ PRICES: new FakeKV() }, deps)).toEqual({ refreshed: 0, errors: [] });
    expect(deps.fetchQuotes).not.toHaveBeenCalled();
  });
});
