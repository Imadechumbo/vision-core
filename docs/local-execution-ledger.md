# Local Execution Ledger — V163.0

Append-only ledger with hash-chain for recording drill/proof/receipt events. No production, no deploy, no stable, no release.

## Exports

- `buildLocalExecutionLedger(input)` — create empty ledger
- `validateLocalExecutionLedger(ledger)` — validate hash chain + invariants
- `appendLocalExecutionLedgerEvent(ledger, event)` — append event (append-only)
- `renderLocalExecutionLedger(ledger)` — human-readable render
- `LOCAL_EXECUTION_LEDGER_STATUSES` — status constants
- `LOCAL_EXECUTION_LEDGER_EVENTS` — allowed event types

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_EXECUTION_LEDGER_EMPTY` | Ledger created, no events |
| `LOCAL_EXECUTION_LEDGER_READY` | Events appended, hash chain valid |
| `LOCAL_EXECUTION_LEDGER_TAMPERED` | Hash chain broken |
| `LOCAL_EXECUTION_LEDGER_BLOCKED_EVENT` | Blocked event type attempted |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- DEPLOY/STABLE_PROMOTE/RELEASE/PRODUCTION/TAG_CREATE events are always blocked

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
