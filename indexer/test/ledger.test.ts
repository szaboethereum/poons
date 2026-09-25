import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../src/ledger.ts';
import type { Trade } from '../src/classify.ts';

const E18 = 10n ** 18n;
const ETH_USD = 2000;
const usd = (n: number) => (BigInt(Math.round(n * 1e6)) * E18) / BigInt(ETH_USD * 1e6);
let n = 0;
const t = (wallet: string, kind: Trade['kind'], dollars: number, time = 0): Trade =>
  ({ tx: '0x' + (++n).toString(16), logIndex: 0, block: BigInt(n), time, wallet, kind, tokens: 100n, ethWei: usd(dollars) });
const make = () => new Ledger(':memory:', 10);
const status = (l: Ledger, w: string) => l.status(l.row(w));

test('a single $10+ buy queues the wallet immediately', () => {
  const l = make();
  assert.equal(l.apply([t('a', 'buy', 12)], ETH_USD), true);
  assert.equal(status(l, 'a'), 'queued');
  assert.deepEqual(l.queue(10), ['a']);
});

test('buys under $10 never qualify, even if they add up', () => {
  const l = make();
  l.apply([t('b', 'buy', 6), t('b', 'buy', 6)], ETH_USD);
  assert.equal(status(l, 'b'), 'below_min');
  assert.deepEqual(l.queue(10), []);
});

test('selling or moving tokens does not affect eligibility', () => {
  const l = make();
  l.apply([t('c', 'out', 5), t('c', 'buy', 20), t('c', 'out', 20)], ETH_USD);
  assert.equal(status(l, 'c'), 'queued');
});

test('one Poon per wallet: buying more changes nothing, minted is final', () => {
  const l = make();
  l.apply([t('d', 'buy', 20), t('d', 'buy', 500)], ETH_USD);
  assert.deepEqual(l.queue(10), ['d']);
  l.recordDrop('d', 1, '0x01', '0xabc', 2);
  l.apply([t('d', 'buy', 50)], ETH_USD);
  assert.equal(status(l, 'd'), 'minted');
  assert.deepEqual(l.queue(10), []);
});

test('tokens received by transfer never qualify', () => {
  const l = make();
  l.apply([t('e', 'in', 0)], ETH_USD);
  assert.equal(status(l, 'e'), 'none');
});

test('queue is first-come, first-served', () => {
  const l = make();
  l.apply([t('late', 'buy', 15, 200), t('early', 'buy', 15, 100)], ETH_USD);
  assert.deepEqual(l.queue(10), ['early', 'late']);
});

test('re-scanning the same trades is a no-op', () => {
  const l = make();
  const buy = t('f', 'buy', 30);
  l.apply([buy], ETH_USD);
  assert.equal(l.apply([buy], ETH_USD), false);
  assert.equal((l.db.prepare('SELECT COUNT(*) AS n FROM trades').get() as any).n, 1);
});
