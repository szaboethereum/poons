// Typed wrapper around the shared art engine (../../../art/poons-art.js).
// The engine is a UMD script. In dev, Vite serves it as a plain ES module (no `module` global), so it
// sets window.PoonsArt. In production, Rolldown detects the `module.exports` branch and wraps it as
// CommonJS, so the API arrives as the module's exports instead. Accept whichever one is present.
import * as engine from '../../../art/poons-art.js';

export type TraitOpt = [name: string, weight: number, colors: string[], variant?: string];
export interface Trait { key: string; opts: TraitOpt[] }
export interface Rarity { tier: string; score: number }

interface PoonsArtApi {
  TRAITS: Trait[];
  svg(seed: bigint): string;
  traitsFor(seed: bigint): number[];
  traitLabels(idx: number[]): Record<string, string>;
  randomSeed(): bigint;
  rarity?: (seed: bigint) => Rarity;
}

declare global {
  interface Window { PoonsArt?: PoonsArtApi }
}

function resolveEngine(): PoonsArtApi {
  const mod = engine as unknown as { default?: PoonsArtApi } & Partial<PoonsArtApi>;
  const api = window.PoonsArt ?? mod.default ?? (mod.svg ? (mod as PoonsArtApi) : undefined);
  if (!api) throw new Error('Poons art engine failed to load');
  return api;
}

export const Art: PoonsArtApi = resolveEngine();
export const TRAITS: Trait[] = Art.TRAITS;

/** Rarity tiers from most to least common. Unknown tiers returned by the engine are still displayed. */
export const TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;
/** Named special types. Only highlighted inside the "Type"/"Special" trait (Body has an unrelated "Ghost"). */
export const SPECIAL_NAMES = new Set(['Gold', 'Skeleton', 'Ghost', 'Shadow', 'Zombie']);

export const hasRarity = (): boolean => typeof Art.rarity === 'function';

/** Index of the special-type trait, or -1 while the engine doesn't have one. */
export const TYPE_TRAIT = TRAITS.findIndex((t) => /^(type|special)$/i.test(t.key));

export function toSeed(s: string | bigint | null | undefined): bigint | null {
  if (s === null || s === undefined) return null;
  if (typeof s === 'bigint') return s;
  try { return BigInt(s); } catch { return null; }
}

const svgCache = new Map<string, string>();
export function poonDataUri(seed: bigint): string {
  const key = seed.toString(16);
  let uri = svgCache.get(key);
  if (!uri) {
    uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Art.svg(seed));
    if (svgCache.size > 600) svgCache.clear();
    svgCache.set(key, uri);
  }
  return uri;
}

export function poonSvg(seed: bigint): string { return Art.svg(seed); }

export function rarityOf(seed: bigint): Rarity | null {
  if (!hasRarity()) return null;
  try { return Art.rarity!(seed); } catch { return null; }
}

export interface TraitRow { key: string; value: string; pct: number | null; special: boolean; isType: boolean }
/**
 * Traits for a seed, labelled via the engine (special types relabel some traits, e.g. Gold body).
 * `pct` is the option's odds, or null when a special type overrides the rolled option.
 */
export function traitsOf(seed: bigint): TraitRow[] {
  const idx = Art.traitsFor(seed);
  const labels = Art.traitLabels(idx);
  return TRAITS.map((t, k) => {
    const rolled = t.opts[idx[k]][0];
    const value = labels[t.key] ?? rolled;
    return { key: t.key, value, pct: value === rolled ? optionPct(t, idx[k]) : null, special: isSpecial(k, idx[k]), isType: k === TYPE_TRAIT };
  });
}

/** Traits worth showing as chips: the plain (non-special) type and empty 'None' slots are left out. */
export const chipTraits = (seed: bigint): TraitRow[] => traitsOf(seed).filter((t) => (!t.isType || t.special) && t.value !== 'None');

/** Label of the special-type trait for a seed, or null if the engine has no such trait. */
export function typeOf(seed: bigint): string | null {
  if (TYPE_TRAIT < 0) return null;
  return TRAITS[TYPE_TRAIT].opts[Art.traitsFor(seed)[TYPE_TRAIT]][0];
}

const totals = new Map<Trait, number>();
export function optionPct(t: Trait, i: number): number {
  let total = totals.get(t);
  if (total === undefined) { total = t.opts.reduce((a, o) => a + o[1], 0); totals.set(t, total); }
  return total ? (t.opts[i][1] / total) * 100 : 0;
}

export function isSpecial(traitIdx: number, optIdx: number): boolean {
  return traitIdx === TYPE_TRAIT && SPECIAL_NAMES.has(TRAITS[traitIdx].opts[optIdx][0]);
}

/**
 * A seed whose trait `k` lands on option `i` and every other trait on its first (most common) option.
 * Trait k reads 16-bit chunk k of the seed modulo the total weight. Returns null if the engine
 * doesn't agree (e.g. a future trait derived differently), so callers can skip the preview.
 */
export function seedForOption(k: number, i: number): bigint | null {
  const cum = TRAITS[k].opts.slice(0, i).reduce((a, o) => a + o[1], 0);
  if (cum > 0xffff) return null;
  const seed = BigInt(cum) << BigInt(16 * k);
  try { return Art.traitsFor(seed)[k] === i ? seed : null; } catch { return null; }
}

export function seedHex(seed: bigint): string { return '0x' + seed.toString(16).padStart(64, '0'); }
