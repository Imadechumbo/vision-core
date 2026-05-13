# V8 Gold Runtime Audit — Complete Map

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

Runtime audit map completed for all listed V8/V14 legacy runtime scripts.

Do not remove any legacy script until visual initializers are ported to the clean V14 files and the V8 Gold visual is compared after each removal.

## Runtime Responsibility Table

| Script | DOM IDs/classes used | Visual role | Runtime role | Risk | Clean destination |
|---|---|---|---|---|---|
| `vision-runtime-v297.js` | Global `window.RUNTIME_CONFIG`, `window.API_BASE_URL`, `window.__VISION_API__`, `window.API`, `window.VisionCoreRuntime`, `window.fetch`, `window.EventSource` | none directly; bootstraps API globals used by visual/runtime scripts | rewrites API URLs, patches global fetch, patches EventSource, exposes `getVisionApi()` | CRITICAL: global fetch/EventSource override; must not survive clean mode | `vision-api.js` for API base and URL normalization only. Do not port global fetch/EventSource monkeypatch. |
| `vision-v297-interactions.js` | `v297ChatLog`, `v236CopilotMiniChat`, `mcLiveBadge`, `.v236-tl-step`, `executeBtn`, `missionText`, `v297RunSddfBtn`, `v297AddFileBtn`, `v236FileBtn`, `v297AddImageBtn`, `v297FileInput`, `v236FileInput`, `v236CopilotBtn` | chat append, body pipeline state classes, compact timeline state, file/image button UX, PASS GOLD visual state | posts to `/run-live`, starts EventSource fallback, binds execution button, updates timeline, calls `/copilot` | CRITICAL: duplicate execution owner, unsafe SSE, mission query string stream, PASS GOLD visual state | split into `vision-chat.js` for chat/file UX, `vision-agent-local.js` for visual state, `vision-runtime-owner.js` for real execution after contract alignment |
| `v23-ui-system.js` | `mcLiveBadge`, `document.documentElement.dataset.contracts`, global `window.__VISION_CONTRACTS__` | small status badge: `CONTRACTS` vs `LOCAL UI`; marks document as `data-contracts=real/offline` | fetches `/api/runtime/contracts` and writes contracts object globally | MEDIUM: useful contract status probe, but global state and direct fetch should not own runtime | `vision-api.js` for `/api/runtime/contracts`; `vision-agent-local.js` for contract badge/status display |
| `v231-backend-agents.js` | `agentMetricsLarge`, `agentsCatalogGrid`, `metricsBoard .live-pill`, `mcMetricsGrid`, CSS classes `metric-big-row`, `agent-real-card`, `agent-status-chip` | renders large Agent Metrics board and OpenSquad reserve cards; paints small metrics data colors | fetches `/api/metrics/agents` and `/api/agents/catalog`; falls back to local metrics and agents when backend unavailable | HIGH: useful visual renderer, but fallback can look real unless clearly marked local | `vision-agent-local.js` for visual metrics rendering; optional `vision-api.js` endpoints; preserve explicit LOCAL/UI markers |
| `v233-realtime.js` | `processScreen`, `processTitle`, `processMessage`, `processStage`, `runtimeMonitor`, `runtimeText`, `.v23-top-eye`, `.eye-wrap`, `mcCore`, `mcCoreStatus`, `logsPanel`, `logsBox`, `timelineBox`, `projectSelector`, `missionText`, `runMode`, `executeBtn` | live process screen, runtime badges, eye/core state, log stream, mission timeline | defines `RUN_PATH`, `STREAM_PATH`, opens EventSource, binds `executeBtn.onclick`, polling fallback, calls `/api/run-live`, `/api/mission/:id` | CRITICAL: duplicate runtime owner and forbidden markers; high regression source | `vision-runtime-owner.js` for execution lifecycle; `vision-report.js`/`vision-agent-local.js` for visual updates; do not port `executeBtn.onclick` or static paths |
| `v273-sddf-command-chat.js` | `missionText`, `executeBtn`, `v236CopilotBtn`, `processScreen`, `processTitle`, `processMessage`, `processStage`, `v236FileInput`, dynamic `v273CommandPanel`, `v273-sddf-bar`, `v273-chip-row` | command chat panel, SDDF gate chips, prompt chips, process header updates | sends `/api/copilot`, opens EventSource with mission query params, fallback POST to `/api/run-live`, binds execute button with capture | CRITICAL: duplicate chat/runtime owner; unsafe direct SSE; useful SDDF UI/gate visual | `vision-chat.js` for chat/chips/files; `vision-runtime-owner.js` for execution; `vision-report.js` for gates/evidence |
| `vision-v298-command-chat.js` | `v298CommandChat`, `v298CommandStatus`, `v298ChatStream`, `v298Prompt`, `v298SendBtn`, `v298RunBtn`, `v298Mode`, `v298Model`, `v298Streaming`, `v298AddFilesBtn`, `v298ReadPrintBtn`, `v298ClearBtn`, `v298FileInput`, `mission`, `missionText`, `.v236-compact-timeline`, `.vc-process-screen`, `.v236-action-row`, `mcCore`, `.v236-tl-step` | builds replacement Vision AI Command chat, hides old controls, renders prompt/file controls, updates compact timeline and core state | posts to `/api/copilot`, `/api/hermes/analyze`, `/api/run-live`; creates SSE singleton placeholder/dummy; binds send/run/clear/file buttons | CRITICAL: creates its own chat/runtime owner and hides DOM controls. Useful visual shell but unsafe as execution owner | `vision-chat.js` for command chat UI and files; `vision-runtime-owner.js` for run button; `vision-agent-local.js` for timeline/core visual updates |
| `vision-v298-final-hard-fix2.js` | `v298Mode`, `v298Model`, `v298Streaming`, `.v298-dd`, `.v236-compact-timeline`, `v298CommandChat` | replaces native selects with custom dropdown UI, hides duplicate timelines | patches global fetch and EventSource; exposes `v298GetCommandMode`, `v298GetCommandModel`, `v298GetStreaming` | HIGH: visual dropdown useful, but network patch must not survive clean mode | `vision-chat.js` for dropdown/UI helpers only; `vision-api.js` must own URL normalization without monkeypatch |
| `vision-v299-fullstack-runtime.js` | `v299QuotaBadge`, `.v298-tool-row`, `v299ConfigModal`, `v299ProviderSelect`, `v299ApiKey`, `v299ModelDefault`, `v299SaveProvider`, `v299ProviderMsg`, `v299PlanInfo`, `v299ObsidianBtn`, `v298Mode`, `v298Model`, `v298ChatStream` | extends command chat with quota badge, provider config modal, Obsidian button, agent download, extra modes, injected modal CSS | calls `/api/usage/quota`, `/api/ai/providers`, `/api/ai/providers/save`, `/api/billing/plans`, `/api/billing/checkout`, `/api/memory/obsidian/status`; exposes `window.v299Upgrade` | HIGH: SaaS/provider UI useful, but mixes billing/provider actions into legacy runtime and injects CSS | `vision-chat.js` for UI controls; `vision-api.js` for endpoints; future billing/provider module if kept. Do not expose secrets client-side. |
| `vision-v2910-clean-runtime.js` | `v298Prompt`, `missionText`, `v298Mode`, `.v298-dd`, `v298Model`, `v298ChatStream`, `v297ChatLog`, `v236CopilotMiniChat`, `v298CommandStatus`, buttons/forms, `window.__nativeFetch`, `window.__nativeEventSource`, `window.VisionApi`, `window.VisionCoreRuntime` | final legacy command/chat intercept, state badges, duplicate timeline cleanup | owns API URL cleanup, POST/GET JSON, EB fallback, global fetch patch, EventSource patch, SSE singleton, form/button interception, `/run-live`, `/run-live-stream`, `/health` | CRITICAL: closest to clean intent but still global monkeypatch + EB fallback + duplicate Runtime Owner | split into `vision-api.js` for pure URL helpers, `vision-runtime-owner.js` for execution/SSE, `vision-chat.js` for intercept-free UI |
| `vision-v32-orbit-runtime.js` | `mcCore`, `mcCoreStatus`, `mcCoreSub`, `.mc-node[data-key]`, `v33-t-*`, `.mc-ps-badge`, `executeBtn`, `missionText`, `.mc-orb-wrap`, chat/report targets | owns orbit state, mc-node animation, core status, pipeline row status, sticky CSS support, mission report card | declares `window.__V32_OWNER__`, neutralizes old EventSource, owns SSE singleton, posts `/api/run-live`, fetches report endpoints | CRITICAL: orbit ownership and SSE ownership are mixed; must be last to remove after porting orbit visual behavior | `vision-agent-local.js` for orbit/core/node rendering; `vision-runtime-owner.js` for SSE; `vision-report.js` for report card |
| `vision-v34-enterprise.js` | `.mc-node[data-key]`, `v33-t-*`, `mcCore`, `mcCoreStatus`, `mcCoreSub`, `agentDownload`, `v34StatusBlock`, `v34s-*`, `v298ChatStream`, `v297ChatLog`, `logsBox` | orbit telemetry, system status block, sticky fix, PASS GOLD report observer, fake animation blocker | polls `/api/runtime/harness-stats`, `/api/workers/status`; observes SSE singleton; fetches mission/pass-gold/github/hermes/workers/logs report data | HIGH: valuable telemetry/reporting, but duplicates v32/v44 report/orbit logic | `vision-agent-local.js` for orbit/status, `vision-report.js` for report observer, `vision-api.js` for endpoint reads |
| `vision-v35-telemetry.js` | `bar-*`, `val-*`, `mcTotalCost`, `v298ChatStream`, `v297ChatLog` | updates right-panel metric bars and total cost, fallback PASS GOLD bar from harness stats | polls `/api/metrics/agents`, `/api/runtime/harness-stats`; observes PASS GOLD text if v34 absent | MEDIUM-HIGH: useful telemetry but duplicates metrics ownership | `vision-agent-local.js` for metric rendering; `vision-api.js` for polling helpers |
| `vision-v44-runtime-consistency.js` | `.mc-node[data-key]`, `v33-t-*`, `mcCore`, `mcCoreStatus`, `mcCoreSub`, right aside, `agentDownload`, download links, `executeBtn`, chat/report targets, gate ids | final consistency layer for sticky, download link, orbit SSE state, Mission Report, gates | attaches to `window.__VISION_SSE__`, observes chat, polls pass-gold/runtime endpoints, builds real report, blocks fake animation | HIGH: useful final consistency ideas but duplicates v32/v34/v35 and can mask ownership boundaries | `vision-agent-local.js` for sticky/orbit/gates, `vision-report.js` for report, keep download link static in HTML/CSS |

