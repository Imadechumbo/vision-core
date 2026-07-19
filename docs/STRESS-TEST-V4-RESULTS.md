# Vision Core — Stress Test V4 Results

**Data:** 2026-07-19T14:58:58.511Z
**Resultado:** 15/15 PASS (100%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 1128ms | selected, shadow, selected.push |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 68125ms | slice, summarizeTrends, 0, 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 1072ms | ===, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 649ms | score, string, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 1178ms | sort, spread, items |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 19284ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 2815ms | allSettled, Promise.all, fulfilled, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ✅ PASS | 20026ms | catch, error.message, status, ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 1176ms | return, writeImageCache, then |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 10532ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 5523ms | sourceTierFor, || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 607ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 16289ms | enrichedCount, módulo, compartilhado, hydrateMissingImages |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 10408ms | push, spread, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 762ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 15/15 (100%)
- Blocos: H=5/5, I=5/5, J=5/5