import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-drill-risk-classifier.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'release-drill-risk-required',
  'evidence-receipt-required',
  'risk-classification-only',
  'no-risk-acceptance',
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
  'human-approval-required',
  'pass-gold-required',
];

const VALID_HASH = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

function validItem(n) {
  return {
    risk_id: `risk-${n}`,
    risk_category: 'release_risk',
    risk_level: 'low',
    risk_disposition: 'classified',
    risk_hash: VALID_HASH.slice(0, 63) + String(n % 10),
  };
}

function validInput() {
  return {
    release_drill_risk_classifier_id: 'risk-classifier-v393-001',
    release_drill_evidence_receipt_id: 'evidence-receipt-v392-001',
    release_drill_evidence_receipt_ready: true,
    risk_items: [validItem(1), validItem(2)],
    classifier_level: 'supervised-drill-classification-only',
    required_risk_controls: [...ALL_CONTROLS],
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

console.log('\n=== release-drill-risk-classifier tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('RELEASE_DRILL_RISK_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_DRILL_RISK_BLOCKED_EVIDENCE'), 'B_EVIDENCE');
assert(STATUSES.includes('RELEASE_DRILL_RISK_FAIL'), 'FAIL');
assert(STATUSES.includes('RELEASE_DRILL_RISK_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_DRILL_RISK_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('RELEASE_DRILL_RISK_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.release_drill_risk_classifier_id = '';
assert(build(noId).errors[0].startsWith('RELEASE_DRILL_RISK_BLOCKED_INPUT'), 'empty classifier id');

console.log('--- blocked evidence ---');
const noEvidId = validInput(); noEvidId.release_drill_evidence_receipt_id = null;
assert(build(noEvidId).errors[0].startsWith('RELEASE_DRILL_RISK_BLOCKED_EVIDENCE'), 'missing evidence id');
const evidNotReady = validInput(); evidNotReady.release_drill_evidence_receipt_ready = false;
assert(build(evidNotReady).errors[0].startsWith('RELEASE_DRILL_RISK_BLOCKED_EVIDENCE'), 'evidence not ready');

console.log('--- fail ---');
const missingCtrl = validInput(); missingCtrl.required_risk_controls = ['audit-required'];
assert(build(missingCtrl).errors[0].startsWith('RELEASE_DRILL_RISK_FAIL'), 'missing controls');
const emptyItems = validInput(); emptyItems.risk_items = [];
assert(build(emptyItems).errors[0].startsWith('RELEASE_DRILL_RISK_FAIL'), 'empty items');
const badCat = validInput(); badCat.risk_items = [{ ...validItem(1), risk_category: 'invalid' }];
assert(build(badCat).errors[0].startsWith('RELEASE_DRILL_RISK_FAIL'), 'bad risk_category');
const badLevel = validInput(); badLevel.risk_items = [{ ...validItem(1), risk_level: 'extreme' }];
assert(build(badLevel).errors[0].startsWith('RELEASE_DRILL_RISK_FAIL'), 'bad risk_level');
const badDisp = validInput(); badDisp.risk_items = [{ ...validItem(1), risk_disposition: 'accepted' }];
assert(build(badDisp).errors[0].startsWith('RELEASE_DRILL_RISK_FAIL'), 'bad risk_disposition');
const badHash = validInput(); badHash.risk_items = [{ ...validItem(1), risk_hash: 'short' }];
assert(build(badHash).errors[0].startsWith('RELEASE_DRILL_RISK_FAIL'), 'bad hash');
const noLevel = validInput(); noLevel.classifier_level = null;
assert(build(noLevel).errors[0].startsWith('RELEASE_DRILL_RISK_FAIL'), 'missing classifier_level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.classifier_ready === true, 'classifier_ready');
assert(r.classifier_hash && r.classifier_hash.length === 64, 'hash 64 chars');
assert(r.risk_items.length === 2, '2 risk items');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.invalid_items.length === 0, 'no invalid items');
assert(r.final_message && r.final_message.includes('V393'), 'final message V393');
assert(r.final_message.includes('no risk accepted'), 'mentions no risk accepted');
assert(r.errors.length === 0, 'no errors');

console.log('--- all risk categories accepted ---');
['release_risk', 'deploy_risk', 'tag_risk', 'stable_risk', 'artifact_risk',
 'production_risk', 'billing_risk', 'secret_risk', 'network_risk',
 'rollback_risk', 'data_risk', 'compliance_risk'].forEach(rc => {
  const inp = validInput(); inp.risk_items = [{ ...validItem(1), risk_category: rc }];
  assert(build(inp).classifier_ready === true, `risk_category: ${rc}`);
});

console.log('--- all risk levels accepted ---');
['none', 'low', 'medium', 'high', 'critical'].forEach(rl => {
  const inp = validInput(); inp.risk_items = [{ ...validItem(1), risk_level: rl }];
  assert(build(inp).classifier_ready === true, `risk_level: ${rl}`);
});

console.log('--- all risk dispositions accepted ---');
['blocked', 'classified', 'noted', 'deferred', 'acknowledged'].forEach(rd => {
  const inp = validInput(); inp.risk_items = [{ ...validItem(1), risk_disposition: rd }];
  assert(build(inp).classifier_ready === true, `risk_disposition: ${rd}`);
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
assert(rend.includes('RELEASE_DRILL_RISK_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('release_drill_risk_accepted: false'), 'risk_accepted false');
assert(render(null) === 'RELEASE_DRILL_RISK_BLOCKED_INPUT', 'null render');
const beRend = render({ ...r, classifier_ready: false, errors: ['RELEASE_DRILL_RISK_BLOCKED_EVIDENCE: x'] });
assert(beRend.includes('BLOCKED_EVIDENCE'), 'blocked evidence render');
const failRend = render({ ...r, classifier_ready: false, errors: ['RELEASE_DRILL_RISK_FAIL: x'] });
assert(failRend.includes('FAIL'), 'fail render');

console.log('--- deterministic ---');
assert(build(validInput()).classifier_hash === build(validInput()).classifier_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
