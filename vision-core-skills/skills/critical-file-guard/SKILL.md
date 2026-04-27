---
name: critical-file-guard
version: 1.0.0
category: governance
priority: critical
---

# Critical File Guard Skill

## Purpose

Protect critical files from AI full rewrites or unsafe changes.

## Required Inputs

- file path
- old content
- new content
- critical-files config

## Required Behavior

- Enforce max changed percent.
- Enforce max patch lines.
- Detect removed exports and forbidden bypass signals.

## Forbidden Behavior

- Full rewrite.
- Removing PASS GOLD.
- Removing Aegis.
- Hermes without scanResult.
- OpenClaw after Hermes.

## Expected Output

Guard verdict: passed, blocked, risk, reasons, changedPercent.

## Validation

- criticalFileGuardPassed === true for protected files

## Failure Handling

Return CRITICAL_FILE_GUARD_BLOCKED.
