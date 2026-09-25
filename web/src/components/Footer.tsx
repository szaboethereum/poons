import { explorerAddr, shortAddr } from '../lib/format';
import type { Stats } from '../lib/types';
import { Poon } from './Poon';

export function Footer({ stats, demo }: { stats: Stats | undefined; demo: boolean }) {
  const real = stats && !demo;
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <div className="site-footer__brand">
          <Poon seed={0n} size={48} alt="" />
          <div>
            <p className="wordmark wordmark--sm">Poons</p>
            <p className="dim">Free, fully on-chain pixel Poons on Robinhood Chain.</p>
          </div>
        </div>
        <ul className="site-footer__links">
          {stats?.ponsUrl && <li><a href={stats.ponsUrl} target="_blank" rel="noopener noreferrer">Buy on Pons ↗</a></li>}
          {real && <li>Token <a className="mono" href={explorerAddr(stats.chainId, stats.token)} target="_blank" rel="noopener noreferrer">{shortAddr(stats.token)}</a></li>}
          {real && <li>Poons contract <a className="mono" href={explorerAddr(stats.chainId, stats.poons)} target="_blank" rel="noopener noreferrer">{shortAddr(stats.poons)}</a></li>}
          <li><a href="#top">Back to top ↑</a></li>
        </ul>
        <p className="site-footer__note dim">Not financial advice. Tokens are risky; only buy what you can afford to lose.</p>
      </div>
    </footer>
  );
}
