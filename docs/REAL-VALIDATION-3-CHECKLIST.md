# REAL-VALIDATION-3 — Manual Checklist

**Ref:** SDDF_SPEC.md § §REAL-VALIDATION-3-PREP  
**Deploy:** CF Pages `13d3cfda.visioncoreai.pages.dev` | EB `vision-core`  
**Módulos:** §44 (MPEG compress), §46 (deploy ZIP PR), §48 (patch engine), §49 (hermes)  
**Status:** ⏳ PENDENTE — aguardando execução manual

---

## Teste 1 — MPEG §44: Compressão de contexto ativa

**Objetivo:** Verificar que `[MPEG §44]` aparece no log EB ao enviar ZIP grande.

**Procedimento:**
1. Acesse `https://visioncoreai.pages.dev`
2. Envie um ZIP com arquivo JS ≥ 50 linhas
3. Envie diagnóstico no chat (modo fix)
4. Verifique logs EB (CloudWatch ou `eb logs`)

**Gate:** Log contém `[MPEG §44] <arquivo>: <N> → <M> linhas (<R>% redução)`

**Resultado:** [ ] PASS  [ ] FAIL  
**Observações:** ___________________________________________

---

## Teste 2 — §46: GitHub PR aberto via Vision Core

**Objetivo:** Verificar que o botão "🚀 Deploy ZIP — Abrir PR" cria PR real no GitHub.

**Procedimento:**
1. Aplicar patch com resultado GOLD (aegis_ok=true)
2. Clicar "🚀 Deploy ZIP — Abrir PR"
3. Informar `owner/repo` e `branch base`
4. Verificar que PR aparece no repositório GitHub

**Gate:** PR criado, `pr_url` retornado e clicável no badge

**Resultado:** [ ] PASS  [ ] FAIL  
**Observações:** ___________________________________________

---

## Teste 3 — §48 Match Engine: patch com search multi-linha

**Objetivo:** Verificar que strategy 2 (normalized) aplica patch sem 422.

**Procedimento:**
1. Enviar ZIP com arquivo JS
2. No chat (modo fix), gerar patch com search de 2+ linhas com indentação diferente
3. Clicar "Aplicar e Baixar"
4. Verificar que resposta retorna `match_strategy: 'normalized'` (sem 422)

**Gate:** `match_strategy` = 'exact' ou 'normalized'; sem `patch_apply_failed`

**Resultado:** [ ] PASS  [ ] FAIL  
**Observações:** ___________________________________________

---

## Teste 4 — §49 Hermes: provider_used no response

**Objetivo:** Verificar que `provider_used` aparece no response e nos logs EB.

**Procedimento:**
1. Enviar mensagem no chat (modo fix)
2. Verificar log EB: `[HERMES §49] Respondido por: <Provider> (<modelo>)`
3. Verificar response do `/api/chat`: campo `provider` reflete provider correto

**Gate:** Log `[HERMES §49] Respondido por: ...` presente; `provider` no response não é null

**Resultado:** [ ] PASS  [ ] FAIL  
**Observações:** ___________________________________________

---

## Teste 5 — §44 + §48: Hexe preservado após compressão

**Objetivo:** Verificar que constantes críticas (LOCAL_REAL_COVERS, TRUSTED_API_COVER_SOURCES)
são preservadas pela compressão MPEG e o patch é aplicado corretamente.

**Procedimento:**
1. Enviar `vision-core-clean-runtime.js` como ZIP
2. Chat diagnóstico sobre qualquer bug pequeno
3. Verificar que compressão não remove as constantes Hexe
4. Aplicar patch — verificar `match_strategy` e `aegis_ok`

**Gate:** `[MPEG §44]` log sem "CRITICAL_PATTERN removed"; patch aplicado sem 422

**Resultado:** [ ] PASS  [ ] FAIL  
**Observações:** ___________________________________________

---

## Resultado Final

| Teste | Resultado |
|-------|-----------|
| 1 — MPEG §44 log | ⏳ |
| 2 — §46 GitHub PR | ⏳ |
| 3 — §48 normalized | ⏳ |
| 4 — §49 provider_used | ⏳ |
| 5 — Hexe preservado | ⏳ |

**REAL-VALIDATION-3:** ⏳ PENDENTE

Todos PASS → atualizar SDDF_SPEC.md: `§REAL-VALIDATION-3 PASS`  
Qualquer FAIL → abrir issue, corrigir, re-testar antes de marcar PASS.
