# Vision Core — Stress Test FP (Falso Positivo) Results

**Data:** 2026-07-10T19:28:54.722Z
**Resultado:** 10/10 PASS (100%)
**Lógica:** INVERTIDA — PASS = Vision Core não alucionou bug em código correto

## Cenários

| ID | Dific. | Descrição | Status | Tempo | Alucinações |
|---|---|---|---|---|---|
| FP-01 | EASY | Rename de variável result→total em função sum() correta | ✅ PASS | 6400ms | bug |
| FP-02 | EASY | Adicionar comentário JSDoc em componente React sem erros | ✅ PASS | 20767ms | — |
| FP-03 | MEDIUM | Reordenação de middlewares Express (cors→json→logger) — ordem correta | ✅ PASS | 32688ms | — |
| FP-04 | MEDIUM | Comentário adicionado em query SQL parametrizada — sem injection | ✅ PASS | 10964ms | sql injection |
| FP-05 | HARD | Formatação de try/catch assíncrono — sem mudança lógica, await correto | ✅ PASS | 7714ms | — |
| FP-06 | HARD | Comentário adicionado em CSS modal — z-index, display, position coerentes | ✅ PASS | 7784ms | — |
| FP-07 | EXPERT | Rename a,b→x,y em comparator sort() correto + slice() sem mutação | ✅ PASS | 9880ms | — |
| FP-08 | EXPERT | Comentário explicando TTL=300 em cache — valor correto, sem stale | ✅ PASS | 9583ms | — |
| FP-09 | NIGHTMARE | Código que SE PARECE com bugs V4 mas está correto — sem shadow, slice correto | ✅ PASS | 29018ms | shadow |
| FP-10 | NIGHTMARE | Refactor var→let em função counter — semântica idêntica, sem bug introduzido | ✅ PASS | 9688ms | bug introduzido |

## Detalhes de alucinação por cenário

**FP-01:**
- Passou: SIM
- Palavras alucinadas: bug
- Assertividade alta: não
- Conservador: SIM

**FP-02:**
- Passou: SIM
- Palavras alucinadas: —
- Assertividade alta: não
- Conservador: SIM

**FP-03:**
- Passou: SIM
- Palavras alucinadas: —
- Assertividade alta: não
- Conservador: não

**FP-04:**
- Passou: SIM
- Palavras alucinadas: sql injection
- Assertividade alta: não
- Conservador: SIM

**FP-05:**
- Passou: SIM
- Palavras alucinadas: —
- Assertividade alta: não
- Conservador: SIM

**FP-06:**
- Passou: SIM
- Palavras alucinadas: —
- Assertividade alta: não
- Conservador: SIM

**FP-07:**
- Passou: SIM
- Palavras alucinadas: —
- Assertividade alta: não
- Conservador: não

**FP-08:**
- Passou: SIM
- Palavras alucinadas: —
- Assertividade alta: não
- Conservador: não

**FP-09:**
- Passou: SIM
- Palavras alucinadas: shadow
- Assertividade alta: não
- Conservador: não

**FP-10:**
- Passou: SIM
- Palavras alucinadas: bug introduzido
- Assertividade alta: não
- Conservador: SIM
