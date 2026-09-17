# Price Data Providers + Cloudflare Worker Cache — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's broken per-exchange price fetching with shared, testable provider code and a free Cloudflare Worker that caches quotes for BVB, LSE and crypto.

**Architecture:** Pure fetch-based provider modules live in `src/services/providers/` and are imported both by the Expo app and by a Worker in `worker/`. The Worker serves `GET /prices?symbols=…` from a single KV blob and refreshes tracked symbols on a 15-minute cron. The app's `marketDataApi` keeps its public API but batches into one request and falls back to calling the providers directly when no Worker URL is configured.

**Tech Stack:** TypeScript 5.9 (strict), Expo 54 / React Native, Vitest, Cloudflare Workers (wrangler, KV, cron triggers).

**Spec:** `docs/superpowers/specs/2026-09-17-price-data-worker-design.md`

## Global Constraints

- Files under `src/services/providers/`, `src/services/symbols.ts` and `src/services/exchangeService.ts` must not import anything from `react-native`, `expo-*` or `@react-native-*` (they run inside the Worker).
- App symbol format stays `SYMBOL.EXCHANGE`, EXCHANGE ∈ `BVB | L | CRYPTO`, always upper-case.
- Public API of `src/services/marketDataApi.ts` stays: `getStockPrice`, `getStockPrices`, `getCachedTimestamp`, `clearPriceCache`.
- Worker uses exactly two KV keys: `quotes` and `symbols`. Max 50 symbols per request.
- Pence (`GBX` / `GBp`) → divide by 100, currency `GBP`. `USDT` → `USD`.
- Tests never touch the network. `npm test` = `vitest run`.
- Commit after every task with a `feat:` / `test:` / `chore:` / `docs:` prefix and the Co-Authored-By trailer.

---

### Task 1: Test tooling + shared types + symbol mapping

**Files:**
- Modify: `package.json` (scripts, devDependencies), `tsconfig.json` (exclude worker)
- Create: `vitest.config.ts`, `src/services/providers/types.ts`, `src/services/symbols.ts`
- Test: `src/services/__tests__/symbols.test.ts`

**Interfaces:**
- Produces: `Quote { symbol; price; currency; fetchedAt; source }`, `QuoteError { symbol; reason }`, `FetchQuotesResult { quotes; errors }`, `FetchFn = typeof fetch`, `USER_AGENT`.
- Produces: `toTradingViewTickers(appSymbol): string[]`, `toYahooTicker(appSymbol): string`, `normalizePrice(price, currency): { price; currency }`.

- [ ] **Step 1: Install vitest and add config**

```bash
npm install -D vitest
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/test/**/*.test.ts'],
  },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`. Add `"exclude": ["node_modules", "worker"]` to `tsconfig.json`.

- [ ] **Step 2: Write the failing test** `src/services/__tests__/symbols.test.ts`

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/symbols.test.ts`
Expected: FAIL, cannot resolve `../symbols`.

- [ ] **Step 4: Implement**

`src/services/providers/types.ts`:
```ts
export type ProviderName = 'tradingview' | 'yahoo';

