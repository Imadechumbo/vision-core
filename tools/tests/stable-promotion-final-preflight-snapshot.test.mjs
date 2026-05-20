#!/usr/bin/env node
/**
 * Tests — Stable Promotion Final Preflight Snapshot V122.0
 */

import {
  captureStablePromotionFinalPreflightSnapshot,
  validateStablePromotionFinalPreflightSnapshot,
  renderStablePromotionFinalPreflightSnapshot,
  PREFLIGHT_SNAPSHOT_STATUSES,
} from '../stable-promotion-final-preflight-snapshot.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_RUNBOOK = {
  runbook_ready:     true,
  runbook_id:        'runbook-001',
  target_stable_ref: 'stable',
  target_tag:        'v1.0.0',
  all_gates_passed:  true,
};

const GOOD_PARAMS = {
  stable_promotion_human_runbook: GOOD_RUNBOOK,
  current_stable_head:            'cafecafe1234567',
  current_worktree_status:        'clean',
};

console.log('\n=== stable-promotion-final-preflight-snapshot tests ===\n');

console.log('--- null runbook ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot({});
  assert(r.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_RUNBOOK', 'null runbook → BLOCKED_RUNBOOK');
  assert(r.snapshot_ready === false, 'snapshot_ready false');
}

console.log('--- runbook not ready ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot({ stable_promotion_human_runbook: { runbook_ready: false } });
  assert(r.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_RUNBOOK', 'not-ready → BLOCKED_RUNBOOK');
}

console.log('--- ci_environment blocked ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot({ ...GOOD_PARAMS, ci_environment: true });
  assert(r.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_CI', 'ci_environment → BLOCKED_CI');
  assert(r.snapshot_ready === false, 'snapshot_ready false');
}

console.log('--- github_actions blocked ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot({ ...GOOD_PARAMS, github_actions: true });
  assert(r.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_CI', 'github_actions → BLOCKED_CI');
}

console.log('--- snapshot ready ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS);
  assert(r.snapshot_status === 'PREFLIGHT_SNAPSHOT_READY', 'ready status');
  assert(r.snapshot_ready === true, 'snapshot_ready true');
  assert(r.runbook_id === 'runbook-001', 'runbook_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.all_gates_passed === true, 'all_gates_passed propagated');
  assert(r.current_stable_head === 'cafecafe1234567', 'current_stable_head propagated');
  assert(r.current_worktree_status === 'clean', 'worktree_status propagated');
  assert(typeof r.snapshot_id === 'string' && r.snapshot_id.length === 64, 'snapshot_id sha256');
  assert(typeof r.content_hash === 'string' && r.content_hash.length === 64, 'content_hash sha256');
  assert(r.schema_version === 'v122.0', 'schema version');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = captureStablePromotionFinalPreflightSnapshot({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS).release_performed === false, 'release_performed=false');
}

console.log('--- snapshot_executes_nothing=true ---');
{
  const r1 = captureStablePromotionFinalPreflightSnapshot({});
  assert(r1.snapshot_executes_nothing === true, 'blocked: true');
  const r2 = captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS);
  assert(r2.snapshot_executes_nothing === true, 'ready: true');
}

console.log('--- pre_promotion_only=true ---');
{
  assert(captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS).pre_promotion_only === true, 'pre_promotion_only=true');
}

console.log('--- validate ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS);
  const v = validateStablePromotionFinalPreflightSnapshot(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionFinalPreflightSnapshot(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot(GOOD_PARAMS);
  const txt = renderStablePromotionFinalPreflightSnapshot(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION FINAL PREFLIGHT SNAPSHOT'), 'render title');
  assert(txt.includes('PREFLIGHT_SNAPSHOT_READY'), 'status in output');
  assert(txt.includes('snapshot_executes_nothing:'), 'invariant in output');
  assert(txt.includes('pre_promotion_only:'), 'pre_promotion field in output');
}

console.log('--- render blocked ---');
{
  const r = captureStablePromotionFinalPreflightSnapshot({});
  const txt = renderStablePromotionFinalPreflightSnapshot(r);
  assert(txt.includes('PREFLIGHT SNAPSHOT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_READY'), 'ready in statuses');
  assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_RUNBOOK'), 'runbook blocked in statuses');
  assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_CI'), 'ci blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
