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
