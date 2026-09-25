// Turns raw logs into trades. Pure: no I/O, so it is unit-tested and replayable on history.
//
// Pons buy path (bonding curve):  user --ETH--> router --> CURVE --token--> router --token--> user
// After graduation:               user --WETH--> POOL --token--> (router) --> user
// We therefore look at *net* token movement per address per tx, and take the ETH leg from the
// curve's CurveBuy/CurveSell events or from WETH moving in/out of the pool in the same tx.

export const TOPIC = {
  Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  // CurveBuy(address indexed, address indexed, uint256 ethIn, uint256 tokensOut, uint256 fee, uint256)
  CurveBuy: '0xec36bf571f136799e8dc0b0b8bea4b04d8bd3d43de838aab0d5fc21d4cbfc455',
  // CurveSell(address indexed, address indexed, uint256 tokensIn, uint256 ethOut, uint256 fee, uint256)
  CurveSell: '0x8113d738abdcb6b38357e9d53a54a7157861a09031b453651f0fe7fe151f59df',
} as const;

export type Log = {
  address: string;
  topics: readonly string[];
  data: string;
  transactionHash: string;
  logIndex: number;
  blockNumber: bigint;
  time: number; // block timestamp (s)
};

export type Trade = {
  tx: string;
  logIndex: number; // first token log of the tx, used as a stable id
  block: bigint;
  time: number;
  wallet: string;
  kind: 'buy' | 'out' | 'in'; // out = sold or sent away; in = received without a market fill
  venue?: 'curve' | 'pool';   // buys only: bonding curve (pre-graduation) or DEX pool
  tokens: bigint;
  ethWei: bigint; // for 'buy': ETH paid; for 'out': ETH value at trade/last price; 'in': 0
};

export type Ctx = {
  token: string;
  curve: string;
  weth: string;
  pools: Set<string>; // graduated DEX pools (lowercase)
  infra: Set<string>; // never credited: curve, router, pools, token, zero/dead, excluded wallets
};

const E18 = 10n ** 18n;
const lc = (a: string) => a.toLowerCase();
const addr = (topic: string) => '0x' + topic.slice(26).toLowerCase();
const word = (data: string, i: number) => BigInt('0x' + data.slice(2 + i * 64, 2 + (i + 1) * 64));

/**
 * @param lastPriceE18 wei per 1e18 token units from the previous fill (0n if unknown)
 * @returns trades plus the updated last price
 */
export function classify(ctx: Ctx, logs: Log[], lastPriceE18: bigint): { trades: Trade[]; priceE18: bigint } {
  const token = lc(ctx.token), curve = lc(ctx.curve), weth = lc(ctx.weth);
  const byTx = new Map<string, Log[]>();
  for (const l of [...logs].sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex)) {
    const k = lc(l.transactionHash);
    if (!byTx.has(k)) byTx.set(k, []);
    byTx.get(k)!.push(l);
  }

  const trades: Trade[] = [];
  let price = lastPriceE18;

  for (const [tx, txLogs] of byTx) {
    const tokenLogs = txLogs.filter(l => lc(l.address) === token && l.topics[0] === TOPIC.Transfer);
    if (!tokenLogs.length) continue;

    const delta = new Map<string, bigint>();
    const bump = (a: string, v: bigint) => delta.set(a, (delta.get(a) ?? 0n) + v);
    const fromMarket: bigint[] = [], toMarket: bigint[] = [];
    let poolOut = 0n, poolIn = 0n;
    for (const l of tokenLogs) {
      const from = addr(l.topics[1]), to = addr(l.topics[2]), v = word(l.data, 0);
      bump(from, -v); bump(to, v);
      if (from === curve) fromMarket.push(v);
      if (to === curve) toMarket.push(v);
      if (ctx.pools.has(from)) poolOut += v;
      if (ctx.pools.has(to)) poolIn += v;
    }

    // ETH legs. Curve events carry no token field, so match them to our transfers by amount.
    let boughtTokens = poolOut, boughtEth = 0n, soldTokens = poolIn, soldEth = 0n, curveTokens = 0n;
    for (const l of txLogs) {
      if (lc(l.address) === curve && l.topics[0] === TOPIC.CurveBuy) {
        const ethIn = word(l.data, 0), out = word(l.data, 1);
        const i = fromMarket.indexOf(out);
        if (i >= 0) { fromMarket.splice(i, 1); boughtTokens += out; boughtEth += ethIn; curveTokens += out; }
      } else if (lc(l.address) === curve && l.topics[0] === TOPIC.CurveSell) {
        const tin = word(l.data, 0), ethOut = word(l.data, 1);
        const i = toMarket.indexOf(tin);
        if (i >= 0) { toMarket.splice(i, 1); soldTokens += tin; soldEth += ethOut; }
      } else if (lc(l.address) === weth && l.topics[0] === TOPIC.Transfer) {
        const from = addr(l.topics[1]), to = addr(l.topics[2]), v = word(l.data, 0);
        if (ctx.pools.has(to) && poolOut > 0n) boughtEth += v;
        if (ctx.pools.has(from) && poolIn > 0n) soldEth += v;
      }
    }

    if (boughtTokens > 0n && boughtEth > 0n) price = (boughtEth * E18) / boughtTokens;
    else if (soldTokens > 0n && soldEth > 0n) price = (soldEth * E18) / soldTokens;

    const first = tokenLogs[0];
    for (const [wallet, d] of delta) {
      if (d === 0n || ctx.infra.has(wallet)) continue;
      const base = { tx, logIndex: first.logIndex, block: first.blockNumber, time: first.time, wallet };
      if (d > 0n) {
        if (boughtTokens > 0n && boughtEth > 0n) {
          trades.push({ ...base, kind: 'buy', tokens: d, ethWei: (d * boughtEth) / boughtTokens,
            venue: curveTokens * 2n >= boughtTokens ? 'curve' : 'pool' });
        } else {
          trades.push({ ...base, kind: 'in', tokens: d, ethWei: 0n });
        }
      } else {
        trades.push({ ...base, kind: 'out', tokens: -d, ethWei: (-d * price) / E18 });
      }
    }
  }
  return { trades, priceE18: price };
}
