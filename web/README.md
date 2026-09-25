# Poons web

Public site for Poons: hero, how it works, wallet checker, live drops, gallery, rarity and FAQ.
Vite + React + TypeScript, hand-written CSS, no UI or wallet libraries.

## Run

```sh
cd web
npm install
cp .env.example .env   # optional, only needed if the indexer isn't on localhost:8788
npm run dev            # http://localhost:5173
npm run build          # type-check + production build into dist/
npm run preview        # serve dist/ locally
```

## Environment

| Variable       | Default                 | What it does                                    |
| -------------- | ----------------------- | ----------------------------------------------- |
| `VITE_API_URL` | `http://localhost:8788` | Base URL of the indexer API (no trailing slash). |

The indexer has to send CORS headers (`Access-Control-Allow-Origin`) for the site's origin, because the
browser calls it directly.

If the API can't be reached (network error or timeout), the site switches to **demo data** and shows a
"Demo data — indexer offline" banner. HTTP errors from a running indexer are shown as errors, not
replaced with demo data. In demo mode the last hex digit of a wallet address picks the scenario:
`0–1` queued (becomes minted a few seconds later), `2–5` minted, `6–8` under the minimum, `9` and
`a–f` no buy.

## Art

The site doesn't reimplement the art. `src/lib/art.ts` imports the shared engine at `../art/poons-art.js`
(Vite's `server.fs.allow` includes the repo root) and renders every Poon from its seed. Traits, the
special "Type" trait, and `rarity()` are read from the engine at runtime, so new traits or options show up
without code changes. If the engine has no `rarity()` or no Type trait, the related filters and
badges are hidden.

## Layout

```
src/
  main.tsx, App.tsx, styles.css      entry, page composition, design tokens + styles
  lib/api.ts                         typed API client + demo-mode fallback
  lib/demo.ts                        demo data generator
  lib/types.ts                       API response types
  lib/art.ts                         typed wrapper around the art engine
  lib/format.ts                      addresses, time, currency, explorer links
  lib/wallet.ts                      injected EIP-1193 wallet access
  hooks/                             polling, clock, reduced motion, demo flag
  components/                        one file per section, plus Poon, TierBadge, PoonDetail
```
