#!/usr/bin/env node
/**
 * Tests — Stable Promotion Human Runbook V121.1
 */

import {
  buildStablePromotionHumanRunbook,
  validateStablePromotionHumanRunbook,
  renderStablePromotionHumanRunbook,
  RUNBOOK_STATUSES,
} from '../stable-promotion-human-runbook.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_CLASSIFIER = {
  readiness_status:  'READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION',
  readiness_ready:   true,
  classifier_id:     'classifier-001',
  target_stable_ref: 'stable',
  target_tag:        'v1.0.0',
  all_gates_passed:  true,
};

const DRY_RUN_CLASSIFIER = {
  readiness_status:  'READINESS_DRY_RUN_READY',
  readiness_ready:   false,
  classifier_id:     'classifier-002',
  target_stable_ref: 'stable',
  target_tag:        'v1.0.0',
  all_gates_passed:  false,
};

const BLOCKED_CLASSIFIER = {
  readiness_status:  'READINESS_BLOCKED_REPORT',
  readiness_ready:   false,
  classifier_id:     'classifier-003',
};

console.log('\n=== stable-promotion-human-runbook tests ===\n');

console.log('--- null classifier ---');
{
  const r = buildStablePromotionHumanRunbook({});
  assert(r.runbook_status === 'RUNBOOK_BLOCKED_CLASSIFIER', 'null classifier → BLOCKED_CLASSIFIER');
  assert(r.runbook_ready === false, 'runbook_ready false');
}

console.log('--- blocked classifier ---');
{
  const r = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: BLOCKED_CLASSIFIER });
  assert(r.runbook_status === 'RUNBOOK_BLOCKED_CLASSIFIER', 'blocked classifier → BLOCKED_CLASSIFIER');
}

console.log('--- not ready classifier ---');
{
  const r = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: DRY_RUN_CLASSIFIER });
  assert(r.runbook_status === 'RUNBOOK_BLOCKED_NOT_READY', 'dry-run only → BLOCKED_NOT_READY');
  assert(r.runbook_ready === false, 'runbook_ready false');
}

console.log('--- runbook ready ---');
{
  const r = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER });
  assert(r.runbook_status === 'RUNBOOK_READY', 'ready status');
  assert(r.runbook_ready === true, 'runbook_ready true');
  assert(r.classifier_id === 'classifier-001', 'classifier_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.readiness_status === 'READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION', 'readiness_status propagated');
  assert(r.all_gates_passed === true, 'all_gates_passed propagated');
  assert(typeof r.runbook_id === 'string' && r.runbook_id.length === 64, 'runbook_id sha256');
  assert(r.schema_version === 'v121.1', 'schema version');
}

console.log('--- checklists present ---');
{
  const r = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER });
  assert(Array.isArray(r.pre_execution_checklist), 'pre_execution_checklist array');
  assert(r.pre_execution_checklist.length > 0, 'pre_execution_checklist not empty');
  assert(Array.isArray(r.execution_steps), 'execution_steps array');
  assert(r.execution_steps.length > 0, 'execution_steps not empty');
  assert(Array.isArray(r.post_execution_checklist), 'post_execution_checklist array');
  assert(r.post_execution_checklist.length > 0, 'post_execution_checklist not empty');
  assert(Array.isArray(r.warnings), 'warnings array');
  assert(r.warnings.length > 0, 'warnings not empty');
}

console.log('--- execution steps include target ---');
{
  const r = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER });
  assert(r.execution_steps.some(s => s.includes('v1.0.0')), 'tag in execution step');
  assert(r.execution_steps.some(s => s.includes('stable')), 'ref in execution step');
  assert(r.execution_steps.some(s => s.includes('git push')), 'git push in steps');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = buildStablePromotionHumanRunbook({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER });
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER }).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER }).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER }).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER }).release_performed === false, 'release_performed=false');
}

console.log('--- runbook_executes_nothing=true ---');
{
  const r1 = buildStablePromotionHumanRunbook({});
  assert(r1.runbook_executes_nothing === true, 'blocked: true');
  const r2 = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER });
  assert(r2.runbook_executes_nothing === true, 'ready: true');
}

console.log('--- human_must_follow_manually=true ---');
{
  assert(buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER }).human_must_follow_manually === true, 'human_must_follow_manually=true');
}

console.log('--- validate ---');
{
  const r = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER });
  const v = validateStablePromotionHumanRunbook(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionHumanRunbook(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: GOOD_CLASSIFIER });
  const txt = renderStablePromotionHumanRunbook(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION HUMAN RUNBOOK'), 'render title');
  assert(txt.includes('PRE-EXECUTION CHECKLIST'), 'pre-check section');
  assert(txt.includes('EXECUTION STEPS'), 'execution section');
  assert(txt.includes('POST-EXECUTION CHECKLIST'), 'post-check section');
  assert(txt.includes('WARNINGS'), 'warnings section');
  assert(txt.includes('runbook_executes_nothing:'), 'invariant in output');
  assert(txt.includes('human_must_follow_manually:'), 'human field in output');
}

console.log('--- render blocked ---');
{
  const r = buildStablePromotionHumanRunbook({});
  const txt = renderStablePromotionHumanRunbook(r);
  assert(txt.includes('HUMAN RUNBOOK BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(RUNBOOK_STATUSES.includes('RUNBOOK_READY'), 'ready in statuses');
  assert(RUNBOOK_STATUSES.includes('RUNBOOK_BLOCKED_CLASSIFIER'), 'classifier blocked in statuses');
  assert(RUNBOOK_STATUSES.includes('RUNBOOK_BLOCKED_NOT_READY'), 'not-ready in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
