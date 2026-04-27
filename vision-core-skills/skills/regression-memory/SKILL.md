---
name: regression-memory
version: 1.0.0
category: learning-core
priority: high
---

# Regression Memory Skill

## Purpose

Turn solved PASS GOLD cases into preventive checks so the same bug does not return.

## Required Inputs

- validated memory record
- benchmark case
- test/check definition

## Required Behavior

- Create regression guard from solved case.
- Link future missions to known bug patterns.
- Alert if a patch reintroduces previous failure.

## Forbidden Behavior

- adding regression from unvalidated feedback.
- storing secrets or private code.

## Expected Output

Regression guard with trigger pattern, expected prevention, and linked benchmark.

## Validation

- guard source has PASS GOLD evidence

## Failure Handling

Do not create guard; keep as validated note only.
