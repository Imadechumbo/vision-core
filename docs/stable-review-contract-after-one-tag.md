# Stable Review Contract After One-Tag Operation — V111.0

Stable review contract after one real tag operation. Does NOT promote stable.

## States

| Status | Condition |
|--------|-----------|
| `STABLE_REVIEW_CONTRACT_BLOCKED_BASELINE` | One-tag baseline not ready |
| `STABLE_REVIEW_CONTRACT_BLOCKED_EVIDENCE` | evidence_source not go-core |
| `STABLE_REVIEW_CONTRACT_BLOCKED_TAG` | target_tag invalid |
| `STABLE_REVIEW_CONTRACT_DRY_RUN_REVIEW_READY` | Dry-run mode |
| `STABLE_REVIEW_CONTRACT_MOCK_REAL_TAG_REVIEW_READY` | Mock real tag mode |
| `STABLE_REVIEW_CONTRACT_REAL_TAG_REVIEW_READY` | Real tag confirmed via receipt |

## Invariants

- `stable_promotion_allowed=false` always
- `stable_promoted=false` always
- `deploy_performed=false` always
- `release_performed=false` always
- `human_review_required=true` always
- `evidence_source` must be `go-core`
