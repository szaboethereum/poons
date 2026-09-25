// Read-only HTTP API for the frontend (node:http, no framework). CORS is open: everything here is
// public on-chain information.
import { createServer } from 'node:http';
import type { Ledger } from './ledger.ts';
import type { Watcher } from './watcher.ts';
import type { Minter } from './minter.ts';

import { rpcStats } from './rpc.ts';

export type ApiInfo = { chainId: number; token: string; poons: string; ponsUrl: string; maxSupply: number; minBuyUsd: number };

export function startApi(port: number, ledger: Ledger, watcher: Watcher, minter: Minter, info: ApiInfo) {
  const routes: [RegExp, (m: RegExpMatchArray, q: URLSearchParams) => unknown][] = [
    [/^\/api\/stats$/, () => ({
      ...info, ...ledger.stats(), soldOut: minter.soldOut, mintOpen: minter.dryRun ? true : minter.mintOpen, updatedAt: Math.floor(Date.now() / 1000),
      // Graduated = the token trades on a DEX pool now, so no new Founding Residents.
      graduated: watcher.ctx.pools.size > 0,
    })],
    [/^\/api\/wallet\/(0x[0-9a-fA-F]{40})$/, m => {
      const w = ledger.row(m[1]);
      return {
        address: m[1].toLowerCase(),
        status: ledger.status(w),
        bestBuyUsd: (w?.best_buy_usd6 ?? 0) / 1e6,
        qualifiedAt: w?.qualified_at ?? null,
        tokenId: w?.token_id ?? null,
        seed: w?.seed ?? null,
        tx: w?.token_id != null ? ledger.dropTx(w.token_id) : null,
      };
    }],
    [/^\/api\/wallet\/(.*)$/, () => { throw Object.assign(new Error('Not a valid wallet address'), { status: 400 }); }],
    [/^\/api\/recent$/, (_, q) => ({ drops: ledger.tokens(0, clamp(q.get('limit'), 24, 100)).tokens })],
    [/^\/api\/tokens$/, (_, q) => ledger.tokens(clamp(q.get('offset'), 0, 1e9), clamp(q.get('limit'), 48, 200))],
    [/^\/api\/stats\/series$/, (_, q) => {
      const bucket = ({ hour: 3600, day: 86400, '10m': 600 } as Record<string, number>)[q.get('bucket') ?? 'hour'] ?? 3600;
      return { bucket, series: ledger.series(bucket) };
    }],
    [/^\/api\/stats\/buy-sizes$/, () => ({ minBuyUsd: info.minBuyUsd, buckets: ledger.buySizes() })],
    [/^\/api\/stats\/overview$/, () => ({ ...ledger.overview(), maxSupply: info.maxSupply })],
    [/^\/api\/seeds$/, () => ({ seeds: ledger.seeds() })],
    [/^\/api\/health$/, () => {
      const h = watcher.health;
      return { ok: h.head - h.cursor < 600n && Date.now() - h.lastErrorAt > 60_000, lagBlocks: Number(h.head - h.cursor),
        head: Number(h.head), cursor: Number(h.cursor), lastError: h.lastError || null, rescans: h.rescans, recoveredTrades: h.recovered,
        rpc: { total: rpcStats.total, perMinute: Math.round(rpcStats.total / Math.max(1, (Date.now() - rpcStats.since) / 60_000)), byMethod: rpcStats.byMethod } };
    }],
  ];

  createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('content-type', 'application/json');
    const url = new URL(req.url ?? '/', 'http://x');
    for (const [re, fn] of routes) {
      const m = url.pathname.match(re);
      if (!m || req.method !== 'GET') continue;
      try { return res.end(JSON.stringify(fn(m, url.searchParams))); }
      catch (e: any) { res.statusCode = e.status ?? 500; return res.end(JSON.stringify({ error: e.message })); }
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  }).listen(port, () => console.log(`[api] listening on :${port}`));
}

function clamp(v: string | null, def: number, max: number) {
  const n = Number(v ?? def);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), max) : def;
}
