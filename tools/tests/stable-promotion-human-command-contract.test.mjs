#!/usr/bin/env node
/**
 * Tests — Stable Promotion Human Command Contract V116.0
 */

import {
  buildStablePromotionHumanCommandContract,
  validateStablePromotionHumanCommandContract,
  renderStablePromotionHumanCommandContract,
  HUMAN_COMMAND_CONTRACT_STATUSES,
  ALLOWED_TARGET_REFS,
} from '../stable-promotion-human-command-contract.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_BASELINE  = { stable_review_baseline_ready: true, baseline_id: 'baseline-001' };
const GOOD_PREFLIGHT = { stable_preflight_ready: true, preflight_id: 'preflight-001' };
const GOOD_PARAMS = {
  stable_review_baseline:    GOOD_BASELINE,
  stable_promotion_preflight: GOOD_PREFLIGHT,
  target_stable_ref:         'stable',
  target_tag:                'v1.0.0',
  git_head:                  'cafecafe1234567',
  rollback_anchor_id:        'rollback-001',
  requested_by:              'human-001',
};

console.log('\n=== stable-promotion-human-command-contract tests ===\n');

console.log('--- missing baseline ---');
{
  const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, stable_review_baseline: null });
  assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_BLOCKED_BASELINE', 'null baseline → BLOCKED_BASELINE');
  assert(r.contract_ready === false, 'contract_ready false');
}

console.log('--- baseline not ready ---');
{
  const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, stable_review_baseline: { stable_review_baseline_ready: false } });
  assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_BLOCKED_BASELINE', 'not-ready baseline → BLOCKED_BASELINE');
}

console.log('--- missing preflight ---');
{
  const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, stable_promotion_preflight: null });
  assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_BLOCKED_PREFLIGHT', 'null preflight → BLOCKED_PREFLIGHT');
}

console.log('--- preflight not ready ---');
{
  const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, stable_promotion_preflight: { stable_preflight_ready: false } });
  assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_BLOCKED_PREFLIGHT', 'not-ready preflight → BLOCKED_PREFLIGHT');
}

console.log('--- bad target ref ---');
{
  const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, target_stable_ref: 'master' });
  assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_BLOCKED_TARGET', 'bad ref → BLOCKED_TARGET');
}

console.log('--- missing rollback ---');
{
  const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, rollback_anchor_id: null });
  assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_BLOCKED_ROLLBACK', 'no rollback → BLOCKED_ROLLBACK');
}

console.log('--- full ready ---');
{
  const r = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_READY', 'ready status');
  assert(r.contract_ready === true, 'contract_ready true');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref');
  assert(r.rollback_anchor_id === 'rollback-001', 'rollback_anchor_id');
  assert(r.schema_version === 'v116.0', 'schema version');
  assert(r.human_required === true, 'human_required true');
  assert(r.local_interactive_only === true, 'local_interactive_only true');
  assert(r.future_command_required === true, 'future_command_required true');
}

console.log('--- target refs ---');
{
  for (const ref of ['stable', 'production/stable', 'refs/heads/stable']) {
    const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, target_stable_ref: ref });
    assert(r.contract_status === 'HUMAN_COMMAND_CONTRACT_READY', `${ref} → READY`);
  }
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, stable_review_baseline: null });
  assert(r1.stable_promotion_allowed === false, 'blocked: stable_promotion_allowed=false');
  const r2 = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'ready: stable_promotion_allowed=false');
}

console.log('--- stable_promoted=false ---');
{
  const r = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  const r = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  const r = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  const r = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- validate ---');
{
  const r = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  const v = validateStablePromotionHumanCommandContract(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- render ready ---');
{
  const r = buildStablePromotionHumanCommandContract(GOOD_PARAMS);
  const txt = renderStablePromotionHumanCommandContract(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE PROMOTION HUMAN COMMAND CONTRACT'), 'render includes title');
}

console.log('--- render blocked ---');
{
  const r = buildStablePromotionHumanCommandContract({ ...GOOD_PARAMS, stable_review_baseline: null });
  const txt = renderStablePromotionHumanCommandContract(r);
  assert(txt.includes('HUMAN COMMAND CONTRACT BLOCKED'), 'render blocked label');
}

console.log('--- statuses export ---');
{
  assert(HUMAN_COMMAND_CONTRACT_STATUSES.includes('HUMAN_COMMAND_CONTRACT_READY'), 'ready in exports');
  assert(HUMAN_COMMAND_CONTRACT_STATUSES.includes('HUMAN_COMMAND_CONTRACT_BLOCKED_BASELINE'), 'blocked in exports');
}

console.log('--- allowed refs export ---');
{
  assert(ALLOWED_TARGET_REFS.includes('stable'), 'stable in allowed');
  assert(ALLOWED_TARGET_REFS.includes('production/stable'), 'production/stable in allowed');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
