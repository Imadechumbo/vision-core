# Hermes Cache Intelligence Baseline — V145.0

Capstone for the V141.0–V144.1 Hermes Learning + Runtime Cache Intelligence phase.

## Purpose

Verifies all 8 Hermes intelligence modules are connected and safe. Provides a single consolidated status signal — `hermes_cache_intelligence_ready` — that downstream consumers can use to determine whether Hermes cache learning is operational.

## REGRA ABSOLUTA

`stable_promoted=false`, `deploy_performed=false`, `release_performed=false` on every output — no exceptions.

## Verified Modules (8)

| Module | Version |
|--------|---------|
| hermes-cache-learning-contract | V141.0 |
| hermes-cost-pattern-memory | V141.1 |
| hermes-evidence-reuse-gate | V142.0 |
| hermes-similar-mission-classifier | V142.1 |
| hermes-expensive-analysis-skip-gate | V143.0 |
| hermes-runtime-prompt-compression-plan | V143.1 |
| hermes-extra-records-connector | V144.0 |
| hermes-learning-safety-ledger | V144.1 |

## Statuses

| Status | Meaning |
|--------|---------|
| `CACHE_INTELLIGENCE_BLOCKED_INPUT` | `mission_id` missing or empty |
| `CACHE_INTELLIGENCE_READY` | All module statuses clear |
| `CACHE_INTELLIGENCE_WARNING` | At least one status has WARNING or PARTIAL |
| `CACHE_INTELLIGENCE_BLOCKED` | At least one status has a BLOCKED pattern |

## Safety Invariants (always true)

- `unsafe_learning_blocked = true`
- `positive_learning_requires_pass_gold = true`
- `evidence_reuse_guarded = true`
- `expensive_analysis_skip_guarded = true`

## API

```js
import {
  buildCacheIntelligenceBaseline,
  validateCacheIntelligenceBaseline,
  renderCacheIntelligenceBaseline,
  CACHE_INTELLIGENCE_BASELINE_STATUSES,
  HERMES_INTELLIGENCE_MODULES,
} from './tools/hermes-cache-intelligence-baseline.mjs';
```

### `buildCacheIntelligenceBaseline(params)`

| Param | Type | Notes |
|-------|------|-------|
| `mission_id` | string | Required |
| `learning_contract_status` | string\|null | From V141.0 |
| `cost_pattern_status` | string\|null | From V141.1 |
| `evidence_reuse_status` | string\|null | From V142.0 |
| `similar_mission_status` | string\|null | From V142.1 |
| `skip_gate_status` | string\|null | From V143.0 |
| `prompt_compression_status` | string\|null | From V143.1 |
| `extra_records_status` | string\|null | From V144.0 |
| `learning_safety_ledger_sealed` | boolean\|null | From V144.1 |
| `hermes_learning_connected` | boolean | |
| `graph_memory_connected` | boolean | |
| `extra_records_connected` | boolean | |
| `baselined_at` | string | ISO timestamp; defaults to `new Date().toISOString()` |

### `validateCacheIntelligenceBaseline(result)`

Returns `{ valid: boolean, errors: string[] }`. Checks required fields and all safety invariants.

### `renderCacheIntelligenceBaseline(result)`

Returns human-readable string summary. Safe to call with `null`.
