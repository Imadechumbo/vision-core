# Real Local Patch Evidence Report — V169.0

Aggregates sandbox → apply-proof → test-lane → rollback-drill into a complete evidence record. Requires ROLLBACK_DRILL_PASS upstream. All 4 stages must pass for PATCH_EVIDENCE_COMPLETE.

## Exports

- `buildRealLocalPatchEvidenceReport(input)` — build evidence report record
- `validateRealLocalPatchEvidenceReport(report)` — validate invariants
- `renderRealLocalPatchEvidenceReport(report)` — human-readable render
- `REAL_LOCAL_PATCH_EVIDENCE_REPORT_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `PATCH_EVIDENCE_BLOCKED_INPUT` | Missing required fields |
| `PATCH_EVIDENCE_BLOCKED_ROLLBACK` | rollback_drill_status is not ROLLBACK_DRILL_PASS or missing rollback_hash |
| `PATCH_EVIDENCE_BLOCKED_PRODUCTION` | production_touched=true or local_only=false |
| `PATCH_EVIDENCE_COMPLETE` | All 4 stages passed, evidence complete |
| `PATCH_EVIDENCE_INCOMPLETE` | One or more stages failed |

## Stages

1. Sandbox: `SANDBOX_READY`
2. Patch Proof: `PATCH_PROOF_CAPTURED`
3. Test Lane: `TEST_LANE_PASS`
4. Rollback Drill: `ROLLBACK_DRILL_PASS`

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `is_real_execution=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
