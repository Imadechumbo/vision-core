---
name: hybrid-github-gitness
version: 1.0.0
category: governance
priority: high
---

# Hybrid GitHub + Gitness Skill

## Purpose

Create and validate PRs across GitHub and Gitness without weakening PASS GOLD.

## Required Inputs

- PASS GOLD report
- branch
- commit
- git remotes

## Required Behavior

- GitHub is required in hybrid mode.
- Gitness validation may be required by config.
- Create PR only after local PASS GOLD.

## Forbidden Behavior

- PR before PASS GOLD.
- merge with failed CI.
- treating Gitness as decorative when required.

## Expected Output

Hybrid PR result with githubPR, gitnessPR, CI status, and merge eligibility.

## Validation

- CI confirms PASS GOLD remains valid

## Failure Handling

Block merge and preserve branch.
