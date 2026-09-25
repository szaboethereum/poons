import { useCallback, useEffect, useRef, useState } from 'react';
import { demoStore, offlineStore } from '../lib/api';

export interface PollState<T> { data: T | undefined; error: string | null; loading: boolean; refresh: () => void }

/** Calls `fn` now and then every `ms` (skipped while the tab is hidden). `ms = null` fetches once. */
export function usePoll<T>(fn: () => Promise<T>, ms: number | null, deps: readonly unknown[] = []): PollState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const gen = useRef(0);
  const [kick, setKick] = useState(0);

  useEffect(() => {
    const my = ++gen.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    const tick = async (force: boolean) => {
      if (force || !document.hidden) {
        try {
          const d = await fnRef.current();
          if (gen.current !== my) return;
          setData(d);
          setError(null);
        } catch (e) {
          if (gen.current !== my) return;
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          if (gen.current === my) setLoading(false);
        }
      }
      if (ms !== null && gen.current === my) timer = setTimeout(() => tick(false), ms);
    };
    tick(true);
    return () => { gen.current++; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, kick, ...deps]);

  const refresh = useCallback(() => setKick((k) => k + 1), []);

  // Refetch right away when the tab becomes visible again, or when the indexer comes back online
  // (demo/offline -> live), so every panel catches up at once.
  useEffect(() => {
    let wasDemo = demoStore.get(), wasOffline = offlineStore.get();
    const onVis = () => { if (!document.hidden) refresh(); };
    const unDemo = demoStore.subscribe(() => { const d = demoStore.get(); if (wasDemo && !d) refresh(); wasDemo = d; });
    const unOff = offlineStore.subscribe(() => { const o = offlineStore.get(); if (wasOffline && !o) refresh(); wasOffline = o; });
    document.addEventListener('visibilitychange', onVis);
    return () => { unDemo(); unOff(); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);
  return { data, error, loading, refresh };
}
