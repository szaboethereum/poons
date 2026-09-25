import { useMemo, useState } from 'react';
import { countTicks, fmtBucket, fmtFull, scale } from '../../lib/chart';
import { num, usd } from '../../lib/format';
import type { Bucket, SeriesPoint } from '../../lib/types';
import { useWidth } from '../../hooks/useSize';
import { ChartCard, EmptyChart, Segmented, Tooltip, type TipState } from './ChartCard';

const H = 260, M = { t: 16, r: 12, b: 28, l: 40 };
const WINDOW: Record<Bucket, { max: number; min: number }> = {
  '10m': { max: 144, min: 18 },
  hour: { max: 96, min: 12 },
  day: { max: 60, min: 7 },
};

const empty = (t: number): SeriesPoint => ({ t, buys: 0, qualifyingBuys: 0, buyers: 0, volumeUsd: 0, sells: 0, sellUsd: 0, drops: 0, mintedTotal: 0 });

/** Fill the gaps the API leaves out, ending at the current bucket; keep between min and max buckets. */
export function fillSeries(series: SeriesPoint[], bucketS: number, bucket: Bucket, nowS: number): SeriesPoint[] {
  const { max, min } = WINDOW[bucket];
  const end = Math.floor(nowS / bucketS) * bucketS;
  const first = series.length ? series[0].t : end;
  let start = Math.max(first, end - (max - 1) * bucketS);
  start = Math.min(start, end - (min - 1) * bucketS);
  const byT = new Map(series.map((p) => [p.t, p]));
  const out: SeriesPoint[] = [];
  for (let t = start; t <= end; t += bucketS) out.push(byT.get(t) ?? empty(t));
  return out;
}

interface Props { series: SeriesPoint[]; bucketS: number; bucket: Bucket; onBucket: (b: Bucket) => void; nowS: number; loading: boolean }

export function ActivityChart({ series, bucketS, bucket, onBucket, nowS, loading }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(() => fillSeries(series, bucketS, bucket, nowS), [series, bucketS, bucket, nowS]);
  const any = data.some((p) => p.buys || p.sells);
  const totals = data.reduce((a, p) => ({ buys: a.buys + p.buys, sells: a.sells + p.sells, q: a.q + p.qualifyingBuys }), { buys: 0, sells: 0, q: 0 });

  const up = countTicks(Math.max(1, ...data.map((p) => p.buys)) * 1.1, 3);
  const downMax = Math.max(1, ...data.map((p) => p.sells));
  // Share the scale above and below zero so bar heights compare honestly.
  const top = up.max, bottom = Math.max(downMax, top * 0.35);
  const plotH = H - M.t - M.b;
  const zeroY = M.t + (top / (top + bottom)) * plotH;
  const y = scale(0, top, zeroY, M.t);
  const yDown = (v: number) => zeroY + (v / bottom) * (H - M.b - zeroY);
  const n = data.length;
  const band = (W - M.l - M.r) / n;
  const bw = Math.max(2, Math.min(24, band * 0.72));
  const cx = (i: number) => M.l + band * i + band / 2;
  const labelEvery = Math.ceil(n / Math.max(2, Math.floor((W - M.l - M.r) / 70)));
  const q = data.map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${y(p.qualifyingBuys).toFixed(1)}`).join('');

  const tip: TipState | null = hover === null ? null : {
    x: cx(hover), y: M.t,
    content: (() => { const p = data[hover]; return (
      <>
        <span className="dim">{fmtFull(p.t)}</span>
        <dl className="tip-dl">
          <dt><i className="key key--buy" />Buys</dt><dd className="mono">{num(p.buys)} · {usd(p.volumeUsd)}</dd>
          <dt><i className="key key--q" />Qualifying</dt><dd className="mono">{num(p.qualifyingBuys)}</dd>
          <dt><i className="key key--sell" />Sells</dt><dd className="mono">{num(p.sells)} · {usd(p.sellUsd)}</dd>
        </dl>
      </>
    ); })(),
  };

  return (
    <ChartCard
      title="Market activity"
      sub={<>Buys above the line, sells below, per {bucket === '10m' ? '10 minutes' : bucket}. <span className="mono">{num(totals.buys)}</span> buys, <span className="mono">{num(totals.q)}</span> qualifying, <span className="mono">{num(totals.sells)}</span> sells.</>}
      actions={<Segmented label="Bucket size" value={bucket} onChange={onBucket} options={[{ value: '10m', label: '10m' }, { value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }]} />}
      note={<span className="legend"><span><i className="key key--buy" />Buys</span><span><i className="key key--q" />Qualifying buys ($10+)</span><span><i className="key key--sell" />Sells</span></span>}
    >
      {!any && !loading ? (
        <EmptyChart height={H}>No trades in this window yet.</EmptyChart>
      ) : (
        <div className="chart" ref={ref}>
          <svg width={W} height={H} role="img" aria-label={`Market activity per ${bucket}: ${totals.buys} buys, ${totals.q} qualifying, ${totals.sells} sells`}>
            {up.ticks.map((v) => (
              <g key={v} className="axis">
                <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'zero-line' : 'grid-line'} />
                <text x={M.l - 8} y={y(v)} dy="0.32em" textAnchor="end">{v}</text>
              </g>
            ))}
            <text className="axis" x={M.l - 8} y={yDown(bottom)} dy="-0.2em" textAnchor="end">−{Math.round(bottom)}</text>
            {data.map((p, i) => (
              <g key={p.t} className={hover === i ? 'is-hover' : undefined}>
                {hover === i && <rect x={M.l + band * i} y={M.t} width={band} height={plotH} className="hover-band" />}
                {p.buys > 0 && <rect x={cx(i) - bw / 2} y={y(p.buys)} width={bw} height={zeroY - y(p.buys)} rx={Math.min(2, bw / 3)} className="bar bar--buy" />}
                {p.sells > 0 && <rect x={cx(i) - bw / 2} y={zeroY + 1} width={bw} height={Math.max(0, yDown(p.sells) - zeroY - 1)} rx={Math.min(2, bw / 3)} className="bar bar--sell" />}
                {i % labelEvery === 0 && <text className="axis" x={cx(i)} y={H - 8} textAnchor="middle">{fmtBucket(p.t, bucketS)}</text>}
              </g>
            ))}
            <path d={q} className="series-line series-line--q" />
            {data.map((p, i) => p.qualifyingBuys > 0 && <circle key={p.t} cx={cx(i)} cy={y(p.qualifyingBuys)} r={n > 60 ? 1.8 : 3} className="series-dot series-dot--q" />)}
            <rect
              x={M.l} y={M.t} width={Math.max(0, W - M.l - M.r)} height={plotH} fill="transparent"
              onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / band)))); }}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
          <Tooltip tip={tip} width={W} />
        </div>
      )}
      <table className="sr-only">
        <caption>Market activity per bucket</caption>
        <thead><tr><th>Bucket start</th><th>Buys</th><th>Qualifying</th><th>Sells</th></tr></thead>
        <tbody>{data.filter((p) => p.buys || p.sells).map((p) => <tr key={p.t}><td>{fmtFull(p.t)}</td><td>{p.buys}</td><td>{p.qualifyingBuys}</td><td>{p.sells}</td></tr>)}</tbody>
      </table>
    </ChartCard>
  );
}
