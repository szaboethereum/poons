import { Page } from '../components/Page';

type Status = 'live' | 'next' | 'planned' | 'exploring';
const STATUS_LABEL: Record<Status, string> = { live: 'Live now', next: 'Designing', planned: 'Planned', exploring: 'Exploring' };

const PHASES: { n: number; name: string; status: Status; items: [string, string][] }[] = [
  {
    n: 0, name: 'Launch', status: 'live', items: [
      ['Token on Pons', 'The $POONS token trades on the Pons launchpad.'],
      ['A free Poon for every $10+ buy', 'One per wallet, 3,333 max, dropped automatically within seconds.'],
      ['Fully on-chain art', 'Every Poon is drawn by the contract from its seed. Nothing lives off-chain.'],
      ['Founding Resident stamp', 'Poons whose buy happened on the bonding curve, before graduation, carry a gold star.'],
      ['Creator fee', 'A 5% creator fee is enforced on OpenSea.'],
    ],
  },
  {
    n: 1, name: 'The Neighborhood Economy', status: 'next', items: [
      ['Rent', 'We are designing a way for part of the creator fees to flow back to Poon holders as rent.'],
      ['Deed', 'An idea we are exploring: a treasury that each Poon holds a share of.'],
      ['Renovations', 'Use $POONS to repaint your house on-chain.'],
    ],
  },
  {
    n: 2, name: 'Furnished Houses', status: 'planned', items: [
      ['A wallet in every house', 'Every Poon gets its own wallet (ERC-6551), so rent and items live inside the house and move with it.'],
      ['Landmarks', 'Something special for Legendary Poons.'],
    ],
  },
  {
    n: 3, name: 'Research', status: 'exploring', items: [
      ['Streets', 'Ways for houses that share a roof to do things together.'],
    ],
  },
];

export function RoadmapPage() {
  return (
    <Page eyebrow="Roadmap" title="Where the neighborhood is going" sub="Phases, not dates. Each one ships when it's ready, and plans can change along the way.">
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
      <p className="note">Everything after Phase 0 is a plan, not a promise. Details, timing and scope may change, and new contracts will be reviewed before they go live. Poons are collectibles, not an investment.</p>
    </Page>
  );
}
