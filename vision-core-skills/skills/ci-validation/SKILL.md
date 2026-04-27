---
name: ci-validation
version: 1.0.0
category: governance
priority: high
---

# CI Validation Skill

## Purpose

Ensure GitHub/Gitness CI enforces syntax, PASS GOLD, Aegis, and critical guards.

## Required Inputs

- workflow files
- pipeline files
- scripts/checkPassGold.js

## Required Behavior

- Add node --check for critical services.
- Run checkPassGold.js.
- Fail CI on guard violations.

## Forbidden Behavior

- continue-on-error for required gates.
- skipping checkPassGold.
- allowing bypass configs.

## Expected Output

CI validation report with jobs, required checks, and blocking rules.

## Validation

- CI fails on syntax or PASS GOLD violation

## Failure Handling

Block PR.
