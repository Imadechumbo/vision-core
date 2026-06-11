# Vision Core — Stress Test V4 Results

**Data:** 2026-06-11T09:58:40.970Z
**Resultado:** 9/15 PASS (60%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 28591ms | selected |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 26795ms | slice, 0, 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 20865ms |  |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ✅ PASS | 4613ms | score, string, + |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 31130ms |  |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 26409ms | await, readCache, Promise, getCache |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ❌ FAIL | 31548ms |  |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 31178ms | ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ✅ PASS | 4472ms | return, writeImageCache, then, persistImageCache |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ✅ PASS | 2505ms | await, persist, translationSession, fire |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ✅ PASS | 27569ms | || 9, undefined, NaN |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 944ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 26118ms | compartilhado |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ✅ PASS | 5692ms | push, fetchedItems, withSeedFallback |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ✅ PASS | 10180ms | scheduledTask, cron.schedule |

## Resumo

- PASS: 9/15 (60%)
- Blocos: H=2/5, I=3/5, J=4/5