#!/usr/bin/env bash
# §105 — verificação E2E completa do loop fechado (sem navegador)
# Chat (simulado via curl) -> /api/agent/mission/queue (apply_patch) ->
# Vision Agent Local real (processo node de verdade) -> patch real no disco
# com backup .vision-bak + git commit -> /api/agent/mission/result.
#
# Roda contra um backend LOCAL (não a produção) porque o objetivo aqui é
# provar a lógica do loop, não o deploy. Para validar contra produção depois
# do deploy, use o mesmo padrão de _test104_verify_e2e.sh contra o gateway.
#
# Uso: bash _test105_full_loop_e2e.sh
# Requer: node, git. Não precisa de chaves de API (não chama LLM nenhum).

set -uo pipefail
PORT=${VC_TEST_PORT:-4399}
AGENT_PORT=${VC_TEST_AGENT_PORT:-7199}
PROJ=$(mktemp -d /tmp/vc-test105-XXXXXX)
FAILED=0

cleanup() {
  [ -n "${SRVPID:-}" ] && kill -9 "$SRVPID" 2>/dev/null
  [ -n "${AGTPID:-}" ] && kill -9 "$AGTPID" 2>/dev/null
}
trap cleanup EXIT

echo "=== §105 E2E — projeto de teste: $PROJ ==="
cd "$PROJ"
git init -q
git config core.autocrlf false  # Windows: evita CRLF no git checkout (falso positivo na comparação de string)
git config user.email "test@vc.test"
git config user.name "VC Test"
cat > buggy.js << 'EOF'
function add(a, b) {
  return a - b; // bug: deveria ser soma
}
module.exports = { add };
EOF
git add buggy.js
git commit -q -m "initial buggy version"

cd - > /dev/null

echo ""
echo "=== 1. Subindo backend local na porta $PORT ==="
( cd backend && PORT=$PORT node server.js > /tmp/_t105_server.log 2>&1 & echo $! > /tmp/_t105_server.pid )
SRVPID=$(cat /tmp/_t105_server.pid)
sleep 1.5
HEALTH=$(curl -s "http://localhost:$PORT/api/health")
echo "$HEALTH" | grep -q '"ok":true' && echo "✅ backend up (pid $SRVPID)" || { echo "❌ backend não respondeu"; FAILED=1; }

echo ""
echo "=== 2. Subindo Vision Agent Local real na porta $AGENT_PORT, apontado pro backend local ==="
( VC_WORKER="http://localhost:$PORT" VC_PORT=$AGENT_PORT VC_POLL_MS=1000 node frontend/downloads/vision-agent.js "$PROJ" > /tmp/_t105_agent.log 2>&1 & echo $! > /tmp/_t105_agent.pid )
AGTPID=$(cat /tmp/_t105_agent.pid)
sleep 2

echo ""
echo "=== 3. /api/agent/status deve virar connected:true após o agent começar a fazer polling ==="
STATUS=$(curl -s "http://localhost:$PORT/api/agent/status")
echo "$STATUS"
echo "$STATUS" | grep -q '"connected":true' && echo "✅ agent detectado" || { echo "❌ agent não foi detectado via /api/agent/status"; FAILED=1; }

echo ""
echo "=== 4. Caminho feliz: enfileirar apply_patch real (corrige a-b -> a+b) ==="
Q1=$(curl -s -X POST "http://localhost:$PORT/api/agent/mission/queue" -H "Content-Type: application/json" \
  -d '{"type":"apply_patch","file":"buggy.js","fix_type":"code_patch","diagnosis":"operador errado","patch":{"search":"return a - b; // bug: deveria ser soma","replace":"return a + b;"}}')
echo "$Q1"
M1=$(echo "$Q1" | grep -o '"mission_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$M1" ] && { echo "❌ não recebeu mission_id"; FAILED=1; }

sleep 3
R1=$(curl -s "http://localhost:$PORT/api/agent/mission/result/$M1")
echo "$R1"
echo "$R1" | grep -q '"action":"patch_applied_committed"' && echo "✅ patch aplicado e commitado" || { echo "❌ patch não foi aplicado/commitado como esperado"; FAILED=1; }

CONTENT_AFTER=$(cat "$PROJ/buggy.js")
echo "$CONTENT_AFTER" | grep -q "return a + b;" && echo "✅ arquivo real no disco foi corrigido de verdade" || { echo "❌ arquivo no disco não foi corrigido"; FAILED=1; }

LAST_COMMIT_MSG=$(cd "$PROJ" && git log -1 --format=%s)
echo "$LAST_COMMIT_MSG" | grep -q "vision-agent apply_patch" && echo "✅ commit git real criado ($LAST_COMMIT_MSG)" || { echo "❌ commit git não encontrado"; FAILED=1; }

echo ""
echo "=== 5. Caminho de segurança: patch que quebra sintaxe deve dar rollback automático ==="
Q2=$(curl -s -X POST "http://localhost:$PORT/api/agent/mission/queue" -H "Content-Type: application/json" \
  --data-binary '{"type":"apply_patch","file":"buggy.js","fix_type":"code_patch","diagnosis":"teste rollback","patch":{"search":"return a + b;","replace":"return a + b +++ ;;; {{{ broken"}}')
M2=$(echo "$Q2" | grep -o '"mission_id":"[^"]*"' | head -1 | cut -d'"' -f4)
sleep 3
R2=$(curl -s "http://localhost:$PORT/api/agent/mission/result/$M2")
echo "$R2" | grep -q '"action":"patch_rollback"' && echo "✅ Aegis detectou erro de sintaxe e reverteu" || { echo "❌ rollback não ocorreu como esperado"; FAILED=1; }

CONTENT_AFTER2=$(cat "$PROJ/buggy.js")
[ "$CONTENT_AFTER2" = "$CONTENT_AFTER" ] && echo "✅ arquivo intacto após rollback (idêntico ao estado pré-mission-2)" || { echo "❌ arquivo foi alterado mesmo após rollback"; FAILED=1; }

LINES_AFTER_ROLLBACK=$(cd "$PROJ" && git log --oneline | wc -l)
[ "$LINES_AFTER_ROLLBACK" -eq 2 ] && echo "✅ nenhum commit espúrio criado pelo patch revertido (total ainda é 2)" || { echo "❌ número de commits inesperado: $LINES_AFTER_ROLLBACK"; FAILED=1; }

echo ""
echo "=== 6. Caminho de validação: apply_patch sem file/patch deve dar 400 ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://localhost:$PORT/api/agent/mission/queue" -H "Content-Type: application/json" -d '{"type":"apply_patch","diagnosis":"sem campos"}')
[ "$CODE" = "400" ] && echo "✅ 400 retornado corretamente" || { echo "❌ esperava 400, recebeu $CODE"; FAILED=1; }

echo ""
rm -rf "$PROJ"
if [ "$FAILED" -eq 0 ]; then
  echo "=== §105 E2E: TODOS OS CHECKS PASSARAM (loop chat -> agent local -> patch real -> rollback confirmado) ==="
  exit 0
else
  echo "=== §105 E2E: FALHOU — ver mensagens ❌ acima. Logs em /tmp/_t105_server.log e /tmp/_t105_agent.log ==="
  exit 1
fi
