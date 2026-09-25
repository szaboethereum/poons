// Waiting mode: before the token exists, watch the Pons factory for a launch by our own wallet and lock
// onto it. Matching is by the launching wallet only (the factory's indexed `deployer`), never by name or
// ticker, so a copycat "POONS" token can't be picked up. The result is saved, so restarts reuse it.
import { createServer, type Server } from 'node:http';
import type { PublicClient } from 'viem';
import { TOPIC } from './classify.ts';
import type { Ledger } from './ledger.ts';

export type Launch = { token: string; curve: string; block: bigint; tx: string };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const topicAddr = (a: string) => `0x${a.toLowerCase().slice(2).padStart(64, '0')}` as `0x${string}`;

export async function waitForLaunch(pub: PublicClient, opts: {
  factory: string; launcher: string; ledger: Ledger; port: number; wsUrl?: string; fromBlock?: bigint; maxRange?: bigint;
}): Promise<Launch> {
  const { factory, launcher, ledger } = opts;
  const saved = ledger.get('launch');
  if (saved) {
    const l = JSON.parse(saved);
    return { ...l, block: BigInt(l.block) };
  }

  // Only launches after the first time we started waiting count; older ones by the same wallet are ignored.
  let from = BigInt(ledger.get('launch_from') ?? opts.fromBlock ?? await pub.getBlockNumber());
  ledger.set('launch_from', from.toString());
  const maxRange = opts.maxRange ?? 2000n;
  console.log(`[launch] waiting for a Pons launch by ${launcher} from block ${from}`);

  // Keep /api/health green for the host; everything else says "not yet" (the site shows its offline state).
  const server: Server = createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('content-type', 'application/json');
    if (req.url?.startsWith('/api/health')) {
      res.end(JSON.stringify({ ok: true, waitingForLaunch: true, launcher, scannedTo: (from - 1n).toString() }));
    } else {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Waiting for the token launch' }));
    }
  }).listen(opts.port);

  // A websocket subscription on the factory makes detection instant; polling is the safety net.
  let wake: (() => void) | null = null;
  let unwatch: (() => void) | null = null;
  if (opts.wsUrl) {
    const { createPublicClient, webSocket } = await import('viem');
    const ws = createPublicClient({ transport: webSocket(opts.wsUrl, { reconnect: true }) });
    unwatch = ws.watchEvent({
      address: factory as `0x${string}`,
      onLogs: logs => { if (logs.some(l => l.topics[3]?.toLowerCase() === topicAddr(launcher))) wake?.(); },
      onError: e => console.error('[launch ws]', e.message),
    });
  }
  const idleMs = opts.wsUrl ? 10_000 : 2000;

  for (;;) {
    try {
      const head = await pub.getBlockNumber();
      while (from <= head) {
        const to = from + maxRange - 1n < head ? from + maxRange - 1n : head;
        const logs = await pub.request({ method: 'eth_getLogs', params: [{
          address: factory as `0x${string}`, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}`,
          topics: [TOPIC.PonsLaunched as `0x${string}`, null, null, topicAddr(launcher)],
        }] }) as any[];
        if (logs.length) {
          const l = logs[0];
          const launch: Launch = {
            token: ('0x' + l.topics[1].slice(26)).toLowerCase(), curve: ('0x' + l.topics[2].slice(26)).toLowerCase(),
            block: BigInt(l.blockNumber), tx: l.transactionHash,
          };
          ledger.set('launch', JSON.stringify({ ...launch, block: launch.block.toString() }));
          console.log(`[launch] found: token ${launch.token}, curve ${launch.curve}, block ${launch.block}, tx ${launch.tx}`);
          unwatch?.();
          server.closeAllConnections();
          await new Promise<void>(r => server.close(() => r()));
          return launch;
        }
        from = to + 1n;
        ledger.set('launch_from', from.toString());
      }
    } catch (e: any) {
      console.error('[launch]', e.shortMessage ?? e.message);
    }
    await new Promise<void>(r => { wake = r; setTimeout(r, idleMs); });
    wake = null;
  }
}
