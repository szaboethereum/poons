// Small typed client for the Poons indexer API. If the indexer can't be reached, calls fail and the
// app shows an "offline" banner. Generated demo data exists only for local development (VITE_DEMO=1).
import { DEMO } from './config';
type Demo = typeof import('./demo');
import type {
  Bucket, BuySizes, Health, Overview, RecentResponse, SeedsResponse, SeriesResponse, Stats, TokensResponse, WalletStatus,
} from './types';

export const API_URL: string = ((import.meta.env.VITE_API_URL as string | undefined) || (import.meta.env.DEV ? 'http://localhost:8788' : '')).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ---- connection stores (useSyncExternalStore-compatible) ----
function flag() {
  let v = false;
  const listeners = new Set<() => void>();
  return {
    get: () => v,
    set(next: boolean) { if (next !== v) { v = next; listeners.forEach((l) => l()); } },
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}
/** True while showing generated data (local development only). */
export const demoStore = flag();
/** True while the indexer can't be reached. */
export const offlineStore = flag();
const setDemo = demoStore.set;

export const OFFLINE_MSG = 'Live data is unavailable right now.';

async function get<T>(path: string, fallback: (d: Demo) => T): Promise<T> {
  let res: Response;
  try {
    if (!API_URL) throw new Error('no API URL');
    res = await fetch(API_URL + path, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } });
  } catch {
    // Dead code in production builds, so the generated data never ships.
    if (DEMO) { setDemo(true); return fallback(await import('./demo')); }
    offlineStore.set(true);
    throw new ApiError(0, OFFLINE_MSG);
  }
  offlineStore.set(false);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const body = await res.json(); if (body && typeof body.error === 'string') msg = body.error; } catch { /* not JSON */ }
    throw new ApiError(res.status, msg);
  }
  setDemo(false);
  return (await res.json()) as T;
}

export const api = {
  stats: () => get<Stats>('/api/stats', (d) => d.demoStats()),
  wallet: (address: string) => get<WalletStatus>(`/api/wallet/${encodeURIComponent(address)}`, (d) => d.demoWallet(address)),
  recent: (limit = 24) => get<RecentResponse>(`/api/recent?limit=${limit}`, (d) => d.demoRecent(limit)),
  tokens: (offset = 0, limit = 48) => get<TokensResponse>(`/api/tokens?offset=${offset}&limit=${limit}`, (d) => d.demoTokens(offset, limit)),
  overview: () => get<Overview>('/api/stats/overview', (d) => d.demoOverview()),
  series: (bucket: Bucket) => get<SeriesResponse>(`/api/stats/series?bucket=${bucket}`, (d) => d.demoSeries(bucket)),
  buySizes: () => get<BuySizes>('/api/stats/buy-sizes', (d) => d.demoBuySizes()),
  seeds: () => get<SeedsResponse>('/api/seeds', (d) => d.demoSeeds()),
  health: () => get<Health>('/api/health', (d) => d.demoHealth()),
};
