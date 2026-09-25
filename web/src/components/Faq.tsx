import { num, usd } from '../lib/format';
import type { Stats } from '../lib/types';

export function Faq({ stats }: { stats: Stats | undefined }) {
  const minBuy = usd(stats?.minBuyUsd ?? 10);
  const max = num(stats?.maxSupply ?? 3333);
  const items: [string, string][] = [
    ['Is it really free?', `Yes. There's no mint price and you don't send a mint transaction. The project's minter sends your Poon to you. You only pay for the token you buy on Pons.`],
    ['Can I get more than one?', `No. It's one Poon per wallet, ever. Buying more, or buying again later, changes nothing.`],
    ['Can I sell my tokens?', `Yes, whenever you want. Selling doesn't affect your Poon, before or after it lands.`],
    ['I bought but nothing arrived. Why?', `Check your wallet above. Common reasons: no single buy was ${minBuy} or more, the tokens came in by transfer rather than a market buy, the wallet already has a Poon, or the drop is still being sent (it takes seconds).`],
    ['Can I sell or trade my Poon?', `Yes. On OpenSea a 5% creator fee is enforced (ERC721-C). Plain wallet-to-wallet transfers are free.`],
    ['Where does the art live?', `Fully on-chain. Each Poon is a 32×32 pixel image drawn by the contract from a seed, with no IPFS and no server. The same seed always gives the same Poon.`],
    [`What happens after ${max}?`, `Supply is capped at ${max}. When the last Poon drops, the airdrop ends for good.`],
  ];
  return (
    <section className="section section--alt" id="faq" aria-labelledby="faq-title">
      <div className="wrap faq">
        <header className="section__head">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title">Questions</h2>
        </header>
        <div className="faq__list">
          {items.map(([q, a]) => (
            <details key={q} className="faq__item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
