# Vision Core — Stress Test V4 Results

**Data:** 2026-07-09T06:53:22.420Z
**Resultado:** 14/15 PASS (93%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 12913ms | selected, shadow, diversifyCollection, selected.push |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 12800ms | slice, summarizeTrends, 0, 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 8894ms | categoryMatch, ===, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 40959ms | score, string, calculateRanking, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 11824ms | sort, spread, items, dedupeItems |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 8409ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 19082ms | allSettled, Promise.all, fulfilled, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ✅ PASS | 9908ms | catch, error.message, status, ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 13253ms | return, writeImageCache, then, persistImageCache |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 14913ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 11794ms | sourceTierFor, || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 1203ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 61205ms |  |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 15042ms | push, spread, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 8153ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 14/15 (93%)
- Blocos: H=5/5, I=5/5, J=4/5