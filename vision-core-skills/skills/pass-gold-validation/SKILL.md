---
name: pass-gold-validation
version: 1.0.0
category: validation
priority: critical
---

# PASS GOLD Validation Skill

## Purpose

Centralize final validation and promotion eligibility.

## Required Inputs

- patch result
- Aegis result
- test output
- benchmark status
- CI status

## Required Behavior

- Require all gates to pass.
- Emit pass_gold boolean.
- Block PR/merge/stable if false.

## Forbidden Behavior

- PASS GOLD optional.
- partial promotion.
- merge with failed checks.

## Expected Output

PASS GOLD report with pass_gold, promotionAllowed, gates, tests, and evidence.

## Validation

- pass_gold === true before PR/merge/stable

## Failure Handling

Return VALIDATION_FAILED and block promotion.
