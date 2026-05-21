# Real Repo Patch Pre-State Snapshot — V171.1

Captures pre-patch state of a permitted repo file. Requires REPO_PATCH_SCOPE_READY and a clean working tree. Accepts file_exists_before=false only for CREATE_DOC or CREATE patch types.

## Exports

- `buildRealRepoPatchPreStateSnapshot(input)` — build snapshot record
- `validateRealRepoPatchPreStateSnapshot(snapshot)` — validate invariants
- `renderRealRepoPatchPreStateSnapshot(snapshot)` — human-readable render
- `REAL_REPO_PATCH_PRE_STATE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `REPO_PRE_STATE_BLOCKED_INPUT` | Missing required fields or dirty working tree |
| `REPO_PRE_STATE_BLOCKED_SCOPE` | scope_contract_status is not REPO_PATCH_SCOPE_READY |
| `REPO_PRE_STATE_BLOCKED_MISSING_FILE` | file_exists_before=false but patch_type is not CREATE |
| `REPO_PRE_STATE_READY` | Pre-state captured, snapshot hash computed |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `is_real_execution=false` always
- `working_tree_clean_before=true` required
- Does NOT modify the target file

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
