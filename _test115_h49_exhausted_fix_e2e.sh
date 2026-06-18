#!/usr/bin/env bash
# §115 — E2E dedicado: reproduz o cenário exato que crashava o backend antes do fix.
#
# Bug achado em paralelo durante o §115 (não introduzido por esta sessão): a resposta
# 503 de ALL_PROVIDERS_EXHAUSTED referenciava _h49budgetMs, uma variável NUNCA definida
# em server.js. Toda vez que TODOS os providers de IA falhassem na mesma requisição
# (outage simultâneo real, ou — como aqui — nenhuma API key configurada), o processo
# sofria um ReferenceError não tratado dentro do handler de POST /api/chat.
#
# Este teste roda o backend real SEM nenhuma API key (estado natural deste sandbox),
# manda 2 requisições de mode:fix com contexto de arquivo (passa o gate §25), e confirma:
#   1. a 1a requisição retorna 503 ALL_PROVIDERS_EXHAUSTED (não timeout, não connection refused)
#   2. a mensagem de erro tem o timeout real (não "NaN" — sintoma do _h49budgetMs undefined)
#   3. o processo do servidor AINDA ESTÁ VIVO depois da exaustão (prova que não crashou)
#   4. uma 2a requisição imediatamente depois também é respondida normalmente
#
# Uso: bash _test115_h49_exhausted_fix_e2e.sh
# Requer: node, curl. Roda sem nenhuma API key — não chama LLM real nenhum (mesmo
# comportamento de outage real: todos os providers falham, só que aqui por falta de chave).

set -uo pipefail
PORT=${VC_TEST_PORT:-4518}
FAILED=0

cleanup() {
  [ -n "${SRVPID:-}" ] && kill -9 "$SRVPID" 2>/dev/null
}
trap cleanup EXIT

echo "=== §115 E2E — _h49budgetMs fix (ALL_PROVIDERS_EXHAUSTED não deve crashar) ==="
echo ""
echo "=== 1. Subindo backend local na porta $PORT, sem nenhuma API key ==="
( cd backend && env -u ANTHROPIC_API_KEY -u CEREBRAS_API_KEY -u GROQ_API_KEY -u OPENROUTER_API_KEY \
  -u DEEPSEEK_API_KEY -u GEMINI_API_KEY PORT=$PORT node server.js > /tmp/_t115_server.log 2>&1 & echo $! > /tmp/_t115_server.pid )
sleep 1.5
SRVPID=$(cat /tmp/_t115_server.pid)
if ! kill -0 "$SRVPID" 2>/dev/null; then
  echo "❌ servidor não subiu — log:"; cat /tmp/_t115_server.log; exit 1
fi
echo "✅ servidor no ar (pid $SRVPID)"

echo ""
echo "=== 2. POST /api/chat mode:fix com contexto de arquivo (todos providers vão falhar) ==="
RESP1=$(curl -s -w "\n%{http_code}" --max-time 20 -X POST "http://localhost:$PORT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"[Arquivo: buggy.js]\nfunction add(a,b){ return a - b; }\n\nconserte o bug","mode":"fix"}')
HTTP1=$(echo "$RESP1" | tail -1)
BODY1=$(echo "$RESP1" | sed '$d')

if [ "$HTTP1" = "503" ]; then
  echo "✅ HTTP 503 (ALL_PROVIDERS_EXHAUSTED), como esperado"
else
  echo "❌ esperava HTTP 503, recebeu $HTTP1 — body: $BODY1"; FAILED=1
fi

if echo "$BODY1" | grep -q '"error":"ALL_PROVIDERS_EXHAUSTED"'; then
  echo "✅ campo error=ALL_PROVIDERS_EXHAUSTED presente"
else
  echo "❌ campo error=ALL_PROVIDERS_EXHAUSTED ausente — body: $BODY1"; FAILED=1
fi

if echo "$BODY1" | grep -qi 'NaN'; then
  echo "❌ mensagem contém NaN — sintoma do bug antigo (_h49budgetMs undefined / 1000 = NaN)"; FAILED=1
else
  echo "✅ mensagem sem NaN (timeout real interpolado corretamente)"
fi

if echo "$BODY1" | grep -q 'atingiram o timeout de'; then
  echo "✅ mensagem usa a frase nova (timeout, não budget undefined)"
else
  echo "❌ mensagem não contém a frase esperada — body: $BODY1"; FAILED=1
fi

echo ""
echo "=== 3. Processo ainda vivo depois da exaustão (prova que NÃO crashou) ==="
if kill -0 "$SRVPID" 2>/dev/null; then
  echo "✅ processo do servidor ainda vivo (pid $SRVPID)"
else
  echo "❌ processo morreu — crash confirmado. log:"; cat /tmp/_t115_server.log; FAILED=1
fi

echo ""
echo "=== 4. Segunda requisição imediatamente depois — servidor deve responder normalmente ==="
HTTP2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 -X POST "http://localhost:$PORT/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"[Arquivo: outro.js]\nfunction mul(a,b){ return a + b; }\n\nconserte o bug","mode":"fix"}')
if [ "$HTTP2" = "503" ]; then
  echo "✅ 2a requisição também respondida normalmente (503 — mesmo motivo, sem chave)"
else
  echo "❌ 2a requisição falhou de forma inesperada: HTTP $HTTP2"; FAILED=1
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "=== §115 E2E: TODOS OS CHECKS PASSARAM (_h49budgetMs fix confirmado com processo real) ==="
  exit 0
else
  echo "=== §115 E2E: FALHAS ENCONTRADAS ==="
  exit 1
fi
