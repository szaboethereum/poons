#!/usr/bin/env bash
# Usage: ./deploy.sh testnet            deploy MockPons + renderer + Poons (mint closed) to testnet
#        CONFIRM_MAINNET=yes ./deploy.sh mainnet   deploy renderer + Poons (mint closed) to mainnet
# Reads ../.env, checks the RPC really is the requested network, then writes <KEY>_<NETWORK>
# addresses and START_BLOCK_<NETWORK> back into ../.env.
set -euo pipefail
cd "$(dirname "$0")"
NET="${1:?testnet or mainnet}"
set -a; source ../.env; set +a
case "$NET" in
  testnet) SCRIPT=script/DeployTestnet.s.sol:DeployTestnet; RPCS="$RPC_URLS_TESTNET"; WANT=46630 ;;
  mainnet) SCRIPT=script/Deploy.s.sol:Deploy; RPCS="$RPC_URLS_MAINNET"; WANT=4663
           [ "${CONFIRM_MAINNET:-}" = yes ] || { echo "Refusing: mainnet deploy needs CONFIRM_MAINNET=yes"; exit 1; } ;;
  *) echo "network must be testnet or mainnet"; exit 1 ;;
esac
SUFFIX=$(echo "$NET" | tr a-z A-Z)
# The deployer signs and becomes owner; MINTER_ROLE goes to the network's minter hot wallet.
eval "MINTER_ADDRESS=\${MINTER_ADDRESS_${SUFFIX}:-}"
[ -n "$MINTER_ADDRESS" ] || { echo "Refusing: MINTER_ADDRESS_${SUFFIX} is not set"; exit 1; }
export MINTER_ADDRESS
RPC="${RPCS%%,*}"
GOT=$(cast chain-id --rpc-url "$RPC")
[ "$GOT" = "$WANT" ] || { echo "Refusing: RPC_URLS_${SUFFIX} is chain $GOT, expected $WANT"; exit 1; }
echo "Deploying to $NET (chain $GOT): owner $DEPLOYER_ADDRESS (balance $(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC" --ether) ETH), minter $MINTER_ADDRESS"

OUT=$(forge script "$SCRIPT" --rpc-url "$RPC" --private-key "$DEPLOYER_KEY" --broadcast --slow 2>&1) || { echo "$OUT" | tail -5; exit 1; }
echo "$OUT" | grep -E "^ *(CURVE|TOKEN|POONS|RENDERER)=" | sed 's/^ *//' | tee /tmp/poons-deploy.env
BLOCK=$(cast block-number --rpc-url "$RPC")
while IFS='=' read -r k v; do
  key="${k}_${SUFFIX}"
  if grep -q "^$key=" ../.env; then sed -i '' "s|^$key=.*|$key=$v|" ../.env; else echo "$key=$v" >> ../.env; fi
done < /tmp/poons-deploy.env
sed -i '' "s|^START_BLOCK_${SUFFIX}=.*|START_BLOCK_${SUFFIX}=$BLOCK|" ../.env
echo "START_BLOCK_${SUFFIX}=$BLOCK written to ../.env. Minting is CLOSED; open it with:"
echo "  cast send \$POONS_${SUFFIX} 'setMintOpen(bool)' true --private-key \$DEPLOYER_KEY --rpc-url \${RPC_URLS_${SUFFIX}%%,*}"
