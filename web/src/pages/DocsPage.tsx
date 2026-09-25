import type { ReactNode } from 'react';
import { API_URL } from '../lib/api';
import { TRAITS, TIERS, TYPE_TRAIT, SPECIAL_NAMES } from '../lib/art';
import { explorerAddr, MAINNET_CHAIN_ID, TESTNET_CHAIN_ID, usd, num } from '../lib/format';
import { href } from '../lib/router';
import type { Stats } from '../lib/types';
import { Page } from '../components/Page';
import { AddressRow, Code } from '../components/Copy';

const NETWORKS: Record<number, { name: string; rpc: string; explorer: string }> = {
  [MAINNET_CHAIN_ID]: { name: 'Robinhood Chain', rpc: 'https://rpc.mainnet.chain.robinhood.com', explorer: 'https://robinhoodchain.blockscout.com' },
  [TESTNET_CHAIN_ID]: { name: 'Robinhood Chain Testnet', rpc: 'https://rpc.testnet.chain.robinhood.com', explorer: 'https://explorer.testnet.chain.robinhood.com' },
};

const SECTIONS = [
  ['overview', 'Overview'], ['rules', 'Rules'], ['detection', 'How buys are detected'], ['founders', 'Founding Resident'],
  ['art', 'On-chain art'], ['fees', 'Creator fees'], ['contracts', 'Contracts'], ['api', 'API reference'], ['verify', 'Verify it yourself'],
] as const;

const J = (v: unknown) => JSON.stringify(v, null, 2);
const ENDPOINTS: { path: string; desc: string; example: unknown }[] = [
  { path: '/api/stats', desc: 'Headline numbers and addresses.', example: { chainId: 46630, token: '0x4f31…5d93', poons: '0x795d…93B3', ponsUrl: 'https://www.ponsfamily.com/launchpad/0x4f31…', maxSupply: 3333, minBuyUsd: 10, minted: 4, queued: 0, belowMin: 2, soldOut: false, updatedAt: 1790350507 } },
  { path: '/api/stats/overview', desc: 'Totals for the Stats page. Times are unix seconds.', example: { uniqueBuyers: 6, buys: 8, buyVolumeUsd: 97.92, sellVolumeUsd: 19.81, founders: 4, minted: 4, maxSupply: 3333, firstDropAt: 1790349801, lastDropAt: 1790349808, dropLatencySec: { p50: 1, p90: 1, max: 1, samples: 4 } } },
  { path: '/api/stats/series?bucket=10m|hour|day', desc: 'Activity per time bucket, oldest first. Empty buckets are omitted.', example: { bucket: 3600, series: [{ t: 1790348400, buys: 8, qualifyingBuys: 5, buyers: 6, volumeUsd: 97.92, sells: 2, sellUsd: 19.81, drops: 4, mintedTotal: 4 }] } },
  { path: '/api/stats/buy-sizes', desc: 'Histogram of single buys by USD size. `to: null` is open-ended.', example: { minBuyUsd: 10, buckets: [{ from: 5, to: 10, buys: 3 }, { from: 10, to: 25, buys: 5 }, { from: 1000, to: null, buys: 0 }] } },
  { path: '/api/seeds', desc: 'Every minted token as [tokenId, seed]. Feed the seeds to the art engine for distributions.', example: { seeds: [[1, '0x9e15…3752'], [2, '0xe121…3ae4']] } },
  { path: '/api/recent?limit=24', desc: 'Latest drops, newest first.', example: { drops: [{ tokenId: 4, to: '0xed75…ec25', seed: '0xc088…d956', tx: '0x8f2f…554c', time: 1790343970 }] } },
  { path: '/api/tokens?offset=0&limit=48', desc: 'Paged list of minted tokens, newest first.', example: { total: 4, tokens: [{ tokenId: 4, to: '0xed75…ec25', seed: '0xc088…d956', tx: '0x8f2f…554c', time: 1790343970 }] } },
  { path: '/api/wallet/:address', desc: "A wallet's status: none, below_min, queued (drop tx being sent) or minted.", example: { address: '0xed75…ec25', status: 'minted', bestBuyUsd: 20.4, qualifiedAt: 1790343969, tokenId: 4, seed: '0xc088…d956', tx: '0x8f2f…554c' } },
  { path: '/api/health', desc: 'Indexer health: how far behind the chain head it is.', example: { ok: true, lagBlocks: 0, head: 124175431, cursor: 124175431, lastError: null, rescans: 0, recoveredTrades: 0 } },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="doc" id={`doc-${id}`} aria-labelledby={`doc-${id}-h`}>
      <h2 id={`doc-${id}-h`}>
        <a className="doc__anchor" href={href('docs', id)} aria-label={`Link to ${title}`}>#</a>{title}
      </h2>
      {children}
    </section>
  );
}