export interface Quote {
  symbol: string;      // app symbol, e.g. "TLV.BVB"
  price: number;       // in `currency`, pence already converted to pounds
  currency: string;    // ISO code: RON, GBP, USD, EUR
  fetchedAt: number;   // ms epoch when the provider answered
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
```

`src/services/symbols.ts`:
```ts
import { parseSymbol } from './exchangeService';

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

export function normalizePrice(price: number, currency: string): { price: number; currency: string } {
  const upper = currency.toUpperCase();
  if (currency === 'GBp' || upper === 'GBX') {
    return { price: price / 100, currency: 'GBP' };
  }
  if (upper === 'USDT') {
    return { price, currency: 'USD' };
  }
  return { price, currency: upper };
}
```

- [ ] **Step 5: Run test to verify it passes** — `npx vitest run src/services/__tests__/symbols.test.ts` → PASS (7 tests).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: symbol mapping, quote types and vitest setup"`

---

### Task 2: TradingView provider

**Files:**
- Create: `src/services/providers/tradingview.ts`
- Test: `src/services/providers/__tests__/tradingview.test.ts`

**Interfaces:**
- Consumes: `toTradingViewTickers`, `normalizePrice`, `Quote`, `QuoteError`, `FetchQuotesResult`, `FetchFn`, `USER_AGENT`.
- Produces: `fetchTradingViewQuotes(symbols: string[], fetchFn?: FetchFn): Promise<FetchQuotesResult>`, `TRADINGVIEW_SCAN_URL`.

- [ ] **Step 1: Write the failing test** (fixture is the real response recorded 2026-09-17)

```ts
import { describe, expect, it, vi } from 'vitest';
import { fetchTradingViewQuotes, TRADINGVIEW_SCAN_URL } from '../tradingview';

const scanFixture = {
  totalCount: 6,
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
    const [url, init] = (fetchFn as any).mock.calls[0];
    expect(url).toBe(TRADINGVIEW_SCAN_URL);
    expect(JSON.parse(init.body)).toEqual({
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
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/services/providers` → FAIL, cannot resolve `../tradingview`.

- [ ] **Step 3: Implement** `src/services/providers/tradingview.ts`

```ts
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
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
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
    quotes.push({ symbol, price: normalized.price, currency: normalized.currency, fetchedAt, source: 'tradingview' });
  }

  return { quotes, errors };
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run src/services/providers` → PASS (5 tests).
- [ ] **Step 5: Commit** — `git commit -am "feat: TradingView scanner provider"` (add new files first).

---

### Task 3: Yahoo provider

**Files:**
- Create: `src/services/providers/yahoo.ts`
- Test: `src/services/providers/__tests__/yahoo.test.ts`

**Interfaces:**
- Produces: `fetchYahooQuote(symbol, fetchFn?): Promise<Quote>` (throws on failure), `fetchYahooQuotes(symbols, fetchFn?): Promise<FetchQuotesResult>`, `YAHOO_CHART_URL`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { fetchYahooQuote, fetchYahooQuotes, YAHOO_CHART_URL } from '../yahoo';

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
    const fetchFn = fetchByUrl({ 'TLV.RO': { body: ok({ currency: 'RON', symbol: 'TLV.RO', regularMarketPrice: 33.5 }) } });
    const quote = await fetchYahooQuote('TLV.BVB', fetchFn);
    expect(quote).toMatchObject({ symbol: 'TLV.BVB', price: 33.5, currency: 'RON', source: 'yahoo' });
    expect((fetchFn as any).mock.calls[0][0]).toBe(`${YAHOO_CHART_URL}TLV.RO?range=1d&interval=1d`);
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
```

- [ ] **Step 2: Run to verify it fails** — cannot resolve `../yahoo`.

- [ ] **Step 3: Implement** `src/services/providers/yahoo.ts`

```ts
import { normalizePrice, toYahooTicker } from '../symbols';
import { FetchFn, FetchQuotesResult, Quote, QuoteError, USER_AGENT } from './types';

export const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

interface ChartResponse {
  chart?: {
    result?: { meta?: { currency?: string; regularMarketPrice?: number } }[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

export async function fetchYahooQuote(symbol: string, fetchFn: FetchFn = fetch): Promise<Quote> {
  const ticker = toYahooTicker(symbol);
  const response = await fetchFn(`${YAHOO_CHART_URL}${encodeURIComponent(ticker)}?range=1d&interval=1d`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Yahoo HTTP ${response.status}`);
  }
  const body = (await response.json()) as ChartResponse;
  const meta = body.chart?.result?.[0]?.meta;
  if (!meta) {
    throw new Error(body.chart?.error?.description ?? 'No data in Yahoo response');
  }
  if (typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0 || !meta.currency) {
    throw new Error('No price in Yahoo response');
  }
  const normalized = normalizePrice(meta.regularMarketPrice, meta.currency);
  return { symbol, price: normalized.price, currency: normalized.currency, fetchedAt: Date.now(), source: 'yahoo' };
}

export async function fetchYahooQuotes(symbols: string[], fetchFn: FetchFn = fetch): Promise<FetchQuotesResult> {
  const settled = await Promise.allSettled(symbols.map((symbol) => fetchYahooQuote(symbol, fetchFn)));
  const quotes: Quote[] = [];
  const errors: QuoteError[] = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      quotes.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ symbol: symbols[index], reason });
    }
  });
  return { quotes, errors };
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (5 tests).
- [ ] **Step 5: Commit** — `feat: Yahoo chart provider`.

---

### Task 4: `fetchQuotes` orchestrator

**Files:**
- Create: `src/services/providers/index.ts`
- Test: `src/services/providers/__tests__/index.test.ts`

**Interfaces:**
- Produces: `fetchQuotes(symbols: string[], fetchFn?: FetchFn): Promise<FetchQuotesResult>` — normalises/dedupes symbols, TradingView first, Yahoo for the rest. Re-exports the types.

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../tradingview', () => ({ fetchTradingViewQuotes: vi.fn() }));
vi.mock('../yahoo', () => ({ fetchYahooQuotes: vi.fn() }));

import { fetchTradingViewQuotes } from '../tradingview';
import { fetchYahooQuotes } from '../yahoo';
import { fetchQuotes } from '..';

const tv = vi.mocked(fetchTradingViewQuotes);
const yh = vi.mocked(fetchYahooQuotes);
const quote = (symbol: string, source: 'tradingview' | 'yahoo') => ({ symbol, price: 1, currency: 'RON', fetchedAt: 1, source });

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
    tv.mockResolvedValue({ quotes: [quote('TLV.BVB', 'tradingview')], errors: [{ symbol: 'CSPX.L', reason: 'not found on TradingView' }] });
    yh.mockResolvedValue({ quotes: [quote('CSPX.L', 'yahoo')], errors: [] });
    const result = await fetchQuotes(['TLV.BVB', 'CSPX.L']);
    expect(yh).toHaveBeenCalledWith(['CSPX.L'], expect.any(Function));
    expect(result.quotes.map((q) => [q.symbol, q.source])).toEqual([['TLV.BVB', 'tradingview'], ['CSPX.L', 'yahoo']]);
    expect(result.errors).toEqual([]);
  });

  it('combines both reasons when both providers fail', async () => {
    tv.mockResolvedValue({ quotes: [], errors: [{ symbol: 'NOPE.BVB', reason: 'not found on TradingView' }] });
    yh.mockResolvedValue({ quotes: [], errors: [{ symbol: 'NOPE.BVB', reason: 'No data found' }] });
    const result = await fetchQuotes(['NOPE.BVB']);
    expect(result.errors).toEqual([{ symbol: 'NOPE.BVB', reason: 'tradingview: not found on TradingView; yahoo: No data found' }]);
  });

  it('returns empty result for empty input without calling providers', async () => {
    expect(await fetchQuotes([])).toEqual({ quotes: [], errors: [] });
    expect(tv).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — cannot resolve `..` (index).

- [ ] **Step 3: Implement** `src/services/providers/index.ts`

```ts
import { fetchTradingViewQuotes } from './tradingview';
import { FetchFn, FetchQuotesResult } from './types';
import { fetchYahooQuotes } from './yahoo';

export type { FetchFn, FetchQuotesResult, ProviderName, Quote, QuoteError } from './types';

export function normalizeSymbols(symbols: string[]): string[] {
  return Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0)));
}

export async function fetchQuotes(symbols: string[], fetchFn: FetchFn = fetch): Promise<FetchQuotesResult> {
  const unique = normalizeSymbols(symbols);
  if (unique.length === 0) {
    return { quotes: [], errors: [] };
  }

  const primary = await fetchTradingViewQuotes(unique, fetchFn);
  if (primary.errors.length === 0) {
    return primary;
  }

  const primaryReasons = new Map(primary.errors.map((e) => [e.symbol, e.reason]));
  const fallback = await fetchYahooQuotes(Array.from(primaryReasons.keys()), fetchFn);

  return {
    quotes: [...primary.quotes, ...fallback.quotes],
    errors: fallback.errors.map((e) => ({
      symbol: e.symbol,
      reason: `tradingview: ${primaryReasons.get(e.symbol)}; yahoo: ${e.reason}`,
    })),
  };
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (4 tests).
- [ ] **Step 5: Commit** — `feat: fetchQuotes orchestrator with Yahoo fallback`.

---

### Task 5: Cloudflare Worker

**Files:**
- Create: `worker/package.json`, `worker/tsconfig.json`, `worker/wrangler.toml`, `worker/.gitignore`, `worker/src/handlers.ts`, `worker/src/index.ts`, `worker/README.md`
- Test: `worker/test/handlers.test.ts`

**Interfaces:**
- Consumes: `fetchQuotes`, `isValidSymbolFormat`, `normalizeSymbols`, `Quote`, `QuoteError`, `FetchQuotesResult`.
- Produces: `KVLike { get; put }`, `PriceEnv { PRICES: KVLike }`, `handlePrices(request, env, deps?)`, `refreshAll(env, deps?)`, `json(body, status?)`, `QUOTES_KEY`, `SYMBOLS_KEY`, `MAX_SYMBOLS`.

- [ ] **Step 1: Scaffold**

`worker/package.json`:
```json
{
  "name": "bvb-portfolio-price-worker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  }
}
```
Then `cd worker && npm install -D wrangler @cloudflare/workers-types typescript`.

`worker/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "lib": ["es2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`worker/wrangler.toml`:
```toml
name = "bvb-portfolio-prices"
main = "src/index.ts"
compatibility_date = "2026-09-01"

[triggers]
crons = ["*/15 * * * *"]

[[kv_namespaces]]
binding = "PRICES"
id = "REPLACE_WITH_ID_FROM_wrangler_kv_namespace_create_PRICES"
```

`worker/.gitignore`: `node_modules/`, `.wrangler/`, `.dev.vars`.

- [ ] **Step 2: Write the failing test** `worker/test/handlers.test.ts`

```ts
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

const quote = (symbol: string, price = 1) => ({ symbol, price, currency: 'RON', fetchedAt: 1000, source: 'tradingview' as const });
const req = (qs: string) => new Request(`https://w.example/prices${qs}`);

describe('handlePrices', () => {
  it('400s on missing or malformed symbols', async () => {
    const env = { PRICES: new FakeKV() };
    const deps = { fetchQuotes: vi.fn() };
    expect((await handlePrices(req(''), env, deps)).status).toBe(400);
    expect((await handlePrices(req('?symbols=TLV'), env, deps)).status).toBe(400);
    expect((await handlePrices(req('?symbols=' + Array(51).fill('TLV.BVB').map((s, i) => `${s}${i}.BVB`).join(',')), env, deps)).status).toBe(400);
    expect(deps.fetchQuotes).not.toHaveBeenCalled();
  });

  it('fetches uncached symbols, stores them in one blob and tracks them', async () => {
    const kv = new FakeKV();
    const deps = { fetchQuotes: vi.fn().mockResolvedValue({ quotes: [quote('TLV.BVB', 33.58)], errors: [{ symbol: 'NOPE.BVB', reason: 'nope' }] }) };
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
    kv.writes = 0;
    const deps = { fetchQuotes: vi.fn() };
    const body = await (await handlePrices(req('?symbols=CSPX.L,TLV.BVB'), { PRICES: kv }, deps)).json();
    expect(body.quotes.map((q: any) => q.symbol)).toEqual(['CSPX.L', 'TLV.BVB']);
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
    expect(body.quotes.map((q: any) => q.symbol)).toEqual(['TLV.BVB', 'BTC.CRYPTO']);
    expect(JSON.parse(kv.store.get(SYMBOLS_KEY)!)).toEqual(['TLV.BVB', 'BTC.CRYPTO']);
  });
});

describe('refreshAll', () => {
  it('refreshes every tracked symbol and keeps old quotes on failure', async () => {
    const kv = new FakeKV();
    kv.store.set(QUOTES_KEY, JSON.stringify({ 'TLV.BVB': quote('TLV.BVB', 1), 'CSPX.L': quote('CSPX.L', 2) }));
    kv.store.set(SYMBOLS_KEY, JSON.stringify(['TLV.BVB', 'CSPX.L']));
    const deps = { fetchQuotes: vi.fn().mockResolvedValue({ quotes: [quote('TLV.BVB', 9)], errors: [{ symbol: 'CSPX.L', reason: 'down' }] }) };
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
```

- [ ] **Step 3: Run to verify it fails** — `npx vitest run worker` → cannot resolve `../src/handlers`.

- [ ] **Step 4: Implement** `worker/src/handlers.ts`

```ts
import { isValidSymbolFormat } from '../../src/services/exchangeService';
import { fetchQuotes, normalizeSymbols } from '../../src/services/providers';
import type { FetchQuotesResult, Quote, QuoteError } from '../../src/services/providers';

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface PriceEnv {
  PRICES: KVLike;
}

export interface Deps {
  fetchQuotes: (symbols: string[]) => Promise<FetchQuotesResult>;
}

export const QUOTES_KEY = 'quotes';
export const SYMBOLS_KEY = 'symbols';
export const MAX_SYMBOLS = 50;

type QuoteMap = Record<string, Quote>;

const defaultDeps: Deps = { fetchQuotes: (symbols) => fetchQuotes(symbols) };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
    },
  });
}

async function readJson<T>(kv: KVLike, key: string, fallback: T): Promise<T> {
  const raw = await kv.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseSymbolsParam(raw: string | null): { symbols: string[]; invalid: string[] } {
  const symbols = normalizeSymbols((raw ?? '').split(','));
  const invalid = symbols.filter((s) => !isValidSymbolFormat(s));
  return { symbols, invalid };
}

async function trackSymbols(kv: KVLike, newSymbols: string[]): Promise<void> {
  const tracked = await readJson<string[]>(kv, SYMBOLS_KEY, []);
  const set = new Set(tracked);
  let changed = false;
  for (const symbol of newSymbols) {
    if (!set.has(symbol)) {
      set.add(symbol);
      changed = true;
    }
  }
  if (changed) {
    await kv.put(SYMBOLS_KEY, JSON.stringify(Array.from(set)));
  }
}

export async function handlePrices(request: Request, env: PriceEnv, deps: Deps = defaultDeps): Promise<Response> {
  const url = new URL(request.url);
  const { symbols, invalid } = parseSymbolsParam(url.searchParams.get('symbols'));
  if (symbols.length === 0) return json({ error: 'symbols query param required, e.g. ?symbols=TLV.BVB,CSPX.L' }, 400);
  if (invalid.length > 0) return json({ error: `invalid symbols: ${invalid.join(', ')}` }, 400);
  if (symbols.length > MAX_SYMBOLS) return json({ error: `at most ${MAX_SYMBOLS} symbols per request` }, 400);

  const quoteMap = await readJson<QuoteMap>(env.PRICES, QUOTES_KEY, {});
  const missing = symbols.filter((symbol) => !quoteMap[symbol]);
  let errors: QuoteError[] = [];

  if (missing.length > 0) {
    const result = await deps.fetchQuotes(missing);
    for (const quote of result.quotes) {
      quoteMap[quote.symbol] = quote;
    }
    errors = result.errors;
    if (result.quotes.length > 0) {
      await env.PRICES.put(QUOTES_KEY, JSON.stringify(quoteMap));
    }
    await trackSymbols(env.PRICES, missing);
  }

  const quotes = symbols.map((symbol) => quoteMap[symbol]).filter((q): q is Quote => Boolean(q));
  return json({ quotes, errors });
}

export async function refreshAll(env: PriceEnv, deps: Deps = defaultDeps): Promise<{ refreshed: number; errors: QuoteError[] }> {
  const tracked = await readJson<string[]>(env.PRICES, SYMBOLS_KEY, []);
  if (tracked.length === 0) return { refreshed: 0, errors: [] };

  const result = await deps.fetchQuotes(tracked);
  const quoteMap = await readJson<QuoteMap>(env.PRICES, QUOTES_KEY, {});
  for (const quote of result.quotes) {
    quoteMap[quote.symbol] = quote;
  }
  if (result.quotes.length > 0) {
    await env.PRICES.put(QUOTES_KEY, JSON.stringify(quoteMap));
  }
  return { refreshed: result.quotes.length, errors: result.errors };
}
```

`worker/src/index.ts`:
```ts
import { handlePrices, json, PriceEnv, refreshAll } from './handlers';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: PriceEnv): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405);
    }
    const { pathname } = new URL(request.url);
    if (pathname === '/prices') return handlePrices(request, env);
    if (pathname === '/health') return json({ ok: true });
    return json({ error: 'not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: PriceEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      refreshAll(env).then((result) => {
        console.log(`refreshed ${result.refreshed} quotes, ${result.errors.length} errors`);
        for (const e of result.errors) console.warn(`${e.symbol}: ${e.reason}`);
      })
    );
  },
};
```

- [ ] **Step 5: Run to verify it passes** — `npx vitest run worker` → PASS (6 tests). Also `cd worker && npx tsc --noEmit`.
- [ ] **Step 6: Smoke test locally** — `cd worker && npx wrangler dev --port 8787` then `curl 'http://localhost:8787/prices?symbols=TLV.BVB,CSPX.L,BTC.CRYPTO'` → real quotes with `source: "tradingview"`.
- [ ] **Step 7: Write `worker/README.md`** — deploy steps: `npx wrangler login`, `npx wrangler kv namespace create PRICES` (paste id into wrangler.toml), `npm run deploy`, set `EXPO_PUBLIC_PRICE_API_URL` in the app's `.env`. Mention free-tier budget and the ToS caveat.
- [ ] **Step 8: Commit** — `feat: Cloudflare Worker price cache`.

---

### Task 6: App wiring — `marketDataApi`, exchange currency, FX service

**Files:**
- Rewrite: `src/services/marketDataApi.ts`
- Modify: `src/services/exchangeService.ts:34-39` (L currency → GBP), `src/services/currencyService.ts:35` (URL) and `:53-56` (GBP rate)
- Test: `src/services/__tests__/marketDataApi.test.ts`

**Interfaces:**
- Consumes: `fetchQuotes`, `FetchQuotesResult`, `parseSymbol`, `getExchangeInfo`, `StockMarketData`.
- Produces (unchanged names): `getStockPrice(fullSymbol): Promise<StockMarketData>`, `getStockPrices(symbols): Promise<StockMarketData[]>`, `getCachedTimestamp(fullSymbol): number | null`, `clearPriceCache(fullSymbol?)`. New: `getPriceApiUrl(): string | undefined`, `PRICE_CACHE_DURATION_MS`.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../providers', () => ({ fetchQuotes: vi.fn() }));

import { fetchQuotes } from '../providers';
import { clearPriceCache, getCachedTimestamp, getStockPrice, getStockPrices } from '../marketDataApi';

const direct = vi.mocked(fetchQuotes);
const q = (symbol: string, price: number, currency = 'RON') => ({ symbol, price, currency, fetchedAt: 1234, source: 'tradingview' as const });

beforeEach(() => {
  clearPriceCache();
  direct.mockReset();
  delete process.env.EXPO_PUBLIC_PRICE_API_URL;
  vi.unstubAllGlobals();
});
afterEach(() => vi.unstubAllGlobals());

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
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ quotes: [q('TLV.BVB', 34)], errors: [] }) }));
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
```

