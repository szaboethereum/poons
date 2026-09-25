import type { Health } from '../../lib/types';

export function HealthChip({ health, error, demo }: { health: Health | undefined; error: string | null; demo: boolean }) {
  let state: 'live' | 'lag' | 'down' | 'demo' | 'wait' = 'wait';
  let text = 'Checking indexer…';
  let title = '';
  if (demo) { state = 'demo'; text = 'Demo data'; title = 'Indexer offline; showing generated data'; }
  else if (error) { state = 'down'; text = 'Indexer error'; title = error; }
  else if (health) {
    const lagging = !health.ok || health.lagBlocks > 20;
    state = lagging ? 'lag' : 'live';
    text = lagging ? `Lagging ${health.lagBlocks} blocks` : 'Live';
    title = `Head ${health.head}, indexed ${health.cursor}${health.lastError ? `. Last error: ${health.lastError}` : ''}`;
  }
  return <span className={`health health--${state}`} title={title} role="status"><i aria-hidden="true" />{text}</span>;
}
