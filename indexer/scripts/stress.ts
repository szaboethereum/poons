// LOCAL ONLY (anvil): pump simulation. Thousands of wallets buy on MockPonsCurve within seconds while
// the real indexer + minter run against the same chain; then we check every rule held at scale.
//
//   see scripts/stress.sh (starts anvil, deploys, runs indexer + this script)
import { createPublicClient, createWalletClient, http, parseAbi, parseEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const RPC = 'http://127.0.0.1:8545';
const API = `http://localhost:${process.env.API_PORT ?? 8799}`;
const N = Number(process.env.STRESS_WALLETS ?? 3600);
const ETH_USD = Number(process.env.ETH_USD_LOCAL ?? 100000);
const curve = process.env.CURVE_LOCAL as `0x${string}`;
const poons = process.env.POONS_LOCAL as `0x${string}`;
const chain = { id: 31337, name: 'Anvil', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } } as const;
const pub = createPublicClient({ chain, transport: http(RPC) });
const CURVE_ABI = parseAbi(['function buy() payable']);
const POONS_ABI = parseAbi(['function totalSupply() view returns (uint256)', 'function dropOf(address) view returns (uint256)', 'function balanceOf(address) view returns (uint256)']);
const eth = (usd: number) => parseEther(((usd * 1.02) / ETH_USD / 0.99).toFixed(18));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const stats = async () => (await fetch(`${API}/api/stats`)).json();

// Mix: 90% qualify ($12–$40), 7% under $10, 3% qualify twice (must still get one Poon).
const plan = Array.from({ length: N }, (_, i) => ({
  key: generatePrivateKey(),
  buys: i % 33 === 0 ? [15, 25] : i % 14 === 0 ? [5] : [12 + (i % 29)],
}));
const accounts = plan.map(p => privateKeyToAccount(p.key));
const qualifying = plan.filter(p => p.buys.some(b => b >= 10)).length;

for (let i = 0; i < accounts.length; i += 500) {
  await Promise.all(accounts.slice(i, i + 500).map(a =>
    pub.request({ method: 'anvil_setBalance' as any, params: [a.address, '0xde0b6b3a7640000'] as any })));
}
console.log(`funded ${N} wallets; ${qualifying} should qualify, max supply 3333`);

const t0 = Date.now();
let sent = 0;
for (let i = 0; i < plan.length; i += 300) {
  await Promise.all(plan.slice(i, i + 300).map(async (p, j) => {
    const w = createWalletClient({ chain, transport: http(RPC), account: accounts[i + j] });
    for (const [n, usd] of p.buys.entries()) {
      await w.writeContract({ address: curve, abi: CURVE_ABI, functionName: 'buy', value: eth(usd), nonce: n, gas: 200_000n });
      sent++;
    }
  }));
}
console.log(`sent ${sent} buys in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Wait (bounded) until the minter is done: sold out, or nothing left in the queue.
let s: any = {};
for (let i = 0; i < 600; i++) {
  s = await stats().catch(() => ({}));
  if (s.soldOut || (s.minted >= Math.min(3333, qualifying) && s.queued === 0)) break;
  await sleep(1000);
}
const secs = (Date.now() - t0) / 1000;
const supply = await pub.readContract({ address: poons, abi: POONS_ABI, functionName: 'totalSupply' });

// Every wallet holds at most one Poon, and dropOf matches.
let over = 0, holders = 0;
for (let i = 0; i < accounts.length; i += 400) {
  const bals = await Promise.all(accounts.slice(i, i + 400).map(a =>
    pub.readContract({ address: poons, abi: POONS_ABI, functionName: 'balanceOf', args: [a.address] })));
  for (const b of bals) { if (b > 1n) over++; if (b === 1n) holders++; }
}
const health = await (await fetch(`${API}/api/health`)).json();
console.log(JSON.stringify({
  seconds: Math.round(secs), onChainSupply: Number(supply), apiMinted: s.minted, soldOut: s.soldOut,
  walletsHoldingOne: holders, walletsHoldingMoreThanOne: over, belowMin: s.belowMin, stillQueued: s.queued,
  rpcCalls: health.rpc?.total, watcherErrors: health.lastError,
}, null, 2));
const ok = Number(supply) === Math.min(3333, qualifying) && over === 0 && holders === Number(supply);
console.log(ok ? 'STRESS PASS' : 'STRESS FAIL');
process.exit(ok ? 0 : 1);
