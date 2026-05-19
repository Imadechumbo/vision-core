# One Real Tag Local Manual Command Export — V106.1

Exports copy/paste-safe local manual commands for one real git tag operation.

## Purpose

Takes a ready execution packet and builds a complete, copy-paste-safe command
export for human operators. Includes preflight checks, execution commands,
post-verification and rollback. Does NOT execute anything.

## Fields

| Field | Description |
|-------|-------------|
| command_export_id | SHA-256 of packet_id + export_hash |
| schema_version | v106.1 |
| packet_id | Source execution packet reference |
| target_tag | Target git tag |
| git_head | Exact commit SHA |
| preflight_commands | Commands to run before execution |
| execution_commands | git tag + git push commands |
| verification_commands | Commands to verify after execution |
| rollback_commands | Commands to rollback if needed |
| receipt_fill_instructions | How to fill in the receipt |
| command_hash | SHA-256 of execution+verify+rollback commands |
| export_hash | SHA-256 of packet_id+tag+head+command_hash |

## Invariants

- `tag_created=false` always
- `git_push_performed=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `copy_paste_safe=true` always
- `human_only=true` always
- `no_ci=true` always
- `no_automation=true` always

## States

- `COMMAND_EXPORT_BLOCKED_PACKET` — execution packet not ready
- `COMMAND_EXPORT_BLOCKED_HASH` — hash computation failed
- `COMMAND_EXPORT_READY_FOR_HUMAN_COPY_PASTE` — all checks passed
