# Vision Core — Stress Test V4 Results

**Data:** 2026-06-13T08:39:42.669Z
**Resultado:** 15/15 PASS (100%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 8353ms | selected, shadow, diversifyCollection, selected.push |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 1441ms | slice, summarizeTrends, 0, 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 12569ms | ===, hardware |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 2112ms | score, string, calculateRanking, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ✅ PASS | 15593ms | sort, spread, items, dedupeItems |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 2044ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 10842ms | allSettled, Promise.all, fulfilled, sourceResults |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ✅ PASS | 1598ms | catch, error.message, status, ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 23325ms | return, writeImageCache, then, persistImageCache |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 2604ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 2751ms | sourceTierFor, || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 1593ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 8465ms | enrichedCount, módulo, compartilhado, hydrateMissingImages |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 3918ms | push, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 12411ms | scheduledTask, stop, cron.schedule |

## Resumo

- PASS: 15/15 (100%)
- Blocos: H=5/5, I=5/5, J=5/5