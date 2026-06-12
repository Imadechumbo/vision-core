# Vision Core — CI Last Run

**Data:** 2026-06-12T13:31:34.786Z
**Status:** ❌ FAIL (1 cenários)
**Total:** 79/80 PASS (99%)
**Run:** #77 | **Ref:** main | **SHA:** 5c4a6d21

## Resultados por suíte

| Suíte | PASS | FAIL | Total |
|-------|------|------|-------|
| V1 | 10 | 0 | 10 |
| V2 | 14 | 1 | 15 |
| V3 | 15 | 0 | 15 |
| V4 | 15 | 0 | 15 |
| SF | 15 | 0 | 15 |
| FP | 10 | 0 | 10 |
| **Total** | **79** | **1** | **80** |

## §69 — Resultado CI #77 (baseline pós-fix)

**STRESS-06 + STRESS-10: PASS** ✅ (V1: 10/10)  
**STRESS-12 (V2): FAIL** 50.2s — LLM non-determinism (1 fail em 8 runs histórico), não relacionado a §69.

### Comparação baseline

| Run | Score | STRESS-06 | STRESS-10 | STRESS-12 | Race |
|-----|-------|-----------|-----------|-----------|------|
| #76 (pré-fix) | 78/80 | ❌ timeout 60s | ❌ timeout 60s | ✅ | sem ECONN |
| **#77 (pós-fix)** | **79/80** | **✅ PASS** | **✅ PASS** | ❌ LLM non-det. | sem ECONN |

**Fix §69 validado:** timeout 90s + sleep 5s eliminou o timeout cascade de V1.  
Hermes 503 ativo — próxima falha por exaustão de providers retornará `ALL_PROVIDERS_EXHAUSTED` em vez de timeout mudo.
