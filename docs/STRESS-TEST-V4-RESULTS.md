# Vision Core — Stress Test V4 Results

**Data:** 2026-06-11T12:18:12.994Z
**Resultado:** 1/15 PASS (7%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1203ms |  |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 1161ms | 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1086ms |  |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 1223ms |  |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1154ms |  |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1667ms |  |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ❌ FAIL | 1687ms |  |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1101ms | ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ❌ FAIL | 1331ms |  |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1096ms |  |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ❌ FAIL | 1538ms |  |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 773ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1108ms |  |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1135ms |  |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ❌ FAIL | 1034ms |  |

## Resumo

- PASS: 1/15 (7%)
- Blocos: H=0/5, I=0/5, J=1/5