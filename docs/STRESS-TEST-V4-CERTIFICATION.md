# Vision Core — Stress Test V4 Certification

**Data:** 2026-06-06  
**Versão:** V3.0.0  
**Resultado:** ✅ 15/15 PASS (100%) — PRIMEIRO RUN

## Destaque

V4 é o segundo stress test consecutivo a passar 100% no Run 1.
Nível EXPERT/NIGHTMARE — bugs que não produzem erro no console.

## Histórico

| Run | PASS | Taxa |
|---|---|---|
| Run 1 | 15/15 | 100% |

## Cenários (todos EXPERT/NIGHTMARE)

| Bloco | ID | Dific. | Arquivo | Bug | Tempo |
|---|---|---|---|---|---|
| H — Invisíveis | STRESS-41 | NIGHTMARE | feedService.js | `const selected` shadow no loop | 1.6s |
| H — Invisíveis | STRESS-42 | NIGHTMARE | hermesService.js | `.slice(1,6)` off-by-one | 0.9s |
| H — Invisíveis | STRESS-43 | NIGHTMARE | feedService.js | `item.category = 'hardware'` atribuição muta itens | 1.2s |
| H — Invisíveis | STRESS-44 | NIGHTMARE | hermesService.js | `'' + score + 1` → scores viram strings | 8.3s |
| H — Invisíveis | STRESS-45 | EXPERT | feedService.js | `items.sort()` sem spread — muta array original | 18.0s |
| I — Async | STRESS-46 | NIGHTMARE | feedService.js | `readCache()` sem await — cache é Promise | 1.2s |
| I — Async | STRESS-47 | NIGHTMARE | gameCoverService.js | `Promise.all` em vez de `allSettled` | 1.3s |
| I — Async | STRESS-48 | EXPERT | feedService.js | catch swallowing → status `ok` em erros | 13.2s |
| I — Async | STRESS-49 | EXPERT | imageService.js | `return` omitido em `.then` — chain quebrada | 1.4s |
| I — Async | STRESS-50 | NIGHTMARE | feedService.js | `persist()` fire-and-forget sem await | 8.3s |
| J — Estado | STRESS-51 | NIGHTMARE | gameCoverService.js | `SOURCE_TIERS.get` sem `|| 9` → NaN | 39.4s |
| J — Estado | STRESS-52 | EXPERT | hermesCron.js | `const jobStarted` local shadow | 0.8s |
| J — Estado | STRESS-53 | NIGHTMARE | feedService.js | `enrichedCount` em módulo — estado compartilhado | 1.2s |
| J — Estado | STRESS-54 | EXPERT | feedService.js | `push()` em vez de spread — muta parâmetro | 1.2s |
| J — Estado | STRESS-55 | NIGHTMARE | refreshScheduler.js | `scheduledTask.stop()` removido — cron acumula | 1.7s |

## Evolução do sistema de testes

| Suite | Runs para 100% | Técnicas introduzidas |
|---|---|---|
| V1 | 3 runs | §53 diff contextual |
| V2 | 5 runs | §55 windowContent + §56 multi-DIFF |
| V3 | 1 run | patches verificados + esperado com valores literais |
| V4 | 1 run | metodologia consolidada — NIGHTMARE sem ajuste |

## Placar geral

| Suite | PASS | Taxa |
|---|---|---|
| V1 | 10/10 | 100% |
| V2 | 15/15 | 100% |
| V3 | 15/15 | 100% |
| V4 | 15/15 | 100% |
| Total | 55/55 | 100% |
