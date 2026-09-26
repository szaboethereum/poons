// Tiny hash router: #/stats, #/docs/api … works on any static host.
import { useEffect, useSyncExternalStore } from 'react';

export const ROUTES = [
  { id: 'home', path: '', label: 'Home', title: 'Poons — a free on-chain Poon for every $10 buy' },
  { id: 'check', path: 'check', label: 'Check', title: 'Check your wallet · Poons' },
  { id: 'drops', path: 'drops', label: 'Drops', title: 'Live drops · Poons' },
  { id: 'gallery', path: 'gallery', label: 'Gallery', title: 'Gallery · Poons' },
  { id: 'rarity', path: 'rarity', label: 'Rarity', title: 'Rarity · Poons' },
  { id: 'stats', path: 'stats', label: 'Stats', title: 'Stats · Poons' },
  { id: 'roadmap', path: 'roadmap', label: 'Roadmap', title: 'Roadmap · Poons', soon: false },
  { id: 'docs', path: 'docs', label: 'Docs', title: 'Docs · Poons' },
  { id: 'faq', path: 'faq', label: 'FAQ', title: 'FAQ · Poons' },
] as const;

/** Routes shown in navigation but not open yet. */
export const isSoon = (r: (typeof ROUTES)[number]) => 'soon' in r && r.soon;

export type RouteId = (typeof ROUTES)[number]['id'] | 'notfound';
export interface Route { id: RouteId; sub: string | null }

// Anchors from the single-page version keep working.
const LEGACY: Record<string, RouteId> = { top: 'home', how: 'home', wallet: 'check', drops: 'drops', gallery: 'gallery', rarity: 'rarity', faq: 'faq' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (!h || h === '/') return { id: 'home', sub: null };
  if (!h.startsWith('/')) return { id: LEGACY[h] ?? 'home', sub: null };
  const [first, ...rest] = h.slice(1).split('/');
  const r = ROUTES.find((x) => x.path === first);
  return { id: r ? r.id : 'notfound', sub: rest.join('/') || null };
}

export const href = (id: Exclude<RouteId, 'notfound'>, sub?: string) => {
  const r = ROUTES.find((x) => x.id === id)!;
  return `#/${r.path}${sub ? `/${sub}` : ''}`;
};

const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
const snapshot = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot);
  return parseHash(hash);
}

/** Title, scroll and focus handling on route change (not on first load, so deep links behave). */
export function useRouteEffects(route: Route) {
  useEffect(() => {
    const meta = ROUTES.find((r) => r.id === route.id);
    document.title = meta ? meta.title : 'Not found · Poons';
  }, [route.id]);

  useEffect(() => {
    const target = route.sub ? document.getElementById(`doc-${route.sub}`) : null;
    if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
    else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route.id, route.sub]);

  useEffect(() => {
    if (first) { first = false; return; }
    if (route.sub) return;
    const h = document.querySelector<HTMLElement>('[data-page-title]');
    h?.focus({ preventScroll: true });
  }, [route.id, route.sub]);
}
let first = true;
