/**
 * Cloudflare Worker entry point.
 *   GET /prices?symbols=TLV.BVB,CSPX.L  -> { quotes, errors }
 *   GET /health                          -> { ok: true }
 *   cron */15                            -> refresh every tracked symbol
 */

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
