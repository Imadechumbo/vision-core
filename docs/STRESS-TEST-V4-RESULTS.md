# Vision Core — Stress Test V4 Results

**Data:** 2026-06-11T13:40:42.741Z
**Resultado:** 10/15 PASS (67%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 31526ms |  |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 31238ms | 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 24042ms | ===, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 2442ms | score, string, calculateRanking, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 23654ms | sort, spread, items |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 18718ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 29531ms | allSettled, Promise.all, fulfilled, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ✅ PASS | 12778ms | catch, error.message, status, ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 10622ms | return, writeImageCache, then |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 31206ms |  |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 6498ms | sourceTierFor, || 9, undefined |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ❌ FAIL | 31412ms |  |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 31184ms |  |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 12164ms | push, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 14268ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 10/15 (67%)
- Blocos: H=3/5, I=4/5, J=3/5