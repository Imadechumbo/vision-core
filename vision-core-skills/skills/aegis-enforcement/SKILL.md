---
name: aegis-enforcement
version: 1.0.0
category: security
priority: critical
---

# Aegis Enforcement Skill

## Purpose

Enforce security, target lock, and agent authorization before validation and promotion.

## Required Inputs

- mission
- patch result
- changed files
- policy config

## Required Behavior

- Block bypass attempts.
- Verify target lock.
- Verify authorized agents.
- Mark high risk changes.

## Forbidden Behavior

- No bypassAegis.
- No forceHighRisk.
- No credential exposure.
- No promotion without Aegis OK.

## Expected Output

Aegis result with ok, blocks, warnings, riskLevel, and authorization.

## Validation

- aegisOk === true required for PASS GOLD path

## Failure Handling

Return AEGIS_BLOCKED and stop promotion.
