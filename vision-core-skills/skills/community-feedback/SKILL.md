---
name: community-feedback
version: 1.0.0
category: learning-core
priority: critical
---

# Community Feedback Skill

## Purpose

Capture hard real-world errors as candidate knowledge only.

## Required Inputs

- user/community feedback payload

## Required Behavior

- Sanitize first.
- Reject or redact secrets.
- Store safe candidate feedback.
- Never promote directly to Hermes Memory.

## Forbidden Behavior

- raw secrets.
- full private source code.
- direct validated memory write.

## Expected Output

Feedback record with status, sanitized payload, redactions, and Obsidian note ID.

## Validation

- no secrets
- status is candidate/submitted unless solved by PASS GOLD

## Failure Handling

Create rejected stub only.
