import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-drill-result-verifier.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'release-drill-result-verifier-required',
  'noop-executor-required',
  'metadata-result-only',
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
  'evidence-required',
  'audit-required',
  'human-approval-required',
  'pass-gold-required',
];

const VALID_HASH = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

function validItem(n) {
  return {
    result_id: `result-${n}`,
    result_type: 'release_result',
    result_mode: 'no-op',
    result_hash: VALID_HASH.slice(0, 63) + String(n % 10),
    result_status: 'verified',
  };
}

function validInput() {
  return {
    release_drill_result_verifier_id: 'result-verifier-v391-001',
    release_drill_noop_executor_id: 'noop-exec-v390-001',
    release_drill_noop_executor_ready: true,
    result_items: [validItem(1), validItem(2), validItem(3)],
    result_level: 'supervised-drill-metadata-result-only',
    required_result_controls: [...ALL_CONTROLS],
  };
}

const MUST_FALSE_KEYS = [
  'supervised_release_drill_command_received',
  'release_drill_scope_bound', 'release_drill_plan_published',
  'release_drill_noop_executed', 'release_drill_result_verified',
  'release_drill_evidence_receipt_published', 'release_drill_risk_classified',
  'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
  'release_firewall_consolidation_phase_passed', 'release_firewall_registry_published',
  'unified_firewall_snapshot_published', 'firewall_chain_integrity_confirmed',
  'firewall_dependency_graph_published', 'firewall_policy_bound',
  'unified_release_authority_report_published', 'firewall_evidence_index_published',
  'firewall_drift_detected', 'firewall_regression_guard_enabled',
  'unified_firewall_final_review_approved', 'release_execution_firewall_phase_passed',
  'release_execution_firewall_enabled', 'production_mutation_firewall_locked',
  'secret_access_firewall_locked', 'billing_execution_firewall_locked',
  'network_execution_firewall_locked', 'artifact_tag_stable_firewall_locked',
  'rollback_execution_firewall_locked', 'last_mile_noop_drill_completed',
  'firewall_evidence_receipt_published', 'firewall_final_authority_approved',
  'real_release_executed', 'real_deploy_executed', 'real_tag_created',
  'real_stable_promoted', 'artifact_published', 'production_touched',
  'billing_executed', 'secrets_accessed', 'network_accessed', 'rollback_executed',
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed',
];

console.log('\n=== release-drill-result-verifier tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_NOOP'), 'B_NOOP');
assert(STATUSES.includes('RELEASE_DRILL_RESULT_VERIFIER_FAIL'), 'FAIL');
assert(STATUSES.includes('RELEASE_DRILL_RESULT_VERIFIER_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.release_drill_result_verifier_id = '';
assert(build(noId).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_INPUT'), 'empty verifier id');

console.log('--- blocked noop ---');
const noExecId = validInput(); noExecId.release_drill_noop_executor_id = null;
assert(build(noExecId).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_NOOP'), 'missing executor id');
const execNotReady = validInput(); execNotReady.release_drill_noop_executor_ready = false;
assert(build(execNotReady).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_NOOP'), 'executor not ready');

console.log('--- fail ---');
const missingCtrl = validInput(); missingCtrl.required_result_controls = ['metadata-result-only'];
assert(build(missingCtrl).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_FAIL'), 'missing controls');
const emptyItems = validInput(); emptyItems.result_items = [];
assert(build(emptyItems).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_FAIL'), 'empty items');
const badType = validInput(); badType.result_items = [{ ...validItem(1), result_type: 'invalid' }];
assert(build(badType).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_FAIL'), 'bad result_type');
const badHash = validInput(); badHash.result_items = [{ ...validItem(1), result_hash: 'short' }];
assert(build(badHash).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_FAIL'), 'bad hash');
const badStatus = validInput(); badStatus.result_items = [{ ...validItem(1), result_status: 'executed' }];
assert(build(badStatus).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_FAIL'), 'bad result_status');
const noLevel = validInput(); noLevel.result_level = null;
assert(build(noLevel).errors[0].startsWith('RELEASE_DRILL_RESULT_VERIFIER_FAIL'), 'missing result_level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.verifier_ready === true, 'verifier_ready');
assert(r.verifier_hash && r.verifier_hash.length === 64, 'hash 64 chars');
assert(r.result_items.length === 3, '3 result items');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.invalid_items.length === 0, 'no invalid items');
assert(r.final_message && r.final_message.includes('V391'), 'final message V391');
assert(r.final_message.includes('V387-V391'), 'references V387-V391');
assert(r.final_message.includes('V377-V386'), 'references V377-V386');
assert(r.final_message.includes('does not approve real release'), 'not approving real release');
assert(r.errors.length === 0, 'no errors');

console.log('--- all result types accepted ---');
const allResultTypes = [
  'release_result', 'deploy_result', 'tag_result', 'stable_result', 'artifact_result',
  'production_result', 'billing_result', 'secret_result', 'network_result',
  'rollback_result', 'verification_result', 'emergency_stop_result',
];
allResultTypes.forEach(rt => {
  const inp = validInput(); inp.result_items = [{ ...validItem(1), result_type: rt }];
  assert(build(inp).verifier_ready === true, `result_type accepted: ${rt}`);
});

console.log('--- all result modes accepted ---');
['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op'].forEach(rm => {
  const inp = validInput(); inp.result_items = [{ ...validItem(1), result_mode: rm }];
  assert(build(inp).verifier_ready === true, `result_mode accepted: ${rm}`);
});

console.log('--- all result statuses accepted ---');
['blocked', 'skipped', 'simulated', 'noop', 'verified'].forEach(rs => {
  const inp = validInput(); inp.result_items = [{ ...validItem(1), result_status: rs }];
  assert(build(inp).verifier_ready === true, `result_status accepted: ${rs}`);
});

console.log('--- invariants always false ---');
MUST_FALSE_KEYS.forEach(k => {
  assert(r[k] === false, `${k} === false`);
});

console.log('--- validate ---');
assert(validate(r).valid === true, 'valid ready');
assert(validate(null).valid === false, 'null invalid');
assert(validate({}).valid === false, 'empty invalid');
assert(validate({ ...r, errors: ['e'] }).valid === false, 'has errors invalid');

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'render string');
assert(rend.includes('RELEASE_DRILL_RESULT_VERIFIER_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('release_drill_result_verified: false'), 'result_verified false in render');
assert(rend.includes('supervised_release_drill_phase_passed: false'), 'phase_passed false in render');
assert(render(null) === 'RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_INPUT', 'null render');
const bnRend = render({ ...r, verifier_ready: false, errors: ['RELEASE_DRILL_RESULT_VERIFIER_BLOCKED_NOOP: x'] });
assert(bnRend.includes('BLOCKED_NOOP'), 'blocked noop render');
const failRend = render({ ...r, verifier_ready: false, errors: ['RELEASE_DRILL_RESULT_VERIFIER_FAIL: x'] });
assert(failRend.includes('FAIL'), 'fail render');

console.log('--- deterministic ---');
assert(build(validInput()).verifier_hash === build(validInput()).verifier_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
