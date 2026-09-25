// Small typed client for the Poons indexer API. If the indexer can't be reached at all
// (network error / timeout), calls resolve with demo data and the app shows a "Demo data" banner.
import { demoBuySizes, demoHealth, demoOverview, demoRecent, demoSeeds, demoSeries, demoStats, demoTokens, demoWallet } from './demo';
import type {
  Bucket, BuySizes, Health, Overview, RecentResponse, SeedsResponse, SeriesResponse, Stats, TokensResponse, WalletStatus,
} from './types';

export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:8788').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ---- demo-mode store (useSyncExternalStore-compatible) ----
let demo = false;
const listeners = new Set<() => void>();
function setDemo(v: boolean) {
  if (v === demo) return;
  demo = v;
  listeners.forEach((l) => l());
}
export const demoStore = {
  get: () => demo,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

async function get<T>(path: string, fallback: () => T): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } });
  } catch {
    setDemo(true);
    return fallback();
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const body = await res.json(); if (body && typeof body.error === 'string') msg = body.error; } catch { /* not JSON */ }
    throw new ApiError(res.status, msg);
  }
  setDemo(false);
  return (await res.json()) as T;
}

export const api = {
  stats: () => get<Stats>('/api/stats', demoStats),
  wallet: (address: string) => get<WalletStatus>(`/api/wallet/${encodeURIComponent(address)}`, () => demoWallet(address)),
  recent: (limit = 24) => get<RecentResponse>(`/api/recent?limit=${limit}`, () => demoRecent(limit)),
  tokens: (offset = 0, limit = 48) => get<TokensResponse>(`/api/tokens?offset=${offset}&limit=${limit}`, () => demoTokens(offset, limit)),
  overview: () => get<Overview>('/api/stats/overview', demoOverview),
  series: (bucket: Bucket) => get<SeriesResponse>(`/api/stats/series?bucket=${bucket}`, () => demoSeries(bucket)),
  buySizes: () => get<BuySizes>('/api/stats/buy-sizes', demoBuySizes),
  seeds: () => get<SeedsResponse>('/api/seeds', demoSeeds),
  health: () => get<Health>('/api/health', demoHealth),
};
