# Real Repo Patch Scope Contract — V171.0

Defines the allowed scope for a real patch on a permitted repo file. Blocks forbidden paths, production flags, and unverified preconditions.

## Exports

- `buildRealRepoPatchScopeContract(input)` — build scope contract record
- `validateRealRepoPatchScopeContract(contract)` — validate invariants
- `renderRealRepoPatchScopeContract(contract)` — human-readable render
- `REAL_REPO_PATCH_SCOPE_CONTRACT_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `REPO_PATCH_SCOPE_BLOCKED_INPUT` | Missing required fields or gate flags not met |
| `REPO_PATCH_SCOPE_BLOCKED_FORBIDDEN_PATH` | target_file is forbidden or not in allowed_files |
| `REPO_PATCH_SCOPE_BLOCKED_PRODUCTION` | production_touched=true or local_only=false |
| `REPO_PATCH_SCOPE_READY` | Scope validated, rollback required |

## Forbidden Patterns

.env, secrets, credentials, tokens, .github/, frontend/, src/, deploy, infra, package-lock.json, node_modules/, .git/, workflow

## Required Gate Flags

- `local_patch_baseline_ready=true`
- `human_approval_verified=true`
- `anti_hallucination_confirmed=true`
- `pass_gold_confirmed=true`

## Invariants

- `rollback_required=true` always
- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
