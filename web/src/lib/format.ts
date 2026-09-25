export const isAddress = (s: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(s.trim());

export const shortAddr = (a: string): string => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

export const TESTNET_CHAIN_ID = 46630;
export const MAINNET_CHAIN_ID = 4663;

function explorerBase(chainId: number | undefined): string {
  return chainId === TESTNET_CHAIN_ID
    ? 'https://explorer.testnet.chain.robinhood.com'
    : 'https://robinhoodchain.blockscout.com';
}
export const explorerTx = (chainId: number | undefined, tx: string) => `${explorerBase(chainId)}/tx/${tx}`;
export const explorerAddr = (chainId: number | undefined, a: string) => `${explorerBase(chainId)}/address/${a}`;

export function relTime(unixS: number, nowMs: number): string {
  const d = Math.max(0, Math.round(nowMs / 1000 - unixS));
  if (d < 10) return 'just now';
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function duration(seconds: number): string {
  if (seconds % 3600 === 0 && seconds >= 3600) return `${seconds / 3600} hour${seconds === 3600 ? '' : 's'}`;
  if (seconds % 60 === 0) return `${seconds / 60} minute${seconds === 60 ? '' : 's'}`;
  return `${seconds} seconds`;
}

export const usd = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export const num = (n: number): string => n.toLocaleString('en-US');

export const pct = (p: number): string => (p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)) + '%';
