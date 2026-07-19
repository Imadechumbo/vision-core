# Vision Core — Stress Test V4 Results

**Data:** 2026-07-19T01:26:47.133Z
**Resultado:** 15/15 PASS (100%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 10409ms | selected, shadow, diversifyCollection, selected.push |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 8664ms | slice, summarizeTrends, 0, 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 8887ms | categoryMatch, ===, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 9184ms | score, string, calculateRanking, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 9325ms | sort, spread, items, dedupeItems |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 6629ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 19463ms | allSettled, Promise.all, fulfilled, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ✅ PASS | 10585ms | catch, error.message, status, ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 31856ms | return, writeImageCache, then, persistImageCache |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 11201ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 10571ms | sourceTierFor, || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 747ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 8019ms | enrichedCount, módulo, compartilhado, hydrateMissingImages |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 10921ms | push, spread, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 11835ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 15/15 (100%)
- Blocos: H=5/5, I=5/5, J=5/5