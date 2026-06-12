# Vision Core — CI Last Run

**Data:** 2026-06-12T14:38:17.262Z
**Status:** ❌ FAIL (15 cenários)
**Total:** 65/80 PASS (81%)
**Run:** #79 | **Ref:** main | **SHA:** 0de8a12b

## Resultados por suíte

| Suíte | PASS | FAIL | Total |
|-------|------|------|-------|
| V1 | 10 | 0 | 10 |
| V2 | 15 | 0 | 15 |
| V3 | 0 | 15 | 15 |
| V4 | 15 | 0 | 15 |
| SF | 15 | 0 | 15 |
| FP | 10 | 0 | 10 |
| **Total** | **65** | **15** | **80** |

## §69 hotfix — Diagnóstico CI #79

**V3: 0/15 por 502 Bad Gateway — EB backend crash, NÃO regressão de código.**

### Timeline do crash

```
14:26:36  STRESS-26 enviado (~14KB, Hermes com timeout 60s)
14:27:15  ❌ STRESS-26 → 502 nginx (39s de processamento → crash)
14:27:15  STRESS-27..40: todos disparam imediatamente → 502 (<1ms cada)
           = processo Node.js down no momento do crash
```

### Evidências que é crash de infraestrutura (não código)

- V1/V2/V4/SF/FP: 10+15+15+15+10 = **65/65 PASS** (código funcionando)
- 502 = nginx/EB gateway (não é nosso HTTP 503 estruturado)
- 14 cenários responderam em <1ms ao MESMO timestamp = processo down
- Hotfix `0de8a12` restaura comportamento pré-§69 (V3 era 15/15 em CI #71-#77)
- Causa provável: OOM ou EB health restart após ~25 requests pesados de V1+V2

### Próximo passo: CI #80 (docs-only) confirma se crash era transiente
