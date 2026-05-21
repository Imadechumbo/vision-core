# Real Repo Patch Apply Controller — V172.0

## Purpose

Safe controller contract for applying a real permitted patch in the repo.
Does NOT perform the physical patch — requires human command confirmation.

## Schema Version

`v172.0`

## Statuses

| Status | Meaning |
|--------|---------|
| `REPO_PATCH_APPLY_BLOCKED_INPUT` | Missing or invalid required input field |
| `REPO_PATCH_APPLY_BLOCKED_SCOPE` | Scope contract not READY |
| `REPO_PATCH_APPLY_BLOCKED_PRE_STATE` | Pre-state snapshot not READY |
| `REPO_PATCH_APPLY_REQUIRES_HUMAN_COMMAND` | Waiting for human_command_confirmed=true |
| `REPO_PATCH_APPLY_READY` | All gates passed, controller ready for human to execute |

## Required Inputs

| Field | Type | Constraint |
|-------|------|-----------|
| `apply_controller_id` | string | non-empty |
| `scope_contract_id` | string | non-empty |
| `scope_contract_status` | string | must be `REPO_PATCH_SCOPE_READY` |
| `snapshot_id` | string | non-empty |
| `pre_state_status` | string | must be `REPO_PRE_STATE_READY` |
| `target_file` | string | non-empty |
| `patch_type` | string | non-empty |
| `patch_intent` | string | non-empty |
| `patch_content_hash` | string | non-empty |
| `human_command_confirmed` | boolean | must be `true` for READY |
| `local_only` | boolean | must be `true` |
| `production_touched` | boolean | must be `false` |

## Invariants (All Return Paths)

- `production_touched = false`
- `deploy_performed = false`
- `stable_promoted = false`
- `release_performed = false`
- `local_only = true`
- `command_executed = false`
- `human_command_required = true`
- `is_real_execution = false`

## Controller Hash

```
sha256(`${apply_controller_id}:${scope_contract_id}:${snapshot_id}:${target_file}:${patch_type}:${patch_content_hash}`)
```

Computed before the human_command_confirmed gate — present in REQUIRES_HUMAN_COMMAND and READY states.

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
