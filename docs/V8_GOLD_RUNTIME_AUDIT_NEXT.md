# V8 Gold Runtime Audit — Next Steps

Current frontend state: `V8_PURE_VISUAL_SNAPSHOT MODE`.

The V8 Gold visual is preserved. Promotion and deploy remain blocked.

This document defines the mandatory audit before removing any legacy V8 runtime script.

## Rule

Do not remove legacy runtime scripts one by one until their visual and behavioral responsibilities are mapped.

The V8 pure snapshot currently depends on legacy assets for visual parity. Removing them blindly breaks:

- orbit
- agent metrics
- pipeline visual
- mission timeline
- chat
- create-pr visual controls
- pass_gold visual state
- below-scroll sections

## Required Audit Table

For each legacy script, record:

| Script | DOM IDs/classes used | Visual role | Runtime role | Risk | Clean destination |
|---|---|---|---|---|---|
| vision-runtime-v297.js | TBD | TBD | TBD | TBD | TBD |
| vision-v297-interactions.js | TBD | TBD | TBD | TBD | TBD |
| v23-ui-system.js | TBD | TBD | TBD | TBD | TBD |
| v231-backend-agents.js | TBD | TBD | TBD | TBD | TBD |
| v233-realtime.js | TBD | TBD | TBD | TBD | TBD |
| v273-sddf-command-chat.js | TBD | TBD | TBD | TBD | TBD |
| vision-v298-command-chat.js | TBD | TBD | TBD | TBD | TBD |
| vision-v298-final-hard-fix2.js | TBD | TBD | TBD | TBD | TBD |
| vision-v299-fullstack-runtime.js | TBD | TBD | TBD | TBD | TBD |
| vision-v2910-clean-runtime.js | TBD | TBD | TBD | TBD | TBD |
| vision-v32-orbit-runtime.js | TBD | TBD | TBD | TBD | TBD |
| vision-v34-enterprise.js | TBD | TBD | TBD | TBD | TBD |
| vision-v35-telemetry.js | TBD | TBD | TBD | TBD | TBD |
| vision-v44-runtime-consistency.js | TBD | TBD | TBD | TBD | TBD |

## Audit Questions

For each script, answer:

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
13. Does it hardcode `pass_gold:true`?
14. Does it hardcode `promotion_allowed:true`?
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

### Step A — Audit
Document every legacy runtime responsibility.

### Step B — Port Visual Initializers
Move visual-only initialization into clean V14 scripts without enabling unsafe runtime behavior.

### Step C — Remove Legacy Scripts Incrementally
Remove one legacy script at a time and compare visual output.

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
