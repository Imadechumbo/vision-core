# Cost, Cache and Agent Budget Governance Baseline — V140.0

Capstone module consolidating V131.0–V139.1. Provides a single baseline record verifying all cost, cache, and agent budget governance modules are present and healthy.

## Exports

- `buildGovernanceBaseline(params)` — builds governance baseline from status of all sub-modules
- `validateGovernanceBaseline(result)` — validates required fields and REGRA invariants
- `renderGovernanceBaseline(result)` — human-readable summary
- `GOVERNANCE_BASELINE_STATUSES` — 4-element status array
- `VERIFIED_MODULES` — array of 18 verified module names

## Statuses

| Status | Meaning |
|--------|---------|
| `GOVERNANCE_BASELINE_BLOCKED_INPUT` | Missing `mission_id` |
| `GOVERNANCE_BASELINE_READY` | All modules clear |
| `GOVERNANCE_BASELINE_WARNING` | One or more modules in WARNING state |
| `GOVERNANCE_BASELINE_BLOCKED` | One or more modules BLOCKED |

## Verified Modules (18)

| Version | Module |
|---------|--------|
| V131.0 | agent-context-cache-contract |
| V131.1 | agent-context-cache-store |
| V132.0 | prompt-cache-ledger |
| V132.1 | cache-hit-miss-reporter |
| V133.0 | token-budget-controller |
| V133.1 | mission-cost-estimator |
| V134.0 | cost-gate-policy |
| V134.1 | cost-gate-enforcement-report |
| V135.0 | budget-aware-test-lane-selector |
| V135.1 | budget-aware-agent-router |
| V136.0 | local-free-fallback-governor |
| V136.1 | peak-offpeak-execution-scheduler |
| V137.0 | agent-usage-ledger |
| V137.1 | cost-cache-governance-report |
| V138.0 | budget-regression-guard |
| V138.1 | mission-budget-receipt |
| V139.0 | cost-aware-mission-finalizer |
| V139.1 | cache-budget-audit-baseline |

## Key fields

- `baseline_id` — sha256 deterministic from all input fields
- `schema_version` — `v140.0`
- `cost_cache_governance_baseline_ready` — `true` when no module is BLOCKED
- `verified_modules` / `verified_module_count` — full list and count
- `baselined_at` — ISO timestamp

## REGRA ABSOLUTA

`stable_promoted=false`, `deploy_performed=false`, `release_performed=false` — always, on every output.

## Tests

92 passed, 0 failed.
