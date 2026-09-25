import { useMemo, useState } from 'react';
import { countTicks, fmtFull, fmtBucket, scale, compact } from '../../lib/chart';
import { num } from '../../lib/format';
import type { SeriesPoint } from '../../lib/types';
import { useWidth } from '../../hooks/useSize';
import { ChartCard, EmptyChart, Segmented, Tooltip, type TipState } from './ChartCard';

const H = 240, M = { t: 16, r: 16, b: 28, l: 44 };

export function MintProgressChart({ series, bucket, maxSupply, nowS }: { series: SeriesPoint[]; bucket: number; maxSupply: number; nowS: number }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [mode, setMode] = useState<'fit' | 'cap'>('fit');
  const [tip, setTip] = useState<TipState | null>(null);

  // Step points at each bucket's end, starting from 0 at the first bucket's start and running to now.
  const pts = useMemo(() => {
    const withDrops = series.filter((p) => p.drops > 0 || p.mintedTotal > 0);
    if (!withDrops.length) return [];
    const out = [{ t: withDrops[0].t, v: 0 }];
    for (const p of withDrops) out.push({ t: Math.min(p.t + bucket, nowS), v: p.mintedTotal });
    const last = out[out.length - 1];
    if (last.t < nowS) out.push({ t: nowS, v: last.v });
    return out;
  }, [series, bucket, nowS]);

  if (!pts.length) {
    return <ChartCard title="Mint progress" sub="Cumulative Poons minted"><EmptyChart>No Poons minted yet. The first drop starts this line.</EmptyChart></ChartCard>;
  }

  const total = pts[pts.length - 1].v;
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + bucket);
  const { max, ticks } = mode === 'cap' ? { max: maxSupply, ticks: [0, maxSupply / 4, maxSupply / 2, (maxSupply * 3) / 4, maxSupply].map(Math.round) } : countTicks(total * 1.2);
  const x = scale(t0, t1, M.l, W - M.r);
  const y = scale(0, max, H - M.b, M.t);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
  const area = `${line}L${x(pts[pts.length - 1].t).toFixed(1)} ${y(0)}L${x(t0).toFixed(1)} ${y(0)}Z`;
  const xTicks = Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4);
  const capInView = maxSupply <= max;
  const span = t1 - t0;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = pts[0];
    for (const p of pts) if (Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    setTip({ x: x(best.t), y: y(best.v) - 10, content: <><strong className="mono">{num(best.v)}</strong> minted<br /><span className="dim">{fmtFull(best.t)}</span></> });
  };

  return (
    <ChartCard
      title="Mint progress"
      sub={<><span className="mono">{num(total)}</span> of <span className="mono">{num(maxSupply)}</span> minted</>}
      actions={<Segmented label="Vertical scale" value={mode} onChange={setMode} options={[{ value: 'fit', label: 'Fit' }, { value: 'cap', label: 'Full supply' }]} />}
    >
      <div className="chart" ref={ref}>
        <svg width={W} height={H} role="img" aria-label={`Cumulative mints: ${total} of ${maxSupply} over ${Math.round(span / 3600)} hours`}>
          <defs>
            <linearGradient id="mint-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className="grad-a" />
              <stop offset="1" className="grad-b" />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v} className="axis">
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="grid-line" />
              <text x={M.l - 8} y={y(v)} dy="0.32em" textAnchor="end">{compact(v)}</text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text key={i} className="axis" x={x(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>
              {span > 2 * 86400 ? fmtBucket(t, 86400) : fmtBucket(t, 3600)}
            </text>
          ))}
          <path d={area} fill="url(#mint-fill)" />
          <path d={line} className="series-line" />
          {capInView && (
            <g className="cap">
              <line x1={M.l} x2={W - M.r} y1={y(maxSupply)} y2={y(maxSupply)} />
              <text x={W - M.r} y={y(maxSupply) + 14} textAnchor="end">Cap {num(maxSupply)}</text>
            </g>
          )}
          <circle cx={x(pts[pts.length - 1].t)} cy={y(total)} r={3.5} className="series-dot" />
          <rect x={M.l} y={M.t} width={Math.max(0, W - M.l - M.r)} height={H - M.t - M.b} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setTip(null)} />
        </svg>
        {!capInView && <span className="chart-flag">Cap {num(maxSupply)} is off-scale ↑</span>}
        <Tooltip tip={tip} width={W} />
      </div>
    </ChartCard>
  );
}
