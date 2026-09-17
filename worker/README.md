# Price worker

A tiny Cloudflare Worker that caches quotes for the app so phones never talk to
TradingView or Yahoo directly. Free tier is plenty: one KV read per app request,
about 100 KV writes/day, 100k requests/day allowed.

## Endpoints

| Route | Response |
|---|---|
| `GET /prices?symbols=TLV.BVB,CSPX.L,BTC.CRYPTO` | `{ quotes: Quote[], errors: { symbol, reason }[] }` |
| `GET /health` | `{ ok: true }` |

`Quote` = `{ symbol, price, currency, fetchedAt, source }`. Prices are in `currency`
(pence already converted to GBP). Max 50 symbols per request.

Symbols requested once are tracked and refreshed by a cron every 15 minutes.
Unknown symbols are answered from the providers on demand and then tracked.
A symbol that never resolves stays in the tracked list, which costs one batch
request per cron run and nothing else.

## Run locally

```bash
cd worker
npm install
npx wrangler dev          # http://localhost:8787/prices?symbols=TLV.BVB
```

`wrangler dev` uses a local KV emulation, no account needed.

## Deploy (one time)

```bash
cd worker
npx wrangler login
npx wrangler kv namespace create PRICES    # paste the printed id into wrangler.toml
npm run deploy                              # prints https://bvb-portfolio-prices.<you>.workers.dev
```

Then in the app's `.env`:

```
EXPO_PUBLIC_PRICE_API_URL=https://bvb-portfolio-prices.<you>.workers.dev
```

Restart `expo start` after changing `.env`. Without that variable the app calls
the same provider code directly from the phone, which is fine for development.

## Data sources and terms

Providers live in `../src/services/providers/` and are shared with the app.
TradingView (primary) and Yahoo (fallback) are unofficial endpoints whose terms
forbid commercial redistribution. That is acceptable for a personal app; for a
public store release swap the upstream for a licensed feed such as EODHD
(`All World` plan covers BVB and LSE) by adding one provider file.
