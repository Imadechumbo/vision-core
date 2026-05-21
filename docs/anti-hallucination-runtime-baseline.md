# Anti-Hallucination Runtime Baseline — V150.0

Capstone for V146.0–V149.1. Verifies all 9 anti-hallucination modules active
and all invariants hold before any agent assertion can be treated as fact.

## Modules (9 total)

| Module | Version |
|---|---|
| agent-claim-verification-gate | V146.0 |
| filesystem-reality-check | V146.1 |
| git-diff-truth-binding | V147.0 |
| tool-execution-proof-ledger | V147.1 |
| hermes-hallucination-incident-memory | V148.0 |
| agent-truth-score-gate | V148.1 |
| real-execution-controlled-gate | V149.0 |
| real-execution-dry-run-proof-report | V149.1 |
| anti-hallucination-runtime-baseline | V150.0 |

## Invariant flags (must all be true for READY)

- `hallucinated_claims_blocked=true`
- `unverified_agent_claims_blocked=true`
- `pass_gold_fake_blocked=true`
- `agent_claims_require_local_proof=true`
- `no_execution_without_truth=true`
- `no_learning_from_false_claims=true`

## Baseline statuses

- `ANTI_HALLUCINATION_BASELINE_BLOCKED` — missing baseline_id
- `ANTI_HALLUCINATION_BASELINE_PARTIAL` — modules present but invariants incomplete
- `ANTI_HALLUCINATION_BASELINE_READY` — all 9 modules + all invariants satisfied

## REGRA ABSOLUTA

`stable_promoted=false`, `deploy_performed=false`, `release_performed=false` always.
`unsafe_learning_blocked=true`, `positive_learning_requires_pass_gold=true` always.

No agent assertion becomes fact without local verifiable proof.
