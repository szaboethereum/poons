import { useEffect, useRef, useState } from 'react';
import type { Stats } from '../lib/types';
import { num } from '../lib/format';
import { ROUTES, href, type RouteId } from '../lib/router';
import { Logo } from './Logo';

export function Header({ stats, active }: { stats: Stats | undefined; active: RouteId }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [active]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const links = ROUTES.filter((r) => r.id !== 'home');
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <a className="site-header__brand" href={href('home')} aria-label="Poons home" aria-current={active === 'home' ? 'page' : undefined}>
          <Logo height={20} title="Poons" />
        </a>
        <nav className="nav" aria-label="Main">
          <ul className="nav__list">
            {links.map((r) => (
              <li key={r.id}>
                <a className="nav__link" href={href(r.id)} aria-current={active === r.id ? 'page' : undefined}>{r.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__end">
          {stats && (
            <span className="header-count mono" title="Minted">
              {num(stats.minted)}<span className="dim">/{num(stats.maxSupply)}</span>
            </span>
          )}
          <a className="btn btn--primary btn--small header-cta" href={stats?.ponsUrl ?? 'https://www.ponsfamily.com/'} target="_blank" rel="noopener noreferrer">Buy on Pons</a>
          <button
            ref={btn}
            className="menu-btn"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <span className="menu-btn__bars" aria-hidden="true" data-open={open} />
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Main">
          <ul className="wrap">
            {ROUTES.map((r) => (
              <li key={r.id}>
                <a href={href(r.id)} aria-current={active === r.id ? 'page' : undefined}>{r.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
