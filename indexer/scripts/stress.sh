#!/usr/bin/env bash
# Local pump simulation: anvil (1 s blocks, many txs per block) + deploy + indexer/minter + 3,600 buyers.
# Nothing touches a public network. Usage: ./scripts/stress.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=$(mktemp -d)
KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil's well-known dev key #0
ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
cleanup() { kill "${INDEXER:-}" "${ANVIL:-}" 2>/dev/null || true; }
trap cleanup EXIT

anvil --block-time 1 --gas-limit 300000000 --silent > "$DIR/anvil.log" 2>&1 & ANVIL=$!
for i in $(seq 1 30); do cast chain-id --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1 && break; sleep 0.5; done

OUT=$(cd ../contracts && MINTER_ADDRESS=$ADDR forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url http://127.0.0.1:8545 --private-key $KEY --broadcast 2>&1)
val() { echo "$OUT" | grep -E "^ *$1=" | sed 's/.*=//'; }
export CURVE_LOCAL=$(val CURVE) TOKEN_LOCAL=$(val TOKEN) POONS_LOCAL=$(val POONS)
cast send "$POONS_LOCAL" 'setMintOpen(bool)' true --private-key $KEY --rpc-url http://127.0.0.1:8545 >/dev/null
echo "deployed: poons $POONS_LOCAL, mint open"

export NETWORK=local MINTER_KEY=$KEY RPC_URLS_LOCAL=http://127.0.0.1:8545 WS_URL_LOCAL=ws://127.0.0.1:8545 \
  START_BLOCK_LOCAL=0 ETH_USD_LOCAL=100000 DB="$DIR/stress.db" API_PORT=8799 MIN_BUY_USD=10 MAX_SUPPLY=3333
node --disable-warning=ExperimentalWarning src/main.ts > "$DIR/indexer.log" 2>&1 & INDEXER=$!
for i in $(seq 1 30); do curl -s -m 1 localhost:8799/api/health >/dev/null && break; sleep 0.5; done

node --disable-warning=ExperimentalWarning scripts/stress.ts || { echo "--- indexer log tail"; tail -20 "$DIR/indexer.log"; exit 1; }
echo "--- minter batches"; grep -c "\[mint\] [0-9]* Poon" "$DIR/indexer.log" || true
grep -E "\[mint\] (max supply|[0-9]+ Poon)" "$DIR/indexer.log" | awk '{s+=$2} END {print "Poons in batches:", s}'
grep -iE "error" "$DIR/indexer.log" | sort | uniq -c | head -5 || true
