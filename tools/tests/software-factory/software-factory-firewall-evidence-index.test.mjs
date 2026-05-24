import { STATUSES, build, validate, render } from '../../software-factory/software-factory-firewall-evidence-index.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const REQUIRED_VERSIONS = ['V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375','V377','V378','V379','V380','V381','V382'];
const CONTROLS = ['firewall-evidence-index-required','unified-report-required','all-evidence-sources-required','no-real-evidence-publish','no-artifact-publish','no-network','no-secret-access','no-production-touch','no-real-release','no-real-deploy','no-tag-create','no-stable-promotion','no-real-rollback','audit-required','pass-gold-required'];
const TYPES = ['module_evidence','test_evidence','registry_evidence','snapshot_evidence','chain_evidence','graph_evidence','policy_evidence','report_evidence','firewall_evidence','authority_evidence','invariant_evidence','emergency_stop_evidence'];

function makeItems() {
  return REQUIRED_VERSIONS.map((v, i) => ({
    evidence_id: `ev-${v.toLowerCase()}`,
    evidence_type: TYPES[i % TYPES.length],
    evidence_mode: 'metadata-only',
    evidence_hash: 'b'.repeat(64),
    source_version: v,
  }));
}

function validInput() {
  return {
    firewall_evidence_index_id: 'evidx-001',
    unified_release_authority_report_id: 'report-001',
    unified_release_authority_report_ready: true,
    evidence_index_items: makeItems(),
    required_evidence_index_controls: [...CONTROLS],
    evidence_index_level: 'full-evidence-index',
  };
}

console.log('\n=== firewall-evidence-index tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT'), 'B_REPORT');
assert(STATUSES.includes('FIREWALL_EVIDENCE_INDEX_INCOMPLETE'), 'INCOMPLETE');
assert(STATUSES.includes('FIREWALL_EVIDENCE_INDEX_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT'), '{}');

console.log('--- blocked report ---');
const noReport = validInput(); noReport.unified_release_authority_report_ready = false;
assert(build(noReport).errors[0].startsWith('FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT'), 'report not ready');
const noReportId = validInput(); noReportId.unified_release_authority_report_id = null;
assert(build(noReportId).errors[0].startsWith('FIREWALL_EVIDENCE_INDEX_BLOCKED_REPORT'), 'missing report id');

console.log('--- incomplete ---');
const missingV = validInput(); missingV.evidence_index_items = makeItems().filter(it => it.source_version !== 'V370');
assert(build(missingV).errors[0].includes('INCOMPLETE'), 'missing source version');
const badType = validInput(); badType.evidence_index_items[0] = { ...badType.evidence_index_items[0], evidence_type: 'bad_type' };
assert(build(badType).errors[0].includes('INCOMPLETE'), 'invalid evidence_type');
const badMode = validInput(); badMode.evidence_index_items[0] = { ...badMode.evidence_index_items[0], evidence_mode: 'real' };
assert(build(badMode).errors[0].includes('INCOMPLETE'), 'invalid evidence_mode');
const shortHash = validInput(); shortHash.evidence_index_items[0] = { ...shortHash.evidence_index_items[0], evidence_hash: 'short' };
assert(build(shortHash).errors[0].includes('INCOMPLETE'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_evidence_index_controls = ['firewall-evidence-index-required'];
assert(build(missingCtrl).errors[0].includes('INCOMPLETE'), 'missing controls');
const noLevel = validInput(); noLevel.evidence_index_level = null;
assert(build(noLevel).errors[0].includes('INCOMPLETE'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.firewall_evidence_index_ready === true, 'ready');
assert(r.evidence_index_hash && r.evidence_index_hash.length === 64, 'hash64');
assert(r.evidence_index_items_count === 17, 'items count 17');
assert(r.required_evidence_index_controls_count === 15, 'controls count 15');
assert(r.missing_source_versions.length === 0, 'no missing versions');
assert(r.firewall_evidence_index_published === false, 'evidence not published');
assert(r.unified_release_authority_report_published === false, 'report not published');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.firewall_drift_detected === false, 'drift not detected');
assert(r.firewall_regression_guard_enabled === false, 'regression guard off');
assert(r.unified_firewall_final_review_approved === false, 'final review not approved');
assert(r.release_firewall_consolidation_phase_passed === false, 'phase not passed');
assert(r.release_execution_firewall_phase_passed === false, 'exec fw phase not passed');
assert(r.real_release_executed === false, 'not executed');
assert(r.production_touched === false, 'not touched');
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
assert(rend.includes('FIREWALL_EVIDENCE_INDEX_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(render(null) === 'FIREWALL_EVIDENCE_INDEX_BLOCKED_INPUT', 'null render');
assert(render({ ...r, firewall_evidence_index_ready: false, errors: ['FIREWALL_EVIDENCE_INDEX_INCOMPLETE: x'] }).includes('INCOMPLETE'), 'incomplete render');

console.log('--- invariants ---');
assert(build(validInput()).evidence_index_hash === build(validInput()).evidence_index_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
