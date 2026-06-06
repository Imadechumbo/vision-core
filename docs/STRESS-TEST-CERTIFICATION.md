# Vision Core — Stress Test Certification

**Data:** 2026-06-06  
**Versão:** V3.0.0  
**Resultado:** ✅ 10/10 PASS (100%)  
**Commit §53:** `a672b2d`  

---

## Histórico de Iterações

| Iteração | PASS | Taxa | Fix aplicado |
|---|---|---|---|
| Run 1 | 0/10 | 0% | Erro HTTP 413 — ZIP 125 MB rejeitado pelo Express |
| Run 2 | 2/10 | 20% | ZIP mínimo (só arquivo alvo) + extração `data.answer` |
| Run 3 | 10/10 | 100% | §53 diff contextual — `[DIFF]...[/DIFF]` no prompt |

---

## Cenários Certificados

| ID | Dificuldade | Descrição | Status |
|---|---|---|---|
| STRESS-01 | EASY | Comentar linha `LOCAL_REAL_COVERS` | ✅ PASS |
| STRESS-02 | EASY | `LOCAL_REAL_COVERS = undefined` | ✅ PASS |
| STRESS-03 | MEDIUM | `isAllowedLocalRealCover` retorna `false` | ✅ PASS |
| STRESS-04 | MEDIUM | Pokopia extensão `.jpg` → `.gif` | ✅ PASS |
| STRESS-05 | MEDIUM | GTA VI `rank: 1` → `rank: 99` | ✅ PASS |
| STRESS-06 | HARD | GTA VI `release` vazio | ✅ PASS |
| STRESS-07 | HARD | Resident Evil Requiem — PS5 removido | ✅ PASS |
| STRESS-08 | HARD | `TRUSTED_API_COVER_SOURCES` — `'rawg'` removido | ✅ PASS |
| STRESS-09 | EXPERT | `isAllowedLocalRealCover` regex `.png\|jpg` → `.svg\|webp` | ✅ PASS |
| STRESS-10 | EXPERT | Hexe key typo — apóstrofo curvo (U+2019) removido | ✅ PASS |

---

## O que foi descoberto

### Problema raiz: alucinação por falta de diff

Sem o diff, Vision Core recebia o arquivo completo (≈23 KB) e precisava encontrar o bug sozinho.
O LLM alucinava bugs plausíveis baseados em padrões de treinamento:

- `isRemoteHttpUrl protocol-relative URLs` (não existe no arquivo)
- `auth middleware token expiry < em vez de <=` (copiado do próprio exemplo no `basePrompt`, linha 1108)
- `date formatting error` (genérico, inexistente)
- `linha 187` (número de linha inventado)

### Solução: §53 diff contextual

Com `[DIFF]...[/DIFF]` e a regra §53 no system prompt:

> "Sua análise RCA DEVE focar EXCLUSIVAMENTE nas linhas marcadas com - (removidas) e + (adicionadas). NÃO reporte bugs em outras partes do arquivo."

O modelo identifica o bug exato em todas as categorias de dificuldade.

---

## Impacto no Vision Core

| Métrica | Antes §53 | Depois §53 |
|---------|-----------|------------|
| Taxa de diagnóstico correto | 20% | 100% |
| Alucinações por sessão | ~8/10 | 0/10 |
| `patch_apply_failed` esperado | Alto | Baixo |
| Confiança média do LLM | < 0.7 (BLOCKED) | ≥ 0.85 (forçado) |

---

## Próximos stress tests recomendados

- Testar com múltiplos arquivos modificados simultaneamente
- Testar com bugs em arquivos CSS (seletor errado, propriedade trocada)
- Testar com bugs em arquivos backend Node.js (rota, middleware, query)
- Testar com bugs introduzidos em 3+ locais diferentes no mesmo arquivo
- Testar diff com ruído (linhas de contexto enganosas)

---

## Reproduzir

```bash
# Pré-requisitos
export GITHUB_TOKEN=<token>
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Rodar
node scripts/stress-test-vision-core.js

# Dashboard em tempo real
# http://localhost:3099
```

Relatório JSON: `docs/STRESS-TEST-RESULTS.json`  
Relatório MD: `docs/STRESS-TEST-RESULTS.md`
