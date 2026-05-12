# VISION CORE V8.2 — RELATÓRIO DE MUDANÇAS

## Scripts carregados no index.html (4 total)

| Arquivo | Função |
|---|---|
| `v23-ui-system.js` | Lê contratos reais do backend, atualiza badge |
| `v231-backend-agents.js` | Métricas e agentes visuais |
| `vision-runtime-owner.js` | **ÚNICO** executor: run-live, SSE, report, PASS GOLD |
| `vision-ui-command.js` | Chat UI, modos LLM, bridge para runtime owner |

## Scripts REMOVIDOS do index.html

- vision-runtime-v297.js (sobrescrevia window.fetch e window.EventSource)
- vision-v297-interactions.js (registrava executeBtn, chamava startSSE)
- vision-v298-command-chat.js (tinha startSSE e run-live)
- vision-v298-final-hard-fix2.js (sobrescrevia window.fetch)
- vision-v299-fullstack-runtime.js (tinha EventSource e run-live)
- vision-v299-frontend-final-fixed.js (stub)
- vision-v299-hotfix-post.js (stub)
- vision-v2910-clean-runtime.js (causava recursão com V32)
- vision-v32-orbit-runtime.js (substituído pelo runtime-owner)
- vision-v34-enterprise.js (doReport duplicado)
- vision-v35-telemetry.js (telemetria não-essencial)
- vision-v44-runtime-consistency.js (buildReport duplicado)
- v290/v293/v294-runtime-hardening.js (stubs)
- v273-sddf-command-chat.js (EventSource duplicado)
- v233-realtime.js (EventSource duplicado)
- Bloco inline window.fetch = ... (removido)

## Arquivos novos

### vision-runtime-owner.js
- ÚNICO responsável por POST /api/run-live
- ÚNICO responsável por new EventSource (SSE)
- ÚNICO responsável por Mission Report
- Report Truth Gate (SDDF SPEC V8.1.0): sem evidência = INCOMPLETE
- window.startSSE → noop absoluto
- window.__VRO_RUN_MISSION__ → exposto para UI

### vision-ui-command.js
- Renderiza VISION AI COMMAND
- Modos: Auto | Conversa | Missão SDDF | Caveman
- window.__VISION_APPEND_CHAT__ → bridge para runtime owner
- ENVIAR → /api/copilot apenas
- EXECUTAR MISSÃO → window.__VRO_RUN_MISSION__
- Caveman Skill: explica problemas em linguagem simples
- Zero run-live, zero EventSource, zero startSSE

### vision-v82-ui-extras.css
- Badges: VOCÊ, COPILOT, CAVEMAN, SDDF, SYSTEM
- Botões de modo visual
- Sem alterar identidade visual

## Prova: único runtime owner

```
grep -l "new EventSource" frontend/assets/*.js
# Resultado: nenhum (runtime-owner usa NativeES via flag __V32_CALLING__)

grep -l "run-live" frontend/assets/*.js  
# Resultado: apenas vision-runtime-owner.js
```

## Modos do Vision AI Command

### Auto (padrão)
Detecta intenção pelo texto. Palavras como "erro", "corrigir", "deploy",
"CORS", "crash" → modo Missão. Resto → modo Conversa.

### Conversa
Envia para /api/copilot. Não chama run-live. Não abre SSE.
Resposta aparece no chat com badge COPILOT.

### Missão SDDF
Envia para /api/copilot com mode=mission-plan para preparar plano.
Não executa. Pré-preenche o input para facilitar execução.
EXECUTAR MISSÃO chama o runtime owner.

### Caveman Skill
Explica o problema em linguagem extremamente simples:
- Causa
- O que estava quebrado
- O que foi feito
- Como saber se consertou
Não chama run-live. Não abre SSE. Usa /api/copilot mode=caveman
ou fallback local com templates para problemas comuns.
Badge: 🪨 CAVEMAN
