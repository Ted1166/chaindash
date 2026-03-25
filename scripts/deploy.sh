#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ChainDash — Contract Deployment Script
# Publishes the Move package to testnet and writes .env to the client.
#
# Prerequisites:
#   - sui CLI installed (cargo install sui  OR  brew install sui)
#   - sui client configured and pointing at testnet
#   - Active account has enough SUI for gas (run: sui client faucet)
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
CLIENT_DIR="$(cd "$(dirname "$0")/../client" && pwd)"

echo "───────────────────────────────────────"
echo " ChainDash Contract Deployment"
echo "───────────────────────────────────────"

# ── 1. Build ──────────────────────────────────────────────────────────────────
echo ""
echo "▶ Building Move package…"
cd "$CONTRACTS_DIR"
sui move build

# ── 2. Publish ────────────────────────────────────────────────────────────────
echo ""
echo "▶ Publishing to testnet…"
PUBLISH_OUTPUT=$(sui client publish \
  --gas-budget 200000000 \
  --json 2>&1)

echo "$PUBLISH_OUTPUT" | head -20

# ── 3. Extract key object IDs from JSON output ────────────────────────────────
echo ""
echo "▶ Extracting object IDs…"

PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for change in data.get('objectChanges', []):
    if change.get('type') == 'published':
        print(change['packageId'])
        break
")

LEADERBOARD_ID=$(echo "$PUBLISH_OUTPUT" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for change in data.get('objectChanges', []):
    f = change.get('objectType', '')
    owner = change.get('owner', {})
    if '::leaderboard::Leaderboard' in f and isinstance(owner, dict) and 'Shared' in owner:
        print(change['objectId'])
        break
")

PRIZE_POOL_ID=$(echo "$PUBLISH_OUTPUT" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for change in data.get('objectChanges', []):
    f = change.get('objectType', '')
    owner = change.get('owner', {})
    if '::prize_pool::PrizePool' in f and isinstance(owner, dict) and 'Shared' in owner:
        print(change['objectId'])
        break
")

# ── 4. Validate ───────────────────────────────────────────────────────────────
if [[ -z "$PACKAGE_ID" || -z "$LEADERBOARD_ID" || -z "$PRIZE_POOL_ID" ]]; then
  echo ""
  echo "✗ Could not extract one or more object IDs."
  echo "  Check the full publish output above."
  exit 1
fi

echo "  Package ID    : $PACKAGE_ID"
echo "  Leaderboard   : $LEADERBOARD_ID"
echo "  Prize Pool    : $PRIZE_POOL_ID"

# ── 5. Write .env to client ───────────────────────────────────────────────────
ENV_FILE="$CLIENT_DIR/.env"
cat > "$ENV_FILE" <<EOF
VITE_PACKAGE_ID=$PACKAGE_ID
VITE_LEADERBOARD_ID=$LEADERBOARD_ID
VITE_PRIZE_POOL_ID=$PRIZE_POOL_ID
VITE_NETWORK=testnet
EOF

echo ""
echo "✓ Written to $ENV_FILE"

# ── 6. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "───────────────────────────────────────"
echo " Deployment complete!"
echo "───────────────────────────────────────"
echo ""
echo " Next steps:"
echo "   cd client && npm install && npm run dev"
echo "   cd ai-engine && pip install -r requirements.txt && uvicorn main:app --reload"
echo ""
