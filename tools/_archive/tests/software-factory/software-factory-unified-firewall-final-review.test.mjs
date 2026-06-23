import { STATUSES, build, validate, render } from '../../software-factory/software-factory-unified-firewall-final-review.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const CONTROLS = ['unified-firewall-final-review-required','drift-detector-required','human-review-required','no-real-execution-approval','no-real-release','no-real-deploy','no-tag-create','no-stable-promotion','no-artifact-publish','no-production-touch','no-billing-execution','no-secret-access','no-network','no-real-rollback','audit-required','pass-gold-required'];

function validInput(decision = 'approved') {
  return {
    unified_firewall_final_review_id: 'review-001',
    firewall_drift_detector_id: 'drift-001',
    firewall_drift_detector_ready: true,
    authority_decision: decision,
    authority_id: 'human-authority-001',
    review_reason: 'All firewall consolidation checks passed in dry-run mode.',
    review_mode: 'dry-run',
    required_review_controls: [...CONTROLS],
  };
}

console.log('\n=== unified-firewall-final-review tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT'), 'B_DRIFT');
assert(STATUSES.includes('UNIFIED_FIREWALL_FINAL_REVIEW_DENIED'), 'DENIED');
assert(STATUSES.includes('UNIFIED_FIREWALL_FINAL_REVIEW_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT'), '{}');

console.log('--- blocked drift ---');
const noDrift = validInput(); noDrift.firewall_drift_detector_ready = false;
assert(build(noDrift).errors[0].startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT'), 'drift not ready');
const noDriftId = validInput(); noDriftId.firewall_drift_detector_id = null;
assert(build(noDriftId).errors[0].startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT'), 'missing drift id');

console.log('--- validation ---');
const noDecision = validInput(); noDecision.authority_decision = null;
assert(build(noDecision).errors[0].includes('BLOCKED_INPUT'), 'null decision');
const badDecision = validInput(); badDecision.authority_decision = 'maybe';
assert(build(badDecision).errors[0].includes('BLOCKED_INPUT'), 'bad decision');
const noAuthority = validInput(); noAuthority.authority_id = null;
assert(build(noAuthority).errors[0].includes('BLOCKED_INPUT'), 'null authority id');
const noReason = validInput(); noReason.review_reason = null;
assert(build(noReason).errors[0].includes('BLOCKED_INPUT'), 'null reason');
const badMode = validInput(); badMode.review_mode = 'real';
assert(build(badMode).errors[0].includes('BLOCKED_INPUT'), 'bad review_mode');

console.log('--- denied ---');
const denied = build(validInput('denied'));
assert(denied.unified_firewall_final_review_ready === false, 'denied not ready');
assert(denied.errors[0].startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_DENIED'), 'denied error');
assert(denied.unified_firewall_final_review_approved === false, 'approved still false');
assert(denied.production_touched === false, 'not touched');
const blocked = build(validInput('blocked'));
assert(blocked.errors[0].startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_DENIED'), 'blocked error');

console.log('--- missing controls ---');
const missingCtrl = validInput(); missingCtrl.required_review_controls = ['unified-firewall-final-review-required'];
assert(build(missingCtrl).errors[0].includes('BLOCKED_INPUT'), 'missing controls');

console.log('--- ready ---');
const r = build(validInput());
assert(r.unified_firewall_final_review_ready === true, 'ready');
assert(r.review_hash && r.review_hash.length === 64, 'hash64');
assert(r.authority_decision === 'approved', 'decision approved');
assert(r.required_review_controls_count === 16, 'controls count 16');
assert(r.unified_firewall_final_review_approved === false, 'final review approved still false');
assert(r.firewall_drift_detected === false, 'drift not detected');
assert(r.firewall_regression_guard_enabled === false, 'regression guard off');
assert(r.firewall_evidence_index_published === false, 'evidence not published');
assert(r.unified_release_authority_report_published === false, 'report not published');
assert(r.release_firewall_consolidation_phase_passed === false, 'phase not passed');
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

console.log('--- validate ---');
assert(validate(r).valid === true, 'vready');
assert(validate(null).valid === false, 'vnull');
assert(validate({}).valid === false, 'vblocked');
assert(validate(denied).valid === false, 'vdenied has errors');

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'rend string');
assert(rend.includes('UNIFIED_FIREWALL_FINAL_REVIEW_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(rend.includes('unified_firewall_final_review_approved: false'), 'approved false in render');
assert(render(null) === 'UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT', 'null render');
assert(render({ ...r, unified_firewall_final_review_ready: false, errors: ['UNIFIED_FIREWALL_FINAL_REVIEW_DENIED: x'] }).includes('DENIED'), 'denied render');
assert(render({ ...r, unified_firewall_final_review_ready: false, errors: ['UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT: x'] }).includes('BLOCKED_DRIFT'), 'blocked drift render');

console.log('--- invariants ---');
assert(build(validInput()).review_hash === build(validInput()).review_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
