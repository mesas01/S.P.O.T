#!/usr/bin/env bash
#
# run-integration.sh — Full integration test pipeline:
#   1. Deploy fresh contract to testnet
#   2. Wipe and re-migrate DB
#   3. Wait for backend to be healthy
#   4. Run integration tests
#
# Usage:  cd backend && bash scripts/run-integration.sh
#
# Prerequisites: same as reset-testnet.sh
#   - Docker running with commitspre-scaffold-1, commitspre-backend-1, postgres
#   - ADMIN_SECRET funded on testnet in .env
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"
BACKEND_CONTAINER="commitspre-backend-1"

echo "============================================"
echo "  SPOT Integration Test Pipeline"
echo "============================================"
echo ""

# -----------------------------------------------
# Step 1: Reset testnet (deploy contract + wipe DB)
# -----------------------------------------------
echo "==> Phase 1: Deploying fresh contract + resetting DB..."
echo ""
bash "$SCRIPT_DIR/reset-testnet.sh"
echo ""

# -----------------------------------------------
# Step 2: Wait for backend container to be healthy
# -----------------------------------------------
echo "==> Phase 2: Waiting for backend to be healthy..."
MAX_WAIT=60
for i in $(seq 1 $MAX_WAIT); do
  if docker exec "$BACKEND_CONTAINER" node -e "
    fetch('http://localhost:4000/health')
      .then(r => r.json())
      .then(j => { if (j.status === 'ok') process.exit(0); else process.exit(1); })
      .catch(() => process.exit(1))
  " 2>/dev/null; then
    echo "    Backend healthy after ${i}s"
    break
  fi
  if [ "$i" -eq "$MAX_WAIT" ]; then
    echo "ERROR: Backend did not become healthy after ${MAX_WAIT}s"
    exit 1
  fi
  sleep 1
done
echo ""

# -----------------------------------------------
# Step 3: Generate a random claimer address
# -----------------------------------------------
echo "==> Phase 3: Generating test claimer address..."
CLAIMER_ADDRESS=$(docker exec "$BACKEND_CONTAINER" node -e "
  import('@stellar/stellar-sdk').then(m => console.log(m.Keypair.random().publicKey()))
")
echo "    Claimer: $CLAIMER_ADDRESS"
echo ""

# -----------------------------------------------
# Step 4: Run integration tests
# -----------------------------------------------
echo "==> Phase 4: Running integration tests..."
echo "============================================"
echo ""

docker exec \
  -e RUN_INTEGRATION_TESTS=true \
  -e INTEGRATION_CLAIMER_ADDRESS="$CLAIMER_ADDRESS" \
  "$BACKEND_CONTAINER" \
  npx cross-env \
    NODE_ENV=test \
    RUN_INTEGRATION_TESTS=true \
    INTEGRATION_CLAIMER_ADDRESS="$CLAIMER_ADDRESS" \
    LOG_FILE=./logs/backend.integration.log \
    node --test --test-concurrency 1 "./test/integration/*.test.js"

EXIT_CODE=$?

echo ""
echo "============================================"
if [ $EXIT_CODE -eq 0 ]; then
  echo "  All integration tests passed!"
else
  echo "  Integration tests failed (exit code $EXIT_CODE)"
fi
echo "============================================"

exit $EXIT_CODE
