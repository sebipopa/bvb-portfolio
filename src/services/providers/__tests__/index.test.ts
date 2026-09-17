import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTradingViewQuotes } from '../tradingview';
import { fetchYahooQuotes } from '../yahoo';
import { fetchQuotes } from '..';

// vitest hoists vi.mock above the imports, so the modules under test see the fakes.
vi.mock('../tradingview', () => ({ fetchTradingViewQuotes: vi.fn() }));
vi.mock('../yahoo', () => ({ fetchYahooQuotes: vi.fn() }));

const tv = vi.mocked(fetchTradingViewQuotes);
const yh = vi.mocked(fetchYahooQuotes);
const quote = (symbol: string, source: 'tradingview' | 'yahoo') => ({
  symbol,
  price: 1,
  currency: 'RON',
  fetchedAt: 1,
  source,
});

beforeEach(() => {
  tv.mockReset();
  yh.mockReset();
});

describe('fetchQuotes', () => {
  it('normalises and dedupes symbols before asking TradingView', async () => {
    tv.mockResolvedValue({ quotes: [quote('TLV.BVB', 'tradingview')], errors: [] });
    const result = await fetchQuotes([' tlv.bvb ', 'TLV.BVB']);
    expect(tv).toHaveBeenCalledWith(['TLV.BVB'], expect.any(Function));
    expect(yh).not.toHaveBeenCalled();
    expect(result.quotes).toHaveLength(1);
  });

  it('asks Yahoo only for symbols TradingView could not resolve', async () => {
    tv.mockResolvedValue({
      quotes: [quote('TLV.BVB', 'tradingview')],
      errors: [{ symbol: 'CSPX.L', reason: 'not found on TradingView' }],
    });
    yh.mockResolvedValue({ quotes: [quote('CSPX.L', 'yahoo')], errors: [] });
    const result = await fetchQuotes(['TLV.BVB', 'CSPX.L']);
    expect(yh).toHaveBeenCalledWith(['CSPX.L'], expect.any(Function));
    expect(result.quotes.map((q) => [q.symbol, q.source])).toEqual([
      ['TLV.BVB', 'tradingview'],
      ['CSPX.L', 'yahoo'],
    ]);
    expect(result.errors).toEqual([]);
  });

  it('combines both reasons when both providers fail', async () => {
    tv.mockResolvedValue({ quotes: [], errors: [{ symbol: 'NOPE.BVB', reason: 'not found on TradingView' }] });
    yh.mockResolvedValue({ quotes: [], errors: [{ symbol: 'NOPE.BVB', reason: 'No data found' }] });
    const result = await fetchQuotes(['NOPE.BVB']);
    expect(result.errors).toEqual([
      { symbol: 'NOPE.BVB', reason: 'tradingview: not found on TradingView; yahoo: No data found' },
    ]);
  });

  it('returns an empty result for empty input without calling providers', async () => {
    expect(await fetchQuotes([])).toEqual({ quotes: [], errors: [] });
    expect(tv).not.toHaveBeenCalled();
  });
});
