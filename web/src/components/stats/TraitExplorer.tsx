import { useMemo, useState } from 'react';
import { TRAITS, TYPE_TRAIT, isSpecial, optionPct } from '../../lib/art';
import { num, pct } from '../../lib/format';
import { ChartCard } from './ChartCard';

/** counts[k][i] = minted Poons whose trait k rolled option i. */
export function TraitExplorer({ counts, minted }: { counts: number[][]; minted: number }) {
  const [k, setK] = useState(TYPE_TRAIT >= 0 ? TYPE_TRAIT : 0);
  const t = TRAITS[k];
  const rows = useMemo(() => t.opts.map((o, i) => {
    const exp = optionPct(t, i);
    return { name: o[0], n: counts[k]?.[i] ?? 0, exp, expN: (exp / 100) * minted, special: isSpecial(k, i) };
  }).sort((a, b) => b.exp - a.exp), [t, k, counts, minted]);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.n, r.expN)));

  return (
    <ChartCard
      title="Trait explorer"
      sub="Minted count per option; the tick marks what the odds predict"
      actions={
        <label className="select-inline">
          <span className="sr-only">Trait</span>
          <select className="select select--sm" value={k} onChange={(e) => setK(Number(e.target.value))}>
            {TRAITS.map((tr, i) => <option key={tr.key} value={i}>{tr.key}</option>)}
          </select>
        </label>
      }
      note={<span className="legend"><span><i className="key key--solid" />Minted</span><span><i className="key key--tick" />Expected at current supply</span><span><i className="key key--special" />Special type</span></span>}
    >
      <div className="hbars hbars--dense" role="table" aria-label={`${t.key}: minted vs expected`}>
        {rows.map((r) => (
          <div key={r.name} className={`hbar${r.special ? ' hbar--special' : ''}`} role="row">
            <span className="hbar__label" role="rowheader">{r.name}</span>
            <span className="hbar__track" role="cell" aria-label={`${r.n} minted, ${r.expN.toFixed(1)} expected`}>
              <span className="hbar__fill" style={{ width: `${(r.n / max) * 100}%` }} />
              <span className="hbar__tick" style={{ left: `${(r.expN / max) * 100}%` }} />
            </span>
            <span className="hbar__val mono" role="cell">{num(r.n)} <span className="dim">· {pct(r.exp)}</span></span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
