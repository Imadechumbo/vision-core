import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-drill-final-authority-review.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'release-drill-final-review-required',
  'risk-classifier-required',
  'review-only-no-authority',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-artifact-publish',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
  'audit-required',
  'human-review-required',
  'human-approval-required',
  'pass-gold-required',
];

const VALID_HASH = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

function validItem(n) {
  return {
    review_id: `review-${n}`,
    review_type: 'evidence_review',
    review_outcome: 'reviewed',
    review_hash: VALID_HASH.slice(0, 63) + String(n % 10),
  };
}

function validInput() {
  return {
    release_drill_final_authority_review_id: 'final-review-v394-001',
    release_drill_risk_classifier_id: 'risk-classifier-v393-001',
    release_drill_risk_classifier_ready: true,
    review_items: [validItem(1), validItem(2), validItem(3)],
    review_summary: 'V387-V393 supervised drill evidence and risk reviewed. No authority granted.',
    review_level: 'supervised-drill-review-only',
    required_review_controls: [...ALL_CONTROLS],
  };
}

const MUST_FALSE_KEYS = [
  'release_drill_evidence_published', 'release_drill_risk_accepted', 'release_drill_authority_approved',
  'supervised_release_drill_command_received', 'release_drill_scope_bound', 'release_drill_plan_published',
  'release_drill_noop_executed', 'release_drill_result_verified', 'release_drill_evidence_receipt_published',
  'release_drill_risk_classified', 'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
  'release_firewall_consolidation_phase_passed', 'release_firewall_registry_published',
  'unified_firewall_snapshot_published', 'firewall_chain_integrity_confirmed',
  'firewall_dependency_graph_published', 'firewall_policy_bound',
  'unified_release_authority_report_published', 'firewall_evidence_index_published',
  'firewall_drift_detected', 'firewall_regression_guard_enabled', 'unified_firewall_final_review_approved',
  'release_execution_firewall_phase_passed', 'release_execution_firewall_enabled',
  'production_mutation_firewall_locked', 'secret_access_firewall_locked',
  'billing_execution_firewall_locked', 'network_execution_firewall_locked',
  'artifact_tag_stable_firewall_locked', 'rollback_execution_firewall_locked',
  'last_mile_noop_drill_completed', 'firewall_evidence_receipt_published', 'firewall_final_authority_approved',
  'real_release_executed', 'real_deploy_executed', 'real_tag_created', 'real_stable_promoted',
  'artifact_published', 'production_touched', 'billing_executed', 'secrets_accessed',
  'network_accessed', 'rollback_executed', 'release_allowed', 'deploy_allowed',
  'stable_allowed', 'tag_allowed', 'real_execution_allowed',
];

console.log('\n=== release-drill-final-authority-review tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK'), 'B_RISK');
assert(STATUSES.includes('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'INCOMPLETE');
assert(STATUSES.includes('RELEASE_DRILL_FINAL_REVIEW_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.release_drill_final_authority_review_id = '';
assert(build(noId).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT'), 'empty review id');

console.log('--- blocked risk ---');
const noRiskId = validInput(); noRiskId.release_drill_risk_classifier_id = null;
assert(build(noRiskId).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK'), 'missing risk id');
const riskNotReady = validInput(); riskNotReady.release_drill_risk_classifier_ready = false;
assert(build(riskNotReady).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK'), 'risk not ready');

console.log('--- incomplete ---');
const missingCtrl = validInput(); missingCtrl.required_review_controls = ['audit-required'];
assert(build(missingCtrl).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'missing controls');
const emptyItems = validInput(); emptyItems.review_items = [];
assert(build(emptyItems).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'empty items');
const badType = validInput(); badType.review_items = [{ ...validItem(1), review_type: 'invalid' }];
assert(build(badType).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'bad review_type');
const badOutcome = validInput(); badOutcome.review_items = [{ ...validItem(1), review_outcome: 'approved' }];
assert(build(badOutcome).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'bad review_outcome');
const badHash = validInput(); badHash.review_items = [{ ...validItem(1), review_hash: 'short' }];
assert(build(badHash).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'bad hash');
const noSummary = validInput(); noSummary.review_summary = null;
assert(build(noSummary).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'missing review_summary');
const noLevel = validInput(); noLevel.review_level = null;
assert(build(noLevel).errors[0].startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'), 'missing review_level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.review_ready === true, 'review_ready');
assert(r.review_hash && r.review_hash.length === 64, 'hash 64 chars');
assert(r.review_items.length === 3, '3 review items');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.invalid_items.length === 0, 'no invalid items');
assert(r.review_summary !== null, 'has summary');
assert(r.final_message && r.final_message.includes('V394'), 'final message V394');
assert(r.final_message.includes('no authority granted'), 'mentions no authority');
assert(r.errors.length === 0, 'no errors');

console.log('--- all review types accepted ---');
['evidence_review', 'risk_review', 'scope_review', 'plan_review',
 'execution_review', 'control_review', 'audit_review', 'summary_review'].forEach(rt => {
  const inp = validInput(); inp.review_items = [{ ...validItem(1), review_type: rt }];
  assert(build(inp).review_ready === true, `review_type: ${rt}`);
});

console.log('--- all review outcomes accepted ---');
['reviewed', 'noted', 'deferred', 'flagged', 'acknowledged'].forEach(ro => {
  const inp = validInput(); inp.review_items = [{ ...validItem(1), review_outcome: ro }];
  assert(build(inp).review_ready === true, `review_outcome: ${ro}`);
});

console.log('--- invariants always false ---');
MUST_FALSE_KEYS.forEach(k => { assert(r[k] === false, `${k} === false`); });

console.log('--- validate ---');
assert(validate(r).valid === true, 'valid ready');
assert(validate(null).valid === false, 'null invalid');
assert(validate({}).valid === false, 'empty invalid');
assert(validate({ ...r, errors: ['e'] }).valid === false, 'has errors invalid');

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'render string');
assert(rend.includes('RELEASE_DRILL_FINAL_REVIEW_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('release_drill_authority_approved: false'), 'authority_approved false');
assert(render(null) === 'RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT', 'null render');
const brRend = render({ ...r, review_ready: false, errors: ['RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK: x'] });
assert(brRend.includes('BLOCKED_RISK'), 'blocked risk render');
const incRend = render({ ...r, review_ready: false, errors: ['RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE: x'] });
assert(incRend.includes('INCOMPLETE'), 'incomplete render');

console.log('--- deterministic ---');
assert(build(validInput()).review_hash === build(validInput()).review_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