Note on "keeps the previous price": `clearPriceCache(symbol)` must mark the entry stale rather than delete it, so a failed refresh can still fall back to the last known price. Implement as a `stale` map or by keeping a separate `lastKnown` map.

- [ ] **Step 2: Run to verify it fails** — old module still imports `expo-constants` → fails to resolve in node, plus behaviour mismatches.

- [ ] **Step 3: Implement** `src/services/marketDataApi.ts` (full replacement)

```ts
/**
 * Market Data API Service
 *
 * Resolves current prices for app symbols (SYMBOL.EXCHANGE).
 * - If EXPO_PUBLIC_PRICE_API_URL is set, asks the Cloudflare Worker (see worker/).
 * - Otherwise calls the shared providers directly (TradingView, then Yahoo).
 * Keeps a 15-minute in-memory cache plus the last known price for graceful failure.
 */

import { StockMarketData } from '../types/Stock';
import { getExchangeInfo, parseSymbol } from './exchangeService';
import { fetchQuotes, FetchQuotesResult, Quote } from './providers';

export const PRICE_CACHE_DURATION_MS = 15 * 60 * 1000;

interface CacheEntry {
  price: StockMarketData;
  timestamp: number;
  fresh: boolean;
}

const priceCache = new Map<string, CacheEntry>();

export function getPriceApiUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_PRICE_API_URL;
  return url && url.trim().length > 0 ? url.trim().replace(/\/+$/, '') : undefined;
}

async function fetchFromWorker(symbols: string[], baseUrl: string): Promise<FetchQuotesResult> {
  const response = await fetch(`${baseUrl}/prices?symbols=${encodeURIComponent(symbols.join(','))}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Price API HTTP ${response.status}`);
  }
  return (await response.json()) as FetchQuotesResult;
}

async function fetchLiveQuotes(symbols: string[]): Promise<FetchQuotesResult> {
  const workerUrl = getPriceApiUrl();
  if (workerUrl) {
    try {
      return await fetchFromWorker(symbols, workerUrl);
    } catch (error) {
      console.warn(`⚠️ Price worker failed, falling back to direct providers:`, error);
    }
  }
  return fetchQuotes(symbols);
}

function toMarketData(quote: Quote): StockMarketData {
  return { symbol: quote.symbol, currentPrice: quote.price, currency: quote.currency, lastUpdate: quote.fetchedAt };
}

function zeroPrice(symbol: string): StockMarketData {
  let currency = 'RON';
  try {
    currency = getExchangeInfo(parseSymbol(symbol).exchange).currency;
  } catch {
    // unknown format: keep RON
  }
  return { symbol, currentPrice: 0, currency, lastUpdate: Date.now() };
}

export async function getStockPrices(symbols: string[]): Promise<StockMarketData[]> {
  const now = Date.now();
  const keyBySymbol = new Map<string, string>();
  const toFetch: string[] = [];

  for (const symbol of symbols) {
    try {
      const key = parseSymbol(symbol).fullSymbol;
      keyBySymbol.set(symbol, key);
      const cached = priceCache.get(key);
      const isFresh = cached && cached.fresh && now - cached.timestamp < PRICE_CACHE_DURATION_MS;
      if (!isFresh && !toFetch.includes(key)) {
        toFetch.push(key);
      }
    } catch (error) {
      console.warn(`⚠️ Skipping invalid symbol "${symbol}":`, error);
    }
  }

  if (toFetch.length > 0) {
    console.log(`🌐 Fetching prices for ${toFetch.length} symbols: ${toFetch.join(', ')}`);
    const result = await fetchLiveQuotes(toFetch);
    for (const quote of result.quotes) {
      if (quote.price > 0) {
        priceCache.set(quote.symbol, { price: toMarketData(quote), timestamp: now, fresh: true });
      }
    }
    for (const error of result.errors) {
      console.warn(`⚠️ No price for ${error.symbol}: ${error.reason}`);
    }
  }

  return symbols.map((symbol) => {
    const key = keyBySymbol.get(symbol);
    const cached = key ? priceCache.get(key) : undefined;
    return cached ? cached.price : zeroPrice(symbol);
  });
}

export async function getStockPrice(fullSymbol: string): Promise<StockMarketData> {
  const [price] = await getStockPrices([fullSymbol]);
  return price;
}

export function getCachedTimestamp(fullSymbol: string): number | null {
  try {
    const cached = priceCache.get(parseSymbol(fullSymbol).fullSymbol);
    return cached ? cached.timestamp : null;
  } catch {
    return null;
  }
}

/** Mark one symbol (or all) as stale so the next read refetches; last known prices are kept as fallback. */
export function clearPriceCache(fullSymbol?: string): void {
  if (fullSymbol) {
    try {
      const entry = priceCache.get(parseSymbol(fullSymbol).fullSymbol);
      if (entry) entry.fresh = false;
    } catch (error) {
      console.error(`Error clearing cache for ${fullSymbol}:`, error);
    }
    return;
  }
  priceCache.clear();
}
```