export function DocsPage({ stats, sub }: { stats: Stats | undefined; sub: string | null }) {
  const minBuy = usd(stats?.minBuyUsd ?? 10);
  const max = num(stats?.maxSupply ?? 3333);
  const net = stats ? NETWORKS[stats.chainId] : undefined;
  const poons = stats?.poons ?? '<POONS_ADDRESS>';
  const rpc = net?.rpc ?? '<RPC_URL>';
  const specials = TYPE_TRAIT >= 0 ? TRAITS[TYPE_TRAIT].opts.map((o) => o[0]).filter((n) => SPECIAL_NAMES.has(n)) : [];

  const nav = (
    <ul>
      {SECTIONS.map(([id, label]) => <li key={id}><a href={href('docs', id)} aria-current={sub === id ? 'location' : undefined}>{label}</a></li>)}
    </ul>
  );

  return (
    <Page eyebrow="Docs" title="How Poons works" sub="Rules, mechanics, contracts and the public API.">
      <div className="docs">
        <aside className="docs__nav" aria-label="Docs sections">
          <details className="docs__toc">
            <summary>On this page</summary>
            <nav>{nav}</nav>
          </details>
          <nav className="docs__toc-desktop">{nav}</nav>
        </aside>
        <div className="docs__body">
          <Section id="overview" title="Overview">
            <p>Poons is a free NFT collection of {max} fully on-chain 32×32 pixel characters (felt creatures with a house for a head) on Robinhood Chain. Any wallet that makes one market buy of at least {minBuy} of the project's token on the Pons launchpad gets exactly one Poon, dropped automatically within seconds. There is no mint page and no mint price.</p>
          </Section>

          <Section id="rules" title="Rules">
            <ul className="doc-list">
              <li>One buy of {minBuy} or more earns one Poon. Smaller buys don't count and don't add up.</li>
              <li>One Poon per wallet, ever. Buying more changes nothing.</li>
              <li>Only market buys count. Tokens received by transfer don't qualify.</li>
              <li>No holding requirement. Buy and sell the token whenever you like; your Poon stays yours.</li>
              <li>Supply is capped at {max}. When it's reached, drops stop.</li>
            </ul>
          </Section>

          <Section id="detection" title="How buys are detected">
            <ul className="doc-list">
              <li><strong>Single buy, {minBuy}+.</strong> The indexer reads every trade of the token on Pons and values each buy in USD at the time of the trade.</li>
              <li><strong>Market buys only.</strong> Only buys from the Pons market qualify. Transfers in, airdrops and other movements are ignored.</li>
              <li><strong>First come, first served.</strong> Qualifying wallets enter a queue in the order their buys landed on-chain and are dropped in batches.</li>
              <li><strong>Fast.</strong> A Poon typically lands about 1–2 seconds after the buy. Live latency is on the <a href={href('stats')}>Stats</a> page.</li>
              <li><strong>Re-scan safety.</strong> The indexer re-scans recent blocks so trades missed during an RPC hiccup are recovered. The contract skips wallets that already have a Poon, so a retry can never double-mint.</li>
            </ul>
          </Section>

          <Section id="founders" title="Founding Resident">
            <p>If your qualifying buy happened on the Pons bonding curve, before the token graduated, your Poon is a <strong>Founding Resident</strong>. The flag is stored in bit 255 of the seed. Traits only read the low bits, so the flag doesn't change a Poon's traits; the renderer adds a small gold star to the art, and the metadata lists it as a Status trait.</p>
          </Section>

          <Section id="art" title="On-chain art">
            <ul className="doc-list">
              <li><strong>Seed.</strong> Each Poon gets a 256-bit seed at drop time, derived from the wallet and the previous block hash, so it can't be steered by reordering a batch.</li>
              <li><strong>Seed → traits.</strong> The seed decides {TRAITS.length} traits ({TRAITS.map((t) => t.key).join(', ')}) using weighted odds. See <a href={href('rarity')}>Rarity</a>.</li>
              <li><strong>Tiers.</strong> Each Poon scores into one of {TIERS.length} tiers: {TIERS.join(', ')}.</li>
              {specials.length > 0 && <li><strong>Special types.</strong> {specials.join(', ')}: rare full-body variants, always Legendary.</li>}
              <li><strong>Renderer.</strong> A renderer contract composes the 32×32 image from the seed and returns <code>tokenURI</code> as a base64 JSON data URI with the SVG inside. Nothing is stored off-chain: no IPFS, no server.</li>
            </ul>
          </Section>

          <Section id="fees" title="Creator fees">
            <ul className="doc-list">
              <li>Secondary sales pay a 5% creator fee, declared with ERC-2981.</li>
              <li>The fee is enforced with ERC721-C through OpenSea's transfer validator. Marketplaces that don't enforce creator fees can't move Poons.</li>
              <li>Plain wallet-to-wallet transfers are free.</li>
            </ul>
          </Section>

          <Section id="contracts" title="Contracts">
            {stats ? (
              <dl className="addr-list">
                <div className="addr-row"><dt>Network</dt><dd>{net ? `${net.name} (chain ID ${stats.chainId})` : `Chain ID ${stats.chainId}`}</dd></div>
                <AddressRow label="Poons (ERC-721)" value={stats.poons} link={explorerAddr(stats.chainId, stats.poons)} />
                <AddressRow label="Token" value={stats.token} link={explorerAddr(stats.chainId, stats.token)} />
                {net && <AddressRow label="Public RPC" value={net.rpc} />}
              </dl>
            ) : <p className="dim">Loading addresses…</p>}
          </Section>

          <Section id="api" title="API reference">
            <p>All endpoints are <code>GET</code>, return JSON and allow cross-origin requests. Base URL: <code className="mono">{API_URL}</code>. Addresses and hashes are shortened in the examples.</p>
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="endpoint">
                <h3><span className="method">GET</span> <code>{e.path}</code></h3>
                <p>{e.desc}</p>
                <Code lang="json">{J(e.example)}</Code>
              </div>
            ))}
          </Section>

          <Section id="verify" title="Verify it yourself">
            <p>Everything on this site can be checked against the contract. With Foundry's <code>cast</code>:</p>
            <Code lang="shell">{`# Seed of token #1 (bit 255 set = Founding Resident)
cast call ${poons} "seedOf(uint256)(uint256)" 1 --rpc-url ${rpc}

# Which token a wallet received (0 = none)
cast call ${poons} "dropOf(address)(uint256)" <WALLET> --rpc-url ${rpc}

# Full metadata + SVG, decoded
cast call ${poons} "tokenURI(uint256)(string)" 1 --rpc-url ${rpc} \\
  | sed 's/^data:application\\/json;base64,//' | base64 -d`}</Code>
            <p>No terminal? Open the Poons contract on the {stats ? <a href={explorerAddr(stats.chainId, stats.poons)} target="_blank" rel="noopener noreferrer">block explorer</a> : 'block explorer'}, go to <em>Read contract</em>, and call <code>seedOf</code>, <code>dropOf</code> or <code>tokenURI</code>. Paste a <code>tokenURI</code> result into your browser's address bar to see the metadata.</p>
          </Section>
        </div>
      </div>
    </Page>
  );
}
