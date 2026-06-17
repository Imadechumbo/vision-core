#!/usr/bin/env bash
set -uo pipefail
PORT=${VC_TEST_PORT:-4499}
AGENT_PORT=${VC_TEST_AGENT_PORT:-7299}
PROJ=$(mktemp -d /tmp/vc-test109-XXXXXX)
FAILED=0

cleanup() {
  [ -n "${SRVPID:-}" ] && kill -9 "$SRVPID" 2>/dev/null
  [ -n "${AGTPID:-}" ] && kill -9 "$AGTPID" 2>/dev/null
}
trap cleanup EXIT

echo "=== §109 E2E — projeto de teste: $PROJ ==="
cd "$PROJ"
git init -q
git config core.autocrlf false
git config user.email "test@vc.test"
git config user.name "VC Test"

cat > buggy1.js << 'EOF'
function add(a, b) {
  return a - b; // bug: deveria ser soma
}
module.exports = { add };
EOF

cat > buggy2.js << 'EOF'
function mul(a, b) {
  return a + b; // bug: deveria ser multiplicacao
}
module.exports = { mul };
EOF

cat > buggy3.js << 'EOF'
function sub(a, b) {
  return a + b; // bug: deveria ser subtracao
}
module.exports = { sub };
EOF

cat > buggy4.js << 'EOF'
function div(a, b) {
  return a * b; // bug: deveria ser divisao
}
module.exports = { div };
EOF

cat > buggy5.js << 'EOF'
function inc(a) {
  return a - 1; // bug: deveria ser incremento
}
module.exports = { inc };
EOF

cat > buggy6.js << 'EOF'
function dec(a) {
  return a + 1; // bug: deveria ser decremento
}
module.exports = { dec };
EOF

git add buggy1.js buggy2.js buggy3.js buggy4.js buggy5.js buggy6.js
git commit -q -m "initial buggy versions (6 arquivos, 3 pares de cenario)"
BASELINE_HASH=$(git rev-parse --short HEAD)
echo "Baseline: $BASELINE_HASH"

cd - > /dev/null

echo ""
echo "=== 1. Subindo backend local na porta $PORT ==="
( cd backend && PORT=$PORT node server.js > /tmp/_t109_server.log 2>&1 & echo $! > /tmp/_t109_server.pid )
SRVPID=$(cat /tmp/_t109_server.pid)
sleep 1.5
HEALTH=$(curl -s "http://localhost:$PORT/api/health")
echo "$HEALTH" | grep -q '"ok":true' && echo "✅ backend up (pid $SRVPID)" || { echo "❌ backend não respondeu"; FAILED=1; }

echo ""
echo "=== 2. Subindo Vision Agent Local real na porta $AGENT_PORT, apontado pro projeto de teste ==="
( VC_WORKER="http://localhost:$PORT" VC_PORT=$AGENT_PORT VC_POLL_MS=1000 node frontend/downloads/vision-agent.js "$PROJ" > /tmp/_t109_agent.log 2>&1 & echo $! > /tmp/_t109_agent.pid )
AGTPID=$(cat /tmp/_t109_agent.pid)
sleep 2

echo ""
echo "=== 3. CAMINHO FELIZ: buggy1.js + buggy2.js, os dois patches validos ==="
Q1=$(curl -s -X POST "http://localhost:$PORT/api/agent/mission/queue" -H "Content-Type: application/json" \
  -d '{"type":"apply_patch_multi","diagnosis":"dois operadores errados","files":[
    {"file":"buggy1.js","fix_type":"code_patch","patch":{"search":"return a - b; // bug: deveria ser soma","replace":"return a + b;"}},
    {"file":"buggy2.js","fix_type":"code_patch","patch":{"search":"return a + b; // bug: deveria ser multiplicacao","replace":"return a * b;"}}
  ]}')
echo "$Q1"
M1=$(echo "$Q1" | grep -o '"mission_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$M1" ] && { echo "❌ não recebeu mission_id"; FAILED=1; }

sleep 3
R1=$(curl -s "http://localhost:$PORT/api/agent/mission/result/$M1")
echo "$R1"
echo "$R1" | grep -q '"action":"patch_multi_applied_committed"' && echo "✅ ação correta (patch_multi_applied_committed)" || { echo "❌ ação inesperada"; FAILED=1; }

cd "$PROJ"
AFTER_HAPPY_HASH=$(git rev-parse --short HEAD)
[ "$AFTER_HAPPY_HASH" != "$BASELINE_HASH" ] && echo "✅ novo commit foi criado ($BASELINE_HASH → $AFTER_HAPPY_HASH)" || { echo "❌ HEAD não mudou — commit não foi feito"; FAILED=1; }
FILES_IN_COMMIT=$(git show --stat -1 HEAD | grep -c "buggy[12]\.js")
[ "$FILES_IN_COMMIT" -eq 2 ] && echo "✅ UM commit cobrindo os 2 arquivos juntos (não 2 commits separados)" || { echo "❌ esperava 2 arquivos no mesmo commit, achou $FILES_IN_COMMIT"; FAILED=1; }
grep -q "return a + b;" buggy1.js && echo "✅ buggy1.js corrigido" || { echo "❌ buggy1.js não foi corrigido"; FAILED=1; }
grep -q "return a \* b;" buggy2.js && echo "✅ buggy2.js corrigido" || { echo "❌ buggy2.js não foi corrigido"; FAILED=1; }
cd - > /dev/null

echo ""
echo "=== 4. FALHA NO PATCH: buggy3.js valido, buggy4.js com busca inexistente ==="
Q2=$(curl -s -X POST "http://localhost:$PORT/api/agent/mission/queue" -H "Content-Type: application/json" \
  -d '{"type":"apply_patch_multi","diagnosis":"um patch invalido no segundo arquivo","files":[
    {"file":"buggy3.js","fix_type":"code_patch","patch":{"search":"return a + b; // bug: deveria ser subtracao","replace":"return a - b;"}},
    {"file":"buggy4.js","fix_type":"code_patch","patch":{"search":"return a / b; // texto que nao existe no arquivo","replace":"return a / b;"}}
  ]}')
