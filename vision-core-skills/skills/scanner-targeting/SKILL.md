---
name: scanner-targeting
version: 1.0.0
category: core
priority: critical
---

# Scanner Targeting Skill

## Purpose

Resolve real files and code areas using OpenClaw targetHints and signals.

## Required Inputs

- OpenClaw route
- project tree
- signals
- targetHints

## Required Behavior

- Scan before Hermes RCA.
- Return target candidates with confidence.
- Prefer explicit file matches over semantic matches.

## Forbidden Behavior

- Do not modify files.
- Do not invent targets.
- Do not let Hermes proceed without scanResult.

## Expected Output

scanResult with targetFiles, confidence, evidence, missingTargets, and risk notes.

## Validation

- scanResult exists
- target confidence is reported
- unknown target remains blocked or escalated

## Failure Handling

Return needs_target or unknown_target.
