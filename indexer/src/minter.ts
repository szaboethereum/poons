// Sends Poons.drop(address[]) batches. One tx in flight at a time: while it confirms, newly queued
// wallets pile up and ride the next batch, so throughput scales with demand. The contract enforces
// one Poon per wallet, so resending a batch after a crash or timeout can never double-mint.
import { decodeEventLog, type Account, type PublicClient, type WalletClient } from 'viem';
import { randomBytes } from 'node:crypto';
import type { Ledger } from './ledger.ts';

export const POONS_ABI = [
  { type: 'function', name: 'drop', stateMutability: 'nonpayable', inputs: [{ name: 'wallets', type: 'address[]' }], outputs: [] },
  { type: 'function', name: 'dropOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'seedOf', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'maxSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'event', name: 'Dropped', inputs: [
    { name: 'to', type: 'address', indexed: true }, { name: 'tokenId', type: 'uint256', indexed: true },
    { name: 'seed', type: 'uint256', indexed: false }] },
] as const;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const seedHex = (s: bigint) => '0x' + s.toString(16).padStart(64, '0');

export class Minter {
  wake: (() => void) | null = null;
  pub: PublicClient; wallet: WalletClient | null; account: Account | null; poons: `0x${string}`;
  ledger: Ledger; maxBatch: number;
  soldOut = false;

  constructor(pub: PublicClient, wallet: WalletClient | null, account: Account | null, poons: `0x${string}`,
    ledger: Ledger, maxBatch: number) {
    Object.assign(this, { pub, wallet, account, poons, ledger, maxBatch });
  }

  get dryRun() { return this.wallet === null; }
  kick() { this.wake?.(); }

  /** Trust the chain: a wallet the contract already served is recorded as minted. */
  async reconcile(wallets: string[]) {
    let fixed = 0;
    for (const w of wallets) {
      const id = await this.pub.readContract({ address: this.poons, abi: POONS_ABI, functionName: 'dropOf', args: [w as `0x${string}`] });
      if (id === 0n) continue;
      const seed = await this.pub.readContract({ address: this.poons, abi: POONS_ABI, functionName: 'seedOf', args: [id] });
      this.ledger.recordDrop(w, Number(id), seedHex(seed), '0x', Math.floor(Date.now() / 1000));
      fixed++;
    }
    return fixed;
  }

  async run() {
    if (!this.dryRun) console.log(`[mint] reconciled ${await this.reconcile(this.ledger.queue(100_000))} wallet(s) already served on-chain`);
    for (;;) {
      const batch = this.soldOut ? [] : this.ledger.queue(this.maxBatch);
      if (!batch.length) {
        await new Promise<void>(r => { this.wake = r; setTimeout(r, 2000); });
        this.wake = null;
        continue;
      }
      if (this.dryRun) {
        // Simulated ids/seeds so the API and frontend behave as they will on-chain.
        for (const w of batch) {
          const id = (this.ledger.tokens(0, 1).total as number) + 1;
          this.ledger.recordDrop(w, id, '0x' + randomBytes(32).toString('hex'), 'dry-run', Math.floor(Date.now() / 1000));
        }
        console.log(`[mint] DRY RUN would drop ${batch.length} Poon(s)`);
        continue;
      }
      try {
        const [supply, max] = await Promise.all([
          this.pub.readContract({ address: this.poons, abi: POONS_ABI, functionName: 'totalSupply' }),
          this.pub.readContract({ address: this.poons, abi: POONS_ABI, functionName: 'maxSupply' }),
        ]);
        if (supply >= max) { this.soldOut = true; console.log('[mint] max supply reached — minting stopped'); continue; }

        const t0 = Date.now();
        const hash = await this.wallet!.writeContract({
          address: this.poons, abi: POONS_ABI, functionName: 'drop', args: [batch as `0x${string}`[]],
          account: this.account!, chain: this.wallet!.chain,
        });
        const rc = await this.pub.waitForTransactionReceipt({ hash, pollingInterval: 100, timeout: 60_000 });
        if (rc.status !== 'success') throw new Error(`drop reverted in ${hash}`);
        const block = await this.pub.getBlock({ blockNumber: rc.blockNumber });
        let minted = 0;
        for (const log of rc.logs) {
          if (log.address.toLowerCase() !== this.poons.toLowerCase()) continue;
          try {
            const ev = decodeEventLog({ abi: POONS_ABI, data: log.data, topics: log.topics });
            if (ev.eventName !== 'Dropped') continue;
            this.ledger.recordDrop(ev.args.to.toLowerCase(), Number(ev.args.tokenId), seedHex(ev.args.seed), hash, Number(block.timestamp));
            minted++;
          } catch { /* not ours */ }
        }
        // Wallets in the batch without a Dropped event were already served (or supply ran out).
        if (minted < batch.length) await this.reconcile(batch.filter(w => this.ledger.row(w)?.token_id == null));
        console.log(`[mint] ${minted} Poon(s) in ${Date.now() - t0}ms ${hash}`);
      } catch (e: any) {
        console.error('[mint]', e.shortMessage ?? e.message);
        await sleep(1500);
        await this.reconcile(batch).catch(() => {});
      }
    }
  }
}