echo "$Q2"
M2=$(echo "$Q2" | grep -o '"mission_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$M2" ] && { echo "❌ não recebeu mission_id"; FAILED=1; }

sleep 3
R2=$(curl -s "http://localhost:$PORT/api/agent/mission/result/$M2")
echo "$R2"
echo "$R2" | grep -q '"action":"patch_multi_failed"' && echo "✅ ação correta (patch_multi_failed)" || { echo "❌ ação inesperada"; FAILED=1; }

cd "$PROJ"
AFTER_PATCHFAIL_HASH=$(git rev-parse --short HEAD)
[ "$AFTER_PATCHFAIL_HASH" == "$AFTER_HAPPY_HASH" ] && echo "✅ HEAD não mudou — nenhum commit foi criado" || { echo "❌ HEAD mudou inesperadamente"; FAILED=1; }
DIFF3=$(git diff --stat -- buggy3.js)
DIFF4=$(git diff --stat -- buggy4.js)
[ -z "$DIFF3" ] && echo "✅ buggy3.js revertido — zero diff vs HEAD" || { echo "❌ buggy3.js ficou com alteração parcial: $DIFF3"; FAILED=1; }
[ -z "$DIFF4" ] && echo "✅ buggy4.js sem diff (nunca chegou a ser escrito)" || { echo "❌ buggy4.js ficou com alteração inesperada: $DIFF4"; FAILED=1; }
cd - > /dev/null

echo ""
echo "=== 5. FALHA NA VALIDAÇÃO AEGIS: buggy5.js valido, buggy6.js gera JS invalido ==="
Q3=$(curl -s -X POST "http://localhost:$PORT/api/agent/mission/queue" -H "Content-Type: application/json" \
  -d '{"type":"apply_patch_multi","diagnosis":"segundo arquivo gera sintaxe invalida","files":[
    {"file":"buggy5.js","fix_type":"code_patch","patch":{"search":"return a - 1; // bug: deveria ser incremento","replace":"return a + 1;"}},
    {"file":"buggy6.js","fix_type":"code_patch","patch":{"search":"return a + 1; // bug: deveria ser decremento","replace":"return a - 1; function broken("}}
  ]}')
echo "$Q3"
M3=$(echo "$Q3" | grep -o '"mission_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$M3" ] && { echo "❌ não recebeu mission_id"; FAILED=1; }

sleep 3
R3=$(curl -s "http://localhost:$PORT/api/agent/mission/result/$M3")
echo "$R3"
echo "$R3" | grep -q '"action":"patch_multi_rollback"' && echo "✅ ação correta (patch_multi_rollback)" || { echo "❌ ação inesperada"; FAILED=1; }

cd "$PROJ"
AFTER_VALIDFAIL_HASH=$(git rev-parse --short HEAD)
[ "$AFTER_VALIDFAIL_HASH" == "$AFTER_HAPPY_HASH" ] && echo "✅ HEAD não mudou — nenhum commit foi criado" || { echo "❌ HEAD mudou inesperadamente"; FAILED=1; }
DIFF5=$(git diff --stat -- buggy5.js)
DIFF6=$(git diff --stat -- buggy6.js)
[ -z "$DIFF5" ] && echo "✅ buggy5.js revertido — zero diff vs HEAD (mesmo já tendo passado pelo PatchEngine com sucesso)" || { echo "❌ buggy5.js ficou com alteração parcial: $DIFF5"; FAILED=1; }
[ -z "$DIFF6" ] && echo "✅ buggy6.js revertido — zero diff vs HEAD" || { echo "❌ buggy6.js ficou com alteração parcial: $DIFF6"; FAILED=1; }
cd - > /dev/null

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "=== §109 E2E: TODOS OS CHECKS PASSARAM (caminho feliz com commit unico + 2 cenarios de rollback atomico confirmados) ==="
  exit 0
else
  echo "=== §109 E2E: FALHOU — ver detalhes acima ==="
  exit 1
fi
