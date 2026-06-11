# Vision Core — Stress Test V4 Results

**Data:** 2026-06-11T10:28:20.326Z
**Resultado:** 1/15 PASS (7%)

## Cenários

| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |
|---|---|---|---|---|---|---|
| STRESS-41 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1494ms |  |
| STRESS-42 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 1179ms | 6 |
| STRESS-43 | H | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1975ms |  |
| STRESS-44 | H | NIGHTMARE | backend/src/services/hermesService.js | ❌ FAIL | 1155ms |  |
| STRESS-45 | H | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1105ms |  |
| STRESS-46 | I | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1069ms |  |
| STRESS-47 | I | NIGHTMARE | backend/src/services/gameCoverService.js | ❌ FAIL | 1686ms |  |
| STRESS-48 | I | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1126ms | ok |
| STRESS-49 | I | EXPERT | backend/src/services/imageService.js | ❌ FAIL | 1280ms |  |
| STRESS-50 | I | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1110ms |  |
| STRESS-51 | J | NIGHTMARE | backend/src/services/gameCoverService.js | ❌ FAIL | 3083ms |  |
| STRESS-52 | J | EXPERT | backend/src/jobs/hermesCron.js | ✅ PASS | 717ms | jobStarted, const, shadow, cron |
| STRESS-53 | J | NIGHTMARE | backend/src/services/feedService.js | ❌ FAIL | 1093ms |  |
| STRESS-54 | J | EXPERT | backend/src/services/feedService.js | ❌ FAIL | 1372ms |  |
| STRESS-55 | J | NIGHTMARE | backend/src/jobs/refreshScheduler.js | ❌ FAIL | 1011ms |  |

## Resumo

- PASS: 1/15 (7%)
- Blocos: H=0/5, I=0/5, J=1/5