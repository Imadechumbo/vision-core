# Local Execution Evidence Package — V164.1

Bundles proof, receipt, ledger snapshot, rollback gate, and post-state verifier into a single sealed local evidence package. No production, no deploy, no stable, no release.

## Exports

- `buildLocalExecutionEvidencePackage(input)` — build evidence package
- `validateLocalExecutionEvidencePackage(pkg)` — validate invariants
- `renderLocalExecutionEvidencePackage(pkg)` — human-readable render
- `LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_EVIDENCE_BLOCKED_INPUT` | Missing required fields |
| `LOCAL_EVIDENCE_BLOCKED_PROOF` | Proof missing or not CAPTURED |
| `LOCAL_EVIDENCE_BLOCKED_RECEIPT` | Receipt missing or not READY |
| `LOCAL_EVIDENCE_BLOCKED_LEDGER` | Ledger missing or not READY |
| `LOCAL_EVIDENCE_BLOCKED_ROLLBACK` | Rollback gate missing or not READY/COMPLETED |
| `LOCAL_EVIDENCE_BLOCKED_POST_STATE` | Post-state missing or not VERIFIED |
| `LOCAL_EVIDENCE_BLOCKED_PRODUCTION` | local_only=false or production_touched=true |
| `LOCAL_EVIDENCE_SEALED` | All components valid, package sealed |
| `LOCAL_EVIDENCE_INCOMPLETE` | Components present but not fully sealed |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
