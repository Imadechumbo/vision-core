#!/usr/bin/env bash
# _test108_endpoint_smoke.sh — §108 smoke test: sobe backend real em porta de teste
# Confirma "ok":true nos 5 endpoints + campos-chave do /api/metrics/memory

set -euo pipefail

PORT=4498
BACKEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo ""
echo "=== §108 endpoint smoke test ==="
echo ""

# Sobe backend
cd "$(dirname "$0")/backend"
PORT=$PORT node server.js >/dev/null 2>&1 &
BACKEND_PID=$!
echo "Backend PID=$BACKEND_PID, aguardando 1.5s..."
sleep 1.5

BASE="http://localhost:$PORT"
PASS=0
FAIL=0

check() {
  local label="$1"
  local url="$2"
  local pattern="$3"
  local body
  body=$(curl -sf --max-time 8 "$url" 2>&1 || echo "CURL_FAIL")
  if echo "$body" | grep -q "$pattern"; then
    echo "  ✅ $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $label"
    echo "     URL: $url"
    echo "     Pattern esperado: $pattern"
    echo "     Resposta: ${body:0:300}"
    FAIL=$((FAIL + 1))
  fi
}

check "health ok"                     "$BASE/api/health"            '"ok":true'
check "metrics/agents ok"             "$BASE/api/metrics/agents"    '"ok":true'
check "metrics/summary ok"            "$BASE/api/metrics/summary"   '"ok":true'
check "dora-metrics ok"               "$BASE/api/dora-metrics"      '"ok":true'
check "metrics/memory ok"             "$BASE/api/metrics/memory"    '"ok":true'
check "metrics/memory total_escalations" "$BASE/api/metrics/memory" '"total_escalations"'
check "metrics/memory by_provider"    "$BASE/api/metrics/memory"    '"by_provider"'
check "metrics/memory memory_capable" "$BASE/api/metrics/memory"    '"memory_capable_entries"'
check "metrics/memory data_source"    "$BASE/api/metrics/memory"    '"data_source"'
check "metrics/memory anti_stub"      "$BASE/api/metrics/memory"    '"anti_stub":true'

echo ""
echo "─────────────────────────────────────────"
echo "_test108_endpoint_smoke: $PASS/$((PASS + FAIL)) PASS"
if [ "$FAIL" -gt 0 ]; then
  echo "$FAIL teste(s) falharam."
  exit 1
fi
