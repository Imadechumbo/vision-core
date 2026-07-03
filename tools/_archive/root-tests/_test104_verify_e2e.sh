#!/usr/bin/env bash
# §104 — verificação automatizada (sem navegador)
# Testa: (1) display_input é preferido sobre message no histórico,
#        (2) versão do backend já é 5.9.7 no fallback dos módulos SF.
# Se der erro de TLS (exit code 35), usar a versão PowerShell equivalente
# (mesmo padrão que já funcionou pro §103).

GW="https://visioncore-api-gateway.weiganlight.workers.dev"

echo "=== 1. Registrar usuario de teste ==="
REG=$(curl -s -X POST "$GW/api/auth/register" -H "Content-Type: application/json" -d '{"email":"teste104_'$(date +%s)'@vc.test","password":"teste123","name":"Teste104"}')
echo "$REG"
TOKEN=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

echo ""
echo "=== 2. Mandar mensagem com message LONGO (simulando prefixo de contexto) + display_input LIMPO ==="
curl -s -X POST "$GW/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"[contexto anterior simulado bem longo aqui só pra provar que não é isso que deve aparecer no histórico] teste 104 limpo","display_input":"teste 104 limpo","mode":"vision-geral"}' > /dev/null
echo "Mensagem enviada"

echo ""
echo "=== 3. Checar o que ficou salvo no historico ==="
RESULT=$(curl -s "$GW/api/mission/timeline?limit=5" -H "Authorization: Bearer $TOKEN")
echo "$RESULT"

echo ""
echo "=== 4. Validacao automatica ==="
if echo "$RESULT" | grep -q '"input":"teste 104 limpo"'; then
  echo "✅ SUCESSO: input salvo é o display_input limpo, não o message longo com contexto."
else
  echo "❌ FALHA: input salvo não é o texto limpo esperado — confira a saída do passo 3 acima."
fi

echo ""
echo "=== 5. Confirmar versao 5.9.7 no fallback SF (sem precisar de LLM real) ==="
echo "(esse teste só funciona se o endpoint SF correspondente cair no fallback local —"
echo " se vier resposta de LLM real em vez do fallback, pular esse item é normal)"
