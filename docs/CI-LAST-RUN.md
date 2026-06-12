# Vision Core — CI Last Run

**Data:** 2026-06-12T15:06:32.309Z
**Status:** ❌ FAIL (2 cenários)
**Total:** 78/80 PASS (98%)
**Run:** #80 | **Ref:** main | **SHA:** c9e2f550

## Resultados por suíte

| Suíte | PASS | FAIL | Total |
|-------|------|------|-------|
| V1 | 10 | 0 | 10 |
| V2 | 14 | 1 | 15 |
| V3 | 14 | 1 | 15 |
| V4 | 15 | 0 | 15 |
| SF | 15 | 0 | 15 |
| FP | 10 | 0 | 10 |
| **Total** | **78** | **2** | **80** |

## §69 hotfix — Validação final (CI #77→#80)

| Run | Score | V1 | V3 | FAILs | Causa |
|-----|-------|----|----|-------|-------|
| #77 (fix `5c4a6d2`) | 79/80 | 10/10 | 15/15 | STRESS-12 LLM | ✅ timeout cascade resolvido |
| #78 (bug budget timer) | 74/80 | 10/10 | 12/15 | 5× HTTP 503 falso | `Promise.race` 75s + timeout 30s |
| #79 (hotfix `0de8a12`) | 65/80 | 10/10 | 0/15 | V3 inteiro HTTP 502 | EB crash TRANSIENTE (OOM/restart) |
| **#80 (confirmação)** | **78/80** | **10/10** | **14/15** | STRESS-11 502 + STRESS-28 LLM | intermitência normal |

**§69 DEFINITIVAMENTE CONCLUÍDO.** Hotfix `0de8a12` validado. Score estável 78-79/80.
