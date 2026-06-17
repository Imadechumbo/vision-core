# §104 — Limpeza + Cobertura Completa do Histórico de Missões

Execute os blocos abaixo em sequência, sem parar pra confirmação manual entre eles. Só pare se um assert/teste falhar de verdade (aí me mostra o erro exato).

## Bloco 1 — Aplicar o patch
```
cd ~/Desktop/vision-core
python _patch104_cleanup_and_coverage.py
```
O script tem 6 etapas, cada uma com assert próprio (aborta com mensagem clara se algo não bater com o esperado). Se abortar, me mostra a mensagem de erro completa — não tenta "consertar na mão" sem me avisar primeiro.

## Bloco 2 — Checagem de sintaxe (automática, sem navegador)
```
node -c backend/server.js
node -c frontend/assets/vision-core-bundle.js
python -c "import json; json.load(open('backend/package.json')); print('package.json OK')"
```
Os 3 comandos devem rodar sem erro.

## Bloco 3 — Teste unitário da lógica de display_input
```
node _test104_display_input_unit.cjs
```
Esperado: 4/4 PASS.

## Bloco 4 — Deploy
```
python _deployXX_eb.py
bash bin/deploy-pages.sh "§104: limpeza (v236FileInput, versão backend 5.9.7) + display_input no histórico + recordMissionTimelineEntry nos 3 fluxos restantes (sf-chat, hermes, zip-upload)"
```
(usar o número real do script de deploy do backend, o XX é só placeholder)

## Bloco 5 — Verificação automatizada ponta a ponta (sem navegador)
```
bash _test104_verify_e2e.sh
```
Se der erro de TLS (exit code 35, mesmo problema do §103), roda a versão PowerShell equivalente — mesmo padrão: registrar usuário de teste, mandar `/api/chat` com `message` longo + `display_input` limpo, e confirmar via `GET /api/mission/timeline` que o que ficou salvo foi o `display_input`, não o `message`.

Resultado esperado no final do script: `✅ SUCESSO: input salvo é o display_input limpo`.

## Bloco 6 — Commit e push
Só depois que blocos 1-5 passarem todos. Mensagem de commit sugerida:

```
git add -A
git commit -m "§104: limpeza de código morto + padronização de versão + display_input limpo no histórico + cobertura completa de feedback nos 4 fluxos

- Remove v236FileInput órfão (zero referências, confirmado via grep antes de remover)
- Padroniza versão backend: package.json 4.1.0 -> 5.9.7, 9x v5.9.0 -> v5.9.7 no fallback dos módulos SF
- Backend /api/chat agora prefere body.display_input sobre body.message pra montar entrada do histórico (corrige texto poluído com prefixo de contexto)
- Frontend manda display_input limpo nos fluxos de chat principal e upload de ZIP
- recordMissionTimelineEntry() adicionado nos 3 fluxos que faltavam: sf-chat, EXECUTAR MISSÃO/hermes, zip-upload (backend já persistia os 4 desde §103, faltava só o feedback visual imediato)
- §98-B/§98-C: CLAUDE.md corrigido (doc dizia PRIORIDADE ALTA/MÉDIA, código já estava resolvido)
- CLAUDE.md: PENDÊNCIAS IMEDIATAS reescrita (estava stale desde §102), tabela de histórico com §102/§103 corrigidos e §104 adicionado, VERSÕES ATUAIS atualizada

Verificado: sintaxe OK, teste unitário 4/4, e2e via curl confirmando display_input persistido corretamente."
git tag s104-done
git push origin main
git push origin s104-done
git push gitlab main 2>/dev/null || true
```

## Observação sobre item 5 (não bloqueia nada acima)
Os 3 novos `recordMissionTimelineEntry()` (sf-chat, hermes, zip-upload) são client-side puro — não tem como confirmar via curl que o painel atualiza na hora, só visualmente. O código segue exatamente o padrão já testado e funcionando desde o §102, então o risco é baixo e isso **não precisa travar o deploy/commit**. Se em algum momento (sem pressa, sem precisar ser agora) você quiser confirmar 100%: manda uma missão pelo EXECUTAR MISSÃO ou faz upload de um ZIP e olha se aparece no painel de histórico imediatamente, sem precisar de F5.
