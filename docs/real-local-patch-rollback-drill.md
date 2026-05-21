# Real Local Patch Rollback Drill — V168.1

Validates that a patched sandbox can be cleanly rolled back to pre-patch state. Requires TEST_LANE_PASS upstream. Confirms restored_hash matches pre_patch_hash.

## Exports

- `buildRealLocalPatchRollbackDrill(input)` — build rollback drill record
- `validateRealLocalPatchRollbackDrill(drill)` — validate invariants
- `renderRealLocalPatchRollbackDrill(drill)` — human-readable render
- `REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `ROLLBACK_DRILL_BLOCKED_INPUT` | Missing required fields |
| `ROLLBACK_DRILL_BLOCKED_TEST_LANE` | test_lane_status is not TEST_LANE_PASS or missing hash |
| `ROLLBACK_DRILL_BLOCKED_PRODUCTION` | production_touched=true or local_only=false |
| `ROLLBACK_DRILL_PASS` | Rollback succeeded, restored_hash matches pre_patch_hash |
| `ROLLBACK_DRILL_FAIL` | Rollback failed or hash mismatch |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `is_real_execution=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
