import { num, pct, usd } from '../../lib/format';
import type { Overview } from '../../lib/types';

export function Kpis({ o }: { o: Overview | undefined }) {
  const minted = o?.minted ?? 0, max = o?.maxSupply ?? 3333;
  const p50 = o?.dropLatencySec.p50, p90 = o?.dropLatencySec.p90;
  return (
    <div className="kpis kpis--5">
      <div className="kpi">
        <span className="kpi__label">Minted</span>
        <span className="kpi__value mono">{o ? num(minted) : '—'}<span className="kpi__unit">/ {num(max)}</span></span>
        <span className="kpi__meter" aria-hidden="true"><span style={{ width: `${Math.max(0.5, (minted / max) * 100)}%` }} /></span>
        <span className="kpi__hint mono">{o ? pct((minted / max) * 100) : ''}</span>
      </div>
      <div className="kpi">
        <span className="kpi__label">Unique buyers</span>
        <span className="kpi__value mono">{o ? num(o.uniqueBuyers) : '—'}</span>
        <span className="kpi__hint">{o ? `${num(o.buys)} buys` : ''}</span>
      </div>
      <div className="kpi">
        <span className="kpi__label">Buy volume</span>
        <span className="kpi__value mono">{o ? usd(Math.round(o.buyVolumeUsd)) : '—'}</span>
        <span className="kpi__hint">{o ? `${usd(Math.round(o.sellVolumeUsd))} sold` : ''}</span>
      </div>
      <div className="kpi">
        <span className="kpi__label">Founding Residents</span>
        <span className="kpi__value mono">{o && minted ? pct((o.founders / minted) * 100) : '—'}</span>
        <span className="kpi__hint">{o ? `${num(o.founders)} of ${num(minted)}` : ''}</span>
      </div>
      <div className="kpi">
        <span className="kpi__label">Drop time</span>
        <span className="kpi__value mono">{p50 != null ? `~${p50}s` : '—'}</span>
        <span className="kpi__hint">{p90 != null ? `Poon lands in ~${p50}s · p90 ${p90}s` : 'No drops yet'}</span>
      </div>
    </div>
  );
}
