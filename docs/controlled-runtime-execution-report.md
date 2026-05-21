# Controlled Runtime Execution Report — V155.1

Consolidates ledger state and evidence package status into an immutable report documenting dry-run outcomes and future execution readiness.

## Statuses

| Status | Condition |
|---|---|
| `EXECUTION_REPORT_BLOCKED_INPUT` | `report_id` or `ledger_id` missing |
| `EXECUTION_REPORT_PARTIAL` | Ledger present but `ledger_event_count < 1`, `evidence_package_sealed=false`, or `dry_run_confirmed=false` |
| `EXECUTION_REPORT_READY` | All three conditions met |

## Key Invariants

```
human_command_required = true   (always)
future_execution_ready = true   (READY only)
execution_performed    = false  (always)
stable_promoted        = false  (always)
deploy_performed       = false  (always)
release_performed      = false  (always)
```

## Inputs

| Field | Required | Notes |
|---|---|---|
| `report_id` | Yes | Unique report identifier |
| `ledger_id` | Yes | V155.0 ledger reference |
| `evidence_package_id` | No | V154.1 package reference |
| `ledger_event_count` | No | Must be > 0 for READY |
| `evidence_package_sealed` | No | `true` or `evidence_package_status=EVIDENCE_PACKAGE_SEALED` |
| `dry_run_confirmed` | No | Must be `true` for READY |
| `summary` | No | Optional narrative |

## Exports

- `buildControlledRuntimeExecutionReport(params)` — builder
- `validateControlledRuntimeExecutionReport(result)` → `{ valid, errors }`
- `renderControlledRuntimeExecutionReport(result)` → string
- `EXECUTION_REPORT_STATUSES` — array of 3 status strings

## Schema Version

`v155.1`
