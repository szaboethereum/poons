// Demo data used when the indexer is unreachable, so the site stays reviewable.
// Everything here is fake and the UI labels it as such. It models ~2 days of activity: a few hundred
// drops, busier right after launch, with the first ~38% bought on the bonding curve (Founding Residents).
import { Art } from './art';
import type {
  Bucket, BuySizes, Drop, Health, Overview, SeedsResponse, SeriesPoint, SeriesResponse, Stats, TokensResponse, WalletStatus,
} from './types';

const START = Date.now();
const START_S = Math.floor(START / 1000);
const HISTORY_S = 46 * 3600;
const BASE_COUNT = 318;
const GRADUATED_AT = Math.floor(BASE_COUNT * 0.38);
const DROP_EVERY_MS = 20_000;
const FOUNDER_BIT = 1n << 255n;

/** Small deterministic PRNG so a token's fake trading history is stable between polls. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (bytes: number, r: () => number = Math.random) => {
  let s = '0x';
  for (let i = 0; i < bytes; i++) s += Math.floor(r() * 256).toString(16).padStart(2, '0');
  return s;
};

const tokens: Drop[] = [];
function sync(): Drop[] {
  const want = BASE_COUNT + Math.floor((Date.now() - START) / DROP_EVERY_MS);
  while (tokens.length < want) {
    const id = tokens.length + 1;
    const r = rng(id * 7919);
    // History: busier right after launch, tapering off; later drops arrive live.
    const time = id <= BASE_COUNT
      ? START_S - HISTORY_S + Math.round(HISTORY_S * Math.pow((id - 1 + r()) / BASE_COUNT, 1.6)) - 30
      : Math.floor((START + (id - BASE_COUNT) * DROP_EVERY_MS) / 1000);
    let seed = Art.randomSeed() & (FOUNDER_BIT - 1n);
    if (id <= GRADUATED_AT) seed |= FOUNDER_BIT;
    tokens.push({ tokenId: id, to: hex(20, r), seed: '0x' + seed.toString(16), tx: hex(32, r), time });
  }
  return tokens;
}

// ---- fake trades, derived deterministically from each drop ----
interface Trade { t: number; usd: number; side: 'buy' | 'sell'; qualifying: boolean; wallet: string }
function tradesFor(d: Drop): Trade[] {
  const r = rng(d.tokenId * 104729);
  const out: Trade[] = [];
  const whale = r() < 0.04;
  out.push({ t: d.time - 1, usd: whale ? 250 + r() * 1200 : 10 * Math.exp(r() * 2.4), side: 'buy', qualifying: true, wallet: d.to });
  const extra = r() < 0.1 ? 2 : r() < 0.35 ? 1 : 0;
  for (let i = 0; i < extra; i++) out.push({ t: d.time + Math.round(r() * 3 * 3600), usd: 5 + r() * 75, side: 'buy', qualifying: false, wallet: d.to });
  if (r() < 0.3) out.push({ t: d.time - Math.round(r() * 3600), usd: 1 + r() * 8.9, side: 'buy', qualifying: false, wallet: 'small-' + d.tokenId });
  if (r() < 0.45) out.push({ t: d.time + Math.round(r() * 6 * 3600), usd: 3 + r() * 57, side: 'sell', qualifying: false, wallet: d.to });
  return out;
}
function allTrades(): Trade[] {
  const now = Date.now() / 1000;
  return sync().flatMap(tradesFor).filter((t) => t.t <= now);
}

const BUCKET_S: Record<Bucket, number> = { '10m': 600, hour: 3600, day: 86400 };
export function demoSeries(bucket: Bucket): SeriesResponse {
  const b = BUCKET_S[bucket];
  const map = new Map<number, SeriesPoint & { wallets: Set<string> }>();
  const at = (t: number) => {
    const k = Math.floor(t / b) * b;
    let p = map.get(k);
    if (!p) map.set(k, (p = { t: k, buys: 0, qualifyingBuys: 0, buyers: 0, volumeUsd: 0, sells: 0, sellUsd: 0, drops: 0, mintedTotal: 0, wallets: new Set() }));
    return p;
  };
  for (const tr of allTrades()) {
    const p = at(tr.t);
    if (tr.side === 'buy') { p.buys++; p.volumeUsd += tr.usd; p.wallets.add(tr.wallet); if (tr.qualifying) p.qualifyingBuys++; }
    else { p.sells++; p.sellUsd += tr.usd; }
  }
  for (const d of sync()) at(d.time).drops++;
  let total = 0;
  const series = [...map.values()].sort((x, y) => x.t - y.t).map(({ wallets, ...p }) => {
    total += p.drops;
    return { ...p, buyers: wallets.size, mintedTotal: total, volumeUsd: Math.round(p.volumeUsd * 100) / 100, sellUsd: Math.round(p.sellUsd * 100) / 100 };
  });
  return { bucket: b, series };
}

export function demoOverview(): Overview {
  const ts = sync();
  const trades = allTrades();
  const buys = trades.filter((t) => t.side === 'buy');
  return {
    uniqueBuyers: new Set(buys.map((t) => t.wallet)).size,
    buys: buys.length,
    buyVolumeUsd: Math.round(buys.reduce((a, t) => a + t.usd, 0) * 100) / 100,
    sellVolumeUsd: Math.round(trades.filter((t) => t.side === 'sell').reduce((a, t) => a + t.usd, 0) * 100) / 100,
    founders: Math.min(ts.length, GRADUATED_AT),
    minted: ts.length,
    maxSupply: 3333,
    firstDropAt: ts[0]?.time ?? null,
    lastDropAt: ts[ts.length - 1]?.time ?? null,
    dropLatencySec: { p50: 1, p90: 2, max: 4, samples: ts.length },
  };
}

export function demoBuySizes(): BuySizes {
  const edges: [number, number | null][] = [[0, 5], [5, 10], [10, 25], [25, 50], [50, 100], [100, 250], [250, 1000], [1000, null]];
  const buys = allTrades().filter((t) => t.side === 'buy');
  return {
    minBuyUsd: 10,
    buckets: edges.map(([from, to]) => ({ from, to, buys: buys.filter((t) => t.usd >= from && (to === null || t.usd < to)).length })),
  };
}

export const demoSeeds = (): SeedsResponse => ({ seeds: sync().map((d) => [d.tokenId, d.seed] as [number, string]) });

export const demoHealth = (): Health => ({ ok: true, lagBlocks: 0, head: 0, cursor: 0, lastError: null, rescans: 0, recoveredTrades: 0 });

export function demoStats(): Stats {
  const minted = sync().length;
  return {
    chainId: 46630,
    token: '0x0000000000000000000000000000000000000000',
    poons: '0x0000000000000000000000000000000000000000',
    ponsUrl: 'https://www.ponsfamily.com/',
    maxSupply: 3333,
    minted,
    queued: minted % 3,
    minBuyUsd: 10,
    updatedAt: Math.floor(Date.now() / 1000),
  };
}

export function demoRecent(limit: number): { drops: Drop[] } {
  return { drops: sync().slice(-limit).reverse() };
}

export function demoTokens(offset: number, limit: number): TokensResponse {
  const all = sync().slice().reverse();
  return { total: all.length, tokens: all.slice(offset, offset + limit) };
}

// Demo wallets: the last hex digit of the address picks the scenario so every state can be previewed.
// 0-1 queued (lands as minted a few seconds later), 2-5 minted, 6-8 below minimum, 9 and a-f none.
const firstSeen = new Map<string, number>();
export function demoWallet(address: string): WalletStatus {
  const a = address.toLowerCase();
  const d = parseInt(a.slice(-1), 16);
  const now = Math.floor(Date.now() / 1000);
  const base: WalletStatus = { address: a, status: 'none', bestBuyUsd: 0, qualifiedAt: null, tokenId: null, seed: null, reason: null };
  // Bit 255 clear/set by digit parity so both kinds of minted card can be previewed.
  const low = BigInt('0x' + a.slice(2).repeat(2).slice(0, 64)) & (FOUNDER_BIT - 1n);
  const seed = '0x' + (d % 2 === 0 ? low | FOUNDER_BIT : low).toString(16);

  if (d <= 1) {
    if (!firstSeen.has(a)) firstSeen.set(a, now);
    const qualifiedAt = firstSeen.get(a)!;
    if (now < qualifiedAt + 6) return { ...base, status: 'queued', bestBuyUsd: 25, qualifiedAt };
    return { ...base, status: 'minted', bestBuyUsd: 25, qualifiedAt, tokenId: 1000 + d, seed };
  }
  if (d <= 5) return { ...base, status: 'minted', bestBuyUsd: 42.5, qualifiedAt: now - 7200, tokenId: 77 + d, seed };
  if (d <= 8) return { ...base, status: 'below_min', bestBuyUsd: 6.4 };
  return base;
}
