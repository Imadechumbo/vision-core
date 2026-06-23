import { STATUSES, build, validate, render } from '../../software-factory/software-factory-supervised-release-drill-phase-gate.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const REQUIRED_ID_KEYS = [
  'supervised_release_drill_command_contract',
  'release_drill_scope_binder',
  'release_drill_execution_plan',
  'release_drill_noop_executor',
  'release_drill_result_verifier',
  'release_drill_evidence_receipt',
  'release_drill_risk_classifier',
  'release_drill_final_authority_review',
];

function makeIds() {
  return Object.fromEntries(REQUIRED_ID_KEYS.map(k => [k, `${k}-001`]));
}

function validInput() {
  return {
    phase_gate_id: 'phase-gate-v395-001',
    release_drill_final_authority_review_id: 'final-review-v394-001',
    release_drill_final_authority_review_ready: true,
    ids: makeIds(),
    phase_summary: 'V387-V395 Supervised Real Release Execution Drill complete. All 9 modules consolidated.',
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

console.log('\n=== supervised-release-drill-phase-gate tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW'), 'B_REVIEW');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_PHASE_GATE_INCOMPLETE'), 'INCOMPLETE');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_PHASE_GATE_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.phase_gate_id = '';
assert(build(noId).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT'), 'empty gate id');

console.log('--- blocked review ---');
const reviewNotReady = validInput(); reviewNotReady.release_drill_final_authority_review_ready = false;
assert(build(reviewNotReady).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW'), 'review not ready');
const noReviewId = validInput(); noReviewId.release_drill_final_authority_review_id = null;
assert(build(noReviewId).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW'), 'missing review id');

console.log('--- incomplete ---');
const missingOne = validInput(); const ids2 = makeIds(); delete ids2.release_drill_evidence_receipt; missingOne.ids = ids2;
assert(build(missingOne).errors[0].includes('INCOMPLETE'), 'one missing id');
const r2 = build(missingOne); assert(r2.missing_ids.length === 1, 'missing_ids count 1');
const missingTwo = validInput(); const ids3 = makeIds(); delete ids3.release_drill_risk_classifier; delete ids3.release_drill_final_authority_review; missingTwo.ids = ids3;
const rb = build(missingTwo); assert(rb.errors[0].includes('INCOMPLETE') && rb.missing_ids.length === 2, 'two missing ids');
const noSummary = validInput(); noSummary.phase_summary = null;
assert(build(noSummary).errors[0].includes('INCOMPLETE'), 'missing phase_summary');

console.log('--- ready ---');
const r = build(validInput());
assert(r.phase_gate_ready === true, 'phase_gate_ready');
assert(r.phase_hash && r.phase_hash.length === 64, 'hash 64 chars');
assert(r.missing_ids.length === 0, 'no missing ids');
assert(r.phase_summary !== null, 'has summary');
assert(r.final_message === 'V387-V395 supervised real release execution drill complete. Real release execution remains blocked until explicit V396 command.', 'exact final_message');
assert(r.final_message.includes('V387-V395'), 'message has V387-V395');
assert(r.final_message.includes('V396 command'), 'message references V396');
assert(r.errors.length === 0, 'no errors');

console.log('--- all 8 required ids present ---');
REQUIRED_ID_KEYS.forEach(k => {
  assert(r.ids[k] === `${k}-001`, `id present: ${k}`);
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
assert(rend.includes('SUPERVISED_RELEASE_DRILL_PHASE_GATE_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('supervised_release_drill_phase_passed: false'), 'phase_passed false in render');
assert(rend.includes('V387-V395'), 'final message in render');
assert(rend.includes('V396 command'), 'V396 reference in render');
assert(render(null) === 'SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_INPUT', 'null render');
const brRend = render({ ...r, phase_gate_ready: false, errors: ['SUPERVISED_RELEASE_DRILL_PHASE_GATE_BLOCKED_REVIEW: x'] });
assert(brRend.includes('BLOCKED_REVIEW'), 'blocked review render');
const incRend = render({ ...r, phase_gate_ready: false, errors: ['SUPERVISED_RELEASE_DRILL_PHASE_GATE_INCOMPLETE: x'] });
assert(incRend.includes('INCOMPLETE'), 'incomplete render');

console.log('--- deterministic ---');
assert(build(validInput()).phase_hash === build(validInput()).phase_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
