# Local Rollback Proof Gate — V163.1

Proves that a local execution has verifiable rollback available. Never touches production.

## Exports

- `buildLocalRollbackProofGate(input)` — build rollback proof gate
- `validateLocalRollbackProofGate(gate)` — validate invariants
- `renderLocalRollbackProofGate(gate)` — human-readable render
- `LOCAL_ROLLBACK_PROOF_GATE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT` | Missing required fields or local_only=false |
| `LOCAL_ROLLBACK_PROOF_BLOCKED_SNAPSHOT` | Missing snapshot_id |
| `LOCAL_ROLLBACK_PROOF_BLOCKED_RECEIPT` | Missing receipt_id |
| `LOCAL_ROLLBACK_PROOF_BLOCKED_HASH` | Missing hash fields |
| `LOCAL_ROLLBACK_PROOF_READY` | Rollback available and verified |
| `LOCAL_ROLLBACK_PROOF_COMPLETED` | Rollback executed and verified |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- COMPLETED only when `rollback_verified=true`

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