## Findings From Audit

### 1. Runtime ownership is fragmented

At least six legacy scripts bind or influence mission execution:

- `vision-v297-interactions.js`
- `v233-realtime.js`
- `v273-sddf-command-chat.js`
- `vision-v298-command-chat.js`
- `vision-v2910-clean-runtime.js`
- `vision-v32-orbit-runtime.js`

Clean migration must restore one owner only:

- `frontend/assets/vision-runtime-owner.js`

### 2. API ownership is fragmented

Legacy scripts set API globals and rewrite requests through multiple mechanisms:

- direct `window.RUNTIME_CONFIG`
- direct `window.API_BASE_URL`
- direct `window.__VISION_API__`
- `window.fetch` monkeypatch
- `window.EventSource` monkeypatch
- EB fallback logic
- per-script `apiUrl()` helpers

Clean migration must restore one API client only:

- `frontend/assets/vision-api.js`

### 3. Agent metrics are useful but need clean ownership

`v231-backend-agents.js`, `vision-v35-telemetry.js`, `vision-v34-enterprise.js`, and `vision-v44-runtime-consistency.js` all affect metric/status rendering.

Clean owner:

- `frontend/assets/vision-agent-local.js`

### 4. SDDF chat/gates are useful but mixed with runtime

`v273-sddf-command-chat.js` and `vision-v298-command-chat.js` contain useful command UX:

