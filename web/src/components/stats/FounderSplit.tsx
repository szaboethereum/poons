import { num, pct } from '../../lib/format';
import { ChartCard, EmptyChart } from './ChartCard';

export function FounderSplit({ founders, minted }: { founders: number; minted: number }) {
  if (!minted) return <ChartCard title="Founding vs later residents"><EmptyChart>No Poons minted yet.</EmptyChart></ChartCard>;
  const later = minted - founders;
  const f = founders / minted;
  const R = 44, C = 2 * Math.PI * R;
  return (
    <ChartCard title="Founding vs later residents" sub="Founding Residents bought on the bonding curve, before graduation">
      <div className="donut-wrap">
        <svg viewBox="0 0 120 120" width="136" height="136" role="img" aria-label={`${founders} Founding Residents (${pct(f * 100)}), ${later} later residents`}>
          <circle cx="60" cy="60" r={R} className="donut__track" />
          {founders > 0 && <circle cx="60" cy="60" r={R} className="donut__seg donut__seg--founder" strokeDasharray={`${C * f} ${C}`} transform="rotate(-90 60 60)" />}
          <text x="60" y="58" textAnchor="middle" className="donut__big">{pct(f * 100)}</text>
          <text x="60" y="74" textAnchor="middle" className="donut__small">founders</text>
        </svg>
        <dl className="donut-legend">
          <div><dt><i className="key key--founder" />Founding Residents</dt><dd className="mono">{num(founders)}</dd></div>
          <div><dt><i className="key key--later" />Later residents</dt><dd className="mono">{num(later)}</dd></div>
          <div className="donut-legend__total"><dt>Minted</dt><dd className="mono">{num(minted)}</dd></div>
        </dl>
      </div>
    </ChartCard>
  );
}
