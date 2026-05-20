#!/usr/bin/env node
/**
 * Tests — Stable Promotion Readiness Classifier V121.0
 */

import {
  classifyStablePromotionReadiness,
  validateStablePromotionReadinessClassifier,
  renderStablePromotionReadinessClassifier,
  READINESS_STATUSES,
} from '../stable-promotion-readiness-classifier.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const FULL_REPORT = {
  report_ready:       true,
  report_id:          'report-001',
  target_stable_ref:  'stable',
  target_tag:         'v1.0.0',
  total_audit_events: 5,
  all_gates_passed:   true,
  governance_gates: {
    contract_ready:      true,
    approval_bound:      true,
    dry_run_simulated:   true,
    safety_lock_issued:  true,
    rollback_plan_ready: true,
  },
};

const DRY_RUN_REPORT = {
  report_ready:       true,
  report_id:          'report-002',
  target_stable_ref:  'stable',
  target_tag:         'v1.0.0',
  total_audit_events: 3,
  all_gates_passed:   false,
  governance_gates: {
    contract_ready:      true,
    approval_bound:      true,
    dry_run_simulated:   true,
    safety_lock_issued:  false,
    rollback_plan_ready: false,
  },
};

const PARTIAL_REPORT = {
  report_ready:       true,
  report_id:          'report-003',
  target_stable_ref:  'stable',
  target_tag:         'v1.0.0',
  total_audit_events: 1,
  all_gates_passed:   false,
  governance_gates: {
    contract_ready:      true,
    approval_bound:      false,
    dry_run_simulated:   false,
    safety_lock_issued:  false,
    rollback_plan_ready: false,
  },
};

console.log('\n=== stable-promotion-readiness-classifier tests ===\n');

console.log('--- null report ---');
{
  const r = classifyStablePromotionReadiness({});
  assert(r.readiness_status === 'READINESS_BLOCKED_REPORT', 'null report → BLOCKED_REPORT');
  assert(r.readiness_ready === false, 'readiness_ready false');
}

console.log('--- report not ready ---');
{
  const r = classifyStablePromotionReadiness({ stable_promotion_governance_report: { report_ready: false } });
  assert(r.readiness_status === 'READINESS_BLOCKED_REPORT', 'not-ready → BLOCKED_REPORT');
}

console.log('--- all gates → READY_FOR_FUTURE_HUMAN_EXECUTION ---');
{
  const r = classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT });
  assert(r.readiness_status === 'READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION', 'all gates → READY');
  assert(r.readiness_ready === true, 'readiness_ready true');
  assert(r.all_gates_passed === true, 'all_gates_passed true');
  assert(r.gates_passed_count === 5, 'gates_passed_count 5');
  assert(r.total_gates === 5, 'total_gates 5');
  assert(r.readiness_notes.length === 0, 'no readiness notes');
  assert(r.report_id === 'report-001', 'report_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(typeof r.classifier_id === 'string' && r.classifier_id.length === 64, 'classifier_id sha256');
  assert(r.schema_version === 'v121.0', 'schema version');
}

console.log('--- dry-run only → READINESS_DRY_RUN_READY ---');
{
  const r = classifyStablePromotionReadiness({ stable_promotion_governance_report: DRY_RUN_REPORT });
  assert(r.readiness_status === 'READINESS_DRY_RUN_READY', 'dry-run gates → DRY_RUN_READY');
  assert(r.readiness_ready === false, 'readiness_ready false (not fully ready)');
  assert(r.gates_passed_count === 3, 'gates_passed_count 3');
  assert(r.readiness_notes.length > 0, 'readiness_notes not empty');
}

console.log('--- partial → READINESS_PARTIAL ---');
{
  const r = classifyStablePromotionReadiness({ stable_promotion_governance_report: PARTIAL_REPORT });
  assert(r.readiness_status === 'READINESS_PARTIAL', 'partial → PARTIAL');
  assert(r.readiness_ready === false, 'readiness_ready false');
  assert(r.readiness_notes.some(n => n.includes('approval')), 'note about approval');
  assert(r.readiness_notes.some(n => n.includes('dry-run')), 'note about dry-run');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = classifyStablePromotionReadiness({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT });
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT }).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT }).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT }).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT }).release_performed === false, 'release_performed=false');
}

console.log('--- human_execution_required=true ---');
{
  const r1 = classifyStablePromotionReadiness({});
  assert(r1.human_execution_required === true, 'blocked: true');
  const r2 = classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT });
  assert(r2.human_execution_required === true, 'ready: true');
}

console.log('--- automated_promotion_forbidden=true ---');
{
  assert(classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT }).automated_promotion_forbidden === true, 'automated_promotion_forbidden=true');
}

console.log('--- validate ---');
{
  const r = classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT });
  const v = validateStablePromotionReadinessClassifier(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionReadinessClassifier(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = classifyStablePromotionReadiness({ stable_promotion_governance_report: FULL_REPORT });
  const txt = renderStablePromotionReadinessClassifier(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION READINESS CLASSIFIER'), 'render title');
  assert(txt.includes('READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION'), 'status in output');
  assert(txt.includes('GOVERNANCE GATES'), 'gates section');
  assert(txt.includes('human_execution_required:'), 'invariant in output');
}

console.log('--- render partial ---');
{
  const r = classifyStablePromotionReadiness({ stable_promotion_governance_report: PARTIAL_REPORT });
  const txt = renderStablePromotionReadinessClassifier(r);
  assert(txt.includes('READINESS_PARTIAL'), 'partial status in output');
  assert(txt.includes('READINESS NOTES'), 'notes section');
}

console.log('--- render blocked ---');
{
  const r = classifyStablePromotionReadiness({});
  const txt = renderStablePromotionReadinessClassifier(r);
  assert(txt.includes('READINESS CLASSIFIER BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(READINESS_STATUSES.includes('READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION'), 'ready in statuses');
  assert(READINESS_STATUSES.includes('READINESS_DRY_RUN_READY'), 'dry-run in statuses');
  assert(READINESS_STATUSES.includes('READINESS_PARTIAL'), 'partial in statuses');
  assert(READINESS_STATUSES.includes('READINESS_BLOCKED_REPORT'), 'blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
