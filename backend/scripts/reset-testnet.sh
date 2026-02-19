#!/usr/bin/env bash
#
# reset-testnet.sh — Deploy a fresh poap contract to testnet, wipe DB, update .env
#
# Usage:  cd backend && bash scripts/reset-testnet.sh
#
# Prerequisites:
#   - Docker running with commitspre-scaffold-1 (has compiled poap.wasm)
#   - PostgreSQL accessible (docker-compose dev)
#   - ADMIN_SECRET set in .env (account must be funded on testnet)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"
SCAFFOLD_CONTAINER="commitspre-scaffold-1"
WASM_PATH="/app/target/wasm32v1-none/release/poap.wasm"
DEPLOYER_IMAGE="ubuntu:22.04"
DEPLOYER_NAME="spot-deployer-$$"
STELLAR_CLI_URL="https://github.com/stellar/stellar-cli/releases/download/v25.1.0/stellar-cli-25.1.0-x86_64-unknown-linux-gnu.tar.gz"

# --- Read ADMIN_SECRET from .env ---
ADMIN_SECRET=$(grep -m1 '^ADMIN_SECRET=' "$ENV_FILE" | cut -d= -f2)
if [ -z "$ADMIN_SECRET" ]; then
  echo "ERROR: ADMIN_SECRET not found in $ENV_FILE"
  exit 1
fi

# --- Derive admin public key via Node.js (stellar-sdk is already installed) ---
ADMIN_PUBLIC=$(cd "$BACKEND_DIR" && node -e "
  import('@stellar/stellar-sdk').then(m =>
    console.log(m.Keypair.fromSecret('$ADMIN_SECRET').publicKey())
  )
")
echo "    Admin: $ADMIN_PUBLIC"

# --- Step 1: Copy WASM from scaffold ---
echo "==> Step 1/4: Copying poap.wasm from scaffold container..."
docker cp "$SCAFFOLD_CONTAINER:$WASM_PATH" /tmp/poap.wasm
echo "    OK"

# --- Step 2: Deploy contract via temp Ubuntu container ---
echo "==> Step 2/4: Deploying contract to testnet..."
docker run --rm -d --name "$DEPLOYER_NAME" "$DEPLOYER_IMAGE" sleep 300 >/dev/null
trap "docker rm -f $DEPLOYER_NAME >/dev/null 2>&1" EXIT

# Install stellar CLI
docker exec "$DEPLOYER_NAME" bash -c "
  apt-get update -qq >/dev/null 2>&1
  apt-get install -y -qq curl libdbus-1-3 >/dev/null 2>&1
  curl -fsSL '$STELLAR_CLI_URL' -o /tmp/stellar.tar.gz
  tar xzf /tmp/stellar.tar.gz -C /usr/local/bin/
"

# Copy WASM into container
docker cp /tmp/poap.wasm "$DEPLOYER_NAME:/tmp/poap.wasm"

# Deploy
DEPLOY_OUTPUT=$(docker exec "$DEPLOYER_NAME" bash -c "
  stellar contract deploy \
    --wasm /tmp/poap.wasm \
    --source '$ADMIN_SECRET' \
    --network testnet \
    -- --admin '$ADMIN_PUBLIC'
" 2>&1)

NEW_CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | tail -1)

# Validate contract ID format (starts with C, 56 alphanumeric chars)
if [[ ! "$NEW_CONTRACT_ID" =~ ^C[A-Z0-9]{55}$ ]]; then
  echo "ERROR: Deploy failed. Output:"
  echo "$DEPLOY_OUTPUT"
  exit 1
fi

echo "    New contract: $NEW_CONTRACT_ID"

# --- Step 3: Update .env ---
echo "==> Step 3/4: Updating .env with new contract ID..."
OLD_CONTRACT_ID=$(grep -m1 '^SPOT_CONTRACT_ID=' "$ENV_FILE" | cut -d= -f2)

if [ -n "$OLD_CONTRACT_ID" ]; then
  sed -i "s|$OLD_CONTRACT_ID|$NEW_CONTRACT_ID|g" "$ENV_FILE"
  echo "    $OLD_CONTRACT_ID → $NEW_CONTRACT_ID"
else
  echo "SPOT_CONTRACT_ID=$NEW_CONTRACT_ID" >> "$ENV_FILE"
  echo "    Added SPOT_CONTRACT_ID=$NEW_CONTRACT_ID"
fi

# --- Step 4: Reset database ---
echo "==> Step 4/4: Resetting database..."
BACKEND_CONTAINER="commitspre-backend-1"
docker exec "$BACKEND_CONTAINER" sh -c "npm install --silent 2>/dev/null && npx prisma migrate reset --force --skip-generate" 2>&1 \
  | grep -vE "^(Loaded|Prisma (config|schema)|Datasource|┌|│|└|$)" || true

echo ""
echo "=== Done ==="
echo "  Contract : $NEW_CONTRACT_ID"
echo "  Database : wiped and re-migrated"
echo "  Explorer : https://stellar.expert/explorer/testnet/contract/$NEW_CONTRACT_ID"
