#!/usr/bin/env bash
# run.sh — one-command runner for the PrimeDrop flash-sale load test
#
# Standard (~50k requests, Upstash-safe):
#   ./loadtest/run.sh
#
# Full (~100k requests, local Redis required):
#   FULL_TEST=true ./loadtest/run.sh
#
# Custom target:
#   BASE_URL=http://staging:3001 ./loadtest/run.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
FULL_TEST="${FULL_TEST:-}"
REDIS_URL="${REDIS_URL:-}"

# ---------------------------------------------------------------------------
# 1. Detect Redis mode and warn if needed
# ---------------------------------------------------------------------------
REDIS_MODE="upstash"
if [[ -n "$REDIS_URL" ]]; then
  REDIS_MODE="local"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         ⚡ PrimeDrop Flash-Sale Load Test — Starting         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [[ "$REDIS_MODE" == "upstash" ]]; then
  echo "  ┌─────────────────────────────────────────────────────────┐"
  echo "  │  ⚠️  WARNING: REDIS_URL is not set to a local instance  │"
  echo "  │                                                         │"
  echo "  │  Your backend is pointing at Upstash (free tier):       │"
  echo "  │    • ~100 req/s sustained limit                         │"
  echo "  │    • ~10,000 commands/day cap                           │"
  echo "  │                                                         │"
  echo "  │  For accurate load testing, restart the backend with:   │"
  echo "  │    REDIS_URL=redis://localhost:6379 npm run dev \\       │"
  echo "  │      --prefix backend                                   │"
  echo "  │                                                         │"
  echo "  │  Then re-run:  FULL_TEST=true ./loadtest/run.sh         │"
  echo "  └─────────────────────────────────────────────────────────┘"
  echo ""
fi

if [[ "$FULL_TEST" == "true" && "$REDIS_MODE" != "local" ]]; then
  echo "  ERROR: FULL_TEST=true requires local Redis."
  echo "  Set REDIS_URL=redis://localhost:6379 when starting the backend,"
  echo "  then re-run this script."
  echo ""
  exit 1
fi

TEST_PROFILE="Standard (~50k requests · peak 300 VUs · 150 s)"
if [[ "$FULL_TEST" == "true" ]]; then
  TEST_PROFILE="Full    (~100k requests · peak 1,000 VUs · 210 s)"
fi

echo "  Target  : ${BASE_URL:-http://host.docker.internal:3001}"
echo "  Profile : $TEST_PROFILE"
echo "  Redis   : $REDIS_MODE"
echo "  Results : $RESULTS_DIR"
echo ""

# ---------------------------------------------------------------------------
# 2. Ensure results directory exists
# ---------------------------------------------------------------------------
mkdir -p "$RESULTS_DIR"

# ---------------------------------------------------------------------------
# 3. Write test config so the report generator knows Redis mode and target
# ---------------------------------------------------------------------------
TARGET_REQS=50000
if [[ "$FULL_TEST" == "true" ]]; then TARGET_REQS=100000; fi

cat > "$RESULTS_DIR/test-config.json" <<EOF
{
  "redisMode": "$REDIS_MODE",
  "fullTest": ${FULL_TEST:-false},
  "targetRequests": $TARGET_REQS
}
EOF

# ---------------------------------------------------------------------------
# 4. Run k6 via Docker Compose (local Redis service starts automatically)
# ---------------------------------------------------------------------------
docker compose -f "$SCRIPT_DIR/docker-compose.yml" run --rm k6 \
  2>&1 | tee "$RESULTS_DIR/run.log"

# ---------------------------------------------------------------------------
# 5. Tear down local Redis
# ---------------------------------------------------------------------------
docker compose -f "$SCRIPT_DIR/docker-compose.yml" down --volumes 2>/dev/null || true

echo ""
echo "  k6 run complete. Generating report..."
echo ""

# ---------------------------------------------------------------------------
# 6. Generate ASCII + Markdown report from summary.json
# ---------------------------------------------------------------------------
if [ ! -f "$RESULTS_DIR/summary.json" ]; then
  echo "  ERROR: $RESULTS_DIR/summary.json not found."
  echo "  The k6 run may have failed before handleSummary() executed."
  exit 1
fi

node "$SCRIPT_DIR/format-report.js"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                         ✅  Done!                                ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  ASCII report : results/LOAD_TEST_REPORT.txt                     ║"
echo "║  Markdown     : results/LOAD_TEST_REPORT.md                      ║"
echo "║  Raw log      : results/run.log                                  ║"
echo "║  k6 summary   : results/summary.json                             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
