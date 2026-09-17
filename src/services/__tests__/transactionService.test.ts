import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock('../../../assets/portfolio.json', () => ({
  default: [
    { symbol: 'tlv', shares: 10, avgBuyPrice: 17.35 },
    { symbol: 'CSPX.L', shares: 1, avgBuyPrice: 500 },
  ],
}));

import { migrateFromPortfolio } from '../transactionService';

describe('migrateFromPortfolio', () => {
  it('tags legacy suffix-less tickers as BVB and keeps full symbols as-is', () => {
    const symbols = migrateFromPortfolio().map((t) => t.symbol);
    expect(symbols).toEqual(['TLV.BVB', 'CSPX.L']);
  });
});
