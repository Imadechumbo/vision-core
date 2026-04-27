---
name: openclaw-routing
version: 1.0.0
category: core
priority: critical
---

# OpenClaw Routing Skill

## Purpose

Transform raw human input into a structured mission before any diagnosis or patching.

## Required Inputs

- raw human request
- optional project context
- optional target hints

## Required Behavior

- Determine intent, category, signals, targetHints, agents, and safeMode.
- Mark unknown targets explicitly.
- Route to Scanner before Hermes.

## Forbidden Behavior

- Do not patch.
- Do not validate PASS GOLD.
- Do not call Hermes before Scanner.

## Expected Output

Structured route object with intent, category, signals, targetHints, agents, safety, scanner payload, and Hermes context.

## Validation

- route.gates.passGoldRequired === true
- route.gates.scannerRequired === true
- route.gates.hermesRequiresScanResult === true

## Failure Handling

Return unknown_target and require scanner resolution.
