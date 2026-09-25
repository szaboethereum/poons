// Sends Poons.drop(address[]) batches. One tx in flight at a time: while it confirms, newly queued
// wallets pile up and ride the next batch, so throughput scales with demand. The contract enforces
// one Poon per wallet, so resending a batch after a crash or timeout can never double-mint.
import { decodeEventLog, type Account, type PublicClient, type WalletClient } from 'viem';
import { randomBytes } from 'node:crypto';
import type { Ledger } from './ledger.ts';

export const POONS_ABI = [
  { type: 'function', name: 'drop', stateMutability: 'nonpayable', outputs: [],
    inputs: [{ name: 'drops', type: 'tuple[]', components: [{ name: 'to', type: 'address' }, { name: 'founder', type: 'bool' }] }] },
  { type: 'function', name: 'dropOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'seedOf', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'maxSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'mintOpen', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
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
  /** Minter wallet balance, refreshed every 5 minutes (one eth_getBalance), so gas never silently runs out. */
  balanceEth: number | null = null;
  lowBalanceEth = Number(process.env.LOW_BALANCE_ETH ?? '0.003');
  /** null until first checked. While closed, buys keep qualifying and wait in the queue. */
  mintOpen: boolean | null = null;
  #mintCheckedAt = 0;
  #maxSupply: bigint | null = null;

  constructor(pub: PublicClient, wallet: WalletClient | null, account: Account | null, poons: `0x${string}`,
    ledger: Ledger, maxBatch: number) {
    Object.assign(this, { pub, wallet, account, poons, ledger, maxBatch });
  }

  get dryRun() { return this.wallet === null; }
  kick() { this.wake?.(); }

  /** Reads the on-chain switch at most once a minute while closed (no RPC churn during a pause). */
  async #isOpen(): Promise<boolean> {
    if (this.mintOpen || Date.now() - this.#mintCheckedAt < 60_000) return this.mintOpen === true;
    this.#mintCheckedAt = Date.now();
    const open = await this.pub.readContract({ address: this.poons, abi: POONS_ABI, functionName: 'mintOpen' });
    if (open !== this.mintOpen) console.log(`[mint] minting is ${open ? 'OPEN' : 'closed — qualifying buys are queued until it opens'}`);
    this.mintOpen = open;
    return open;
  }

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

  #watchBalance() {
    if (this.dryRun || !this.account) return;
    const tick = async () => {
      try {
        this.balanceEth = Number(await this.pub.getBalance({ address: this.account!.address })) / 1e18;
        if (this.balanceEth < this.lowBalanceEth) console.warn(`[mint] LOW GAS: minter has ${this.balanceEth.toFixed(5)} ETH`);
      } catch { /* next tick */ }
    };
    tick();
    setInterval(tick, 300_000).unref();
  }

  async run() {
    this.#watchBalance();
    if (!this.dryRun) await this.#isOpen().catch(() => {});
    if (!this.dryRun) console.log(`[mint] reconciled ${await this.reconcile(this.ledger.queue(100_000).map(q => q.address))} wallet(s) already served on-chain`);
    for (;;) {
      const batch = this.soldOut ? [] : this.ledger.queue(this.maxBatch);
      if (!batch.length) {
        await new Promise<void>(r => { this.wake = r; setTimeout(r, 2000); });
        this.wake = null;
        continue;
      }
      if (this.dryRun) {
        // Simulated ids/seeds so the API and frontend behave as they will on-chain.
        for (const q of batch) {
          const id = (this.ledger.tokens(0, 1).total as number) + 1;
          const seed = (BigInt('0x' + randomBytes(32).toString('hex')) >> 1n) | (q.founder ? 1n << 255n : 0n);
          this.ledger.recordDrop(q.address, id, seedHex(seed), 'dry-run', Math.floor(Date.now() / 1000));
        }
        console.log(`[mint] DRY RUN would drop ${batch.length} Poon(s)`);
        continue;
      }
      try {
        if (!(await this.#isOpen())) {
          await new Promise<void>(r => { this.wake = r; setTimeout(r, 60_000); });
          this.wake = null;
          continue;
        }
        this.#maxSupply ??= await this.pub.readContract({ address: this.poons, abi: POONS_ABI, functionName: 'maxSupply' });
        if (BigInt(this.ledger.tokens(0, 1).total) >= this.#maxSupply) { this.soldOut = true; console.log('[mint] max supply reached — minting stopped'); continue; }

        const t0 = Date.now();
        const hash = await this.wallet!.writeContract({
          address: this.poons, abi: POONS_ABI, functionName: 'drop',
          args: [batch.map(q => ({ to: q.address as `0x${string}`, founder: q.founder }))],
          account: this.account!, chain: this.wallet!.chain,
        });
        const rc = await this.pub.waitForTransactionReceipt({ hash, pollingInterval: 250, timeout: 60_000 });
        if (rc.status !== 'success') throw new Error(`drop reverted in ${hash}`);
        const now = Math.floor(Date.now() / 1000); // ~1 s of the block time; saves a getBlock call
        let minted = 0;
        for (const log of rc.logs) {
          if (log.address.toLowerCase() !== this.poons.toLowerCase()) continue;
          try {
            const ev = decodeEventLog({ abi: POONS_ABI, data: log.data, topics: log.topics });
            if (ev.eventName !== 'Dropped') continue;
            this.ledger.recordDrop(ev.args.to.toLowerCase(), Number(ev.args.tokenId), seedHex(ev.args.seed), hash, now);
            minted++;
          } catch { /* not ours */ }
        }
        // Wallets in the batch without a Dropped event were already served (or supply ran out).
        if (minted < batch.length) await this.reconcile(batch.map(q => q.address).filter(w => this.ledger.row(w)?.token_id == null));
        console.log(`[mint] ${minted} Poon(s) in ${Date.now() - t0}ms ${hash}`);
      } catch (e: any) {
        console.error('[mint]', e.shortMessage ?? e.message);
        if (/MintClosed/.test(`${e.message} ${e.shortMessage ?? ''}`)) { this.mintOpen = false; this.#mintCheckedAt = Date.now(); continue; }
        await sleep(1500);
        await this.reconcile(batch.map(q => q.address)).catch(() => {});
      }
    }
  }
}
