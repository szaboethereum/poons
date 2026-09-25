import type { Rarity } from '../lib/art';

export function TierBadge({ rarity, small = false }: { rarity: Rarity | null; small?: boolean }) {
  if (!rarity) return null;
  return (
    <span className={`tier tier--${rarity.tier.toLowerCase()}${small ? ' tier--sm' : ''}`}>
      {rarity.tier}
    </span>
  );
}
