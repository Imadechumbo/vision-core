# Local Execution Receipt Builder — V162.1

Transforms V162.0 local execution proof into a verifiable sealed receipt. No production, no deploy, no stable, no release.

## Exports

- `buildLocalExecutionReceipt(input)` — build receipt from proof
- `validateLocalExecutionReceipt(receipt)` — validate invariants
- `renderLocalExecutionReceipt(receipt)` — human-readable render
- `LOCAL_EXECUTION_RECEIPT_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT` | Missing receipt_id or invalid input |
| `LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF` | Proof not captured or production_touched |
| `LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH` | Missing proof_hash or before/after hash |
| `LOCAL_EXECUTION_RECEIPT_READY` | Receipt sealed, local-only |
| `LOCAL_EXECUTION_RECEIPT_INVALID` | Reserved for invalid states |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
