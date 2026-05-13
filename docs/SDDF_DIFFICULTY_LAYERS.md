# SDDF Difficulty Layers

This document defines the official adaptive execution ladder for Vision Core.

Current frontend state: `V8_PURE_VISUAL_SNAPSHOT MODE`.

Promotion and deploy remain blocked until clean runtime migration and PASS GOLD evidence are complete.

## Master Rule

- No Evidence Receipt -> no PASS GOLD.
- No PASS GOLD -> no PR, promotion, or deploy.
- No layer may skip L7 Evidence Receipt.
- No layer may reach L9 PR / Promotion without L8 PASS GOLD.

## SDDF Execution Layers

### L0 — Intake
Receives the mission, classifies intent and scope, and executes nothing.

Allowed outputs:
- mission summary
- suspected category
- required inputs
- initial risk class

### L1 — Inspect
Scanner reads files, endpoints, logs, contracts, configuration, and current runtime state.

Allowed outputs:
- target inventory
- endpoint inventory
- log summary
- contract mismatches
- missing evidence

### L2 — Diagnose
Hermes identifies probable root cause, risk, affected domain, and failure class.

Allowed outputs:
- root-cause hypothesis
- risk statement
- affected modules
- confidence level

### L3 — Plan
Generates patch plan, target files, rollback strategy, validation criteria, and stop conditions.

Allowed outputs:
- patch plan
- rollback plan
- validation plan
- protected paths
- approval requirements

### L4 — Dry Run
Simulates the patch without changing files.

Allowed outputs:
- expected diff
- possible side effects
- risk confirmation
- dry-run decision

### L5 — Controlled Patch
Applies patch locally with snapshot and rollback protection.

Allowed outputs:
- files changed
- snapshot id
- rollback path
- patch result

### L6 — Validation
Runs tests, build, guards, contracts, CORS, SSE checks, frontend smoke, and required project validations.

Allowed outputs:
- commands executed
- stdout/stderr summaries
- validation matrix
- failures

### L7 — Evidence Receipt
Generates a receipt containing files, commands, results, snapshot, logs, validation evidence, and decision.

Required contents:
- mission id
- changed files
- commands run
- validation results
- snapshot/rollback reference
- logs
- PASS/FAIL decision basis

### L8 — PASS GOLD
PASS GOLD may only pass if evidence is real and sufficient.

Rules:
- frontend cannot decide PASS GOLD alone
- Worker cannot fabricate PASS GOLD
- backend cannot fabricate PASS GOLD without evidence
- hardcoded `pass_gold:true` is invalid outside controlled visual snapshot warnings

### L9 — PR / Promotion
PR, promotion, merge, deploy, or stable marking is allowed only after L8 PASS GOLD.

Rules:
- no auto-merge without PASS GOLD
- no deploy without PASS GOLD
- no stable promotion without Evidence Receipt

## Adaptive Difficulty Classes

### D0 — Trivial
Examples:
- documentation note
- simple command explanation
- small text change

Maximum layer: L0–L2.

### D1 — Low
Examples:
- single-file non-runtime update
- small CSS/doc adjustment
- harmless config note

Maximum layer: L0–L4.

### D2 — Medium
Examples:
- small frontend behavior fix
- simple endpoint alignment
- documented contract update

Maximum layer: L0–L6.

### D3 — High
Examples:
- multi-file change
- frontend plus worker/backend contract
- regression-prone runtime behavior

Maximum layer: L0–L7.

### D4 — Critical
Examples:
- deploy path
- auth
- CORS
- SSE
- GitHub PR flow
- rollback
- PASS GOLD gate

Required layer: L0–L8.

### D5 — Enterprise / Autonomous Repair
Examples:
- full autonomous repair loop
- patch + validation + evidence + PR + promotion
- production release workflow

Required layer: L0–L9.

## Pi Harness Relationship

Pi Harness may recommend difficulty and tool escalation, but it cannot bypass SDDF layers.

Pi can increase parameters, tool budget, context budget, or agent depth only inside the layer rules above.

## Block Conditions

Block immediately when:
- evidence is missing
- mission id is missing
- rollback is unavailable for mutating operations
- PASS GOLD is hardcoded
- PR/promotion is requested without L8
- deploy is requested in V8_PURE_VISUAL_SNAPSHOT mode
