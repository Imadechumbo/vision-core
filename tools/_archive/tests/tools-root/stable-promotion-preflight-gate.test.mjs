#!/usr/bin/env node
/**
 * Tests — Stable Promotion Preflight Gate V114.0
 */

import {
  evaluateStablePromotionPreflightGate,
  validateStablePromotionPreflightGate,
  renderStablePromotionPreflightGate,
  STABLE_PREFLIGHT_GATE_STATUSES,
  STABLE_PREFLIGHT_ALLOWED_TARGETS,
} from '../stable-promotion-preflight-gate.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const GOOD_REPORT = {
  report_ready:             true,
  report_id:                'report-test-001',
  stable_preflight_allowed: true,
};

const GOOD_PARAMS = {
  stable_review_report:        GOOD_REPORT,
  target_stable_ref:           'stable',
  target_tag:                  'v111.0',
  git_head:                    'cafecafe1234567',
  working_tree_clean:          true,
  stable_ref_exists:           false,
  stable_ref_points_to_target: false,
  rollback_anchor_id:          'rollback-001',
  ci_environment:              false,
  github_actions:              false,
};

console.log('\n=== stable-promotion-preflight-gate tests ===\n');

// missing report
console.log('--- missing report ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, stable_review_report: null });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_REPORT', 'null report → BLOCKED_REPORT');
  assert(r.preflight_ready === false, 'preflight_ready false');
  assert(r.stable_preflight_ready === false, 'stable_preflight_ready false');
}

// report not ready
console.log('--- report not ready ---');
{
  const r = evaluateStablePromotionPreflightGate({
    ...GOOD_PARAMS,
    stable_review_report: { report_ready: false, stable_preflight_allowed: true },
  });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_REPORT', 'not-ready → BLOCKED_REPORT');
}

// stable_preflight_allowed=false
console.log('--- stable_preflight_allowed=false ---');
{
  const r = evaluateStablePromotionPreflightGate({
    ...GOOD_PARAMS,
    stable_review_report: { report_ready: true, stable_preflight_allowed: false },
  });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_REPORT', 'preflight_allowed=false → BLOCKED_REPORT');
}

// dirty worktree
console.log('--- dirty worktree ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, working_tree_clean: false });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_WORKTREE', 'dirty → BLOCKED_WORKTREE');
}

// ci_environment=true
console.log('--- ci_environment=true ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, ci_environment: true });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_CI', 'ci_environment=true → BLOCKED_CI');
}

// github_actions=true
console.log('--- github_actions=true ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, github_actions: true });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_CI', 'github_actions=true → BLOCKED_CI');
}

// missing rollback_anchor_id
console.log('--- missing rollback_anchor_id ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, rollback_anchor_id: null });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_ROLLBACK', 'no rollback → BLOCKED_ROLLBACK');
}

// bad target_stable_ref
console.log('--- bad target_stable_ref ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, target_stable_ref: 'master' });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_BLOCKED_TARGET', 'bad ref → BLOCKED_TARGET');
}

// target 'stable' passes
console.log('--- target stable passes ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, target_stable_ref: 'stable' });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_READY_FOR_FUTURE_PROMOTION_COMMAND', 'stable ref → READY');
}

// target 'production/stable' passes
console.log('--- target production/stable passes ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, target_stable_ref: 'production/stable' });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_READY_FOR_FUTURE_PROMOTION_COMMAND', 'production/stable → READY');
}

// target 'refs/heads/stable' passes
console.log('--- target refs/heads/stable passes ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, target_stable_ref: 'refs/heads/stable' });
  assert(r.preflight_status === 'STABLE_PREFLIGHT_READY_FOR_FUTURE_PROMOTION_COMMAND', 'refs/heads/stable → READY');
}

// full ready
console.log('--- full ready ---');
{
  const r = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  assert(r.preflight_status === 'STABLE_PREFLIGHT_READY_FOR_FUTURE_PROMOTION_COMMAND', 'full ready status');
  assert(r.preflight_ready === true, 'preflight_ready true');
  assert(r.stable_preflight_ready === true, 'stable_preflight_ready true');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref set');
  assert(r.rollback_anchor_id === 'rollback-001', 'rollback_anchor_id set');
  assert(r.schema_version === 'v114.0', 'schema version');
  assert(r.report_id === 'report-test-001', 'report_id propagated');
}

// future_promotion_command_required=true always
console.log('--- future_promotion_command_required=true ---');
{
  const r1 = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, stable_review_report: null });
  assert(r1.future_promotion_command_required === true, 'blocked: future_promotion_command_required=true');

  const r2 = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  assert(r2.future_promotion_command_required === true, 'ready: future_promotion_command_required=true');
}

// stable_promotion_allowed=false always
console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, stable_review_report: null });
  assert(r1.stable_promotion_allowed === false, 'blocked: stable_promotion_allowed=false');

  const r2 = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'ready: stable_promotion_allowed=false');
}

// stable_promoted=false always
console.log('--- stable_promoted=false ---');
{
  const r = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// git_push_performed=false always
console.log('--- git_push_performed=false ---');
{
  const r = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

// deploy_performed=false always
console.log('--- deploy_performed=false ---');
{
  const r = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release_performed=false always
console.log('--- release_performed=false ---');
{
  const r = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  assert(r.release_performed === false, 'release_performed=false');
}

// validate
console.log('--- validate ---');
{
  const r = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  const v = validateStablePromotionPreflightGate(r);
  assert(v.valid === true, 'validate ready gate');
  assert(v.errors.length === 0, 'no errors');
}

// render ready
console.log('--- render ready ---');
{
  const r = evaluateStablePromotionPreflightGate(GOOD_PARAMS);
  const txt = renderStablePromotionPreflightGate(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE PROMOTION PREFLIGHT GATE'), 'render includes title');
}

// render blocked
console.log('--- render blocked ---');
{
  const r = evaluateStablePromotionPreflightGate({ ...GOOD_PARAMS, stable_review_report: null });
  const txt = renderStablePromotionPreflightGate(r);
  assert(txt.includes('STABLE PREFLIGHT BLOCKED'), 'render blocked label');
}

// status exports
console.log('--- status exports ---');
{
  assert(STABLE_PREFLIGHT_GATE_STATUSES.includes('STABLE_PREFLIGHT_READY_FOR_FUTURE_PROMOTION_COMMAND'), 'ready in exports');
  assert(STABLE_PREFLIGHT_GATE_STATUSES.includes('STABLE_PREFLIGHT_BLOCKED_CI'), 'ci-blocked in exports');
  assert(STABLE_PREFLIGHT_GATE_STATUSES.includes('STABLE_PREFLIGHT_BLOCKED_REPORT'), 'report-blocked in exports');
}

// allowed target exports
console.log('--- allowed target exports ---');
{
  assert(STABLE_PREFLIGHT_ALLOWED_TARGETS.includes('stable'), 'stable in targets');
  assert(STABLE_PREFLIGHT_ALLOWED_TARGETS.includes('production/stable'), 'production/stable in targets');
  assert(STABLE_PREFLIGHT_ALLOWED_TARGETS.includes('refs/heads/stable'), 'refs/heads/stable in targets');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
