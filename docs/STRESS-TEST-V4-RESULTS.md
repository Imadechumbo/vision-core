# Vision Core — Stress Test V4 Results

**Data:** 2026-06-13T11:58:25.362Z
**Resultado:** 15/15 PASS (100%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 19089ms | selected, shadow, diversifyCollection, selected.push |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 5937ms | slice, summarizeTrends, 0, 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 9114ms | categoryMatch, ===, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 6179ms | score, string, calculateRanking, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 6411ms | sort, spread, items, dedupeItems |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 11006ms | await, readCache, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 5823ms | allSettled, Promise.all, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ✅ PASS | 11382ms | catch, error.message, status, ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 19365ms | return, writeImageCache, then |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 5675ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 19455ms | sourceTierFor, || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 3030ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 4152ms | enrichedCount, módulo, compartilhado, hydrateMissingImages |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 7805ms | push, spread, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 5205ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 15/15 (100%)
- Blocos: H=5/5, I=5/5, J=5/5