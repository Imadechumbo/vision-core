# Cost and Cache Governance Report — V137.1

## Overview

Consolidates cost, cache, budget, routing, fallback, and scheduler status into a single governance report.

## Status Values

| Status | Meaning |
|---|---|
| `GOVERNANCE_REPORT_BLOCKED_INPUT` | Required input missing (e.g., mission_id) |
| `GOVERNANCE_REPORT_READY` | All checks clear, proceed allowed |
| `GOVERNANCE_REPORT_WARNING` | Elevated cost or budget warning, proceed with caution |
| `GOVERNANCE_REPORT_BLOCKED` | Cost or budget blocked, execution must not proceed |

## Inputs

- `mission_id` — required
- `token_budget_result` — from V133.0
- `mission_cost_estimate` — from V133.1
- `cost_gate_policy` — from V134.0
- `cost_enforcement_report` — from V134.1
- `test_lane_selection` — from V135.0
- `agent_route` — from V135.1
- `fallback_governor` — from V136.0
- `execution_window` — from V136.1
- `agent_usage_ledger` — from V137.0

## REGRA ABSOLUTA

`stable_promoted=false` | `deploy_performed=false` | `release_performed=false` — always.
