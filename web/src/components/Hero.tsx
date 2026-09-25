import { PONS_URL } from '../lib/config';
import { useEffect, useMemo, useState } from 'react';
import { Art, chipTraits, isFounder, rarityOf, toSeed } from '../lib/art';
import { href } from '../lib/router';
import { Logo } from './Logo';
import { FounderBadge } from './FounderBadge';
import { num, usd } from '../lib/format';
import type { Drop, Stats } from '../lib/types';
import { useReducedMotion } from '../hooks/misc';
import { Poon } from './Poon';
import { TierBadge } from './TierBadge';

interface Props { stats: Stats | undefined; drops: Drop[] | undefined; onOpen: (d: Drop) => void }

type Slide = { seed: bigint; drop: Drop | null };
const CYCLE_MS = 2800;

export function Hero({ stats, drops, onOpen }: Props) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(!reduced);
  const [i, setI] = useState(0);
  const [randoms, setRandoms] = useState<bigint[]>(() => Array.from({ length: 8 }, () => Art.randomSeed()));

  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);

  // Cycle through the latest real drops; fall back to random preview seeds before the first drop.
  const slides: Slide[] = useMemo(() => {
    const fromDrops = (drops ?? []).slice(0, 8).flatMap((d) => {
      const s = toSeed(d.seed);
      return s === null ? [] : [{ seed: s, drop: d }];
    });
    return fromDrops.length ? fromDrops : randoms.map((seed) => ({ seed, drop: null }));
  }, [drops, randoms]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((n) => n + 1), CYCLE_MS);
    return () => clearInterval(t);
  }, [playing]);

  const slide = slides[i % slides.length];
  const traits = useMemo(() => chipTraits(slide.seed), [slide.seed]);
  const rarity = useMemo(() => rarityOf(slide.seed), [slide.seed]);

  const maxSupply = stats?.maxSupply ?? 3333;
  const minted = stats?.minted ?? 0;
  const progress = Math.min(100, (minted / maxSupply) * 100);
  const minBuy = usd(stats?.minBuyUsd ?? 10);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="wrap hero__grid">
        <div className="hero__copy">
          <p className="eyebrow">Free mint · fully on-chain · Robinhood Chain</p>
          <h1 id="hero-title" className="hero__logo" tabIndex={-1} data-page-title><Logo height={96} title="Poons" /></h1>
          <p className="hero__lede">
            Make one buy of <strong>{minBuy}+</strong> of the token on Pons and a 32×32 pixel Poon lands
            in your wallet <strong>within seconds</strong>. <span className="nowrap">Free. One per wallet.</span>
          </p>

          <div className="supply" aria-label={`${minted} of ${maxSupply} Poons minted`}>
            <div className="supply__row">
              <span className="supply__num mono">{num(minted)}<span className="dim"> / {num(maxSupply)}</span></span>
              <span className="supply__label">minted</span>
            </div>
            <div className="meter" aria-hidden="true"><div className="meter__fill" style={{ width: `${Math.max(progress, 0.6)}%` }} /></div>
            {stats && (
              <p className="supply__meta mono">
                {stats.soldOut || minted >= maxSupply ? 'Sold out: every Poon has dropped' : `${num(maxSupply - minted)} left`}
                {stats.queued > 0 ? ` · ${num(stats.queued)} dropping now` : ''}
              </p>
            )}
          </div>

          <div className="hero__ctas">
            <a className="btn btn--primary" href={stats?.ponsUrl ?? PONS_URL} target="_blank" rel="noopener noreferrer">
              Buy on Pons <span aria-hidden="true">↗</span>
            </a>
            <a className="btn btn--ghost" href={href('check')}>Check my wallet</a>
          </div>
        </div>

        <figure className="room">
          <div className="room__lamp" aria-hidden="true" />
          <div className="room__frame">
            {slide.drop ? (
              <button className="room__art-btn" onClick={() => onOpen(slide.drop!)} aria-label={`Open Poon #${slide.drop.tokenId}`}>
                <Poon seed={slide.seed} size={320} className="room__art" alt={`Poon #${slide.drop.tokenId}`} eager />
              </button>
            ) : (
              <Poon seed={slide.seed} size={320} className="room__art" alt="Random preview Poon" eager />
            )}
          </div>
          <figcaption className="room__caption">
            <div className="room__title">
              <span className="mono">{slide.drop ? `#${slide.drop.tokenId}` : 'Preview'}</span>
              <span className="dim">{slide.drop ? (i % slides.length === 0 ? 'latest drop' : 'recent drop') : 'random seed'}</span>
              <TierBadge rarity={rarity} small />
              {isFounder(slide.seed) && <FounderBadge small />}
            </div>
            <ul className="chips" aria-label="Traits">
              {traits.slice(0, 5).map((t) => <li key={t.key} className={t.special ? 'chip chip--special' : 'chip'}>{t.value}</li>)}
            </ul>
            <div className="room__controls">
              <button className="icon-btn" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
                {playing ? '❚❚' : '▶'}
              </button>
              <button
                className="icon-btn"
                onClick={() => { if (!slides[0].drop) setRandoms(randoms.map(() => Art.randomSeed())); setI((n) => n + 1); }}
                aria-label="Show another Poon"
              >
                ↻
              </button>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
