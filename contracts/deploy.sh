#!/usr/bin/env bash
# Usage: ./deploy.sh testnet|mainnet
# Deploys with MINTER_KEY from ../.env and writes the new addresses back into ../.env.
set -euo pipefail
cd "$(dirname "$0")"
NET="${1:?testnet or mainnet}"
set -a; source ../.env; set +a
if [ "$NET" = testnet ]; then SCRIPT=script/DeployTestnet.s.sol:DeployTestnet; else SCRIPT=script/Deploy.s.sol:Deploy; fi
RPC="${RPC_URLS%%,*}"   # first endpoint in .env

OUT=$(forge script "$SCRIPT" --rpc-url "$RPC" --private-key "$MINTER_KEY" --broadcast --slow 2>&1) || { echo "$OUT"; exit 1; }
echo "$OUT" | grep -E "^ *(CURVE|TOKEN|POONS|RENDERER)=" | sed 's/^ *//' | tee /tmp/poons-deploy.env
BLOCK=$(cast block-number --rpc-url "$RPC")
while IFS='=' read -r k v; do
  if grep -q "^$k=" ../.env; then sed -i '' "s|^$k=.*|$k=$v|" ../.env; else echo "$k=$v" >> ../.env; fi
done < /tmp/poons-deploy.env
sed -i '' "s|^START_BLOCK=.*|START_BLOCK=$BLOCK|; s|^NETWORK=.*|NETWORK=$NET|" ../.env
echo "START_BLOCK=$BLOCK written to ../.env"
