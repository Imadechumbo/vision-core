# Vision Core — Stress Test V4 Results

**Data:** 2026-06-11T14:37:51.386Z
**Resultado:** 10/15 PASS (67%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 7616ms | selected, shadow, selected.push |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 31326ms | 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 13067ms | categoryMatch, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 8781ms | score, string, calculateRanking, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 3289ms | sort, spread |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 10908ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 15214ms | allSettled, Promise.all, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 31394ms | ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ❌ FAIL | 31435ms |  |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 3402ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 12131ms | sourceTierFor, || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ❌ FAIL | 31188ms |  |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 17834ms | enrichedCount, módulo, compartilhado, hydrateMissingImages |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 31314ms |  |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 14702ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 10/15 (67%)
- Blocos: H=4/5, I=3/5, J=3/5