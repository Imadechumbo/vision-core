import { STATUSES, build, validate, render } from '../../software-factory/software-factory-firewall-drift-detector.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const CONTROLS = ['firewall-drift-detector-required','evidence-index-required','no-unreviewed-drift','no-real-execution','no-real-release','no-real-deploy','no-tag-create','no-stable-promotion','no-artifact-publish','no-production-touch','no-billing-execution','no-secret-access','no-network','no-real-rollback','audit-required','pass-gold-required'];

function makeItem(id, type = 'registry_drift', mode = 'metadata-only', severity = 'info') {
  return { drift_id: id, drift_type: type, drift_mode: mode, severity, drift_hash: 'c'.repeat(64) };
}

function validInput() {
  return {
    firewall_drift_detector_id: 'drift-001',
    firewall_evidence_index_id: 'evidx-001',
    firewall_evidence_index_ready: true,
    drift_items: [
      makeItem('d1','registry_drift','metadata-only','info'),
      makeItem('d2','snapshot_drift','contract-only','low'),
      makeItem('d3','chain_drift','blocked','medium'),
    ],
    required_drift_controls: [...CONTROLS],
    drift_level: 'firewall-drift-detection',
  };
}

console.log('\n=== firewall-drift-detector tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE'), 'B_EVIDENCE');
assert(STATUSES.includes('FIREWALL_DRIFT_DETECTOR_FAIL'), 'FAIL');
assert(STATUSES.includes('FIREWALL_DRIFT_DETECTOR_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT'), '{}');

console.log('--- blocked evidence ---');
const noEvidence = validInput(); noEvidence.firewall_evidence_index_ready = false;
assert(build(noEvidence).errors[0].startsWith('FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE'), 'evidence not ready');
const noEvidenceId = validInput(); noEvidenceId.firewall_evidence_index_id = null;
assert(build(noEvidenceId).errors[0].startsWith('FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE'), 'missing evidence id');

console.log('--- fail ---');
const empty = validInput(); empty.drift_items = [];
assert(build(empty).errors[0].includes('FAIL'), 'empty items');
const badType = validInput(); badType.drift_items[0] = { ...badType.drift_items[0], drift_type: 'bad_type' };
assert(build(badType).errors[0].includes('FAIL'), 'invalid drift_type');
const badMode = validInput(); badMode.drift_items[0] = { ...badMode.drift_items[0], drift_mode: 'real' };
assert(build(badMode).errors[0].includes('FAIL'), 'invalid drift_mode');
const badSeverity = validInput(); badSeverity.drift_items[0] = { ...badSeverity.drift_items[0], severity: 'unknown' };
assert(build(badSeverity).errors[0].includes('FAIL'), 'invalid severity');
const shortHash = validInput(); shortHash.drift_items[0] = { ...shortHash.drift_items[0], drift_hash: 'short' };
assert(build(shortHash).errors[0].includes('FAIL'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_drift_controls = ['firewall-drift-detector-required'];
assert(build(missingCtrl).errors[0].includes('FAIL'), 'missing controls');
const noLevel = validInput(); noLevel.drift_level = null;
assert(build(noLevel).errors[0].includes('FAIL'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.firewall_drift_detector_ready === true, 'ready');
assert(r.drift_hash && r.drift_hash.length === 64, 'hash64');
assert(r.drift_items_count === 3, 'items count 3');
assert(r.required_drift_controls_count === 16, 'controls count 16');
assert(r.firewall_drift_detected === false, 'drift not detected');
assert(r.firewall_regression_guard_enabled === false, 'regression guard off');
assert(r.firewall_evidence_index_published === false, 'evidence not published');
assert(r.unified_release_authority_report_published === false, 'report not published');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.unified_firewall_final_review_approved === false, 'final review not approved');
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

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'rend string');
assert(rend.includes('FIREWALL_DRIFT_DETECTOR_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(rend.includes('firewall_drift_detected: false'), 'drift false in render');
assert(rend.includes('firewall_regression_guard_enabled: false'), 'regression false in render');
assert(render(null) === 'FIREWALL_DRIFT_DETECTOR_BLOCKED_INPUT', 'null render');
assert(render({ ...r, firewall_drift_detector_ready: false, errors: ['FIREWALL_DRIFT_DETECTOR_BLOCKED_EVIDENCE: x'] }).includes('BLOCKED_EVIDENCE'), 'blocked evidence render');
assert(render({ ...r, firewall_drift_detector_ready: false, errors: ['FIREWALL_DRIFT_DETECTOR_FAIL: x'] }).includes('FAIL'), 'fail render');

console.log('--- invariants ---');
assert(build(validInput()).drift_hash === build(validInput()).drift_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
