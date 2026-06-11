# Vision Core — Stress Test V4 Results

**Data:** 2026-06-11T11:00:15.414Z
**Resultado:** 1/15 PASS (7%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1166ms |  |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 1330ms | 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1120ms |  |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 1113ms |  |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1146ms |  |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1208ms |  |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ❌ FAIL | 1624ms |  |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1187ms | ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ❌ FAIL | 1319ms |  |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1154ms |  |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ❌ FAIL | 1753ms |  |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 2297ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1104ms |  |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1118ms |  |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ❌ FAIL | 1030ms |  |

## Resumo

- PASS: 1/15 (7%)
- Blocos: H=0/5, I=0/5, J=1/5