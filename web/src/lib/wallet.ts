// Minimal injected EIP-1193 wallet access (no wallet libraries).
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window { ethereum?: Eip1193Provider }
}

export const getProvider = (): Eip1193Provider | undefined => window.ethereum;

export async function requestAccount(): Promise<string> {
  const eth = getProvider();
  if (!eth) throw new Error('No browser wallet found. Install one, or paste your address instead.');
  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.length) throw new Error('The wallet did not share an address.');
  return accounts[0];
}

export function onAccountsChanged(cb: (a: string | null) => void): () => void {
  const eth = getProvider();
  if (!eth?.on) return () => {};
  const h = (...args: unknown[]) => { const list = args[0] as string[] | undefined; cb(list?.[0] ?? null); };
  eth.on('accountsChanged', h);
  return () => eth.removeListener?.('accountsChanged', h);
}
