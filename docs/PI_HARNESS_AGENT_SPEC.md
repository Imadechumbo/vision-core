# Pi Harness Agent Spec

This document specifies the future Pi Harness / Pi Agents role inside Vision Core.

Current implementation status: specification only.

Current frontend state: `V8_PURE_VISUAL_SNAPSHOT MODE`.

Promotion and deploy remain blocked until clean runtime migration and real PASS GOLD evidence.

## Purpose

Pi Harness is the Adaptive Execution Harness for Vision Core.

It adapts mission depth, context, tools, and agent effort to the real difficulty of the problem.

Pi Harness is not a PASS GOLD authority and does not replace OpenClaw, Scanner, Hermes, PatchEngine, Aegis, Evidence Receipt, or PASS GOLD.

## Why Pi Fits Vision Core

Pi is treated as a harness primitive for future integration because it is designed around:

- coding-agent CLI workflows
- tool calling and state management
- multi-provider LLM routing
- extensibility through skills, prompts, packages, themes, and extensions
- interactive, print/JSON, RPC, and SDK modes
- workflow adaptation instead of sealed product behavior

Vision Core will use these ideas as an adaptive execution model before any runtime integration.

## Role in the Agent System

OpenClaw remains mission orchestrator.
Scanner remains reality reader.
Hermes remains diagnosis and RCA layer.
PatchEngine remains controlled mutation layer.
Aegis remains security and policy gate.
PASS GOLD remains evidence-based final gate.

Pi Harness sits beside those agents as:

`ADAPTIVE EXECUTION HARNESS`

## Responsibilities

Pi Harness may:

- measure mission difficulty D0-D5
- choose required SDDF depth L0-L9
- recommend tools
- escalate context budget
- request more logs/screenshots/files
- trigger auxiliary agent planning
- select operation mode: inspect, diagnose, plan, dry-run, patch, validate, audit
- control attempt budget
- avoid overkill for simple problems
- avoid underestimating complex problems
- decide when a task needs L7 Evidence Receipt before continuing

## Prohibitions

Pi Harness must not:

- decide PASS GOLD alone
- mark `pass_gold:true`
- mark `promotion_allowed:true`
- open PR without PASS GOLD
- deploy or promote
- bypass Aegis
- bypass Evidence Receipt
- bypass rollback requirements
- modify files without L3 Plan, L4 Dry Run, and L5 Controlled Patch
- execute direct patch in V8_PURE_VISUAL_SNAPSHOT mode
- convert warnings into promotion rights

## Difficulty Model

Pi Harness maps a mission to D0-D5:

- D0 Trivial: text, explanation, command help
- D1 Low: safe single-file or doc adjustment
- D2 Medium: small frontend or endpoint alignment
- D3 High: multi-file change or contract-sensitive change
- D4 Critical: deploy, auth, CORS, SSE, GitHub flow, rollback, PASS GOLD
- D5 Enterprise: autonomous repair with patch, validation, evidence, PR, and promotion

## Layer Model

Pi Harness maps difficulty to max or required SDDF layer:

- D0 -> L0-L2
- D1 -> L0-L4
- D2 -> L0-L6
- D3 -> L0-L7
- D4 -> L0-L8 required
- D5 -> L0-L9 required

## Future Runtime Modes

Potential future integration modes:

### CLI
Run Pi as an external coding harness under controlled command policy.

### Print/JSON
Use Pi in scriptable output mode for machine-readable events.

### RPC
Use Pi through stdin/stdout JSON protocol as a non-Node integration bridge.

### SDK
Embed Pi-like harness behavior into Vision Core runtime when safe.

No runtime integration is implemented in this spec phase.

## Event Contract Draft

### pi:difficulty_assessed

```json
{
  "difficulty": "D3",
  "max_layer": "L7",
  "reason": "multi-file frontend/backend contract risk",
  "tools_required": ["scanner", "hermes", "aegis"],
  "risk": "high"
}
```

### pi:scale_context

```json
{
  "context_budget": "expanded",
  "files_scope": ["frontend", "worker"],
  "logs_required": true,
  "screenshots_required": true
}
```

### pi:tool_plan

```json
{
  "mode": "dry_run",
  "tools": ["scanner", "diff", "guard"],
  "requires_approval": true
}
```

### pi:block

```json
{
  "reason": "Evidence Receipt missing",
  "required_layer": "L7"
}
```

## Evidence Contract

Every Pi decision that escalates execution must be explainable in Evidence Receipt.

Evidence must include:

- difficulty class
- selected max layer
- reason for escalation
- tools requested
- risk classification
- block reasons
- final decision path

## PASS GOLD Relationship

Pi Harness may recommend readiness, but PASS GOLD remains controlled by evidence validation.

No Pi signal is sufficient to mark PASS GOLD without L7 Evidence Receipt and L8 PASS GOLD evaluation.
