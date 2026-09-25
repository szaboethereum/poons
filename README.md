# Poons

Free, fully on-chain 32×32 pixel NFTs on Robinhood Chain. A wallet that buys at least **$10** of the
project token in a **single buy** on the Pons launchpad gets exactly **one** Poon, airdropped within
seconds. One per wallet, ever. 3,333 max. Holders can trade freely; selling never affects a Poon.

Secondary sales pay a **5% creator fee** to the contract owner (the deployer): ERC2981 plus ERC721-C
with OpenSea's transfer validator, so the fee is enforced on OpenSea. Plain wallet-to-wallet transfers
are never restricted.

| Folder | What |
| --- | --- |
| `art/` | Reference art engine (`poons-art.js`), Solidity data export, parity + rarity calibration scripts |
| `contracts/` | `Poons` (ERC721, one-per-wallet `drop`), `PoonsRenderer` (on-chain SVG + JSON), testnet `MockPons` |
| `indexer/` | Buy watcher → eligibility ledger → minter, plus the read API for the site (Node 24, no build step) |
| `web/` | Public site (Vite + React) |
| `docs/` | Design page (`page.template.html` + inlined art engine → `poons.html`) |

Clone with submodules (Foundry libraries): `git clone --recursive …`, or `git submodule update --init` after cloning.

Secrets and config live in one file: `.env` at the repo root (see `.env.example`). Never commit it.

## Contract checks
```sh
cd contracts && forge test && forge build --sizes      # every contract must stay under 24 KB
forge test --match-path "test/fork/*" --fork-url https://rpc.mainnet.chain.robinhood.com   # real OpenSea validator
```

## Changing the art
```sh
node art/export-sol.js                      # regenerate contracts/src/PoonsData.sol
node art/rarity-calibrate.js                # if weights changed: update TIER_MIN in poons-art.js, re-export
cd contracts && forge test && cd ..
NODE_PATH=indexer/node_modules node art/parity.js   # chain SVG/rarity == JS, 96 seeds incl. specials
```

## Testnet run (Robinhood Chain testnet, chainId 46630)
Pons is not deployed on testnet, so `DeployTestnet` also deploys `MockPonsCurve` + token, which emit the
exact same events as the real Pons curve.
```sh
# 1. fund MINTER_ADDRESS from .env with testnet ETH (faucet)
cd contracts && ./deploy.sh testnet        # writes CURVE, TOKEN, POONS, START_BLOCK into ../.env
cd ../indexer && npm install && npm start  # watcher + minter + API on :8788
npm run simulate                           # 7 scenarios, one per rule (other terminal)
npm run simulate -- check                  # a few seconds later: PASS/FAIL per rule
cd ../web && npm install && npm run dev    # http://localhost:5173
```
Testnet ETH has no price, so `.env` pins `ETH_USD=100000` (a $10 test buy = 0.0001 ETH). Remove it on mainnet.

## Mainnet
1. Put the paid RPC first in `RPC_URLS` (public one as fallback) and remove `ETH_USD`. The deployer wallet
   owns the contract and receives creator fees.
2. `cd contracts && ./deploy.sh mainnet` — deploy **before** launching the token, so `START_BLOCK` precedes the launch.
3. Launch the token on ponsfamily.com, then set `TOKEN=` and `NETWORK=mainnet` in `.env`.
4. `cd indexer && DRY_RUN=1 npm start` to watch it decide, then `npm start` for real.
5. Watch `GET /api/health` (lag, last error, trades recovered by the re-scan).
