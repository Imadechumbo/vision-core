import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-drill-evidence-receipt.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'release-drill-evidence-required',
  'result-verifier-required',
  'evidence-is-dry-run-only',
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
    evidence_id: `evidence-${n}`,
    evidence_type: 'drill_command_evidence',
    evidence_mode: 'no-op',
    evidence_hash: VALID_HASH.slice(0, 63) + String(n % 10),
  };
}

function validInput() {
  return {
    release_drill_evidence_receipt_id: 'evidence-receipt-v392-001',
    release_drill_result_verifier_id: 'result-verifier-v391-001',
    release_drill_result_verifier_ready: true,
    evidence_items: [validItem(1), validItem(2)],
    receipt_level: 'supervised-drill-dry-run-receipt',
    required_evidence_controls: [...ALL_CONTROLS],
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

console.log('\n=== release-drill-evidence-receipt tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('RELEASE_DRILL_EVIDENCE_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_DRILL_EVIDENCE_BLOCKED_RESULT'), 'B_RESULT');
assert(STATUSES.includes('RELEASE_DRILL_EVIDENCE_FAIL'), 'FAIL');
assert(STATUSES.includes('RELEASE_DRILL_EVIDENCE_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.release_drill_evidence_receipt_id = '';
assert(build(noId).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_BLOCKED_INPUT'), 'empty receipt id');

console.log('--- blocked result ---');
const noVerifId = validInput(); noVerifId.release_drill_result_verifier_id = null;
assert(build(noVerifId).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_BLOCKED_RESULT'), 'missing verifier id');
const verifNotReady = validInput(); verifNotReady.release_drill_result_verifier_ready = false;
assert(build(verifNotReady).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_BLOCKED_RESULT'), 'verifier not ready');

console.log('--- fail ---');
const missingCtrl = validInput(); missingCtrl.required_evidence_controls = ['audit-required'];
assert(build(missingCtrl).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_FAIL'), 'missing controls');
const emptyItems = validInput(); emptyItems.evidence_items = [];
assert(build(emptyItems).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_FAIL'), 'empty items');
const badType = validInput(); badType.evidence_items = [{ ...validItem(1), evidence_type: 'invalid' }];
assert(build(badType).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_FAIL'), 'bad evidence_type');
const badHash = validInput(); badHash.evidence_items = [{ ...validItem(1), evidence_hash: 'short' }];
assert(build(badHash).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_FAIL'), 'bad hash');
const noLevel = validInput(); noLevel.receipt_level = null;
assert(build(noLevel).errors[0].startsWith('RELEASE_DRILL_EVIDENCE_FAIL'), 'missing receipt_level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.receipt_ready === true, 'receipt_ready');
assert(r.receipt_hash && r.receipt_hash.length === 64, 'hash 64 chars');
assert(r.evidence_items.length === 2, '2 evidence items');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.invalid_items.length === 0, 'no invalid items');
assert(r.final_message && r.final_message.includes('V392'), 'final message V392');
assert(r.final_message.includes('dry-run'), 'mentions dry-run');
assert(r.errors.length === 0, 'no errors');

console.log('--- all evidence types accepted ---');
['drill_command_evidence', 'scope_binding_evidence', 'execution_plan_evidence',
 'noop_execution_evidence', 'result_verification_evidence', 'audit_trail_evidence',
 'control_checklist_evidence', 'metadata_receipt_evidence'].forEach(et => {
  const inp = validInput(); inp.evidence_items = [{ ...validItem(1), evidence_type: et }];
  assert(build(inp).receipt_ready === true, `evidence_type: ${et}`);
});

console.log('--- all evidence modes accepted ---');
['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op'].forEach(em => {
  const inp = validInput(); inp.evidence_items = [{ ...validItem(1), evidence_mode: em }];
  assert(build(inp).receipt_ready === true, `evidence_mode: ${em}`);
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
assert(rend.includes('RELEASE_DRILL_EVIDENCE_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('release_drill_evidence_published: false'), 'evidence_published false');
assert(render(null) === 'RELEASE_DRILL_EVIDENCE_BLOCKED_INPUT', 'null render');
const brRend = render({ ...r, receipt_ready: false, errors: ['RELEASE_DRILL_EVIDENCE_BLOCKED_RESULT: x'] });
assert(brRend.includes('BLOCKED_RESULT'), 'blocked result render');
const failRend = render({ ...r, receipt_ready: false, errors: ['RELEASE_DRILL_EVIDENCE_FAIL: x'] });
assert(failRend.includes('FAIL'), 'fail render');

console.log('--- deterministic ---');
assert(build(validInput()).receipt_hash === build(validInput()).receipt_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
