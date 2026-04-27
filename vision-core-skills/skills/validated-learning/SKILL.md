---
name: validated-learning
version: 1.0.0
category: learning-core
priority: critical
---

# Validated Learning Skill

## Purpose

Define the complete learning lifecycle from candidate feedback to regression memory.

## Required Inputs

- feedback
- benchmark
- mission result
- PASS GOLD report

## Required Behavior

- Candidate → triaged → reproduced → benchmarked → solved_PASS_GOLD → validated_memory → regression_guard.
- Require sanitization, reproduction, Aegis OK, and PASS GOLD.

## Forbidden Behavior

- direct learning from feedback.
- direct learning from logs with secrets.
- promotion without PASS GOLD.
- dry-run false positive as truth.

## Expected Output

Learning lifecycle event with state transition and evidence.

## Validation

- every state transition is auditable
- validated_memory only after PASS GOLD

## Failure Handling

Remain candidate or benchmark_failed.
