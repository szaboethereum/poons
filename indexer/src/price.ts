// ETH/USD for valuing buys. Polled from two public sources; the median-ish of whatever answered.
// If every source is stale for longer than `maxAgeMs`, `get()` throws and the watcher pauses
// rather than valuing buys at a wrong price.
const SOURCES: [string, (j: any) => number][] = [
  ['https://api.coinbase.com/v2/prices/ETH-USD/spot', j => Number(j.data.amount)],
  ['https://api.kraken.com/0/public/Ticker?pair=ETHUSD', j => Number(Object.values<any>(j.result)[0].c[0])],
];

export class EthUsd {
  value = 0;
  at = 0;
  maxAgeMs: number;
  constructor(maxAgeMs = 120_000) { this.maxAgeMs = maxAgeMs; }

  async refresh() {
    // Testnet ETH has no market price: ETH_USD pins one so test buys can be sized in dollars.
    if (process.env.ETH_USD) { this.value = Number(process.env.ETH_USD); this.at = Date.now(); return; }
    const got = await Promise.all(SOURCES.map(async ([url, pick]) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
        const v = pick(await r.json());
        return Number.isFinite(v) && v > 0 ? v : null;
      } catch { return null; }
    }));
    const ok = got.filter((v): v is number => v !== null).sort((a, b) => a - b);
    if (ok.length) { this.value = ok[Math.floor(ok.length / 2)]; this.at = Date.now(); }
  }

  start(everyMs = 10_000) {
    const tick = () => this.refresh().finally(() => setTimeout(tick, everyMs));
    return this.refresh().then(() => { setTimeout(tick, everyMs); });
  }

  get(): number {
    if (!this.value || Date.now() - this.at > this.maxAgeMs) throw new Error('ETH/USD price is stale');
    return this.value;
  }
}
