import { href, isSoon, ROUTES, type RouteId } from '../lib/router';

type R = (typeof ROUTES)[number];

/** A nav link, or a visible but disabled item for sections that aren't open yet. */
export function NavItem({ r, active, className }: { r: R; active: RouteId; className?: string }) {
  if (isSoon(r)) {
    return (
      <span className={`${className ?? ''} nav-soon`} aria-disabled="true" title="Coming soon">
        {r.label} <span className="nav-soon__tag">soon</span>
      </span>
    );
  }
  return <a className={className} href={href(r.id)} aria-current={active === r.id ? 'page' : undefined}>{r.label}</a>;
}
