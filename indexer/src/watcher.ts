// Head follower. A range [cursor+1, head] is committed together with the cursor, so restarts resume
// exactly where they stopped and never skip or double-count a block.
//
// RPC budget (Robinhood Chain makes ~10 blocks/s, so "is there a new block?" is almost always yes):
//   - one eth_getLogs per poll covers our token's Transfers *and* the curve's buy/sell events
//     (the two WETH queries only exist after graduation)
//   - adaptive polling: POLL_MS while trades are flowing, relaxing to IDLE_POLL_MS after 30 s of quiet
//   - optional WS_URL: a log subscription on the token wakes the loop the moment a buy lands, so the
//     idle poll is only a safety net
//
// Belt and braces for "never miss a buy":
//   - several RPC endpoints behind a fallback transport (see main.ts)
//   - adaptive range: if a provider rejects a range (too many results / timeout) it is halved
//   - a re-scan loop re-reads the recent window every RESCAN_EVERY_MS; trades are keyed by
//     (tx, wallet), so anything a flaky provider dropped the first time is picked up, never doubled
import type { PublicClient } from 'viem';
import { classify, TOPIC, type Ctx, type Log } from './classify.ts';
import type { Ledger } from './ledger.ts';
import type { EthUsd } from './price.ts';

const pad = (a: string) => '0x' + a.slice(2).toLowerCase().padStart(64, '0');
const hex = (n: bigint) => '0x' + n.toString(16);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export type WatcherOpts = {
  startBlock: bigint; pollMs: number; idlePollMs: number; maxRange: bigint; confirmations: bigint;
  rescanBlocks: bigint; rescanEveryMs: number;
};

export class Watcher {
  client: PublicClient; ctx: Ctx; ledger: Ledger; price: EthUsd; opts: WatcherOpts;
  onQueued: () => void;
  #wake: (() => void) | null = null;
  #lastActivity = 0;
  #headHint = 0n; // highest block seen by the websocket; saves an eth_blockNumber and its lag
  health = { head: 0n, cursor: 0n, lastError: '' as string, lastErrorAt: 0, rescans: 0, recovered: 0 };

  constructor(client: PublicClient, ctx: Ctx, ledger: Ledger, price: EthUsd, opts: WatcherOpts, onQueued: () => void) {
    Object.assign(this, { client, ctx, ledger, price, opts, onQueued });
    for (const p of JSON.parse(ledger.get('pools') ?? '[]')) this.addPool(p);
  }

  addPool(p: string) {
    p = p.toLowerCase();
    if (this.ctx.pools.has(p)) return;
    this.ctx.pools.add(p); this.ctx.infra.add(p);
    this.ledger.set('pools', JSON.stringify([...this.ctx.pools]));
    console.log(`[watch] graduated pool registered ${p}`);
  }

