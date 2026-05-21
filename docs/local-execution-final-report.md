# Local Execution Final Report — V165.1

Renders a final human-readable report from a PASS GOLD candidate gate result. No production, no deploy, no stable, no release.

## Exports

- `buildLocalExecutionFinalReport(input)` — build final report
- `validateLocalExecutionFinalReport(report)` — validate invariants
- `renderLocalExecutionFinalReport(report)` — human-readable render
- `LOCAL_EXECUTION_FINAL_REPORT_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_FINAL_REPORT_BLOCKED_INPUT` | Missing required fields |
| `LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE` | Candidate gate missing or invalid status |
| `LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION` | local_only=false or production_touched=true |
| `LOCAL_FINAL_REPORT_PASS` | Candidate passed, final report generated |
| `LOCAL_FINAL_REPORT_FAIL` | Candidate failed, report captures failure |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `pass_gold_local=false` in all blocked states

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
