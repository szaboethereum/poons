import { explorerAddr, shortAddr } from '../lib/format';
import { ROUTES, href } from '../lib/router';
import type { Stats } from '../lib/types';
import { Logo } from './Logo';

export function Footer({ stats, demo }: { stats: Stats | undefined; demo: boolean }) {
  const real = stats && !demo;
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
          {stats?.ponsUrl && <li><a href={stats.ponsUrl} target="_blank" rel="noopener noreferrer">Buy on Pons ↗</a></li>}
          {real && <li>Poons <a className="mono" href={explorerAddr(stats.chainId, stats.poons)} target="_blank" rel="noopener noreferrer">{shortAddr(stats.poons)}</a></li>}
          {real && <li>Token <a className="mono" href={explorerAddr(stats.chainId, stats.token)} target="_blank" rel="noopener noreferrer">{shortAddr(stats.token)}</a></li>}
        </ul>
        <p className="site-footer__note dim">Not financial advice. Tokens are risky; only buy what you can afford to lose.</p>
      </div>
    </footer>
  );
}
