---
name: hermes-memory
version: 1.0.0
category: learning-core
priority: critical
---

# Hermes Memory Skill

## Purpose

Store only validated operational learning, never untrusted raw feedback.

## Required Inputs

- solved mission
- PASS GOLD proof
- sanitized lesson

## Required Behavior

- Accept only solved_PASS_GOLD learning.
- Store root cause, validated fix, regression hints, target patterns.

## Forbidden Behavior

- learning from prompt only.
- learning from AI output only.
- learning from failed/dry-run-only cases.

## Expected Output

Validated memory record with evidence links and regression guard reference.

## Validation

- pass_gold === true
- sanitized === true
- reproduced === true

## Failure Handling

Keep as candidate knowledge.
