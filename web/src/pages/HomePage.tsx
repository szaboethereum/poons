import { OPENSEA_URL, PONS_URL } from '../lib/config';
import { api } from '../lib/api';
import { num, pct } from '../lib/format';
import { href } from '../lib/router';
import type { Drop, Stats } from '../lib/types';
import { usePoll } from '../hooks/usePoll';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { Poon } from '../components/Poon';
import { FounderBadge } from '../components/FounderBadge';
import { isFounder, toSeed } from '../lib/art';

interface Props { stats: Stats | undefined; drops: Drop[] | undefined; onOpen: (d: Drop) => void }

export function HomePage({ stats, drops, onOpen }: Props) {
  const o = usePoll(api.overview, 30_000).data;
  const minted = o?.minted ?? stats?.minted ?? 0;
  const tiles = [
    { label: 'Minted', value: num(minted), hint: `of ${num(stats?.maxSupply ?? 3333)}` },
    { label: 'Unique buyers', value: o ? num(o.uniqueBuyers) : '—', hint: o ? `${num(o.buys)} buys` : '' },
    { label: 'Founding Residents', value: o ? num(o.founders) : '—', hint: o && minted ? `${pct((o.founders / minted) * 100)} of minted` : 'Bought before graduation' },
    { label: 'Drop time', value: o?.dropLatencySec.p50 != null ? `~${o.dropLatencySec.p50}s` : '—', hint: 'From buy to Poon' },
  ];
  return (
    <>
      <Hero stats={stats} drops={drops} onOpen={onOpen} />
      <section className="band" aria-label="Key numbers">
        <div className="wrap">
          <div className="kpis kpis--4">
            {tiles.map((t) => (
              <div key={t.label} className="kpi">
                <span className="kpi__label">{t.label}</span>
                <span className="kpi__value mono">{t.value}</span>
                <span className="kpi__hint">{t.hint}</span>
              </div>
            ))}
          </div>
          <p className="band__more"><a href={href('stats')}>All stats →</a></p>
        </div>
      </section>
      <HowItWorks stats={stats} />
      <section className="section" aria-labelledby="latest-title">
        <div className="wrap">
          <header className="section__head section__head--row">
            <h2 id="latest-title">Latest drops</h2>
            <a href={href('drops')}>All drops →</a>
          </header>
          {drops && drops.length > 0 ? (
            <ul className="strip">
              {drops.slice(0, 8).map((d) => {
                const s = toSeed(d.seed);
                return (
                  <li key={d.tokenId}>
                    <button className="strip__item" onClick={() => onOpen(d)} aria-label={`Open Poon #${d.tokenId}`}>
                      <Poon seed={d.seed} size={96} alt="" />
                      <span className="mono">#{d.tokenId}{s !== null && isFounder(s) && <FounderBadge iconOnly />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="empty">{drops ? 'No drops yet. The first Poon lands seconds after the first $10+ buy.' : 'Loading…'}</p>}
        </div>
      </section>
      <section className="section cta" aria-labelledby="cta-title">
        <div className="wrap cta__inner">
          <div>
            <h2 id="cta-title">One buy. One Poon. Free.</h2>
            <p className="dim">Make one buy of $10 or more on Pons and your Poon lands within seconds.</p>
          </div>
          <div className="cta__actions">
            <a className="btn btn--primary" href={stats?.ponsUrl ?? PONS_URL} target="_blank" rel="noopener noreferrer">Buy on Pons ↗</a>
            <a className="btn btn--ghost" href={href('check')}>Check my wallet</a>
            <a className="btn btn--ghost" href={OPENSEA_URL} target="_blank" rel="noopener noreferrer">OpenSea ↗</a>
          </div>
        </div>
      </section>
    </>
  );
}
