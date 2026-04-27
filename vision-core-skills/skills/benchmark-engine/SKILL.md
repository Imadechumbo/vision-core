---
name: benchmark-engine
version: 1.0.0
category: learning-core
priority: critical
---

# Benchmark Engine Skill

## Purpose

Convert reproduced community cases into empirical tests for the mission pipeline.

## Required Inputs

- benchmark case
- mission pipeline
- safe options

## Required Behavior

- Run dry-run by default.
- Allow safe-patch only explicitly.
- Score actual vs expected outcomes.

## Forbidden Behavior

- bypass Aegis.
- promote memory from benchmark alone.
- expose secrets in reports.

## Expected Output

Benchmark run with score, passGold, targetHit, rootCauseHit, agentsUsed, escalation.

## Validation

- report is community-safe
- score capped at 100
- PASS GOLD not faked

## Failure Handling

Save failed benchmark run and mark weakness.
