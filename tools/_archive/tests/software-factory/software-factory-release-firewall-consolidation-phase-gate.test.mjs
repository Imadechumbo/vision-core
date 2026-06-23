import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-firewall-consolidation-phase-gate.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const REQUIRED_ID_KEYS = [
  'release_firewall_module_registry',
  'unified_release_firewall_snapshot',
  'firewall_chain_integrity_verifier',
  'firewall_dependency_graph',
  'firewall_policy_binding',
  'unified_release_authority_report',
  'firewall_evidence_index',
  'firewall_drift_detector',
  'unified_firewall_final_review',
];

function makeIds() {
  return Object.fromEntries(REQUIRED_ID_KEYS.map(k => [k, `${k}-001`]));
}

function validInput() {
  return {
    phase_gate_id: 'phase-gate-v386-001',
    unified_firewall_final_review_id: 'review-001',
    unified_firewall_final_review_ready: true,
    ids: makeIds(),
    phase_summary: 'V382-V386 Release Firewall Consolidation Part 2 complete. All modules consolidated.',
  };
}

console.log('\n=== release-firewall-consolidation-phase-gate tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_REVIEW'), 'B_REVIEW');
assert(STATUSES.includes('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_INCOMPLETE'), 'INCOMPLETE');
assert(STATUSES.includes('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_INPUT'), '{}');

console.log('--- blocked review ---');
const noReview = validInput(); noReview.unified_firewall_final_review_ready = false;
assert(build(noReview).errors[0].startsWith('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_REVIEW'), 'review not ready');
const noReviewId = validInput(); noReviewId.unified_firewall_final_review_id = null;
assert(build(noReviewId).errors[0].startsWith('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_REVIEW'), 'missing review id');

console.log('--- incomplete ---');
const missingId = validInput(); const ids2 = makeIds(); delete ids2.firewall_drift_detector; missingId.ids = ids2;
assert(build(missingId).errors[0].includes('INCOMPLETE'), 'missing id');
const missingId2 = validInput(); const ids3 = makeIds(); delete ids3.firewall_evidence_index; delete ids3.firewall_policy_binding; missingId2.ids = ids3;
const r2 = build(missingId2); assert(r2.errors[0].includes('INCOMPLETE') && r2.missing_ids.length === 2, 'two missing ids');
const noSummary = validInput(); noSummary.phase_summary = null;
assert(build(noSummary).errors[0].includes('INCOMPLETE'), 'missing phase_summary');

console.log('--- ready ---');
const r = build(validInput());
assert(r.phase_gate_ready === true, 'ready');
assert(r.phase_hash && r.phase_hash.length === 64, 'hash64');
assert(r.missing_ids.length === 0, 'no missing ids');
assert(r.phase_summary !== null, 'has summary');
assert(r.final_message && r.final_message.includes('V377-V386'), 'final message');
assert(r.final_message.includes('V387 command'), 'V387 reference in message');
assert(r.release_firewall_consolidation_phase_passed === false, 'phase not passed');
assert(r.unified_firewall_final_review_approved === false, 'final review approved false');
assert(r.firewall_drift_detected === false, 'drift not detected');
assert(r.firewall_regression_guard_enabled === false, 'regression guard off');
assert(r.firewall_evidence_index_published === false, 'evidence not published');
assert(r.unified_release_authority_report_published === false, 'report not published');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.unified_firewall_snapshot_published === false, 'snapshot not published');
assert(r.release_firewall_registry_published === false, 'registry not published');
assert(r.release_execution_firewall_phase_passed === false, 'exec fw phase not passed');
assert(r.real_release_executed === false, 'not executed');
assert(r.production_touched === false, 'not touched');
assert(r.billing_executed === false, 'not billed');
assert(r.secrets_accessed === false, 'secrets not accessed');
assert(r.network_accessed === false, 'network not accessed');
assert(r.release_allowed === false, 'no release');
assert(r.deploy_allowed === false, 'no deploy');
assert(r.stable_allowed === false, 'no stable');
assert(r.tag_allowed === false, 'no tag');
assert(r.real_execution_allowed === false, 'no real exec');
assert(r.errors.length === 0, 'no errors');

console.log('--- all 9 ids present ---');
REQUIRED_ID_KEYS.forEach(k => {
  assert(r.ids[k] === `${k}-001`, `id present: ${k}`);
});

console.log('--- validate ---');
assert(validate(r).valid === true, 'vready');
assert(validate(null).valid === false, 'vnull');
assert(validate({}).valid === false, 'vblocked');

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'rend string');
assert(rend.includes('RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(rend.includes('V377-V386'), 'final message in render');
assert(rend.includes('release_firewall_consolidation_phase_passed: false'), 'phase false in render');
assert(render(null) === 'RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_INPUT', 'null render');
assert(render({ ...r, phase_gate_ready: false, errors: ['RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_BLOCKED_REVIEW: x'] }).includes('BLOCKED_REVIEW'), 'blocked review render');
assert(render({ ...r, phase_gate_ready: false, errors: ['RELEASE_FIREWALL_CONSOLIDATION_PHASE_GATE_INCOMPLETE: x'] }).includes('INCOMPLETE'), 'incomplete render');

console.log('--- invariants ---');
assert(build(validInput()).phase_hash === build(validInput()).phase_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
