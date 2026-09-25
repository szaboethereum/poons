// Small helpers for the hand-built SVG charts.
export const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** A "nice" upper bound and tick step for a max value (1, 2, 2.5, 5 × 10^n). */
export function niceTicks(max: number, count = 4): { max: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const raw = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { max: top, ticks };
}

/** Integer-only ticks for small counts (avoids 0, 0.5, 1 on tiny datasets). */
export function countTicks(max: number, count = 4) {
  const t = niceTicks(Math.max(max, 1), count);
  if (t.ticks.every((v) => Number.isInteger(v))) return t;
  const top = Math.max(1, Math.ceil(max));
  const step = Math.max(1, Math.ceil(top / count));
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < top) ticks.push(ticks[ticks.length - 1] + step);
  return { max: ticks[ticks.length - 1], ticks };
}

export const compact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : `${Math.round(n * 100) / 100}`;

export const usdCompact = (n: number) => `$${compact(n)}`;

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const fmtTime = (s: number) => timeFmt.format(s * 1000);
export const fmtDay = (s: number) => dayFmt.format(s * 1000);
export const fmtFull = (s: number) => fullFmt.format(s * 1000);
/** Axis label for a bucket start, given the bucket size in seconds. */
export const fmtBucket = (t: number, bucket: number) => (bucket >= 86400 ? fmtDay(t) : fmtTime(t));
