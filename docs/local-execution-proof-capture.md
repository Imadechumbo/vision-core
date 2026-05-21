# Local Execution Proof Capture — V162.0

Captures structured proof of a controlled local execution. No production, no deploy, no stable, no release.

## Exports

- `buildLocalExecutionProofCapture(input)` — build proof record
- `validateLocalExecutionProofCapture(proof)` — validate invariants
- `renderLocalExecutionProofCapture(proof)` — human-readable render
- `LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_EXECUTION_PROOF_BLOCKED_INPUT` | Missing or invalid required fields |
| `LOCAL_EXECUTION_PROOF_BLOCKED_DRILL` | Drill not approved / baseline not confirmed |
| `LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE` | local_only=false or production_touched=true or forbidden files |
| `LOCAL_EXECUTION_PROOF_BLOCKED_COMMAND` | Missing command hash or redacted text |
| `LOCAL_EXECUTION_PROOF_CAPTURED` | Proof captured, exit_code=0, local-only |
| `LOCAL_EXECUTION_PROOF_INVALID` | Non-zero exit_code; no production touched |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `production_execution_blocked=true` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
