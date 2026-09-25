import { num, pct } from '../../lib/format';
import { ChartCard, EmptyChart } from './ChartCard';

interface Props { actual: Map<string, number>; minted: number; expected: { tier: string; share: number }[] | null }

export function TierCompare({ actual, minted, expected }: Props) {
  if (!expected) return <ChartCard title="Rarity: minted vs expected"><EmptyChart>The art engine doesn't expose rarity yet.</EmptyChart></ChartCard>;
  const max = Math.max(...expected.map((e) => e.share), ...expected.map((e) => (minted ? ((actual.get(e.tier) ?? 0) / minted) * 100 : 0)));
  return (
    <ChartCard
      title="Rarity: minted vs expected"
      sub={minted ? <>Share of <span className="mono">{num(minted)}</span> minted Poons per tier, against the odds</> : 'Expected share per tier'}
      note={<>{minted > 0 && minted < 50 && <>Small sample: with {num(minted)} mints, shares swing a lot. </>}<span className="legend"><span><i className="key key--solid" />Minted</span><span><i className="key key--ghost" />Expected</span></span></>}
    >
      <div className="hbars" role="table" aria-label="Tier share, minted vs expected">
        {expected.map((e) => {
          const n = actual.get(e.tier) ?? 0;
          const share = minted ? (n / minted) * 100 : 0;
          const cls = e.tier.toLowerCase();
          return (
            <div key={e.tier} className="hbar" role="row">
              <span className="hbar__label" role="rowheader"><i className={`swatch tier-bg--${cls}`} aria-hidden="true" />{e.tier}</span>
              <span className="hbar__track" role="cell" aria-label={`Minted ${pct(share)}, expected ${pct(e.share)}`}>
                <span className="hbar__ghost" style={{ width: `${(e.share / max) * 100}%` }} />
                <span className={`hbar__fill tier-bg--${cls}`} style={{ width: `${(share / max) * 100}%` }} />
              </span>
              <span className="hbar__val mono" role="cell">{num(n)} <span className="dim">· {pct(share)} / {pct(e.share)}</span></span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
