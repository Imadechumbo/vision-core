# One Real Tag Final Execution Packet — V106.0

Consolidated final execution packet for one real git tag operation.

## Purpose

Builds a complete, sealed packet containing all information a human operator needs
to execute one real git tag manually. Does NOT execute anything.

## Fields

| Field | Description |
|-------|-------------|
| packet_id | SHA-256 of tag+head+evidence+rollback+seal |
| schema_version | v106.0 |
| human_exec_readiness_baseline_id | V105 baseline reference |
| target_tag | Target git tag (must start with v) |
| git_head | Exact commit SHA to tag |
| evidence_receipt_id | Go Core evidence receipt |
| evidence_source | Must be `go-core` |
| rollback_anchor_id | Rollback anchor reference |
| command_seal_id | Command seal reference |
| final_preflight_checks | Human-readable preflight checklist |
| exact_manual_command_block | Copy-paste command string for human execution |
| verification_command_block | Commands to verify after execution |
| rollback_command_block | Commands to rollback if needed |
| forbidden_actions | List of strictly forbidden operations |

## Invariants

- `tag_created=false` always
- `git_push_performed=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `human_must_execute_manually=true` always
- `local_interactive_only=true` always
- `ci_blocked=true` always
- `evidence_source` must be `go-core`

## States

- `EXEC_PACKET_BLOCKED_BASELINE` — V105 baseline not ready
- `EXEC_PACKET_BLOCKED_TAG` — target_tag missing or invalid
- `EXEC_PACKET_BLOCKED_HEAD` — git_head missing or too short
- `EXEC_PACKET_BLOCKED_EVIDENCE` — evidence_source not go-core or receipt missing
- `EXEC_PACKET_BLOCKED_ROLLBACK` — rollback_anchor_id missing
- `EXEC_PACKET_BLOCKED_COMMAND_SEAL` — command_seal_id missing
- `EXEC_PACKET_READY_FOR_HUMAN_EXECUTION` — all checks passed
