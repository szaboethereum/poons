import { useEffect, useMemo, useRef, useState } from 'react';
import { isFounder, poonSvg, rarityOf, seedHex, toSeed, traitsOf } from '../lib/art';
import { FounderBadge } from './FounderBadge';
import { explorerAddr, explorerTx, pct, shortAddr } from '../lib/format';
import type { Drop } from '../lib/types';
import { Poon } from './Poon';
import { TierBadge } from './TierBadge';

interface Props { drop: Drop | null; chainId: number | undefined; onClose: () => void }

/** Detail panel for a single Poon, as a native modal <dialog> (focus trap + Esc for free). */
export function PoonDetail({ drop, chainId, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (drop && !d.open) d.showModal();
    if (!drop && d.open) d.close();
    setCopied(false);
  }, [drop]);

  const seed = drop ? toSeed(drop.seed) : null;
  const traits = useMemo(() => (seed !== null ? traitsOf(seed) : []), [seed]);
  const founder = seed !== null && isFounder(seed);
  const rarity = useMemo(() => (seed !== null ? rarityOf(seed) : null), [seed]);
  const svgHref = useMemo(() => (seed !== null ? URL.createObjectURL(new Blob([poonSvg(seed)], { type: 'image/svg+xml' })) : null), [seed]);
  useEffect(() => () => { if (svgHref) URL.revokeObjectURL(svgHref); }, [svgHref]);

  const copySeed = async () => {
    if (seed === null) return;
    try { await navigator.clipboard.writeText(seedHex(seed)); setCopied(true); } catch { /* clipboard blocked */ }
  };

  return (
    <dialog
      ref={ref}
      className="detail"
      aria-labelledby="detail-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {drop && seed !== null && (
        <div className="detail__inner">
          <div className="detail__art-wrap">
            <Poon seed={seed} size={384} className="detail__art" alt={`Poon #${drop.tokenId}`} eager />
          </div>
          <div className="detail__info">
            <div className="detail__head">
              <h2 id="detail-title">Poon <span className="mono">#{drop.tokenId}</span></h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>
            {(rarity || founder) && (
              <p className="detail__rarity">
                {rarity && <><TierBadge rarity={rarity} /> <span className="mono dim">score {Number.isFinite(rarity.score) ? rarity.score.toFixed(rarity.score % 1 ? 2 : 0) : rarity.score}</span></>}
                {founder && <FounderBadge />}
              </p>
            )}
            <dl className="traits">
              {traits.filter((t) => t.key !== 'Status').map((t) => (
                <div key={t.key} className={t.special ? 'trait trait--special' : 'trait'}>
                  <dt>{t.key}</dt>
                  <dd><span>{t.value}</span><span className="mono dim">{t.pct === null ? 'special' : pct(t.pct)}</span></dd>
                </div>
              ))}
            </dl>
            <dl className="facts">
              <div><dt>Owner</dt><dd><a className="mono" href={explorerAddr(chainId, drop.to)} target="_blank" rel="noopener noreferrer">{shortAddr(drop.to)}</a></dd></div>
              {drop.tx && <div><dt>Drop tx</dt><dd><a className="mono" href={explorerTx(chainId, drop.tx)} target="_blank" rel="noopener noreferrer">{shortAddr(drop.tx)} ↗</a></dd></div>}
              {drop.time > 0 && <div><dt>Dropped</dt><dd>{new Date(drop.time * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
              <div>
                <dt>Seed</dt>
                <dd className="seed">
                  <code className="mono" title={seedHex(seed)}>{shortAddr(seedHex(seed))}</code>
                  <button className="link-btn" onClick={copySeed}>{copied ? 'Copied' : 'Copy'}</button>
                </dd>
              </div>
            </dl>
            {svgHref && <a className="btn btn--ghost btn--small" href={svgHref} download={`poon-${drop.tokenId}.svg`}>Save SVG</a>}
          </div>
        </div>
      )}
    </dialog>
  );
}