Test adjustment: the "returns zero for failures" test expects `getCachedTimestamp('NOPE.L')` to be null — satisfied because nothing is cached for it. The "keeps previous price" test passes because `clearPriceCache(symbol)` only flips `fresh`.

`src/services/exchangeService.ts`: change `L.currency` to `'GBP'` with comment "fallback only; real currency comes from the quote (CSPX trades in USD, VUSA in GBP)".

`src/services/currencyService.ts`: URL → `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=RON,USD,GBP`; keep `EUR: 1` merge; log line mentions GBP.

- [ ] **Step 4: Run to verify it passes** — `npx vitest run` → all green. Then `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** — `feat: batch price fetching via worker with direct fallback`.

---

### Task 7: Config and docs cleanup

**Files:**
- Modify: `app.config.js` (remove `extra.TWELVE_DATA_API_KEY`), `.env.example`, `README.md` (data sources + setup), any other doc mentioning Twelve Data / Yahoo scraping (`grep -ril "twelve\|coingecko\|bvb.ro/Financial" *.md`).

- [ ] **Step 1:** Remove the `extra` block from `app.config.js`. Replace `.env.example` with:

```
# Optional: URL of your deployed price worker (see worker/README.md).
# Leave unset and the app fetches quotes directly from TradingView/Yahoo.
EXPO_PUBLIC_PRICE_API_URL=
```

- [ ] **Step 2:** README: replace the "Real-time price updates" bullet, the "Multi-Exchange Price Fetching" section and the "Market Data API Service" section with the new architecture (providers + worker, 15-min delayed BVB, currency per symbol, `npm test`). Add a "Price data" section linking `worker/README.md` and stating the personal-use-only caveat for TradingView/Yahoo.
- [ ] **Step 3:** Run `npm test`, `npm run typecheck`, `npm run lint`. All green.
- [ ] **Step 4: Commit** — `chore: drop Twelve Data key, document price worker`.
- [ ] **Step 5:** Tell the user to rotate the leaked Twelve Data key in their account (it stays in git history).
