import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { TIERS, TRAITS, TYPE_TRAIT, hasRarity, isFounder, rarityOf, toSeed, typeOf } from '../lib/art';
import { num } from '../lib/format';
import type { Drop } from '../lib/types';
import { Page } from './Page';
import { OPENSEA_URL } from '../lib/config';
import { Poon } from './Poon';
import { FounderBadge } from './FounderBadge';
import { TierBadge } from './TierBadge';

const PAGE = 48;

interface Row { drop: Drop; tier: string | null; type: string | null; founder: boolean }

export function Gallery({ onOpen, latestId }: { onOpen: (d: Drop) => void; latestId: number | undefined }) {
  const tierId = useId();
  const typeId = useId();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState('');
  const [type, setType] = useState('');
  const [resident, setResident] = useState<'' | 'founder' | 'later'>('');
  const residentId = useId();

  const toRow = (d: Drop): Row => {
    const s = toSeed(d.seed);
    return { drop: d, tier: s !== null ? rarityOf(s)?.tier ?? null : null, type: s !== null ? typeOf(s) : null, founder: s !== null && isFounder(s) };
  };

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const r = await api.tokens(offset, PAGE);
      setTotal(r.total);
      setRows((prev) => {
        const base = offset === 0 ? [] : prev;
        const have = new Set(base.map((x) => x.drop.tokenId));
        return [...base, ...r.tokens.filter((t) => !have.has(t.tokenId)).map(toRow)];
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  // Pull new mints into the top of the grid when the live feed sees a newer token.
  useEffect(() => {
    if (latestId === undefined || !rows.length || latestId <= rows[0].drop.tokenId) return;
    api.tokens(0, PAGE).then((r) => {
      setTotal(r.total);
      setRows((prev) => {
        const have = new Set(prev.map((x) => x.drop.tokenId));
        const add = r.tokens.filter((t) => !have.has(t.tokenId)).map(toRow);
        return add.length ? [...add, ...prev].sort((a, b) => b.drop.tokenId - a.drop.tokenId) : prev;
      });
    }).catch(() => { /* next tick will retry */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId]);

  const shown = useMemo(() => rows.filter((r) => (!tier || r.tier === tier) && (!type || r.type === type) && (!resident || (resident === 'founder') === r.founder)), [rows, tier, type, resident]);
  const tierOptions = useMemo(() => {
    const extra = [...new Set(rows.map((r) => r.tier).filter((t): t is string => !!t && !(TIERS as readonly string[]).includes(t)))];
    return [...TIERS, ...extra];
  }, [rows]);
  const filtering = !!(tier || type || resident);
  const more = total !== null && rows.length < total;

  return (
    <Page eyebrow="Gallery" title="Every Poon so far" sub={<>{total !== null ? `${num(total)} minted. ` : ''}Click one for its traits. Trade them on <a href={OPENSEA_URL} target="_blank" rel="noopener noreferrer">OpenSea ↗</a></>}>

        {(

          <div className="filters" role="group" aria-label="Filter the gallery">
            {hasRarity() && (
              <div className="field">
                <label htmlFor={tierId} className="label">Rarity</label>
                <select id={tierId} className="select" value={tier} onChange={(e) => setTier(e.target.value)}>
                  <option value="">All tiers</option>
                  {tierOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {TYPE_TRAIT >= 0 && (
              <div className="field">
                <label htmlFor={typeId} className="label">Type</label>
                <select id={typeId} className="select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">All types</option>
                  {TRAITS[TYPE_TRAIT].opts.map((o) => <option key={o[0]} value={o[0]}>{o[0]}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor={residentId} className="label">Residents</label>
              <select id={residentId} className="select" value={resident} onChange={(e) => setResident(e.target.value as '' | 'founder' | 'later')}>
                <option value="">All residents</option>
                <option value="founder">Founding Residents</option>
                <option value="later">Later residents</option>
              </select>
            </div>
            {filtering && (
              <p className="filters__count" aria-live="polite">
                {num(shown.length)} of {num(rows.length)} loaded match
                <button className="link-btn" onClick={() => { setTier(''); setType(''); setResident(''); }}>Clear</button>
              </p>
            )}
          </div>
        )}

        {error && <p className="alert">Couldn't load the gallery: {error}</p>}
        {total === 0 && <p className="empty">No Poons minted yet. Be the first.</p>}
        {filtering && rows.length > 0 && shown.length === 0 && <p className="empty">None of the loaded Poons match. {more ? 'Load more to keep looking.' : ''}</p>}

        <ul className="grid">
          {shown.map(({ drop, tier: t, founder }) => (
            <li key={drop.tokenId}>
              <button className="tile" onClick={() => onOpen(drop)} aria-label={`Poon #${drop.tokenId}${t ? `, ${t}` : ''}${founder ? ', Founding Resident' : ''}`}>
                <Poon seed={drop.seed} size={160} alt="" className="tile__art" />
                <span className="tile__foot">
                  <span className="mono tile__id">#{drop.tokenId}{founder && <FounderBadge iconOnly />}</span>
                  {t && <TierBadge rarity={{ tier: t, score: 0 }} small />}
                </span>
              </button>
            </li>
          ))}
          {loading && rows.length === 0 && Array.from({ length: 12 }, (_, i) => <li key={`s${i}`}><span className="tile tile--skeleton" /></li>)}
        </ul>

        {more && (
          <div className="gallery__more">
            <button className="btn btn--ghost" onClick={() => load(rows.length)} disabled={loading}>
              {loading ? 'Loading…' : `Load more (${num(total! - rows.length)} left)`}
            </button>
          </div>
        )}
      </Page>
  );
}
