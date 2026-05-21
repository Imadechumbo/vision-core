# Real Local Patch Test Lane — V168.0

Validates that a patched sandbox passes test lane checks. Requires PATCH_PROOF_CAPTURED. No production touching.

## Exports

- `buildRealLocalPatchTestLane(input)` — build test lane record
- `validateRealLocalPatchTestLane(lane)` — validate invariants
- `renderRealLocalPatchTestLane(lane)` — human-readable render
- `REAL_LOCAL_PATCH_TEST_LANE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `TEST_LANE_BLOCKED_INPUT` | Missing or invalid required fields |
| `TEST_LANE_BLOCKED_PROOF` | Patch proof not CAPTURED or missing hash |
| `TEST_LANE_BLOCKED_PRODUCTION` | local_only=false or production_touched=true |
| `TEST_LANE_PASS` | All tests passed, outcome=pass |
| `TEST_LANE_FAIL` | Tests failed or outcome≠pass |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `is_real_execution=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
