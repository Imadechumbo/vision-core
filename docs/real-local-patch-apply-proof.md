# Real Local Patch Apply Proof — V167.1

Captures cryptographic proof of a patch applied within a local sandbox. Requires sandbox READY, verifies hash change.

## Exports

- `buildRealLocalPatchApplyProof(input)` — build proof record
- `validateRealLocalPatchApplyProof(proof)` — validate invariants
- `renderRealLocalPatchApplyProof(proof)` — human-readable render
- `REAL_LOCAL_PATCH_APPLY_PROOF_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `PATCH_PROOF_BLOCKED_INPUT` | Missing required fields |
| `PATCH_PROOF_BLOCKED_SANDBOX` | Sandbox not READY or missing sandbox_hash |
| `PATCH_PROOF_BLOCKED_PRODUCTION` | local_only=false or production_touched=true |
| `PATCH_PROOF_CAPTURED` | Proof captured, pre/post hashes differ |
| `PATCH_PROOF_FAIL` | Identical pre/post hashes — no change detected |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `is_real_execution=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
