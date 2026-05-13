# V14 + PI HARNESS — Remaining Legacy Ownership Audit

Status: Fase 3.2
Branch: `main`
Base validada: `70ab44b`

Regra central:

> Visual congelado. Motor em refatoração. PASS GOLD só com evidência.

## Estado confirmado

- `vision-agent-local.js` é o clean owner de:
  - órbita N1–N8
  - PI HARNESS
  - Agent Metrics
  - `fallbackMetrics`
  - `renderMetrics`
  - `renderLargeMetrics`
  - `renderSmallMetric`
- `v231-backend-agents.js` foi reduzido a adapter/delegador.
- `vision-v35-telemetry.js` foi reduzido a adapter/delegador.
- `tools/sddf-front-guard.mjs` ainda está em `V8 PURE VISUAL SNAPSHOT MODE`.
- Promotion/deploy seguem bloqueados.

## Arquivos ainda legados e risco

### `frontend/assets/vision-v34-enterprise.js`

Ownership remanescente:

- interceptação de SSE
- ativação visual de orbit
- reset visual de orbit
- system status block
- polling de runtime/workers
- Mission Report no chat
- observer de PASS GOLD no chat
- neutralização de demo fake

Risco:

- alto para remoção direta
- toca fluxo runtime/orbit/report/status ao mesmo tempo
- não deve ser apagado antes dos clean owners assumirem explicitamente cada parte

Destino planejado:

- orbit/status de agentes -> `vision-agent-local.js`
- execução/SSE -> `vision-runtime-owner.js`
- Mission Report -> `vision-report.js`
- API helpers -> `vision-api.js`
- chat observers -> remover ou migrar para `vision-report.js` apenas se houver evidence real

### `frontend/assets/vision-v44-runtime-consistency.js`

Ownership remanescente:

- sticky/layout guard do painel local
- ponte SSE para `VisionAgentLocal`
- Mission Report legacy
- sync de gates SDDF
- download link enforcement
- zeroFake guard
- demo/preview do PI HARNESS ainda precisa ser tratado como pendência antes do clean mode final

Risco:

- médio/alto para remoção direta
- hoje é ponte entre runtime legado e clean owner
- não deve ser removido antes de confirmar que `vision-runtime-owner.js`, `vision-agent-local.js` e `vision-report.js` cobrem suas responsabilidades

Destino planejado:

- sticky/layout guard -> CSS/vision-gold ou remover se não necessário
- SSE bridge -> `vision-runtime-owner.js`
- report -> `vision-report.js`
- gates -> `vision-report.js` ou backend payload
- download link enforcement -> HTML estático ou remover
- zeroFake -> futuro guard limpo

## Próxima fase recomendada

### Fase 4 — Chat limpo

Objetivo:

Centralizar o chat em `vision-chat.js` e transformar scripts legados de chat em adapters ou removê-los gradualmente.

Arquivos a auditar:

- `frontend/assets/v273-sddf-command-chat.js`
- `frontend/assets/vision-v298-command-chat.js`
- `frontend/assets/vision-v299-fullstack-runtime.js`
- `frontend/assets/vision-v2910-clean-runtime.js`
- `frontend/assets/vision-chat.js`

Critérios:

- `vision-chat.js` deve ser o único owner de chat/UX/anexos/chips.
- Chat não pode chamar runtime endpoint.
- Chat não pode abrir SSE.
- Chat não pode criar `mission_id`.
- Chat não pode decidir PASS GOLD.
- `vision-runtime-owner.js` permanece único dono da execução.

## Não fazer ainda

- Não remover `vision-v34-enterprise.js`.
- Não remover `vision-v44-runtime-consistency.js`.
- Não mudar `index.html` nesta fase.
- Não ativar deploy/promotion.
- Não trocar guard para clean mode ainda.

## Critério para avançar

Antes de qualquer remoção de script legado:

```cmd
node --check frontend\assets\vision-agent-local.js
node --check frontend\assets\vision-runtime-owner.js
node --check frontend\assets\vision-report.js
node --check frontend\assets\vision-chat.js
node tools\sddf-front-guard.mjs
git diff --check
git status
```

Visual testado localmente deve manter:

- V8 Gold aprovado
- orbit N1–N8
- PI HARNESS em N8
- métricas neutras sem fake cost
- PASS GOLD bloqueado sem `evidence_receipt`
