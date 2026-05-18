# Real Tag Human Runbook — V91.0

> **REGRA ABSOLUTA**: This runbook describes a human-operated, local-interactive-only operation.
> `tag_created=false` and `actual_real_tag_created=false` in all automated contexts always.
> No CI, no automation, no deploy, no stable promotion, no release follows tag creation.

## Pre-Conditions

Before executing, verify ALL of the following:

1. `baseline_status=EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL` (run `node tools/real-tag-execution-baseline.mjs`)
2. Evidence receipt present and verified by Go Core
3. Target tag format valid (`vX.Y.Z` or `vX.Y.Z-suffix`)
4. `git_head` matches expected HEAD SHA
5. No existing local tag with same name (`git tag -l <tag>`)
6. No existing remote tag with same name (`git ls-remote --tags origin <tag>`)
7. Running locally, not in CI
8. Working tree clean (`git status` shows no uncommitted changes)

## Step 1: Dry Run

Always run dry run first:

```
node tools/real-tag-one-shot-execution-controller.mjs --dry-run --json
```

Verify output shows `execution_controller_status=REAL_TAG_EXEC_CTRL_READY_DRY_RUN` and all gates PASS.

## Step 2: Real Execution (Human Only)

Replace `<placeholders>` with actual values, then run:

```
node tools/real-tag-one-shot-execution-controller.mjs \
  --real-tag-one-shot \
  --execute-real-tag \
  --i-understand-this-creates-a-real-git-tag \
  --confirm-target-tag <target_tag> \
  --confirm-git-head <git_head_sha> \
  --confirm-evidence-receipt <evidence_receipt_id> \
  --confirm-rollback-anchor <rollback_anchor_id> \
  --confirm-no-deploy \
  --confirm-no-stable-promotion \
  --confirm-no-release \
  --local-interactive-only \
  --dry-run=false
```

## Step 3: Post-Execution Verification

After execution, verify ALL of the following:

1. `git tag -l <tag>` shows tag exists locally
2. `git ls-remote --tags origin refs/tags/<tag>` shows tag on remote
3. `git rev-list -n 1 <tag>` matches expected HEAD SHA
4. Execution receipt shows `receipt_type=real_tag_created`
5. Audit ledger contains `EXECUTOR_REAL_TAG_EXECUTED` event
6. Confirm `deploy_to_production=BLOCKED`
7. Confirm `promote_to_stable=BLOCKED`
8. Confirm `release_to_users=BLOCKED`

## Rollback

If something goes wrong, delete the tag:

```bash
git tag -d <tag>                        # delete local tag
git push origin :refs/tags/<tag>        # delete remote tag
```

Then verify:
- `git tag -l <tag>` returns empty
- `git ls-remote --tags origin <tag>` returns empty

## Blocked Actions

The following actions are ALWAYS BLOCKED after tag creation:

- `deploy_to_production`
- `promote_to_stable`
- `release_to_users`
- `modify_git_history`
- `push_unsigned_tags`
- `run_in_ci`
- `run_automated_without_human`

## Module Reference

| Module | Role |
|--------|------|
| `real-tag-one-shot-execution-controller.mjs` | 11-gate execution controller |
| `real-tag-one-shot-local-executor.mjs` | Injectable spawn adapter executor |
| `real-tag-one-shot-post-execution-verifier.mjs` | Post-execution tag verifier |
| `real-tag-one-shot-rollback-executor.mjs` | Rollback via spawn adapter |
| `real-tag-execution-receipt.mjs` | Execution receipt builder |
| `real-tag-execution-audit-ledger.mjs` | Append-only hash chain ledger |
| `real-tag-execution-report.mjs` | Execution summary report |
| `real-tag-execution-baseline.mjs` | V90.0 capstone baseline |
