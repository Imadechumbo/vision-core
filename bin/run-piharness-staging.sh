#!/usr/bin/env bash
# §131: PI Harness staging wrapper — runtime-probe + authority contract
# Uso: bash bin/run-piharness-staging.sh [--max-difficulty D7] [--authority-contract path/to/contract.json]
# O backend local é gerenciado pelo harness (inicia + para automaticamente).
# Timeout de 30s por default para acomodar execução do Go Core (~9s por missão).

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"
MAX_DIFF="D7"
AUTHORITY_CONTRACT=""
JSON_FLAG="--json"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --max-difficulty) MAX_DIFF="$2"; shift 2;;
    --authority-contract) AUTHORITY_CONTRACT="$2"; shift 2;;
    --no-json) JSON_FLAG=""; shift;;
    *) shift;;
  esac
done

echo "[PI Harness] Iniciando D7 completo com runtime-probe na porta $PORT..."
echo "[PI Harness] max-difficulty: $MAX_DIFF | authority-contract: ${AUTHORITY_CONTRACT:-não fornecido}"
echo ""

AUTH_ARGS=""
if [[ -n "$AUTHORITY_CONTRACT" ]]; then
  AUTH_ARGS="--authority-contract $AUTHORITY_CONTRACT"
fi

node "$SCRIPT_DIR/tools/pi-harness.mjs" \
  --runtime-probe \
  --runtime-probe-port "$PORT" \
  --runtime-probe-timeout-ms 30000 \
  --max-difficulty "$MAX_DIFF" \
  $AUTH_ARGS \
  $JSON_FLAG
