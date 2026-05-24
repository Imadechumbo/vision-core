import { STATUSES, build, validate, render } from '../../software-factory/software-factory-unified-release-authority-report.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const CONTROLS = ['unified-report-required','policy-binding-required','no-real-report-publish','no-real-release','no-real-deploy','no-tag-create','no-stable-promotion','no-artifact-publish','no-production-touch','no-billing-execution','no-secret-access','no-network','no-real-rollback','audit-required','pass-gold-required'];

function makeItem(id, type = 'registry_report', mode = 'metadata-only') {
  return { report_id: id, report_type: type, report_mode: mode, report_hash: 'a'.repeat(64) };
}

function validInput() {
  return {
    unified_release_authority_report_id: 'report-001',
    firewall_policy_binding_id: 'policy-001',
    firewall_policy_binding_ready: true,
    report_items: [
      makeItem('r1','registry_report','metadata-only'),
      makeItem('r2','snapshot_report','contract-only'),
      makeItem('r3','policy_binding_report','blocked'),
    ],
    required_report_controls: [...CONTROLS],
    report_level: 'consolidated-authority-report',
  };
}

console.log('\n=== unified-release-authority-report tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY'), 'B_POLICY');
assert(STATUSES.includes('UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL'), 'FAIL');
assert(STATUSES.includes('UNIFIED_RELEASE_AUTHORITY_REPORT_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT'), '{}');

console.log('--- blocked policy ---');
const noPolicy = validInput(); noPolicy.firewall_policy_binding_ready = false;
assert(build(noPolicy).errors[0].startsWith('UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY'), 'policy not ready');
const noPolicyId = validInput(); noPolicyId.firewall_policy_binding_id = null;
assert(build(noPolicyId).errors[0].startsWith('UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY'), 'missing policy id');

console.log('--- fail ---');
const empty = validInput(); empty.report_items = [];
assert(build(empty).errors[0].includes('FAIL'), 'empty items');
const badType = validInput(); badType.report_items[0] = { ...badType.report_items[0], report_type: 'bad_type' };
assert(build(badType).errors[0].includes('FAIL'), 'invalid report_type');
const badMode = validInput(); badMode.report_items[0] = { ...badMode.report_items[0], report_mode: 'real' };
assert(build(badMode).errors[0].includes('FAIL'), 'invalid report_mode');
const shortHash = validInput(); shortHash.report_items[0] = { ...shortHash.report_items[0], report_hash: 'short' };
assert(build(shortHash).errors[0].includes('FAIL'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_report_controls = ['unified-report-required'];
assert(build(missingCtrl).errors[0].includes('FAIL'), 'missing controls');
const noLevel = validInput(); noLevel.report_level = null;
assert(build(noLevel).errors[0].includes('FAIL'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.unified_release_authority_report_ready === true, 'ready');
assert(r.report_hash && r.report_hash.length === 64, 'hash64');
assert(r.report_items_count === 3, 'items count 3');
assert(r.required_report_controls_count === 15, 'controls count 15');
assert(r.unified_release_authority_report_published === false, 'report not published');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.unified_firewall_snapshot_published === false, 'snapshot not published');
assert(r.release_firewall_registry_published === false, 'registry not published');
assert(r.firewall_evidence_index_published === false, 'evidence not published');
assert(r.firewall_drift_detected === false, 'drift not detected');
assert(r.firewall_regression_guard_enabled === false, 'regression guard off');
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
assert(rend.includes('UNIFIED_RELEASE_AUTHORITY_REPORT_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(render(null) === 'UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT', 'null render');
assert(render({ ...r, unified_release_authority_report_ready: false, errors: ['UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY: x'] }).includes('BLOCKED_POLICY'), 'blocked policy render');
assert(render({ ...r, unified_release_authority_report_ready: false, errors: ['UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: x'] }).includes('FAIL'), 'fail render');

console.log('--- invariants ---');
const h1 = build(validInput()).report_hash;
const h2 = build(validInput()).report_hash;
assert(h1 === h2, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
