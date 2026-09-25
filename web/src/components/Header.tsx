import type { Stats } from '../lib/types';
import { num } from '../lib/format';

const LINKS = [
  ['#how', 'How it works'],
  ['#drops', 'Live drops'],
  ['#gallery', 'Gallery'],
  ['#rarity', 'Rarity'],
  ['#faq', 'FAQ'],
] as const;

export function Header({ stats }: { stats: Stats | undefined }) {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <a className="wordmark wordmark--sm" href="#top" aria-label="Poons, back to top">Poons</a>
        <nav aria-label="Sections">
          <ul className="nav-links">
            {LINKS.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}
          </ul>
        </nav>
        <div className="site-header__end">
          {stats && (
            <span className="header-count mono" aria-label={`${stats.minted} of ${stats.maxSupply} minted`}>
              {num(stats.minted)}<span className="dim">/{num(stats.maxSupply)}</span>
            </span>
          )}
          <a className="btn btn--small" href="#wallet">Check wallet</a>
        </div>
      </div>
    </header>
  );
}
