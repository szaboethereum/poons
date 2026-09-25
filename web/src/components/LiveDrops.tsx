import { useEffect, useRef } from 'react';
import { explorerTx, relTime, shortAddr } from '../lib/format';
import type { Drop } from '../lib/types';
import { useNow } from '../hooks/misc';
import { Page } from './Page';
import { Poon } from './Poon';
import { FounderBadge } from './FounderBadge';
import { isFounder, toSeed } from '../lib/art';

const founderOf = (seed: string) => { const s = toSeed(seed); return s !== null && isFounder(s); };

interface Props { drops: Drop[] | undefined; error: string | null; chainId: number | undefined; onOpen: (d: Drop) => void }

export function LiveDrops({ drops, error, chainId, onOpen }: Props) {
  const now = useNow(5000);
  // Remember which ids were already on screen so only genuinely new drops get the arrival flash.
  const seen = useRef<Set<number> | null>(null);
  const fresh = new Set<number>();
  if (drops) {
    if (seen.current) for (const d of drops) if (!seen.current.has(d.tokenId)) fresh.add(d.tokenId);
  }
  useEffect(() => { if (drops) seen.current = new Set(drops.map((d) => d.tokenId)); }, [drops]);

  return (
    <Page eyebrow={<><span className="live-dot" aria-hidden="true" /> Live</>} title="Fresh drops" sub="Every Poon airdropped, newest first. Updates every few seconds.">

        {error && !drops && <p className="alert">Couldn't load drops: {error}</p>}
        {!drops && !error && <ul className="drops">{Array.from({ length: 6 }, (_, i) => <li key={i} className="drop drop--skeleton" />)}</ul>}
        {drops && drops.length === 0 && <p className="empty">No drops yet. The first Poon lands seconds after the first $10+ buy.</p>}
        {drops && drops.length > 0 && (
          <ul className="drops">
            {drops.slice(0, 12).map((d) => (
              <li key={d.tokenId} className={fresh.has(d.tokenId) ? 'drop drop--fresh' : 'drop'}>
                <button className="drop__art" onClick={() => onOpen(d)} aria-label={`Open Poon #${d.tokenId}`}>
                  <Poon seed={d.seed} size={56} alt="" />
                </button>
                <div className="drop__body">
                  <span className="drop__id mono">#{d.tokenId}{founderOf(d.seed) && <FounderBadge iconOnly />}</span>
                  <span className="drop__to mono" title={d.to}>to {shortAddr(d.to)}</span>
                </div>
                <div className="drop__meta">
                  <time className="drop__time" dateTime={new Date(d.time * 1000).toISOString()} title={new Date(d.time * 1000).toLocaleString('en-US')}>{relTime(d.time, now)}</time>
                  {d.tx && <a className="drop__tx" href={explorerTx(chainId, d.tx)} target="_blank" rel="noopener noreferrer" aria-label={`Transaction for Poon #${d.tokenId}`}>tx ↗</a>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Page>
  );
}
