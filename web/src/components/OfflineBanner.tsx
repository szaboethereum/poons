/** Shown while the indexer can't be reached. No numbers are invented in the meantime. */
export function OfflineBanner() {
  return (
    <div className="mint-banner" role="status">
      <strong>Live feed connecting.</strong>{' '}
      <span>Drops, stats and wallet checks appear here as soon as it's back. Buys are read from the chain, so none are missed.</span>
    </div>
  );
}
