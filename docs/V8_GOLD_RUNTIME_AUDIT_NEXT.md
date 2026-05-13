# V8 Gold Runtime Audit — Active Map

Current frontend state: `V8_PURE_VISUAL_SNAPSHOT MODE`.

The V8 Gold visual is preserved. Promotion and deploy remain blocked.

This document is the mandatory audit before removing any legacy V8 runtime script.

## Rule

Do not remove legacy runtime scripts until their visual and behavioral responsibilities are mapped.

The V8 pure snapshot currently depends on legacy assets for visual parity. Removing them blindly breaks:

- orbit
- agent metrics
- pipeline visual
- mission timeline
- chat
- create-pr visual controls
- pass_gold visual state
- below-scroll sections

## Audit Status

Initial audit pass completed for the highest-risk scripts that directly patch fetch/SSE, bind execution buttons, or render agent boards.

Remaining legacy scripts are still marked `PENDING`. Do not remove them yet.

## Runtime Responsibility Table

| Script | DOM IDs/classes used | Visual role | Runtime role | Risk | Clean destination |
|---|---|---|---|---|---|
| `vision-runtime-v297.js` | Global `window.RUNTIME_CONFIG`, `window.API_BASE_URL`, `window.__VISION_API__`, `window.API`, `window.VisionCoreRuntime`, `window.fetch`, `window.EventSource` | none directly; bootstraps API globals used by visual/runtime scripts | rewrites API URLs, patches global fetch, patches EventSource, exposes `getVisionApi()` | CRITICAL: global fetch/EventSource override; must not survive clean mode | `vision-api.js` for API base and URL normalization only. Do not port global fetch/EventSource monkeypatch. |
| `vision-v297-interactions.js` | `v297ChatLog`, `v236CopilotMiniChat`, `mcLiveBadge`, `.v236-tl-step`, `executeBtn`, `missionText`, `v297RunSddfBtn`, `v297AddFileBtn`, `v236FileBtn`, `v297AddImageBtn`, `v297FileInput`, `v236FileInput`, `v236CopilotBtn` | chat append, body pipeline state classes, compact timeline state, file/image button UX, PASS GOLD visual state | posts to `/run-live`, starts EventSource fallback, binds execution button, updates timeline, calls `/copilot` | CRITICAL: duplicate execution owner, unsafe SSE, mission query string stream, PASS GOLD visual state | split into `vision-chat.js` for chat/file UX, `vision-agent-local.js` for visual state, `vision-runtime-owner.js` for real execution after contract alignment |
| `v23-ui-system.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `v231-backend-agents.js` | `agentMetricsLarge`, `agentsCatalogGrid`, `metricsBoard .live-pill`, `mcMetricsGrid`, CSS classes `metric-big-row`, `agent-real-card`, `agent-status-chip` | renders large Agent Metrics board and OpenSquad reserve cards; paints small metrics data colors | fetches `/api/metrics/agents` and `/api/agents/catalog`; falls back to local metrics and agents when backend unavailable | HIGH: useful visual renderer, but fallback can look real unless clearly marked local | `vision-agent-local.js` for visual metrics rendering; optional `vision-api.js` endpoints; preserve explicit LOCAL/UI markers |
| `v233-realtime.js` | `processScreen`, `processTitle`, `processMessage`, `processStage`, `runtimeMonitor`, `runtimeText`, `.v23-top-eye`, `.eye-wrap`, `mcCore`, `mcCoreStatus`, `logsPanel`, `logsBox`, `timelineBox`, `projectSelector`, `missionText`, `runMode`, `executeBtn` | live process screen, runtime badges, eye/core state, log stream, mission timeline | defines `RUN_PATH`, `STREAM_PATH`, opens EventSource, binds `executeBtn.onclick`, polling fallback, calls `/api/run-live`, `/api/mission/:id` | CRITICAL: duplicate runtime owner and forbidden markers; high regression source | `vision-runtime-owner.js` for execution lifecycle; `vision-report.js`/`vision-agent-local.js` for visual updates; do not port `executeBtn.onclick` or static paths |
| `v273-sddf-command-chat.js` | `missionText`, `executeBtn`, `v236CopilotBtn`, `processScreen`, `processTitle`, `processMessage`, `processStage`, `v236FileInput`, dynamic `v273CommandPanel`, `v273-sddf-bar`, `v273-chip-row` | command chat panel, SDDF gate chips, prompt chips, process header updates | sends `/api/copilot`, opens EventSource with mission query params, fallback POST to `/api/run-live`, binds execute button with capture | CRITICAL: duplicate chat/runtime owner; unsafe direct SSE; useful SDDF UI/gate visual | `vision-chat.js` for chat/chips/files; `vision-runtime-owner.js` for execution; `vision-report.js` for gates/evidence |
| `vision-v298-command-chat.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `vision-v298-final-hard-fix2.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `vision-v299-fullstack-runtime.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `vision-v2910-clean-runtime.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `vision-v32-orbit-runtime.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `vision-v34-enterprise.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `vision-v35-telemetry.js` | PENDING | PENDING | PENDING | PENDING | PENDING |
| `vision-v44-runtime-consistency.js` | PENDING | PENDING | PENDING | PENDING | PENDING |

## Findings From Initial Pass

### 1. Runtime ownership is fragmented

At least three legacy scripts bind or influence mission execution:

- `vision-v297-interactions.js`
- `v233-realtime.js`
- `v273-sddf-command-chat.js`

Clean migration must restore one owner only:

- `frontend/assets/vision-runtime-owner.js`

### 2. API ownership is fragmented

Legacy scripts set API globals and rewrite requests through multiple mechanisms:

- direct `window.RUNTIME_CONFIG`
- direct `window.API_BASE_URL`
- direct `window.__VISION_API__`
- `window.fetch` monkeypatch
- `window.EventSource` monkeypatch

Clean migration must restore one API client only:

- `frontend/assets/vision-api.js`

### 3. Agent metrics are useful but need clean ownership

`v231-backend-agents.js` is visually valuable because it renders:

- large metrics board
- OpenSquad reserve cards
- backend/local source badge

This should be ported as visual-only rendering into `vision-agent-local.js`, with clear `LOCAL UI` markers when using fallback data.

### 4. SDDF chat/gates are useful but mixed with runtime

`v273-sddf-command-chat.js` contains useful command UX:

- chips
- SDDF gates
- process header updates
- file list
- explanation mode

But it also opens SSE and binds runtime. Port only UI behavior to `vision-chat.js` and leave execution to `vision-runtime-owner.js`.

## Legacy Audit Questions

For each remaining pending script, answer:

1. Which DOM IDs does it read?
2. Which DOM IDs does it write?
3. Which classes does it add or remove?
4. Which buttons does it bind?
5. Does it initialize orbit?
6. Does it initialize agent metrics?
7. Does it initialize chat?
8. Does it initialize Mission Control?
9. Does it open SSE/EventSource?
10. Does it override `window.fetch`?
11. Does it use `RUN_PATH` or `STREAM_PATH`?
12. Does it generate mission IDs?
13. Does it hardcode PASS GOLD true?
14. Does it hardcode promotion allowed true?
15. Does it call or simulate create-pr?

## Clean Destinations

Map responsibilities into clean files:

- `frontend/assets/vision-api.js`
- `frontend/assets/vision-chat.js`
- `frontend/assets/vision-agent-local.js`
- `frontend/assets/vision-runtime-owner.js`
- `frontend/assets/vision-report.js`

## Pi Harness Dependency

Pi Harness visual slot must not be implemented until the orbit and agent metrics responsibilities are known.

Pi Harness can be added safely only after:

- orbit ownership is known
- agent node rendering is known
- metrics ownership is known
- PASS GOLD visual state ownership is known

## Migration Plan

### Step A — Complete Audit
Document every legacy runtime responsibility.

### Step B — Port Visual Initializers
Move visual-only initialization into clean V14 scripts without enabling unsafe runtime behavior.

### Step C — Remove Legacy Scripts Incrementally
Remove one legacy script at a time and compare visual output.

Suggested removal order after full audit:

1. duplicate command/chat runtime after porting chat visuals
2. duplicate realtime runtime after Runtime Owner handles execution
3. fetch/EventSource monkeypatch after VisionApi handles endpoint normalization
4. metrics renderer after porting metrics to Agent Local
5. orbit runtime last, after Pi slot/agent rendering ownership is stable

### Step D — Restore V14 Clean Mode
Once the V8 Gold visual works with clean scripts only, switch guard back to `V14_CLEAN_RUNTIME MODE`.

### Step E — Only Then Implement Pi Slot
Add Pi Harness to the Vision Agent Local wheel after the wheel ownership is stable.

## Stop Conditions

Stop immediately if:

- V8 visual changes unexpectedly
- orbit breaks
- agent metrics disappear
- chat stops rendering
- PASS GOLD becomes hardcoded active
- PR creation becomes active without PASS GOLD
- deploy or promotion is enabled
