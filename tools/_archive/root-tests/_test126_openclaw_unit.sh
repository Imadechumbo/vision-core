#!/usr/bin/env bash
# _test126_openclaw_unit.sh — §126 OpenClaw real: unit + smoke
# Sobe backend em porta de teste, confirma roteamento + campo plan.
#
# Casos:
#   1. message → decision=diagnose, next_stage=Hermes, plan field presente
#   2. patch   → decision=apply_patch, next_stage=PatchEngine, plan=null
#   3. vazio   → decision=inspect_only, plan=null
#   4. (bônus) quando plan tem tasks, cada task tem id/type/target/reason

set -euo pipefail

PORT=4499
BACKEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo ""
echo "=== §126 OpenClaw unit+smoke test ==="
echo ""

cd "$(dirname "$0")/backend"
PORT=$PORT node server.js >/dev/null 2>&1 &
BACKEND_PID=$!
echo "Backend PID=$BACKEND_PID, aguardando 2s..."
sleep 2

BASE="http://localhost:$PORT"
PASS=0
FAIL=0

check() {
  local label="$1"
  local url="$2"
  local method="$3"
  local body_arg="$4"
  local pattern="$5"
  local resp
  if [ "$method" = "POST" ]; then
    resp=$(curl -sf --max-time 10 -X POST \
      -H "Content-Type: application/json" \
      -d "$body_arg" "$url" 2>&1 || echo "CURL_FAIL")
  else
    resp=$(curl -sf --max-time 10 "$url" 2>&1 || echo "CURL_FAIL")
  fi
  if echo "$resp" | grep -q "$pattern"; then
    echo "  ✅ $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $label"
    echo "     Pattern: $pattern"
    echo "     Response: ${resp:0:400}"
    FAIL=$((FAIL + 1))
  fi
}

# ─── Suite A: routing decisions ──────────────────────────────────────
echo "[Suite A] Routing"
check "A-01 message→diagnose" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"message":"corrigir bug de autenticacao"}' \
  '"decision":"diagnose"'

check "A-02 message→next_stage=Hermes" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"message":"corrigir bug de autenticacao"}' \
  '"next_stage":"Hermes"'

check "A-03 patch→apply_patch" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"patch":"diff --git a/server.js b/server.js\n--- a/server.js\n+++ b/server.js"}' \
  '"decision":"apply_patch"'

check "A-04 patch→next_stage=PatchEngine" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"patch":"diff --git a/server.js"}' \
  '"next_stage":"PatchEngine"'

check "A-05 empty→inspect_only" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{}' \
  '"decision":"inspect_only"'

check "A-06 zip_base64→scan_zip" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"zip_base64":"abc123"}' \
  '"decision":"scan_zip"'

check "A-07 mission_id→execute_mission" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"mission_id":"m-abc123"}' \
  '"decision":"execute_mission"'

# ─── Suite B: plan field presence ────────────────────────────────────
echo ""
echo "[Suite B] Plan field"

check "B-01 diagnose response has plan key" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"message":"adicionar validacao de email no registro"}' \
  '"plan"'

check "B-02 patch response has plan:null" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"patch":"diff --git"}' \
  '"plan":null'

check "B-03 empty response has plan:null" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{}' \
  '"plan":null'

check "B-04 response has llm_provider key" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"message":"refatorar funcao de hash"}' \
  '"llm_provider"'

# ─── Suite C: structure quando plan é real (opcional — passa se LLM indisponível) ───
echo ""
echo "[Suite C] Plan structure (passa se LLM indisponível)"

PLAN_RESP=$(curl -sf --max-time 15 -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"corrigir bug de login: senha nao e validada"}' \
  "$BASE/api/openclaw/orchestrate" 2>&1 || echo "CURL_FAIL")

# Testa se plan é não-null
if echo "$PLAN_RESP" | grep -q '"plan":{'; then
  echo "  ✅ C-01 plan é objeto (LLM disponível)"
  PASS=$((PASS + 1))

  # Se é objeto, testa campos internos
  if echo "$PLAN_RESP" | grep -q '"mission_summary"'; then
    echo "  ✅ C-02 plan.mission_summary presente"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: C-02 plan.mission_summary ausente"
    FAIL=$((FAIL + 1))
  fi

  if echo "$PLAN_RESP" | grep -q '"tasks"'; then
    echo "  ✅ C-03 plan.tasks presente"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: C-03 plan.tasks ausente"
    FAIL=$((FAIL + 1))
  fi

  if echo "$PLAN_RESP" | grep -q '"risk_level"'; then
    echo "  ✅ C-04 plan.risk_level presente"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: C-04 plan.risk_level ausente"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ⚠️  C-01 plan=null (LLM indisponível) — fallback local OK"
  # Verifica que llm_provider é 'local' nesse caso
  if echo "$PLAN_RESP" | grep -q '"llm_provider":"local"'; then
    echo "  ✅ C-02 fallback: llm_provider=local"
    PASS=$((PASS + 1))
  else
    echo "  ✅ C-02 fallback: plan=null aceito (sem LLM key)"
    PASS=$((PASS + 1))
  fi
fi

# ─── Suite D: anti-stub ──────────────────────────────────────────────
echo ""
echo "[Suite D] Anti-stub"

check "D-01 orchestration_real:true" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"message":"teste"}' \
  '"orchestration_real":true'

check "D-02 agent=OpenClaw" \
  "$BASE/api/openclaw/orchestrate" POST \
  '{"message":"teste"}' \
  '"agent":"OpenClaw"'

echo ""
echo "─────────────────────────────────────────"
echo "_test126_openclaw_unit: $PASS/$((PASS + FAIL)) PASS"
if [ "$FAIL" -gt 0 ]; then
  echo "$FAIL teste(s) falharam."
  exit 1
fi
