import { API_URL } from '../lib/api';

export function DemoBanner() {
  return (
    <div className="demo-banner" role="status">
      <strong>Demo data — indexer offline.</strong>{' '}
      <span>Couldn't reach <code>{API_URL}</code>, so drops, stats and wallet results below are made up. Wallet demo: the last character of the address picks the scenario (0–1 dropping now, 2–5 minted, 6–8 under $10, 9 or a–f no buy).</span>
    </div>
  );
}
