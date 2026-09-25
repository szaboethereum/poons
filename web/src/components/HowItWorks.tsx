import { num, usd } from '../lib/format';
import type { Stats } from '../lib/types';

export function HowItWorks({ stats }: { stats: Stats | undefined }) {
  const minBuy = usd(stats?.minBuyUsd ?? 10);
  const max = num(stats?.maxSupply ?? 3333);
  const steps = [
    { n: '01', title: `Buy ${minBuy}+ on Pons`, body: `Make one buy of at least ${minBuy} of the token on the Pons launchpad. Smaller buys don't add up.` },
    { n: '02', title: 'Your Poon lands', body: 'It is dropped to your wallet automatically, within seconds. No mint button, no gas.' },
    { n: '03', title: 'Keep it or trade it', body: 'The Poon is yours. Keep it, send it, or trade it on OpenSea.' },
  ];
  return (
    <section className="section" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <header className="section__head">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title">One buy, one Poon</h2>
        </header>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.n} className="step">
              <span className="step__n" aria-hidden="true">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <ul className="rules" aria-label="Rules">
          <li><strong>One per wallet, ever.</strong> Buying more changes nothing.</li>
          <li><strong>{minBuy} minimum, in one buy.</strong> Smaller buys don't count or add up.</li>
          <li><strong>Market buys only.</strong> Tokens received by transfer don't count.</li>
          <li><strong>Free mint, {max} max.</strong> Buy or sell the token whenever you like; your Poon stays yours.</li>
        </ul>
      </div>
    </section>
  );
}
