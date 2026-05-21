# Real Local Patch Baseline — V170.0 (capstone)

Validates the full local patch pipeline: sandbox → apply-proof → test-lane → rollback-drill → evidence-report. Requires PATCH_EVIDENCE_COMPLETE upstream. All 5 stages must pass for PATCH_BASELINE_READY.

## Exports

- `buildRealLocalPatchBaseline(input)` — build baseline record
- `validateRealLocalPatchBaseline(baseline)` — validate invariants
- `renderRealLocalPatchBaseline(baseline)` — human-readable render
- `REAL_LOCAL_PATCH_BASELINE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `PATCH_BASELINE_BLOCKED_INPUT` | Missing required fields |
| `PATCH_BASELINE_BLOCKED_EVIDENCE` | evidence_report_status is not PATCH_EVIDENCE_COMPLETE or missing evidence_hash |
| `PATCH_BASELINE_BLOCKED_PRODUCTION` | production_touched=true or local_only=false |
| `PATCH_BASELINE_READY` | All 5 pipeline stages passed, baseline ready |
| `PATCH_BASELINE_FAIL` | One or more pipeline stages failed |

## Pipeline Stages (5)

1. `sandbox` — SANDBOX_READY
2. `patch_proof` — PATCH_PROOF_CAPTURED
3. `test_lane` — TEST_LANE_PASS
4. `rollback_drill` — ROLLBACK_DRILL_PASS
5. `evidence_report` — PATCH_EVIDENCE_COMPLETE

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `is_real_execution=false` always
- `baseline_ready=true` only when all 5 stages pass
- `patch_baseline_ready=true` only when all 5 stages pass

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
