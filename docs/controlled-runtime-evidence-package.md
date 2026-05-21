# Controlled Runtime Evidence Package — V154.1

Assembles and seals all V151–V154 controlled-execution artifacts into a single immutable evidence package.

## Required Artifacts

| Field | Source |
|---|---|
| `contract_id` | V151.0 Human Execution Command Contract |
| `dry_run_id` | V152.0 Controlled Runtime Execution Dry-Run |
| `plan_id` | V152.1 Controlled Runtime Execution Plan |
| `rollback_binding_id` | V153.0 Rollback Plan Binding Gate |
| `snapshot_id` | V153.1 Pre-Execution Snapshot Contract |
| `proof_receipt_id` | V154.0 Real Execution Proof Receipt |

## Statuses

| Status | Condition |
|---|---|
| `EVIDENCE_PACKAGE_BLOCKED_INPUT` | `package_id` missing or empty |
| `EVIDENCE_PACKAGE_BLOCKED_INCOMPLETE` | One or more artifact IDs missing; `missing_artifacts` lists them |
| `EVIDENCE_PACKAGE_SEALED` | All 6 artifacts present; package is sealed |

## REGRA ABSOLUTA

These fields are hardcoded in every output regardless of inputs:

```
package_sealed      = true
execution_performed = false
stable_promoted     = false
deploy_performed    = false
release_performed   = false
```

## Exports

- `buildControlledRuntimeEvidencePackage(params)` — builder
- `validateControlledRuntimeEvidencePackage(result)` → `{ valid, errors }`
- `renderControlledRuntimeEvidencePackage(result)` → string
- `RUNTIME_EVIDENCE_PACKAGE_STATUSES` — array of 3 status strings
- `RUNTIME_EVIDENCE_ARTIFACT_FIELDS` — array of 6 required field names

## Schema Version

`v154.1`
