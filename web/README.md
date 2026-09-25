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

## Routes

Hash routing, so any static host works: `#/` Home · `#/check` · `#/drops` · `#/gallery` · `#/rarity` ·
`#/stats` · `#/roadmap` · `#/docs` (sections at `#/docs/<id>`, e.g. `#/docs/api`) · `#/faq`.
Old single-page anchors (`#wallet`, `#gallery`…) still resolve.

The Stats page uses `/api/stats/overview`, `/api/stats/series`, `/api/stats/buy-sizes`, `/api/seeds` and
`/api/health`; minted-vs-expected distributions are computed client-side from the seeds with the art
engine. Charts are hand-built SVG (no chart library). Demo mode generates ~2 days of fake activity
(a few hundred mints, the first ~38% Founding Residents) so every chart can be reviewed offline, e.g.
`VITE_API_URL=http://127.0.0.1:9 npm run dev`.

## Brand

`public/logo.png` and `public/pfp.png` are copied from `brand/`. `src/components/Logo.tsx` is the same
wordmark traced 1:1 from `logo.png` (42×9 cells) as inline SVG, so the ink follows the light/dark theme.

## Layout

```
src/
  main.tsx, App.tsx, styles.css      entry, route switch, design tokens + styles
  lib/router.ts                      hash router, route titles, scroll/focus on navigation
  lib/api.ts, lib/demo.ts            typed API client + demo-mode dataset
  lib/types.ts                       API response types
  lib/art.ts                         typed wrapper around the art engine (+ founder, expected tiers)
  lib/chart.ts                       scales, ticks, number/time formatting for charts
  lib/format.ts, lib/wallet.ts       formatting, explorer links, injected EIP-1193 wallet
  hooks/                             polling, clock, element width, reduced motion, demo flag
  pages/                             Home, Stats, Roadmap, Docs
  components/                        Header, Page shell, Logo, Poon, badges, wallet checker, drops,
                                     gallery, rarity, FAQ, detail dialog; stats/ holds the charts
```
