---
name: obsidian-vault
version: 1.0.0
category: learning-core
priority: high
---

# Obsidian Vault Skill

## Purpose

Maintain auditable notes for candidate knowledge, benchmarks, and solved PASS GOLD cases.

## Required Inputs

- sanitized feedback
- benchmark record
- solved result

## Required Behavior

- Create notes in correct folders.
- Move notes by lifecycle status.
- Add warning that notes are not validated memory.

## Forbidden Behavior

- raw env content.
- private paths.
- automatic Hermes promotion.

## Expected Output

Markdown note path and lifecycle status.

## Validation

- folder state matches feedback status

## Failure Handling

Write rejected stub without sensitive content.
