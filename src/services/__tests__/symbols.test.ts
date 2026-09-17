import { describe, expect, it } from 'vitest';
import { normalizePrice, toTradingViewTickers, toYahooTicker } from '../symbols';

describe('toTradingViewTickers', () => {
  it('maps BVB and LSE to their TradingView exchanges', () => {
    expect(toTradingViewTickers('TLV.BVB')).toEqual(['BVB:TLV']);
    expect(toTradingViewTickers('CSPX.L')).toEqual(['LSE:CSPX']);
  });
  it('maps crypto to Coinbase USD first, Binance USDT second', () => {
    expect(toTradingViewTickers('BTC.CRYPTO')).toEqual(['COINBASE:BTCUSD', 'BINANCE:BTCUSDT']);
  });
  it('throws on an unknown exchange', () => {
    expect(() => toTradingViewTickers('AAPL.NASDAQ')).toThrow(/Unknown exchange/);
  });
});

describe('toYahooTicker', () => {
  it('maps each exchange to the Yahoo suffix', () => {
    expect(toYahooTicker('tlv.bvb')).toBe('TLV.RO');
    expect(toYahooTicker('VUSA.L')).toBe('VUSA.L');
    expect(toYahooTicker('ETH.CRYPTO')).toBe('ETH-USD');
  });
});

describe('normalizePrice', () => {
  it('converts pence to pounds for GBX and GBp', () => {
    expect(normalizePrice(131.55, 'GBX')).toEqual({ price: 1.3155, currency: 'GBP' });
    expect(normalizePrice(131.55, 'GBp')).toEqual({ price: 1.3155, currency: 'GBP' });
  });
  it('reports USDT as USD and upper-cases everything else', () => {
    expect(normalizePrice(1, 'USDT')).toEqual({ price: 1, currency: 'USD' });
    expect(normalizePrice(2, 'ron')).toEqual({ price: 2, currency: 'RON' });
  });
});
