# Local Execution Chain Baseline — V166.0 (Capstone)

Validates the full local execution chain: proof → receipt → ledger → rollback → post-state → evidence package → PASS GOLD candidate → final report. No production, no deploy, no stable, no release.

## Exports

- `buildLocalExecutionChainBaseline(input)` — build chain baseline
- `validateLocalExecutionChainBaseline(baseline)` — validate invariants
- `renderLocalExecutionChainBaseline(baseline)` — human-readable render
- `LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_CHAIN_BASELINE_BLOCKED_INPUT` | Missing required fields |
| `LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION` | local_only=false or production_touched=true in input or any component |
| `LOCAL_CHAIN_BASELINE_BLOCKED_CHAIN` | Reserved for future chain-level blocking |
| `LOCAL_CHAIN_BASELINE_READY` | All 8 chain checks pass, baseline ready |
| `LOCAL_CHAIN_BASELINE_FAIL` | One or more chain checks failed |

## Chain Checks

1. `proof_captured` — proof_status === LOCAL_EXECUTION_PROOF_CAPTURED
2. `receipt_ready` — receipt_status === LOCAL_EXECUTION_RECEIPT_READY
3. `ledger_ready` — ledger_status === LOCAL_EXECUTION_LEDGER_READY
4. `rollback_ready` — rollback gate READY or COMPLETED
5. `post_state_verified` — post_state_status === VERIFIED + post_state_verified=true
6. `evidence_sealed` — evidence_package_status === SEALED + evidence_sealed=true
7. `candidate_pass` — candidate_status === CANDIDATE_PASS + candidate_pass=true
8. `final_report_pass` — report_status === PASS + pass_gold_local=true

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `baseline_ready=false` in all blocked/fail states
- Production invariants validated across ALL chain components

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
