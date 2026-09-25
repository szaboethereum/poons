import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { TIER_SAMPLES, TRAITS, TYPE_TRAIT, expectedTiers, isSpecial, optionPct, seedForOption } from '../lib/art';
import { num, pct } from '../lib/format';
import { Page } from './Page';
import { Poon } from './Poon';

const SAMPLES = TIER_SAMPLES;
const useTierDistribution = () => useMemo(() => expectedTiers(), []);

const expected = (share: number, supply: number) => {
  const n = (share / 100) * supply;
  return n >= 10 ? num(Math.round(n)) : n >= 1 ? n.toFixed(0) : '<1';
};

export function RarityTable({ maxSupply }: { maxSupply: number }) {
  const tiers = useTierDistribution();

  const specials = useMemo(() => {
    if (TYPE_TRAIT < 0) return [];
    const t = TRAITS[TYPE_TRAIT];
    return t.opts.flatMap((o, i) => (isSpecial(TYPE_TRAIT, i) ? [{ name: o[0], pct: optionPct(t, i), seed: seedForOption(TYPE_TRAIT, i) }] : []));
  }, []);

  const traits = useMemo(() => TRAITS.flatMap((t, k) => (k === TYPE_TRAIT ? [] : [{
    key: t.key,
    opts: t.opts
      .map((o, i) => ({ name: o[0], pct: optionPct(t, i), seed: seedForOption(k, i) }))
      .sort((a, b) => b.pct - a.pct),
  }])), []);

  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: KeyboardEvent) => {
    const last = traits.length - 1;
    const next = e.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
      : e.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };
  const current = traits[active];
  const maxPct = current ? Math.max(...current.opts.map((o) => o.pct)) : 100;

  return (
    <Page eyebrow="Rarity" title="What's in the mix" sub={`Every trait is rolled from the Poon's on-chain seed. Odds below; counts are expected out of ${num(maxSupply)}.`}>

        <div className="rarity">
          {tiers && (
            <div className="rarity__block">
              <h3 className="rarity__label">Tiers</h3>
              <div className="tierbar" role="img" aria-label={tiers.map((t) => `${t.tier} ${pct(t.share)}`).join(', ')}>
                {tiers.map((t) => <span key={t.tier} className={`tierbar__seg tier-bg--${t.tier.toLowerCase()}`} style={{ flexGrow: t.share }} />)}
              </div>
              <ul className="tierlegend">
                {tiers.map((t) => (
                  <li key={t.tier}>
                    <span className={`swatch tier-bg--${t.tier.toLowerCase()}`} aria-hidden="true" />
                    <span className="tierlegend__name">{t.tier}</span>
                    <span className="mono">{pct(t.share)}</span>
                    <span className="mono dim">≈{expected(t.share, maxSupply)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {specials.length > 0 && (
            <div className="rarity__block">
              <h3 className="rarity__label">Special types</h3>
              <ul className="specials">
                {specials.map((s) => (
                  <li key={s.name} className="special">
                    {s.seed !== null && <Poon seed={s.seed} size={48} alt="" className="special__art" />}
                    <span className="special__name">{s.name}</span>
                    <span className="special__odds mono">{pct(s.pct)} <span className="dim">· ≈{expected(s.pct, maxSupply)}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {current && (
            <div className="rarity__block">
              <h3 className="rarity__label" id="traits-label">Traits</h3>
              <div className="segtabs" role="tablist" aria-labelledby="traits-label" onKeyDown={onTabKey}>
                {traits.map((t, i) => (
                  <button
                    key={t.key}
                    ref={(el) => { tabs.current[i] = el; }}
                    role="tab"
                    id={`trait-tab-${i}`}
                    aria-selected={i === active}
                    aria-controls="trait-panel"
                    tabIndex={i === active ? 0 : -1}
                    className="segtabs__tab"
                    onClick={() => setActive(i)}
                  >
                    {t.key}
                  </button>
                ))}
              </div>
              <div id="trait-panel" role="tabpanel" aria-labelledby={`trait-tab-${active}`} className="optgrid">
                {current.opts.map((o) => (
                  <div key={o.name} className="optrow">
                    {o.seed !== null ? <Poon seed={o.seed} size={24} alt="" className="optrow__art" /> : <span className="optrow__art" />}
                    <span className="optrow__name">{o.name}</span>
                    <span className="optrow__bar" aria-hidden="true"><span style={{ width: `${(o.pct / maxPct) * 100}%` }} /></span>
                    <span className="optrow__pct mono">{pct(o.pct)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {tiers && <p className="hint rarity__note">Tier shares estimated from {num(SAMPLES)} simulated seeds. Special types are always Legendary.</p>}
      </Page>
  );
}
