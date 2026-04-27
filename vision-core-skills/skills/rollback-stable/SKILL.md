---
name: rollback-stable
version: 1.0.0
category: recovery
priority: critical
---

# Rollback Stable Skill

## Purpose

Guarantee rollback and stable snapshot integrity.

## Required Inputs

- snapshot
- mission result
- PASS GOLD result

## Required Behavior

- Snapshot before patch.
- Promote stable only after PASS GOLD.
- Roll back failed missions.

## Forbidden Behavior

- Stable before PASS GOLD.
- rollback without snapshot.
- overwriting known-good baseline with failed build.

## Expected Output

Rollback/stable report with snapshotId, stableVersion, rollbackStatus.

## Validation

- stable promotion requires pass_gold === true

## Failure Handling

Restore snapshot and mark mission failed.
