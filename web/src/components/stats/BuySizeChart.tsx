import { useState } from 'react';
import { countTicks, scale } from '../../lib/chart';
import { num, usd } from '../../lib/format';
import type { BuySizes } from '../../lib/types';
import { useWidth } from '../../hooks/useSize';
import { ChartCard, EmptyChart, Tooltip } from './ChartCard';

const H = 240, M = { t: 24, r: 12, b: 30, l: 36 };
const money = (v: number) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`);
const label = (b: BuySizes['buckets'][number]) => (b.to === null ? `${money(b.from)}+` : `${money(b.from)}–${money(b.to)}`);

export function BuySizeChart({ data }: { data: BuySizes }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const total = data.buckets.reduce((a, b) => a + b.buys, 0);
  const qualifying = data.buckets.filter((b) => b.from >= data.minBuyUsd).reduce((a, b) => a + b.buys, 0);
  const { max, ticks } = countTicks(Math.max(1, ...data.buckets.map((b) => b.buys)) * 1.1, 3);
  const n = data.buckets.length;
  const band = (W - M.l - M.r) / n;
  const bw = Math.min(56, band * 0.74);
  const y = scale(0, max, H - M.b, M.t);
  // Threshold sits on the boundary where a bucket starts at the minimum buy.
  const ti = data.buckets.findIndex((b) => b.from >= data.minBuyUsd);
  const tx = ti >= 0 ? M.l + band * ti : null;
  const narrow = band < 46;

  return (
    <ChartCard
      title="Buy sizes"
      sub={total ? <><span className="mono">{num(qualifying)}</span> of <span className="mono">{num(total)}</span> buys ({Math.round((qualifying / total) * 100)}%) cleared the {usd(data.minBuyUsd)} minimum</> : 'Single buys by USD size'}
    >
      {!total ? <EmptyChart height={H}>No buys yet.</EmptyChart> : (
        <div className="chart" ref={ref}>
          <svg width={W} height={H} role="img" aria-label={`Buy size histogram. ${qualifying} of ${total} buys were ${usd(data.minBuyUsd)} or more.`}>
            {ticks.map((v) => (
              <g key={v} className="axis">
                <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'zero-line' : 'grid-line'} />
                <text x={M.l - 8} y={y(v)} dy="0.32em" textAnchor="end">{v}</text>
              </g>
            ))}
            {data.buckets.map((b, i) => {
              const x = M.l + band * i + (band - bw) / 2;
              const ok = b.from >= data.minBuyUsd;
              return (
                <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                  <rect x={M.l + band * i} y={M.t} width={band} height={H - M.t - M.b} fill="transparent" />
                  {b.buys > 0 && <rect x={x} y={y(b.buys)} width={bw} height={y(0) - y(b.buys)} rx={2} className={`bar ${ok ? 'bar--buy' : 'bar--muted'}${hover === i ? ' is-hover' : ''}`} />}
                  <text className="axis" x={x + bw / 2} y={H - 10} textAnchor="middle">{narrow && i % 2 ? '' : label(b)}</text>
                </g>
              );
            })}
            {tx !== null && (
              <g className="threshold">
                <line x1={tx} x2={tx} y1={M.t - 8} y2={H - M.b} />
                <text x={tx + 6} y={M.t - 10}>{usd(data.minBuyUsd)} minimum</text>
              </g>
            )}
          </svg>
          <Tooltip width={W} tip={hover === null ? null : {
            x: M.l + band * hover + band / 2, y: y(data.buckets[hover].buys) - 8,
            content: <><strong className="mono">{num(data.buckets[hover].buys)}</strong> buys<br /><span className="dim">{label(data.buckets[hover])}</span></>,
          }} />
        </div>
      )}
      <table className="sr-only">
        <caption>Buys by size</caption>
        <tbody>{data.buckets.map((b, i) => <tr key={i}><td>{label(b)}</td><td>{b.buys}</td></tr>)}</tbody>
      </table>
    </ChartCard>
  );
}
