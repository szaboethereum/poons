// TESTNET ONLY: end-to-end rule check against MockPonsCurve.
// Funds a few throwaway wallets from MINTER_KEY, runs one scenario per rule, then asks the indexer
// API what each wallet got and compares with the expected outcome.
//
//   npm run simulate            # send the trades
//   npm run simulate -- check   # a few seconds later: compare API results with expectations
import { createPublicClient, createWalletClient, formatEther, http, parseAbi, parseEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`missing env ${k}`); return v; };
if (env('NETWORK') !== 'testnet') throw new Error('simulate.ts only runs on testnet');
const chain = { id: 46630, name: 'Robinhood Chain Testnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [env('RPC_URLS').split(',')[0]] } } } as const;
const pub = createPublicClient({ chain, transport: http() });
const funder = privateKeyToAccount(env('MINTER_KEY') as `0x${string}`);
const curve = env('CURVE') as `0x${string}`, token = env('TOKEN') as `0x${string}`;
const api = `http://localhost:${process.env.API_PORT || 8788}`;
const CURVE_ABI = parseAbi(['function buy() payable', 'function sell(uint256)']);
const ERC20_ABI = parseAbi(['function approve(address,uint256) returns (bool)', 'function transfer(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)']);
const STATE = new URL('../.sim-wallets.json', import.meta.url);

// Scenario -> expected API status once the drops have landed.
const SCENARIOS = [
  { name: 'buy $12 and hold', expect: 'minted' },
  { name: 'buy $5 only', expect: 'below_min' },
  { name: 'buy $6 twice', expect: 'below_min' },
  { name: 'buy $15 then sell half', expect: 'minted' },
  { name: 'buy $12 then transfer tokens away', expect: 'minted' },
  { name: 'buy $20 twice (still one Poon)', expect: 'minted' },
  { name: 'receive tokens only', expect: 'none' },
] as const;

async function ethFor(usd: number) {
  const price = process.env.ETH_USD ? Number(process.env.ETH_USD)
    : Number((await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot').then(r => r.json())).data.amount);
  // +2% so the post-fee value stays on the intended side of the $10 line
  return parseEther(((usd * 1.02) / price / 0.99).toFixed(18));
}

async function run() {
  const wallets = SCENARIOS.map(() => generatePrivateKey());
  writeFileSync(STATE, JSON.stringify({ wallets }, null, 2));
  const accts = wallets.map(k => privateKeyToAccount(k));
  const client = (a: any) => createWalletClient({ chain, transport: http(), account: a });
  const f = client(funder);
  const need = [12, 5, 12, 15, 12, 40, 0];
  for (let i = 0; i < accts.length; i++) {
    const value = (need[i] ? await ethFor(need[i]) : 0n) + parseEther('0.0002');
    const h = await f.sendTransaction({ to: accts[i].address, value });
    await pub.waitForTransactionReceipt({ hash: h });
    console.log(`funded ${accts[i].address} with ${formatEther(value)} ETH (${SCENARIOS[i].name})`);
  }
  const buy = async (i: number, usd: number) => {
    const w = client(accts[i]);
    const h = await w.writeContract({ address: curve, abi: CURVE_ABI, functionName: 'buy', value: await ethFor(usd) });
    await pub.waitForTransactionReceipt({ hash: h });
  };
  const bal = (i: number) => pub.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [accts[i].address] });

  await buy(0, 12);
  await buy(1, 5);
  await buy(2, 6); await buy(2, 6);
  await buy(3, 15);
  { const w = client(accts[3]); const half = (await bal(3)) / 2n;
    await pub.waitForTransactionReceipt({ hash: await w.writeContract({ address: token, abi: ERC20_ABI, functionName: 'approve', args: [curve, half] }) });
    await pub.waitForTransactionReceipt({ hash: await w.writeContract({ address: curve, abi: CURVE_ABI, functionName: 'sell', args: [half] }) }); }
  await buy(4, 12);
  { const w = client(accts[4]); const all = await bal(4);
    await pub.waitForTransactionReceipt({ hash: await w.writeContract({ address: token, abi: ERC20_ABI, functionName: 'transfer', args: [accts[6].address, all] }) }); }
  await buy(5, 20); await buy(5, 20);
  console.log(`\nAll trades sent. Give the drops a few seconds, then: npm run simulate -- check`);
}

async function check() {
  if (!existsSync(STATE)) throw new Error('run the simulation first');
  const { wallets } = JSON.parse(readFileSync(STATE, 'utf8'));
  let ok = 0;
  for (let i = 0; i < SCENARIOS.length; i++) {
    const a = privateKeyToAccount(wallets[i]).address;
    const r = await fetch(`${api}/api/wallet/${a}`).then(r => r.json());
    const pass = r.status === SCENARIOS[i].expect;
    ok += +pass;
    const founder = r.seed ? BigInt(r.seed) >> 255n === 1n : false;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${SCENARIOS[i].name.padEnd(36)} expected ${SCENARIOS[i].expect.padEnd(12)} got ${r.status}${r.tokenId ? ` (Poon #${r.tokenId}${founder ? ', Founding Resident' : ''})` : ''}`);
  }
  console.log(`\n${ok}/${SCENARIOS.length} scenarios behave as specified`);
  process.exit(ok === SCENARIOS.length ? 0 : 1);
}

await (process.argv[2] === 'check' ? check() : run());
