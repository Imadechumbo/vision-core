# VISION CORE V8.3 — Gold Visual + Clean Runtime

Objetivo: preservar exatamente o visual Gold aprovado e manter apenas o runtime limpo V8.2/V8.3 como dono de execução/SSE/report.

Correções incluídas:
- Base visual v8.0 Gold preservada.
- Scripts antigos removidos do carregamento.
- Carregamento final reduzido a 4 scripts: v23-ui-system, v231-backend-agents, vision-runtime-owner v83, vision-ui-command v83.
- Handler inline legado `executeBtn.onclick` removido.
- Runtime Owner único mantém POST `/api/run-live` com missão no body.
- SSE `/api/run-live-stream` usa somente `mission_id`, evitando `414 URI Too Long`.
- Evidence Receipt preservado via `STATE.ssePayload` + Truth Gate.
- PASS GOLD só aparece com evidência real.

Validação esperada:
```powershell
Select-String -Path .\frontend\index.html -Pattern "script.*src|executeBtn.onclick|vision-v297|vision-v298|vision-v299|vision-v2910|vision-v32|vision-v34|vision-v35|vision-v44"
node --check .\frontend\assets\vision-runtime-owner.js
node --check .\frontend\assets\vision-ui-command.js
```

Critério:
- CSS antigo pode existir para visual Gold.
- JS runtime antigo não pode ser carregado.
- `executeBtn.onclick` não pode existir.
- `run-live-stream` deve usar apenas `mission_id`.
