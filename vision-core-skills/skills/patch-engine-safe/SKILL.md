---
name: patch-engine-safe
version: 1.0.0
category: execution
priority: critical
---

# Safe Patch Engine Skill

## Purpose

Apply minimal, reversible patches based on Hermes RCA and scanner evidence.

## Required Inputs

- RCA package
- scanResult
- target files
- critical-file config

## Required Behavior

- Patch only resolved targets.
- Use small diffs.
- Snapshot before mutation.
- Invoke Critical File Guard for protected files.

## Forbidden Behavior

- Do not rewrite critical files.
- Do not patch unknown targets.
- Do not skip rollback snapshot.

## Expected Output

Patch result with changedFiles, diffSummary, snapshotId, and riskLevel.

## Validation

- node --check for JS files
- CriticalFileGuard passed
- rollback snapshot exists

## Failure Handling

Abort and rollback on patch failure.
