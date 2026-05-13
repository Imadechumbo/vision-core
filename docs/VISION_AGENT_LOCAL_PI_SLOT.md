# Vision Agent Local — Pi Harness Slot

This document prepares the future Pi Harness / Pi Agents slot for the Vision Agent Local wheel.

Current implementation status: specification only.

Current frontend state: `V8_PURE_VISUAL_SNAPSHOT MODE`.

Do not alter the V8 Gold visual, orbit, CSS, or runtime as part of this spec.

## New Agent

Name: `PI HARNESS`

Label: `adaptive difficulty engine`

Contract:

> Adapts agents, tools, context, and execution depth to the real size of the problem without skipping Evidence Receipt or PASS GOLD.

## Future Wheel Placement

Preferred future position:

- between OpenClaw and Scanner, or
- as an external adaptive ring around the existing Vision Agent Local orbit

No visual placement is implemented yet.

## Visual States

Pi Harness may display:

- IDLE
- ASSESSING
- SCALING
- ORCHESTRATING
- BLOCKED
- READY

## Metrics

Pi Harness should eventually expose:

- difficulty: D0-D5
- current_layer: L0-L9
- max_layer: L0-L9
- risk: low / medium / high / critical
- context_budget: normal / expanded / maximum
- tool_budget: minimal / standard / expanded
- attempts_budget
- evidence_status

## Event Labels

Future UI events:

- `pi:difficulty_assessed`
- `pi:scale_context`
- `pi:tool_plan`
- `pi:block`

## UI Behavior

The Pi slot must not execute mission logic directly.

It may display:

- selected difficulty
- required SDDF depth
- tools recommended
- block reason
- next required evidence

It must not display PASS GOLD unless the PASS GOLD layer has evidence.

## Guardrails

Pi Harness in the wheel cannot:

- mark PASS GOLD
- enable promotion
- enable deploy
- create PR
- bypass Aegis
- bypass Evidence Receipt
- write files
- override Runtime Owner

## Runtime Relationship

Future runtime ownership remains:

- Runtime Owner executes mission lifecycle.
- Pi Harness only recommends depth and tool plan.
- PASS GOLD remains final evidence gate.

## Current Non-Goals

This spec does not:

- install Pi
- call Pi
- edit `frontend/index.html`
- edit CSS
- edit the orbit
- remove V8 legacy runtime
- change guard behavior
- change deployment policy

## Future Acceptance Criteria

When implementation begins, it must satisfy:

- Pi slot visible without breaking the V8 Gold orbit
- D0-D5 shown clearly
- L0-L9 shown clearly
- no PASS GOLD without evidence
- no promotion without PASS GOLD
- no direct mutation from UI-only agent
