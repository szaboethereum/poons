import { createPublicClient, createWalletClient, defineChain, fallback, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Ledger } from './ledger.ts';
import { EthUsd } from './price.ts';
import { Watcher } from './watcher.ts';
import { Minter } from './minter.ts';
import { startApi } from './api.ts';
import { countRpc } from './rpc.ts';

// Per-network settings live in .env as KEY_TESTNET / KEY_MAINNET; NETWORK picks the block.
const NETWORK = process.env.NETWORK ?? 'testnet';
const env = (k: string, d?: string) => {
  const v = process.env[`${k}_${NETWORK.toUpperCase()}`] || process.env[k] || d;
  if (v === undefined) throw new Error(`missing env ${k}_${NETWORK.toUpperCase()}`);
  return v;
};

// Network presets. Mainnet addresses were verified against live Pons txs (Sep 2026). Pons is not
// deployed on testnet, so there CURVE comes from our MockPonsCurve deployment (see contracts/script).
const NETWORKS = {
  mainnet: {
    id: 4663, name: 'Robinhood Chain', rpc: 'https://rpc.mainnet.chain.robinhood.com',
    curve: '0xb4cebd11e255c5e0aa8f2337525e06b224ce475b', router: '0x65050a9b7e5075a2ba5ced7b1b64ee66262c40dc',
    weth: '0x0bd7d308f8e1639fab988df18a8011f41eacad73', pons: 'https://www.ponsfamily.com/launchpad/',
  },
  testnet: {
    id: 46630, name: 'Robinhood Chain Testnet', rpc: 'https://rpc.testnet.chain.robinhood.com',
    curve: '', router: '0x0000000000000000000000000000000000000000',
    weth: '0x0000000000000000000000000000000000000000', pons: 'https://www.ponsfamily.com/launchpad/',
  },
} as const;

const net = NETWORKS[NETWORK as keyof typeof NETWORKS];
if (!net) throw new Error('NETWORK must be mainnet or testnet');
const rpcs = env('RPC_URLS', net.rpc).split(',').map(s => s.trim()).filter(Boolean);
const chain = defineChain({
  id: net.id, name: net.name, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: rpcs } },
});
// Every provider gets a turn: a flaky or rate-limited endpoint fails over to the next one.
const transport = fallback(rpcs.map(u => http(u, { timeout: 8000, retryCount: 1, onFetchRequest: countRpc })), { rank: false, retryCount: 2 });
const pub = createPublicClient({ chain, transport });
// Refuse to run against the wrong network (e.g. a mainnet RPC with testnet settings).
for (const u of rpcs) {
  const id = await createPublicClient({ transport: http(u, { timeout: 8000 }) }).getChainId();
  if (id !== net.id) throw new Error(`RPC ${u.replace(/\/v2\/.*/, '/v2/…')} is chain ${id}, but NETWORK=${NETWORK} expects ${net.id}`);
}

const token = env('TOKEN').toLowerCase();
const curve = env('CURVE', net.curve).toLowerCase();
const poons = env('POONS') as `0x${string}`;
const ledger = new Ledger(env('DB', `poons-${net.id}.db`), Number(env('MIN_BUY_USD', '10')));
const price = new EthUsd(process.env[`ETH_USD_${NETWORK.toUpperCase()}`]);
await price.start();

const pools = new Set<string>(env('POOLS', '').split(',').filter(Boolean).map(a => a.toLowerCase()));
const exclude = env('EXCLUDE', '').split(',').filter(Boolean).map(a => a.toLowerCase());
const ctx = {
  token, curve, weth: net.weth, pools,
  infra: new Set([curve, net.router, token, ...pools, ...exclude,
    '0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dead']),
};

const dryRun = env('DRY_RUN', '0') === '1';
const account = dryRun ? null : privateKeyToAccount(env('MINTER_KEY') as `0x${string}`);
const wallet = account ? createWalletClient({ chain, transport, account }) : null;
const minter = new Minter(pub as any, wallet, account, poons, ledger, Number(env('MAX_BATCH', '120')));

const wsUrl = env('WS_URL', '');
const watcher = new Watcher(pub as any, ctx, ledger, price, {
  startBlock: BigInt(env('START_BLOCK')),
  pollMs: Number(env('POLL_MS', '250')),
  idlePollMs: Number(env('IDLE_POLL_MS', wsUrl ? '5000' : '2000')),
  maxRange: BigInt(env('MAX_RANGE', '2000')),
  confirmations: BigInt(env('CONFIRMATIONS', '0')),
  rescanBlocks: BigInt(env('RESCAN_BLOCKS', '6000')), // ~10 minutes of blocks
  rescanEveryMs: Number(env('RESCAN_EVERY_MS', '300000')),
}, () => minter.kick());

// Optional push trigger: a websocket log subscription on the token wakes the watcher instantly.
if (wsUrl) {
  const { webSocket } = await import('viem');
  const ws = createPublicClient({ chain, transport: webSocket(wsUrl, { reconnect: true }) });
  const wsId = await ws.getChainId();
  if (wsId !== net.id) throw new Error(`WS_URL is chain ${wsId}, but NETWORK=${NETWORK} expects ${net.id}`);
  ws.watchEvent({ address: token as `0x${string}`, onLogs: logs => watcher.poke(logs.reduce((m, l) => (l.blockNumber && l.blockNumber > m ? l.blockNumber : m), 0n)), onError: e => console.error('[ws]', e.message) });
  console.log('[ws] subscribed to token logs');
}

startApi(Number(env('API_PORT', '8788')), ledger, watcher, minter, {
  chainId: net.id, token, poons, ponsUrl: net.pons + token, maxSupply: Number(env('MAX_SUPPLY', '3333')),
  minBuyUsd: Number(env('MIN_BUY_USD', '10')),
});
console.log(`[poons] ${net.name} · token ${token} · ${rpcs.length} RPC(s) · min $${env('MIN_BUY_USD', '10')}${dryRun ? ' · DRY RUN' : ''}`);
setInterval(() => console.log('[stats]', ledger.stats()), 60_000).unref();
await Promise.all([watcher.run(), minter.run()]);
