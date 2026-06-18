#!/usr/bin/env bash
# §112 — Etapa F: verificação E2E da fila de missões persistida em SQLite
#
# Roda o server.js REAL (não um stub), queue missões reais via curl, MATA o
# processo com kill -9 (simulando o restart periódico do cfn-hup no EB — ver
# §70: confirmado que é um restart limpo do processo, não um OOM nem uma
# re-extração do bundle), e SOBE o processo de novo — provando que a fila e
# os resultados sobrevivem, o que era impossível antes (array/objeto em
# memória, perdido em todo restart).
#
# Também confirma que o contrato HTTP público (/api/agent/mission/*) não
# mudou nem um pouco — qualquer chamador existente (vision-agent.js, o
# bundle do frontend) continua funcionando sem nenhuma alteração.
#
# Uso: bash _test112_persistent_queue_e2e.sh
# Requer: node, curl. Não precisa de chaves de API nem de git.

set -uo pipefail
PORT=${VC_TEST_PORT:-4612}
BASE="http://localhost:$PORT"
DB_DIR=$(mktemp -d)   # Git Bash Unix-style path (for bash file checks)
DB_DIR_WIN=$(cygpath -w "$DB_DIR" 2>/dev/null || echo "$DB_DIR")  # Windows path for node chdir
FAILED=0

cleanup() {
  [ -n "${SRVPID:-}" ] && kill -9 "$SRVPID" 2>/dev/null
  rm -rf "$DB_DIR" 2>/dev/null || true
}
trap cleanup EXIT

check() {
  local desc="$1" cond="$2"
  if [ "$cond" = "true" ]; then
    echo "  ✅ $desc"
  else
    echo "  ❌ $desc"
    FAILED=$((FAILED+1))
  fi
}

echo "=== §112 E2E — fila SQLite persistente (Etapa F) ==="
echo "DB isolado em: $DB_DIR  (Windows: $DB_DIR_WIN)"

cd "$(dirname "$0")/backend"

BACKEND_ABS="$(pwd)"
BACKEND_ABS_WIN=$(cygpath -w "$BACKEND_ABS" 2>/dev/null || echo "$BACKEND_ABS")
start_server() {
  # VC_TEST_DB_ROOT + VC_TEST_SRV: Windows-style paths via env vars — avoids
  # shell-quoting issues with backslashes in inline -e scripts.
  PORT="$PORT" VC_TEST_DB_ROOT="$DB_DIR_WIN" VC_TEST_SRV="$BACKEND_ABS_WIN/server.js" node -e "
    process.env.PORT = process.env.PORT;
    const dbRoot = process.env.VC_TEST_DB_ROOT;
    if (dbRoot) process.chdir(dbRoot);
    require(process.env.VC_TEST_SRV);
  " >> "$DB_DIR/server.log" 2>&1 &
  SRVPID=$!
}

# ── Sessão 1: sobe o servidor, popula fila + resultado, NÃO consome tudo ──
start_server
sleep 1.5

Q1=$(curl -s -X POST "$BASE/api/agent/mission/queue" -H "Content-Type: application/json" -d '{"type":"general","input":"sobrevive ao restart 1"}')
ID1=$(echo "$Q1" | grep -o '"mission_id":"[^"]*"' | cut -d'"' -f4)
check "mission 1 enfileirada" "$([ -n "$ID1" ] && echo true || echo false)"

Q2=$(curl -s -X POST "$BASE/api/agent/mission/queue" -H "Content-Type: application/json" -d '{"type":"general","input":"sobrevive ao restart 2"}')
ID2=$(echo "$Q2" | grep -o '"mission_id":"[^"]*"' | cut -d'"' -f4)
check "mission 2 enfileirada" "$([ -n "$ID2" ] && echo true || echo false)"

R1=$(curl -s -X POST "$BASE/api/agent/mission/result" -H "Content-Type: application/json" -d '{"mission_id":"old_result_e2e","ok":true,"action":"patch_applied_committed"}')
check "resultado pré-restart armazenado" "$(echo "$R1" | grep -q '"received":true' && echo true || echo false)"

check "arquivo .sqlite existe no disco antes do restart" "$([ -f "$DB_DIR/data/agent-queue.sqlite" ] && echo true || echo false)"

# valida que o contrato de erro 400 dos outros mission types não mudou
BAD=$(curl -s -X POST "$BASE/api/agent/mission/queue" -H "Content-Type: application/json" -d '{"type":"apply_patch"}')
check "apply_patch sem file/patch ainda retorna 400 (contrato preservado)" "$(echo "$BAD" | grep -q 'apply_patch_requires_file_and_patch' && echo true || echo false)"

# ── Mata o processo de verdade (kill -9, igual um crash/restart real) ──
echo "  ⚙️  matando processo (pid $SRVPID) — simulando restart cfn-hup..."
kill -9 "$SRVPID" 2>/dev/null
sleep 1
if kill -0 "$SRVPID" 2>/dev/null; then
  check "processo realmente morreu" "false"
else
  check "processo realmente morreu" "true"
fi

# ── Sessão 2: sobe um processo NOVO, mesmo diretório de dados ──
start_server
sleep 1.5

LEN_CHECK=$(curl -s -X POST "$BASE/api/agent/mission/queue" -H "Content-Type: application/json" -d '{"type":"general","input":"pos-restart"}')
QLEN=$(echo "$LEN_CHECK" | grep -o '"queue_length":[0-9]*' | grep -o '[0-9]*')
check "queue_length pós-restart é 3 (2 antigas + 1 nova — nada foi perdido)" "$([ "$QLEN" = "3" ] && echo true || echo false)"

P1=$(curl -s "$BASE/api/agent/mission/pending")
P1ID=$(echo "$P1" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
check "primeira missão pós-restart é a mission 1 (FIFO preservado entre processos)" "$([ "$P1ID" = "$ID1" ] && echo true || echo false)"

P2=$(curl -s "$BASE/api/agent/mission/pending")
P2ID=$(echo "$P2" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
check "segunda missão pós-restart é a mission 2" "$([ "$P2ID" = "$ID2" ] && echo true || echo false)"

RESULT_CHECK=$(curl -s "$BASE/api/agent/mission/result/old_result_e2e")
check "resultado pré-restart ainda recuperável depois do restart" "$(echo "$RESULT_CHECK" | grep -q '"action":"patch_applied_committed"' && echo true || echo false)"

NOTFOUND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/agent/mission/result/nao_existe_nunca")
check "id inexistente ainda retorna 404 (contrato preservado)" "$([ "$NOTFOUND" = "404" ] && echo true || echo false)"

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "=== §112 E2E: TODOS OS CHECKS PASSARAM (fila + resultados sobrevivem a kill -9 real + restart real) ==="
  exit 0
else
  echo "=== §112 E2E: $FAILED CHECK(S) FALHARAM ==="
  exit 1
fi