  async getLogs(filter: object): Promise<Log[]> {
    const raw = await this.client.request({ method: 'eth_getLogs', params: [filter as any] }) as any[];
    const logs = raw.map(l => ({ address: l.address, topics: l.topics, data: l.data, transactionHash: l.transactionHash,
      logIndex: Number(l.logIndex), blockNumber: BigInt(l.blockNumber), time: Number(l.blockTimestamp ?? 0) }));
    // Nitro only includes blockTimestamp for some blocks; the hold rule needs real time, so fill gaps.
    const missing = [...new Set(logs.filter(l => !l.time).map(l => l.blockNumber))];
    await Promise.all(missing.map(async b => {
      if (!this.#blockTime.has(b)) this.#blockTime.set(b, Number((await this.client.getBlock({ blockNumber: b })).timestamp));
    }));
    for (const l of logs) if (!l.time) l.time = this.#blockTime.get(l.blockNumber)!;
    if (this.#blockTime.size > 50_000) this.#blockTime.clear();
    return logs;
  }
  #blockTime = new Map<bigint, number>();

  async fetch(from: bigint, to: bigint): Promise<Log[]> {
    const range = { fromBlock: hex(from), toBlock: hex(to) };
    const pools = [...this.ctx.pools].map(pad);
    const hasWeth = BigInt(this.ctx.weth) !== 0n && pools.length > 0;
    const [main, wIn, wOut] = await Promise.all([
      // One query: our token's Transfers + the (shared) curve's buy/sell events.
      this.getLogs({ ...range, address: [this.ctx.token, this.ctx.curve], topics: [[TOPIC.Transfer, TOPIC.CurveBuy, TOPIC.CurveSell]] }),
      hasWeth ? this.getLogs({ ...range, address: this.ctx.weth, topics: [TOPIC.Transfer, null, pools] }) : [],
      hasWeth ? this.getLogs({ ...range, address: this.ctx.weth, topics: [TOPIC.Transfer, pools] }) : [],
    ]);
    const token = this.ctx.token.toLowerCase();
    const tok = main.filter(l => l.address.toLowerCase() === token && l.topics[0] === TOPIC.Transfer);
    const ours = new Set(tok.map(l => l.transactionHash.toLowerCase()));
    const rest = [...main.filter(l => l.address.toLowerCase() !== token), ...wIn, ...wOut];
    return [...tok, ...rest.filter(l => ours.has(l.transactionHash.toLowerCase()))];
  }

  /**
   * A tx that moved our token with no curve fill may be a trade on a pool we don't know yet
   * (graduation happened). An AMM pool is the address where token and WETH flow in opposite
   * directions within one tx — detect it from the receipt, register it, and re-classify.
   */
  async discoverPools(txs: string[]): Promise<boolean> {
    if (BigInt(this.ctx.weth) === 0n) return false;
    let found = false;
    for (const hash of txs.slice(0, 5)) {
      const rc = await this.client.getTransactionReceipt({ hash: hash as `0x${string}` });
      const flow = (tokenAddr: string) => {
        const m = new Map<string, bigint>();
        for (const l of rc.logs) if (l.address.toLowerCase() === tokenAddr && l.topics[0] === TOPIC.Transfer) {
          const from = '0x' + l.topics[1]!.slice(26), to = '0x' + l.topics[2]!.slice(26), v = BigInt(l.data);
          m.set(from, (m.get(from) ?? 0n) - v); m.set(to, (m.get(to) ?? 0n) + v);
        }
        return m;
      };
      const t = flow(this.ctx.token.toLowerCase()), w = flow(this.ctx.weth.toLowerCase());
      for (const [a, dt] of t) {
        const dw = w.get(a) ?? 0n;
        if (a !== this.ctx.curve && ((dt < 0n && dw > 0n) || (dt > 0n && dw < 0n)) && !this.ctx.pools.has(a)) {
          this.addPool(a); found = true;
        }
      }
    }
    return found;
  }

  /** Reads and classifies [from, to], discovering a graduated pool on the way if needed. */
  async read(from: bigint, to: bigint, lastPrice: bigint) {
    let res = classify(this.ctx, await this.fetch(from, to), lastPrice);
    const unexplained = [...new Set(res.trades.filter(t => t.kind === 'in').map(t => t.tx))];
    if (unexplained.length && await this.discoverPools(unexplained)) res = classify(this.ctx, await this.fetch(from, to), lastPrice);
    return res;
  }

  /** Called by the websocket subscription: poll right now, up to at least `block`. */
  poke(block?: bigint) {
    if (block && block > this.#headHint) this.#headHint = block;
    this.#lastActivity = Date.now();
    this.#wake?.();
  }

  #pause() {
    const ms = Date.now() - this.#lastActivity < 30_000 ? this.opts.pollMs : this.opts.idlePollMs;
    return new Promise<void>(r => { this.#wake = r; setTimeout(r, ms); }).finally(() => { this.#wake = null; });
  }

  #error(where: string, e: any) {
    this.health.lastError = `${where}: ${e.shortMessage ?? e.message}`;
    this.health.lastErrorAt = Date.now();
    console.error(`[${where}]`, e.shortMessage ?? e.message);
  }

  async run() {
    let cursor = BigInt(this.ledger.get('cursor') ?? (this.opts.startBlock - 1n).toString());
    let lastPrice = BigInt(this.ledger.get('priceE18') ?? '0');
    let range = this.opts.maxRange;
    console.log(`[watch] resuming after block ${cursor}`);
    this.#rescanLoop();
    for (;;) {
      try {
        // A websocket log already tells us a newer block exists; only ask the node when it doesn't.
        const head = this.#headHint > cursor && this.opts.confirmations === 0n
          ? this.#headHint
          : (await this.client.getBlockNumber({ cacheTime: 0 })) - this.opts.confirmations;
        this.health.head = head; this.health.cursor = cursor;
        if (head <= cursor) { await this.#pause(); continue; }
        const to = head - cursor > range ? cursor + range : head;
        const t0 = Date.now();

        const res = await this.read(cursor + 1n, to, lastPrice);
        const ethUsd = res.trades.some(t => t.kind === 'buy') ? this.price.get() : this.price.value;
        const queued = this.ledger.apply(res.trades, ethUsd, { block: to, priceE18: res.priceE18 });
        cursor = to; lastPrice = res.priceE18;
        this.health.cursor = cursor;
        if (range < this.opts.maxRange) range *= 2n;

        const buys = res.trades.filter(t => t.kind === 'buy').length;
        if (res.trades.length) {
          this.#lastActivity = Date.now();
          console.log(`[watch] block ${cursor}: ${buys} buy(s), ${res.trades.length - buys} other, ${Date.now() - t0}ms`);
        }
        if (queued) this.onQueued();
        if (head - cursor < 50n) await this.#pause(); // caught up: wait for the next tick instead of spinning
      } catch (e: any) {
        this.#error('watch', e);
        if (range > 1n) range /= 2n;
        await sleep(500);
      }
    }
  }

  /** Re-reads the recent window behind the cursor; recovers anything a provider silently dropped. */
  async #rescanLoop() {
    for (;;) {
      await sleep(this.opts.rescanEveryMs);
      try {
        const cursor = BigInt(this.ledger.get('cursor') ?? '0');
        if (cursor === 0n) continue;
        const from = cursor > this.opts.rescanBlocks ? cursor - this.opts.rescanBlocks : 1n;
        const count = () => (this.ledger.db.prepare('SELECT COUNT(*) AS n FROM trades WHERE block <= ?').get(Number(cursor)) as any).n as number;
        const before = count();
        for (let a = from; a <= cursor; a += this.opts.maxRange) {
          const b = a + this.opts.maxRange - 1n < cursor ? a + this.opts.maxRange - 1n : cursor;
          const res = await this.read(a, b, BigInt(this.ledger.get('priceE18') ?? '0'));
          if (res.trades.length && this.ledger.apply(res.trades, this.price.get())) this.onQueued();
        }
        const recovered = count() - before;
        this.health.rescans++;
        if (recovered > 0) {
          this.health.recovered += recovered;
          console.warn(`[rescan] recovered ${recovered} trade(s) the live loop missed`);
        }
      } catch (e: any) {
        this.#error('rescan', e);
      }
    }
  }
}
