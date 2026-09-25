import { explorerAddr, shortAddr } from '../lib/format';
import { DEPLOYMENT, PONS_URL } from '../lib/config';
import { ROUTES, href } from '../lib/router';
import type { Stats } from '../lib/types';
import { Logo } from './Logo';

export function Footer({ stats, demo }: { stats: Stats | undefined; demo: boolean }) {
  const real = stats && !demo;
  const token = real ? stats.token : DEPLOYMENT.token;
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <div className="site-footer__brand">
          <Logo height={16} />
          <p className="dim">Free, fully on-chain pixel Poons on Robinhood Chain.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="site-footer__links">
            {ROUTES.filter((r) => r.id !== 'home').map((r) => <li key={r.id}><a href={href(r.id)}>{r.label}</a></li>)}
          </ul>
        </nav>
        <ul className="site-footer__meta">
          {<li><a href={(real && stats.ponsUrl) || PONS_URL} target="_blank" rel="noopener noreferrer">Buy on Pons ↗</a></li>}
          <li>Poons <a className="mono" href={explorerAddr(DEPLOYMENT.chainId, DEPLOYMENT.poons)} target="_blank" rel="noopener noreferrer">{shortAddr(DEPLOYMENT.poons)}</a></li>
          {token && <li>Token <a className="mono" href={explorerAddr(DEPLOYMENT.chainId, token)} target="_blank" rel="noopener noreferrer">{shortAddr(token)}</a></li>}
        </ul>
        <p className="site-footer__note dim">Not financial advice. Tokens are risky; only buy what you can afford to lose.</p>
      </div>
    </footer>
  );
}
