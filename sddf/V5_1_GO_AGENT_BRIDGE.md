# VISION CORE V5.1 — GO AGENT BRIDGE

## Status
V5.1 connects the Node backend to the V5.0 Go Safe Core without changing the frontend, Electron UI, Cloudflare, AWS, or billing.

## Contract
`POST /api/run-live` executes the Go Core binary:

```text
vision-core.exe mission --root "<root>" --input "<input>"
```

The backend parses the pure JSON response and returns PASS GOLD fields to the existing API contract.

## Runtime file

```text
backend/src/runtime/goRunner.js
```

## SSE events

`GET /api/run-live-stream?mission_id=<id>` emits:

```text
mission:start
scanner:ok
fileops:ok
patcher:ok
validator:ok
passgold:ok
mission:complete
```

## Failure policy
Any Go runtime error returns:

```json
{
  "ok": false,
  "status": "FAIL",
  "pass_gold": false,
  "promotion_allowed": false,
  "error_type": "go_runtime_failure"
}
```

## PASS GOLD rule
SEM PASS GOLD → nada é promovido.
