import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { TRAITS, expectedTiers, isFounder, rarityOf, toSeed, Art } from '../lib/art';
import { fmtFull } from '../lib/chart';
import type { Bucket } from '../lib/types';
import { usePoll } from '../hooks/usePoll';
import { useDemoMode, useNow } from '../hooks/misc';
import { Page } from '../components/Page';
import { Kpis } from '../components/stats/Kpis';
import { HealthChip } from '../components/stats/HealthChip';
import { MintProgressChart } from '../components/stats/MintProgressChart';
import { ActivityChart } from '../components/stats/ActivityChart';
import { BuySizeChart } from '../components/stats/BuySizeChart';
import { TierCompare } from '../components/stats/TierCompare';
import { TraitExplorer } from '../components/stats/TraitExplorer';
import { FounderSplit } from '../components/stats/FounderSplit';
import { ChartCard, EmptyChart } from '../components/stats/ChartCard';

export function StatsPage() {
  const demo = useDemoMode();
  const nowS = Math.floor(useNow(15_000) / 1000);
  const [bucket, setBucket] = useState<Bucket>('hour');
  const overview = usePoll(api.overview, 15_000);
  const series = usePoll(() => api.series(bucket), 20_000, [bucket]);
  const fine = usePoll(() => api.series('10m'), 20_000);
  const sizes = usePoll(api.buySizes, 30_000);
  const seeds = usePoll(api.seeds, 30_000);
  const health = usePoll(api.health, 10_000);

  // Distributions of what has actually been minted, computed from seeds with the art engine.
  const dist = useMemo(() => {
    const tiers = new Map<string, number>();
    const traits = TRAITS.map((t) => new Array<number>(t.opts.length).fill(0));
    let founders = 0, n = 0;
    for (const [, hex] of seeds.data?.seeds ?? []) {
      const s = toSeed(hex);
      if (s === null) continue;
      n++;
      if (isFounder(s)) founders++;
      const r = rarityOf(s);
      if (r) tiers.set(r.tier, (tiers.get(r.tier) ?? 0) + 1);
      Art.traitsFor(s).forEach((i, k) => { traits[k][i]++; });
    }
    return { tiers, traits, founders, n };
  }, [seeds.data]);
  const expected = useMemo(() => expectedTiers(), []);
  const o = overview.data;
  const minted = o?.minted ?? dist.n;
  const maxSupply = o?.maxSupply ?? 3333;

  return (
    <Page
      className="stats"
      eyebrow="Stats"
      title="Poons by the numbers"
      sub={<>{demo ? 'Generated demo data (indexer offline).' : 'Live from the indexer.'}{o?.lastDropAt ? <> Last drop {fmtFull(o.lastDropAt)}.</> : null}</>}
      aside={<HealthChip health={health.data} error={health.error} demo={demo} />}
    >
      <Kpis o={o} />
      <div className="chart-grid">
        <div className="span-2">
          {fine.data ? <MintProgressChart series={fine.data.series} bucket={fine.data.bucket} maxSupply={maxSupply} nowS={nowS} />
            : <ChartCard title="Mint progress"><EmptyChart>{fine.error ?? 'Loading…'}</EmptyChart></ChartCard>}
        </div>
        <div className="span-2">
          <ActivityChart series={series.data?.series ?? []} bucketS={series.data?.bucket ?? 3600} bucket={bucket} onBucket={setBucket} nowS={nowS} loading={series.loading && !series.data} />
        </div>
        {sizes.data ? <BuySizeChart data={sizes.data} /> : <ChartCard title="Buy sizes"><EmptyChart>{sizes.error ?? 'Loading…'}</EmptyChart></ChartCard>}
        <FounderSplit founders={o?.founders ?? dist.founders} minted={minted} />
        <TierCompare actual={dist.tiers} minted={dist.n} expected={expected} />
        <TraitExplorer counts={dist.traits} minted={dist.n} />
      </div>
    </Page>
  );
}
