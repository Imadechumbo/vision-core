---
name: hermes-rca
version: 1.0.0
category: core
priority: critical
---

# Hermes RCA Skill

## Purpose

Diagnose root cause using scanResult evidence, not raw prompt guessing.

## Required Inputs

- mission input
- OpenClaw route
- mandatory scanResult

## Required Behavior

- Use scanResult as source of truth.
- Produce rootCause, affectedFiles, patchPlan, validationPlan, rollbackPlan.

## Forbidden Behavior

- Do not run without scanResult.
- Do not approve patches.
- Do not bypass Aegis.

## Expected Output

RCA package with rootCause, confidence, targets, patchPlan, validationPlan, rollbackPlan.

## Validation

- scanResult required
- RCA references target evidence
- validationPlan includes PASS GOLD

## Failure Handling

Return HERMES_SCAN_RESULT_REQUIRED.
