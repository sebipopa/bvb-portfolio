# Price data: shared providers + Cloudflare Worker cache

Date: 2026-09-17. Status: approved in chat (hosting, sources, crypto routing).

## Problem

The app fetches prices directly from each phone. The BVB HTML scraper is fragile,
Twelve Data's free tier does not include LSE at all, and CoinGecko's keyless tier is
5–15 calls/min. Hourly-fresh prices are enough; a small server-side cache is acceptable.

## Decision

1. **Providers** become pure, fetch-based TypeScript in `src/services/providers/`,
   with no React Native imports, so the same code runs in the app and in a Worker.
   - `tradingview.ts` — primary. One POST to `scanner.tradingview.com/global/scan`
     returns every symbol (BVB 15-min delayed, LSE and crypto streaming) with currency.
   - `yahoo.ts` — fallback, per symbol, `query1.finance.yahoo.com/v8/finance/chart/{t}`.
     Covers BVB (`X.RO`), LSE (`X.L`) and crypto (`X-USD`), so no separate crypto
     exchange providers are needed.
   - `index.ts` — `fetchQuotes(symbols)`: TradingView first, Yahoo for anything missing,
     returns `{ quotes, errors }`.
2. **Symbol mapping** in `src/services/symbols.ts`: app symbol `SYM.EXCHANGE`
   (EXCHANGE ∈ BVB | L | CRYPTO) ↔ provider tickers. Crypto maps to
   `COINBASE:{SYM}USD` and `BINANCE:{SYM}USDT` on TradingView (first found wins), `{SYM}-USD` on Yahoo.
3. **Normalisation**: currency comes from the source per symbol. `GBX`/`GBp` (pence)
   is converted to GBP by dividing by 100. `USDT` is reported as `USD`.
4. **Worker** in `worker/` (Cloudflare Workers, free tier), imports the providers via
   relative path. Handlers are plain functions taking `env` so tests use a fake KV.
   - `GET /prices?symbols=TLV.BVB,CSPX.L` → `{ quotes: Quote[], errors: Error[] }`.
     Serves from KV; symbols missing from the cache are fetched on demand and added
     to the tracked set. Max 50 symbols per call, format validated. CORS `*` for GET.
   - Cron `*/15 * * * *`: refresh every tracked symbol in one provider pass.
   - KV layout: two keys only — `quotes` (JSON map symbol → Quote) and `symbols`
     (JSON array). One blob per write keeps us far under the free tier's 1 000
     writes/day (96 cron writes + on-demand writes).
   - Quotes older than 24 h are still served (with their `fetchedAt`) rather than
     dropped; the app shows the age.
5. **App** (`src/services/marketDataApi.ts`) keeps its public API —
   `getStockPrice`, `getStockPrices`, `getCachedTimestamp`, `clearPriceCache` — but:
   - `getStockPrices` makes ONE request for all uncached symbols.
   - If `EXPO_PUBLIC_PRICE_API_URL` is set, it calls the Worker; otherwise it calls
     `fetchQuotes` directly (Expo Go works without deploying anything).
   - In-memory cache TTL drops from 60 to 15 minutes.
6. **Cleanup in the same change**: remove the Twelve Data key and the BVB scraper;
   `EXCHANGES.L.currency` becomes `GBP` (fallback only); Frankfurter URL moves to
   `api.frankfurter.dev/v1` and GBP is added to the fetched rates (GBP holdings
   currently fail conversion silently).

## Quote type

```ts
interface Quote {
  symbol: string;      // app symbol, e.g. "TLV.BVB"
  price: number;       // in `currency`, pence already converted
  currency: string;    // ISO code: RON, GBP, USD, EUR
  fetchedAt: number;   // ms epoch when the provider answered
  source: 'tradingview' | 'yahoo';
}
```

## Error handling

- A provider failure for one symbol never fails the batch; the symbol appears in
  `errors` with a reason and the app keeps its last cached price (or 0 on first load).
- Worker returns 400 for a malformed `symbols` param, never 500 for upstream errors.
- The app treats a Worker HTTP error like a provider error and falls back to direct
  provider calls.

## Testing

Vitest at repo root (`npm test`). Network is never touched: provider tests use
recorded JSON from the 2026-09-17 probes with `fetch` stubbed; Worker tests use an
in-memory KV fake. Expo's `tsc`/lint exclude `worker/`.

## Out of scope

Historical prices/charts, auth on the Worker, market-hours-aware cron, EODHD.
The design keeps EODHD a one-file addition to `providers/` if the app is ever
published commercially (TradingView and Yahoo terms forbid that).
