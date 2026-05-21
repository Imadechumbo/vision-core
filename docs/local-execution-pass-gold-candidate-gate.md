# Local Execution PASS GOLD Candidate Gate — V165.0

Evaluates a sealed local execution evidence package for PASS GOLD candidacy. No production, no deploy, no stable, no release. Local-only candidacy assessment.

## Exports

- `buildLocalExecutionPassGoldCandidateGate(input)` — build candidate gate
- `validateLocalExecutionPassGoldCandidateGate(gate)` — validate invariants
- `renderLocalExecutionPassGoldCandidateGate(gate)` — human-readable render
- `LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_PASS_GOLD_BLOCKED_INPUT` | Missing required fields |
| `LOCAL_PASS_GOLD_BLOCKED_EVIDENCE` | Evidence package missing or not SEALED |
| `LOCAL_PASS_GOLD_BLOCKED_PRODUCTION` | local_only=false or production_touched=true |
| `LOCAL_PASS_GOLD_CANDIDATE_PASS` | All criteria met, PASS GOLD candidate |
| `LOCAL_PASS_GOLD_CANDIDATE_FAIL` | One or more criteria failed |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `candidate_pass=false` in all blocked/fail states

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
