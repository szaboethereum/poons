import { Page } from '../components/Page';

type Status = 'live' | 'next' | 'planned' | 'exploring';
const STATUS_LABEL: Record<Status, string> = { live: 'Live now', next: 'Next', planned: 'Planned', exploring: 'Exploring' };

const PHASES: { n: number; name: string; status: Status; items: [string, string][] }[] = [
  {
    n: 0, name: 'Launch', status: 'live', items: [
      ['Token on Pons', 'The token trades on the Pons launchpad.'],
      ['A free Poon for every $10+ buy', 'One per wallet, 3,333 max, dropped automatically within seconds.'],
      ['Fully on-chain art', 'Every Poon is drawn by the contract from its seed. Nothing lives off-chain.'],
      ['Founding Resident stamp', 'Poons whose buy happened on the bonding curve, before graduation, carry a gold star.'],
      ['Creator fee', 'A 5% creator fee is enforced on OpenSea.'],
    ],
  },
  {
    n: 1, name: 'The Neighborhood Economy', status: 'next', items: [
      ['Rent', 'Creator fees flow into a treasury and are paid out to every Poon as rent, in the token. Whoever holds the Poon can claim it.'],
      ['Deed value', 'Part of the treasury backs every Poon. A holder can hand their Poon to the treasury and take out its share, which sets a floor.'],
      ['Renovations', 'Burn tokens to repaint your house on-chain, priced by a self-adjusting auction curve.'],
    ],
  },
  {
    n: 2, name: 'Furnished Houses', status: 'planned', items: [
      ['A wallet in every house', 'Every Poon gets its own wallet (ERC-6551), so rent and items live inside the house and move with it.'],
      ['Landmarks', 'An opt-in, self-assessed-price mode for Legendary Poons.'],
    ],
  },
  {
    n: 3, name: 'Research', status: 'exploring', items: [
      ['Rent coupons', 'Sell future rent today.'],
      ['Street tokens', 'Liquid baskets of houses that share a roof.'],
    ],
  },
];

export function RoadmapPage() {
  return (
    <Page eyebrow="Roadmap" title="Where the neighborhood is going" sub="Phases, not dates. Each one ships when it's ready.">
      <ol className="timeline">
        {PHASES.map((p) => (
          <li key={p.n} className={`phase phase--${p.status}`}>
            <span className="phase__dot" aria-hidden="true" />
            <div className="phase__head">
              <span className="phase__n mono">Phase {p.n}</span>
              <h2 className="phase__name">{p.name}</h2>
              <span className={`pill pill--${p.status}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <ul className="phase__items">
              {p.items.map(([t, d]) => <li key={t}><strong>{t}.</strong> {d}</li>)}
            </ul>
          </li>
        ))}
      </ol>
      <p className="note">Phase 1 and later contracts will be audited before launch.</p>
    </Page>
  );
}