- chips
- SDDF gates
- process header updates
- file list
- explanation mode
- Vision AI Command composer

But both also bind runtime. Port UI only to `vision-chat.js`; leave execution to `vision-runtime-owner.js`.

### 5. Orbit ownership is the most sensitive area

`vision-v32-orbit-runtime.js`, `vision-v34-enterprise.js`, and `vision-v44-runtime-consistency.js` all manipulate:

- `.mc-node[data-key]`
- `mcCore`
- `mcCoreStatus`
- `mcCoreSub`
- `v33-t-*`
- SSE-driven state
- PASS GOLD report triggers

This means Pi Harness must not be inserted into the orbit until one clean orbit owner exists.

### 6. Contract status is a separate lightweight concern

`v23-ui-system.js` only probes `/api/runtime/contracts` and marks `mcLiveBadge`/`documentElement.dataset.contracts`.

This should become a small read-only status function in `vision-agent-local.js`, using `vision-api.js` for the request.

## Clean Ownership Target

| Clean file | Owns |
|---|---|
| `vision-api.js` | API base, URL normalization, GET/POST helpers, stream URL builder, contract/status read helpers. No global fetch/EventSource monkeypatch. |
| `vision-chat.js` | Chat UI, prompt chips, file selection, explain-only copilot, provider selectors. No run-live and no EventSource. |
| `vision-agent-local.js` | Orbit rendering, node state, Agent Metrics, contract status badge, status pills, Pi slot later. No network mutation. |
| `vision-runtime-owner.js` | Single mission execution lifecycle, POST `/api/run-live`, one SSE connection, mission id requirement, blocked states. |
| `vision-report.js` | Evidence Receipt rendering, Mission Report, PASS GOLD display only with real evidence. |

