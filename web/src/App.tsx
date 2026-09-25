import { useCallback, useState } from 'react';
import { api } from './lib/api';
import type { Drop } from './lib/types';
import { usePoll } from './hooks/usePoll';
import { useDemoMode } from './hooks/misc';
import { Header } from './components/Header';
import { DemoBanner } from './components/DemoBanner';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { WalletChecker } from './components/WalletChecker';
import { LiveDrops } from './components/LiveDrops';
import { Gallery } from './components/Gallery';
import { RarityTable } from './components/RarityTable';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { PoonDetail } from './components/PoonDetail';

export default function App() {
  const demo = useDemoMode();
  const stats = usePoll(api.stats, 10_000);
  const recent = usePoll(() => api.recent(24), 5_000);
  const [detail, setDetail] = useState<Drop | null>(null);
  const open = useCallback((d: Drop) => setDetail(d), []);
  const drops = recent.data?.drops;
  const chainId = stats.data?.chainId;

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header stats={stats.data} />
      {demo && <DemoBanner />}
      <main id="main">
        <Hero stats={stats.data} drops={drops} onOpen={open} />
        <HowItWorks stats={stats.data} />
        <WalletChecker stats={stats.data} onOpen={open} />
        <LiveDrops drops={drops} error={recent.error} chainId={chainId} onOpen={open} />
        <Gallery key={demo ? 'demo' : 'live'} onOpen={open} latestId={drops?.[0]?.tokenId} />
        <RarityTable maxSupply={stats.data?.maxSupply ?? 3333} />
        <Faq stats={stats.data} />
      </main>
      <Footer stats={stats.data} demo={demo} />
      <PoonDetail drop={detail} chainId={chainId} onClose={() => setDetail(null)} />
    </>
  );
}
