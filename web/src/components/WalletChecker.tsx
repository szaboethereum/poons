import { useEffect, useId, useState } from 'react';
import { api } from '../lib/api';
import { chipTraits, rarityOf, toSeed } from '../lib/art';
import { explorerAddr, isAddress, shortAddr, usd } from '../lib/format';
import type { Drop, Stats, WalletStatus } from '../lib/types';
import { getProvider, onAccountsChanged, requestAccount } from '../lib/wallet';
import { Poon } from './Poon';
import { TierBadge } from './TierBadge';

const STORE_KEY = 'poons:last-address';
const readStored = () => { try { return localStorage.getItem(STORE_KEY) ?? ''; } catch { return ''; } };
const writeStored = (v: string) => { try { localStorage.setItem(STORE_KEY, v); } catch { /* storage unavailable */ } };

interface Props { stats: Stats | undefined; onOpen: (d: Drop) => void }

export function WalletChecker({ stats, onOpen }: Props) {
  const inputId = useId();
  const [input, setInput] = useState(readStored);
  const [address, setAddress] = useState<string | null>(null);
  const [result, setResult] = useState<WalletStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [nonce, setNonce] = useState(0); // re-check the same address on demand

  // Fetch, then keep polling while the drop tx is being sent ('queued').
  useEffect(() => {
    if (!address) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async (first: boolean) => {
      if (first) { setBusy(true); setResult(null); setError(null); }
      try {
        const r = await api.wallet(address);
        if (!alive) return;
        setResult(r);
        setError(null);
        if (r.status === 'queued') timer = setTimeout(() => load(false), 3000);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive && first) setBusy(false);
      }
    };
    load(true);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [address, nonce]);

  useEffect(() => (connected ? onAccountsChanged((a) => { if (a) { setInput(a); setAddress(a.toLowerCase()); } }) : undefined), [connected]);

  const check = (raw: string) => {
    const a = raw.trim();
    if (!isAddress(a)) { setError('That doesn\'t look like a wallet address. It should start with 0x and be 42 characters long.'); setResult(null); return; }
    writeStored(a);
    setAddress(a.toLowerCase());
    setNonce((n) => n + 1);
  };

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const a = await requestAccount();
      setInput(a);
      setConnected(true);
      check(a);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|denied/i.test(msg) ? 'Connection request was declined.' : msg);
    } finally {
      setConnecting(false);
    }
  };

  const hasWallet = typeof window !== 'undefined' && !!getProvider();

  return (
    <section className="section section--alt" id="wallet" aria-labelledby="wallet-title">
      <div className="wrap wallet">
        <header className="section__head">
          <p className="eyebrow">Wallet checker</p>
          <h2 id="wallet-title">Where's my Poon?</h2>
          <p className="section__sub">Connect or paste any address to see where it stands. Checking is read-only; nothing is signed.</p>
        </header>

        <div className="wallet__panel">
          <form className="wallet__form" onSubmit={(e) => { e.preventDefault(); check(input); }}>
            <label htmlFor={inputId} className="label">Wallet address</label>
            <div className="wallet__row">
              <input
                id={inputId}
                className="input mono"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                inputMode="text"
              />
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Check'}</button>
            </div>
            <div className="wallet__or">
              <span>or</span>
              <button type="button" className="btn btn--ghost" onClick={connect} disabled={connecting}>
                {connecting ? 'Waiting for wallet…' : connected ? 'Wallet connected' : 'Connect wallet'}
              </button>
              {!hasWallet && <span className="hint">No browser wallet detected.</span>}
            </div>
          </form>

          <div className="wallet__result" aria-live="polite">
            {error && <p className="alert" role="alert">{error}</p>}
            {busy && !result && <div className="status status--loading"><span className="spinner" aria-hidden="true" /> Checking {address && shortAddr(address)}…</div>}
            {result && <StatusCard r={result} stats={stats} onOpen={onOpen} />}
            {!result && !busy && !error && <p className="wallet__empty">Results show up here.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusCard({ r, stats, onOpen }: { r: WalletStatus; stats: Stats | undefined; onOpen: (d: Drop) => void }) {
  const minBuy = usd(stats?.minBuyUsd ?? 10);
  const addr = (
    <a className="mono" href={explorerAddr(stats?.chainId, r.address)} target="_blank" rel="noopener noreferrer">{shortAddr(r.address)}</a>
  );
  const buy = stats?.ponsUrl && <a className="btn btn--primary btn--small" href={stats.ponsUrl} target="_blank" rel="noopener noreferrer">Buy on Pons ↗</a>;

  switch (r.status) {
    case 'below_min':
      return (
        <div className="status status--warn">
          <p className="status__tag">Under {minBuy}</p>
          <h3>Close, but not quite</h3>
          <p>
            The biggest single buy from {addr} was <strong className="mono">{usd(r.bestBuyUsd)}</strong>. It takes one buy of {minBuy} or more;
            smaller buys don't add up. Make one new buy of at least {minBuy} and your Poon drops within seconds.
          </p>
          {buy}
        </div>
      );
    case 'queued':
      return (
        <div className="status status--queued">
          <p className="status__tag"><span className="spinner" aria-hidden="true" /> Dropping</p>
          <h3>Your Poon is on its way</h3>
          <p>Your buy qualified and the drop transaction to {addr} is being sent right now. This page updates as soon as it lands.</p>
        </div>
      );
    case 'minted': {
      const seed = toSeed(r.seed);
      const drop: Drop | null = r.tokenId !== null && r.seed ? { tokenId: r.tokenId, to: r.address, seed: r.seed, tx: r.tx ?? null, time: 0 } : null;
      return (
        <div className="status status--minted">
          {seed !== null && <Poon seed={seed} size={176} className="status__art" alt={`Poon #${r.tokenId}`} />}
          <div>
            <p className="status__tag">Minted</p>
            <h3>Poon #{r.tokenId} is yours</h3>
            <p>It's in {addr}. One per wallet, so this is the one.</p>
            {seed !== null && (
              <>
                <TierBadge rarity={rarityOf(seed)} />
                <ul className="chips">{chipTraits(seed).map((t) => <li key={t.key} className={t.special ? 'chip chip--special' : 'chip'}>{t.value}</li>)}</ul>
              </>
            )}
            {drop && <button className="btn btn--ghost btn--small" onClick={() => onOpen(drop)}>View details</button>}
          </div>
        </div>
      );
    }
    default:
      // 'none', plus any status an older/newer indexer might send.
      return (
        <div className="status status--none">
          <p className="status__tag">No qualifying buy</p>
          <h3>Nothing yet for {addr}</h3>
          <p>
            We haven't seen a qualifying buy from this wallet. Make one buy of at least {minBuy} of the token on Pons and a Poon
            drops within seconds. Tokens received by transfer don't count.
          </p>
          {buy}
        </div>
      );
  }
}