## Pi Harness Dependency

Pi Harness visual slot must not be implemented until the orbit and agent metrics responsibilities are known.

Pi Harness can be added safely only after:

- orbit ownership is known
- agent node rendering is known
- metrics ownership is known
- PASS GOLD visual state ownership is known
- `vision-agent-local.js` is the only orbit owner

## Migration Plan

### Step A — Audit Complete

All listed legacy runtime scripts are now mapped.

### Step B — Port Visual Initializers

Move visual-only initialization into clean V14 scripts without enabling unsafe runtime behavior.

Priority ports:

1. Vision AI Command shell and chips from `vision-v298-command-chat.js` / `v273-sddf-command-chat.js` to `vision-chat.js`.
2. Metrics boards from `v231-backend-agents.js` / `vision-v35-telemetry.js` to `vision-agent-local.js`.
3. Orbit/core status from `vision-v32-orbit-runtime.js` / `vision-v34-enterprise.js` / `vision-v44-runtime-consistency.js` to `vision-agent-local.js`.
4. Mission Report from `vision-v32-orbit-runtime.js` / `vision-v34-enterprise.js` / `vision-v44-runtime-consistency.js` to `vision-report.js`.
5. API URL logic from `vision-runtime-v297.js` / `vision-v2910-clean-runtime.js` to `vision-api.js`, without monkeypatch.
6. Contract status probe from `v23-ui-system.js` to `vision-agent-local.js` plus `vision-api.js`.

### Step C — Remove Legacy Scripts Incrementally

Suggested removal order after full audit and visual ports:

1. `v273-sddf-command-chat.js`
2. `vision-v298-command-chat.js`
3. `v233-realtime.js`
4. `vision-v298-final-hard-fix2.js`
5. `vision-v299-fullstack-runtime.js`
6. `vision-v2910-clean-runtime.js`
7. `vision-runtime-v297.js`
8. `vision-v297-interactions.js`
9. `v231-backend-agents.js`
10. `vision-v35-telemetry.js`
11. `vision-v34-enterprise.js`
12. `vision-v44-runtime-consistency.js`
13. `v23-ui-system.js`
14. `vision-v32-orbit-runtime.js` last

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
