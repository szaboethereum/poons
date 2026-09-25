// Eligibility ledger on SQLite (node:sqlite, built into Node 24).
//
// Rules (one Poon per wallet, ever):
//   1. A single market buy worth >= MIN_BUY_USD queues the wallet for a drop right away.
//   2. Smaller buys never count and never add up. Tokens received by transfer never count.
//   3. Selling or moving tokens changes nothing: people can trade freely.
// Every trade is still recorded (keyed by tx + wallet), so re-scans are idempotent and the history
// can be audited.
import { DatabaseSync } from 'node:sqlite';
import type { Trade } from './classify.ts';

export type Status = 'none' | 'below_min' | 'queued' | 'minted';

export type WalletRow = {
  address: string; best_buy_usd6: number; qualified_at: number | null; token_id: number | null; seed: string | null;
};

export class Ledger {
  db: DatabaseSync;
  minBuyUsd6: bigint;

  constructor(file: string, minBuyUsd: number) {
    this.db = new DatabaseSync(file);
    this.minBuyUsd6 = BigInt(Math.round(minBuyUsd * 1e6));
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS trades (
        tx TEXT NOT NULL, wallet TEXT NOT NULL, kind TEXT NOT NULL, block INTEGER NOT NULL, time INTEGER NOT NULL,
        tokens TEXT NOT NULL, eth_wei TEXT NOT NULL, usd6 INTEGER NOT NULL, eth_usd REAL NOT NULL,
        PRIMARY KEY (tx, wallet)
      );
      CREATE TABLE IF NOT EXISTS wallets (
        address TEXT PRIMARY KEY,
        best_buy_usd6 INTEGER NOT NULL DEFAULT 0,
        qualified_at INTEGER,        -- chain time of the first buy >= MIN_BUY_USD (= queued for the drop)
        token_id INTEGER,
        seed TEXT
      );
      CREATE INDEX IF NOT EXISTS wallets_queued ON wallets (qualified_at) WHERE token_id IS NULL AND qualified_at IS NOT NULL;
      CREATE TABLE IF NOT EXISTS tokens (
        token_id INTEGER PRIMARY KEY, wallet TEXT NOT NULL, seed TEXT NOT NULL, tx TEXT NOT NULL, time INTEGER NOT NULL
      );
    `);
  }

  get(k: string): string | undefined {
    return (this.db.prepare('SELECT v FROM kv WHERE k = ?').get(k) as { v: string } | undefined)?.v;
  }
  set(k: string, v: string) {
    this.db.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run(k, v);
  }

  /**
   * Applies trades atomically (optionally together with the cursor). Trades already recorded are
   * skipped, so overlapping re-scans are safe. Returns true if any wallet was newly queued.
   */
  apply(trades: Trade[], ethUsd: number, cursor?: { block: bigint; priceE18: bigint }): boolean {
    const ethUsd6 = BigInt(Math.round(ethUsd * 1e6));
    let queued = false;
    this.db.exec('BEGIN');
    try {
      const ins = this.db.prepare(`INSERT OR IGNORE INTO trades VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const t of trades) {
        const usd6 = (t.ethWei * ethUsd6) / 10n ** 18n;
        const r = ins.run(t.tx, t.wallet, t.kind, Number(t.block), t.time, t.tokens.toString(), t.ethWei.toString(), Number(usd6), ethUsd);
        if (r.changes === 0 || t.kind !== 'buy') continue;
        queued = this.#buy(t, usd6) || queued;
      }
      if (cursor) {
        this.set('cursor', cursor.block.toString());
        this.set('priceE18', cursor.priceE18.toString());
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return queued;
  }

  #buy(t: Trade, usd6: bigint): boolean {
    this.db.prepare('INSERT OR IGNORE INTO wallets (address) VALUES (?)').run(t.wallet);
    const w = this.row(t.wallet)!;
    const best = Math.max(w.best_buy_usd6, Number(usd6));
    const qualifies = w.qualified_at === null && usd6 >= this.minBuyUsd6;
    this.db.prepare('UPDATE wallets SET best_buy_usd6 = ?, qualified_at = COALESCE(qualified_at, ?) WHERE address = ?')
      .run(best, qualifies ? t.time : null, t.wallet);
    return qualifies;
  }

  queue(limit: number): string[] {
    return (this.db.prepare(`SELECT address FROM wallets WHERE token_id IS NULL AND qualified_at IS NOT NULL
      ORDER BY qualified_at LIMIT ?`).all(limit) as any[]).map(r => r.address);
  }

  recordDrop(wallet: string, tokenId: number, seed: string, tx: string, time: number) {
    this.db.prepare('INSERT OR IGNORE INTO wallets (address) VALUES (?)').run(wallet);
    this.db.prepare('UPDATE wallets SET token_id = ?, seed = ? WHERE address = ?').run(tokenId, seed, wallet);
    this.db.prepare('INSERT OR IGNORE INTO tokens VALUES (?, ?, ?, ?, ?)').run(tokenId, wallet, seed, tx, time);
  }

  dropTx(tokenId: number): string | null {
    const r = this.db.prepare('SELECT tx FROM tokens WHERE token_id = ?').get(tokenId) as any;
    return r && r.tx.startsWith('0x') && r.tx.length === 66 ? r.tx : null;
  }

  row(address: string): WalletRow | undefined {
    return this.db.prepare('SELECT * FROM wallets WHERE address = ?').get(address.toLowerCase()) as any;
  }

  status(w: WalletRow | undefined): Status {
    if (!w) return 'none';
    if (w.token_id !== null) return 'minted';
    if (w.qualified_at !== null) return 'queued';
    return w.best_buy_usd6 > 0 ? 'below_min' : 'none';
  }

  stats() {
    return this.db.prepare(`SELECT
      (SELECT COUNT(*) FROM tokens) AS minted,
      (SELECT COUNT(*) FROM wallets WHERE token_id IS NULL AND qualified_at IS NOT NULL) AS queued,
      (SELECT COUNT(*) FROM wallets WHERE qualified_at IS NULL AND best_buy_usd6 > 0) AS belowMin`).get() as any;
  }

  tokens(offset: number, limit: number) {
    const total = (this.db.prepare('SELECT COUNT(*) AS n FROM tokens').get() as any).n;
    const rows = this.db.prepare('SELECT token_id AS tokenId, wallet AS "to", seed, tx, time FROM tokens ORDER BY token_id DESC LIMIT ? OFFSET ?').all(limit, offset);
    return { total, tokens: rows };
  }
}
