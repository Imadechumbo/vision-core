#!/usr/bin/env node
/**
 * Tests — Stable Execution Post-State Snapshot V127.0
 */

import {
  captureStableExecutionPostStateSnapshot,
  validateStableExecutionPostStateSnapshot,
  renderStableExecutionPostStateSnapshot,
  POST_STATE_SNAPSHOT_STATUSES,
} from '../stable-execution-post-state-snapshot.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_VERIFIER = {
  diff_verified:          true,
  verifier_id:            'verifier-001',
  governance_baseline_id: 'baseline-001',
  import_id:              'import-001',
  execution_receipt_id:   'exec-receipt-001',
  executed_by:            'human-operator',
  target_stable_ref:      'stable',
  target_tag:             'v127.0-test',
  checks: {
    target_ref_match:  true,
    target_tag_match:  true,
    baseline_id_match: true,
  },
};

console.log('\n=== stable-execution-post-state-snapshot tests ===\n');

console.log('--- null verifier ---');
{
  const s = captureStableExecutionPostStateSnapshot({});
  assert(s.snapshot_status === 'POST_STATE_SNAPSHOT_BLOCKED_VERIFIER', 'null verifier → BLOCKED_VERIFIER');
  assert(s.snapshot_ready === false, 'snapshot_ready false');
}

console.log('--- verifier not verified ---');
{
  const s = captureStableExecutionPostStateSnapshot({
    stable_execution_diff_verifier: { diff_verified: false },
  });
  assert(s.snapshot_status === 'POST_STATE_SNAPSHOT_BLOCKED_VERIFIER', 'not-verified → BLOCKED_VERIFIER');
}

console.log('--- snapshot ready ---');
{
  const s = captureStableExecutionPostStateSnapshot({
    stable_execution_diff_verifier: GOOD_VERIFIER,
    captured_at: '2026-05-20T12:00:00Z',
  });
  assert(s.snapshot_status === 'POST_STATE_SNAPSHOT_READY', 'ready status');
  assert(s.snapshot_ready === true, 'snapshot_ready true');
  assert(typeof s.snapshot_id === 'string' && s.snapshot_id.length === 64, 'snapshot_id sha256');
  assert(typeof s.content_hash === 'string' && s.content_hash.length === 64, 'content_hash sha256');
  assert(s.schema_version === 'v127.0', 'schema version');
  assert(s.verifier_id === 'verifier-001', 'verifier_id propagated');
  assert(s.governance_baseline_id === 'baseline-001', 'governance_baseline_id propagated');
  assert(s.import_id === 'import-001', 'import_id propagated');
  assert(s.execution_receipt_id === 'exec-receipt-001', 'execution_receipt_id propagated');
  assert(s.executed_by === 'human-operator', 'executed_by propagated');
  assert(s.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(s.target_tag === 'v127.0-test', 'target_tag propagated');
  assert(s.all_checks_passed === true, 'all_checks_passed true');
  assert(s.captured_at === '2026-05-20T12:00:00Z', 'captured_at');
}

console.log('--- snapshot without captured_at ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.snapshot_ready === true, 'ready without captured_at');
  assert(s.captured_at === null, 'captured_at null');
}

console.log('--- all_checks_passed when some checks false ---');
{
  const partialVerifier = {
    ...GOOD_VERIFIER,
    checks: { target_ref_match: true, target_tag_match: false, baseline_id_match: true },
  };
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: partialVerifier });
  assert(s.snapshot_ready === true, 'snapshot still ready');
  assert(s.all_checks_passed === false, 'all_checks_passed false when partial');
}

console.log('--- snapshot_id deterministic ---');
{
  const s1 = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  const s2 = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s1.snapshot_id === s2.snapshot_id, 'snapshot_id deterministic');
  assert(s1.content_hash === s2.content_hash, 'content_hash deterministic');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const s1 = captureStableExecutionPostStateSnapshot({});
  assert(s1.system_execution_performed === false, 'blocked: false');
  const s2 = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s2.system_execution_performed === false, 'ready: false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.release_performed === false, 'release_performed=false');
}

console.log('--- snapshot_is_post_execution=true ---');
{
  const s1 = captureStableExecutionPostStateSnapshot({});
  assert(s1.snapshot_is_post_execution === true, 'blocked: true');
  const s2 = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s2.snapshot_is_post_execution === true, 'ready: true');
}

console.log('--- snapshot_executes_nothing=true ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  assert(s.snapshot_executes_nothing === true, 'snapshot_executes_nothing=true');
}

console.log('--- validate ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER });
  const v = validateStableExecutionPostStateSnapshot(s);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStableExecutionPostStateSnapshot(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const s = captureStableExecutionPostStateSnapshot({ stable_execution_diff_verifier: GOOD_VERIFIER, captured_at: '2026-05-20T12:00:00Z' });
  const txt = renderStableExecutionPostStateSnapshot(s);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE EXECUTION POST-STATE SNAPSHOT V127.0'), 'render title');
  assert(txt.includes('POST_STATE_SNAPSHOT_READY'), 'status in output');
  assert(txt.includes('system_execution_performed:'), 'invariant in output');
  assert(txt.includes('snapshot_is_post_execution:'), 'snapshot field in output');
}

console.log('--- render blocked ---');
{
  const s = captureStableExecutionPostStateSnapshot({});
  const txt = renderStableExecutionPostStateSnapshot(s);
  assert(txt.includes('POST-STATE SNAPSHOT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(POST_STATE_SNAPSHOT_STATUSES.includes('POST_STATE_SNAPSHOT_READY'), 'ready in statuses');
  assert(POST_STATE_SNAPSHOT_STATUSES.includes('POST_STATE_SNAPSHOT_BLOCKED_VERIFIER'), 'blocked in statuses');
  assert(POST_STATE_SNAPSHOT_STATUSES.length === 2, 'exactly 2 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
