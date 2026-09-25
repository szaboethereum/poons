export interface Stats {
  chainId: number;
  token: string;
  poons: string;
  ponsUrl: string;
  maxSupply: number;
  minted: number;
  /** Wallets whose drop tx is being sent right now. */
  queued: number;
  minBuyUsd: number;
  updatedAt: number;
  /** Wallets whose best single buy was under the minimum. */
  belowMin?: number;
  soldOut?: boolean;
  /** false until the owner opens minting on-chain (null = not checked yet). */
  mintOpen?: boolean | null;
  /** The token now trades on a DEX, so no new Founding Residents. */
  graduated?: boolean;
}

/** 'queued' means the drop transaction is being sent right now. */
export type WalletStatusKind = 'none' | 'below_min' | 'queued' | 'minted';

export interface WalletStatus {
  address: string;
  status: WalletStatusKind;
  bestBuyUsd: number;
  qualifiedAt?: number | null;
  /** No longer meaningful (there is no hold window); ignored by the UI. */
  eligibleAt?: number | null;
  tokenId: number | null;
  seed: string | null;
  /** Drop transaction, once minted. */
  tx?: string | null;
  reason?: string | null;
}

export interface Drop {
  tokenId: number;
  to: string;
  seed: string;
  tx: string | null;
  time: number;
}

export interface RecentResponse { drops: Drop[] }
export interface TokensResponse { total: number; tokens: Drop[] }

// ---- stats endpoints ----
export interface Overview {
  uniqueBuyers: number;
  buys: number;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
  founders: number;
  minted: number;
  maxSupply: number;
  firstDropAt: number | null;
  lastDropAt: number | null;
  dropLatencySec: { p50: number | null; p90: number | null; max: number | null; samples: number };
}

export interface SeriesPoint {
  /** Bucket start, unix seconds. */
  t: number;
  buys: number;
  qualifyingBuys: number;
  buyers: number;
  volumeUsd: number;
  sells: number;
  sellUsd: number;
  drops: number;
  mintedTotal: number;
}
export type Bucket = '10m' | 'hour' | 'day';
export interface SeriesResponse { bucket: number; series: SeriesPoint[] }

export interface BuySizes { minBuyUsd: number; buckets: { from: number; to: number | null; buys: number }[] }
export interface SeedsResponse { seeds: [number, string][] }
export interface Health {
  ok: boolean;
  lagBlocks: number;
  head: number;
  cursor: number;
  lastError: string | null;
  rescans: number;
  recoveredTrades: number;
}
