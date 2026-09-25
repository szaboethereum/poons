import type { Stats } from '../lib/types';

/** Shown until the owner opens minting on-chain. Qualifying buys already count and are dropped on opening. */
export function MintStatusBanner({ stats }: { stats: Stats | undefined }) {
  if (!stats || stats.mintOpen !== false) return null;
  return (
    <div className="mint-banner" role="status">
      <strong>Minting opens soon.</strong>{' '}
      <span>Qualifying buys are already being recorded. Every wallet in line gets its Poon the moment minting opens.</span>
    </div>
  );
}
