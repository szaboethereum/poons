import { useEffect, useState, useSyncExternalStore } from 'react';
import { demoStore } from '../lib/api';

/** Current time in ms, re-rendering every `ms`. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const motionQuery = '(prefers-reduced-motion: reduce)';
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(motionQuery); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => matchMedia(motionQuery).matches,
  );
}

export const useDemoMode = (): boolean => useSyncExternalStore(demoStore.subscribe, demoStore.get);
