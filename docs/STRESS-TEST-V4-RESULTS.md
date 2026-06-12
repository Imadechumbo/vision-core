# Vision Core — Stress Test V4 Results

**Data:** 2026-06-12T13:26:04.761Z
**Resultado:** 15/15 PASS (100%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 14195ms | selected, shadow, diversifyCollection, selected.push |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 23209ms | slice, summarizeTrends, 0, 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 8896ms | categoryMatch, ===, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 36944ms | score, string, calculateRanking, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 13027ms | sort, spread, items, dedupeItems |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 6968ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 14048ms | allSettled, Promise.all, fulfilled, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ✅ PASS | 12458ms | catch, error.message, status, ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 15744ms | return, writeImageCache, then, persistImageCache |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 9702ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 14129ms | sourceTierFor, || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 1415ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 17922ms | enrichedCount, módulo, compartilhado, hydrateMissingImages |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 8953ms | push, spread, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 979ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 15/15 (100%)
- Blocos: H=5/5, I=5/5, J=5/5