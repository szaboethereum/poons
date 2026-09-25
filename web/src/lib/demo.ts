// Demo data used when the indexer is unreachable, so the site stays reviewable.
// Everything here is fake and the UI labels it as such.
import { Art } from './art';
import type { Drop, Stats, TokensResponse, WalletStatus } from './types';

const START = Date.now();
const BASE_COUNT = 214;
const DROP_EVERY_MS = 12_000;

const hex = (bytes: number) => {
  let s = '0x';
  for (let i = 0; i < bytes; i++) s += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return s;
};

const tokens: Drop[] = [];
function sync(): Drop[] {
  const want = BASE_COUNT + Math.floor((Date.now() - START) / DROP_EVERY_MS);
  const nowS = Math.floor(START / 1000);
  while (tokens.length < want) {
    const id = tokens.length + 1;
    // Seeded history spreads the first drops over the past ~2 days; later ones arrive live.
    const time = id <= BASE_COUNT
      ? nowS - Math.round((BASE_COUNT - id) * 780 + Math.random() * 300) - 20
      : Math.floor((START + (id - BASE_COUNT) * DROP_EVERY_MS) / 1000);
    tokens.push({ tokenId: id, to: hex(20), seed: '0x' + Art.randomSeed().toString(16), tx: hex(32), time });
  }
  return tokens;
}

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
  const seed = '0x' + a.slice(2).repeat(2).slice(0, 64);

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
