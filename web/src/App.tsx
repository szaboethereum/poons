import { useCallback, useState } from 'react';
import { api } from './lib/api';
import { DEMO } from './lib/config';
import type { Drop } from './lib/types';
import { href, useRoute, useRouteEffects } from './lib/router';
import { usePoll } from './hooks/usePoll';
import { useDemoMode, useOffline } from './hooks/misc';
import { Header } from './components/Header';
import { DemoBanner } from './components/DemoBanner';
import { OfflineBanner } from './components/OfflineBanner';
import { MintStatusBanner } from './components/MintStatusBanner';
import { WalletChecker } from './components/WalletChecker';
import { LiveDrops } from './components/LiveDrops';
import { Gallery } from './components/Gallery';
import { RarityTable } from './components/RarityTable';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { PoonDetail } from './components/PoonDetail';
import { Page } from './components/Page';
import { HomePage } from './pages/HomePage';
import { StatsPage } from './pages/StatsPage';
import { DocsPage } from './pages/DocsPage';

export default function App() {
  const route = useRoute();
  useRouteEffects(route);
  const demo = useDemoMode();
  const offline = useOffline();
  const stats = usePoll(api.stats, 10_000);
  const recent = usePoll(() => api.recent(24), 5_000);
  const [detail, setDetail] = useState<Drop | null>(null);
  const open = useCallback((d: Drop) => setDetail(d), []);
  const drops = recent.data?.drops;
  const chainId = stats.data?.chainId;

  let page;
  switch (route.id) {
    case 'home': page = <HomePage stats={stats.data} drops={drops} onOpen={open} />; break;
    case 'check': page = <WalletChecker stats={stats.data} onOpen={open} />; break;
    case 'drops': page = <LiveDrops drops={drops} error={recent.error} chainId={chainId} onOpen={open} />; break;
    case 'gallery': page = <Gallery key={demo ? 'demo' : 'live'} onOpen={open} latestId={drops?.[0]?.tokenId} />; break;
    case 'rarity': page = <RarityTable maxSupply={stats.data?.maxSupply ?? 3333} />; break;
    case 'stats': page = <StatsPage />; break;
    case 'roadmap': page = <Page title="Roadmap" sub="Coming soon."><p><a className="btn btn--ghost" href={href('home')}>Back home</a></p></Page>; break;
    case 'docs': page = <DocsPage stats={stats.data} sub={route.sub} />; break;
    case 'faq': page = <Faq stats={stats.data} />; break;
    default:
      page = <Page title="Page not found" sub="That page doesn't exist."><p><a className="btn btn--ghost" href={href('home')}>Back home</a></p></Page>;
  }

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}
      >
        Skip to content
      </a>
      <Header stats={stats.data} active={route.id} />
      {DEMO && demo && <DemoBanner />}
      {!demo && offline && <OfflineBanner />}
      {!demo && !offline && <MintStatusBanner stats={stats.data} />}
      <main id="main" tabIndex={-1} key={route.id}>{page}</main>
      <Footer stats={stats.data} demo={demo} />
      <PoonDetail drop={detail} chainId={chainId} onClose={() => setDetail(null)} />
    </>
  );
}
