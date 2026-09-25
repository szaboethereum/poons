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
# 1. fund MINTER_ADDRESS with testnet ETH; NETWORK=testnet in .env
cd contracts && ./deploy.sh testnet        # writes *_TESTNET addresses into ../.env (mint starts CLOSED)
cd ../indexer && npm install && npm start  # watcher + minter + API on :8788
npm run simulate                           # 7 scenarios, one per rule (other terminal)
cast send $POONS_TESTNET 'setMintOpen(bool)' true --private-key $MINTER_KEY --rpc-url <testnet rpc>
npm run simulate -- check                  # queued wallets get their Poons within ~1 min of opening
cd ../web && npm install && npm run dev    # http://localhost:5173
```

## Mainnet
Config lives in the `*_MAINNET` block of `.env`; set `NETWORK=mainnet`. Every script refuses to run if the RPC
isn't chain 4663.
1. Fund `MINTER_ADDRESS` with a little ETH (deploy + drop gas). The deployer owns the contract and receives creator fees.
2. `cd contracts && CONFIRM_MAINNET=yes ./deploy.sh mainnet` — minting starts **closed**.
3. Launch the token on ponsfamily.com; put its address in `TOKEN_MAINNET` and its launch block in `START_BLOCK_MAINNET`.
4. `cd indexer && DRY_RUN=1 npm start` to watch it decide, then `npm start`. Qualifying buys queue up while minting is closed.
5. Open minting: `cast send $POONS_MAINNET 'setMintOpen(bool)' true --private-key $MINTER_KEY --rpc-url <mainnet rpc>`.
6. Watch `GET /api/health` (lag, last error, RPC calls per minute).
