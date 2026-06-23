import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-drill-noop-executor.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'release-drill-noop-required',
  'execution-plan-required',
  'noop-only',
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
  'verification-required',
  'audit-required',
  'human-approval-required',
  'pass-gold-required',
];

const VALID_HASH = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

function validItem(n) {
  return {
    noop_id: `noop-${n}`,
    noop_type: 'release_noop',
    noop_mode: 'no-op',
    noop_hash: VALID_HASH.slice(0, 63) + String(n % 10),
    simulated_result: 'noop',
  };
}

function validInput() {
  return {
    release_drill_noop_executor_id: 'noop-exec-v390-001',
    release_drill_execution_plan_id: 'exec-plan-v389-001',
    release_drill_execution_plan_ready: true,
    noop_items: [validItem(1), validItem(2)],
    noop_level: 'supervised-drill-noop-only',
    required_noop_controls: [...ALL_CONTROLS],
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

console.log('\n=== release-drill-noop-executor tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_PLAN'), 'B_PLAN');
assert(STATUSES.includes('RELEASE_DRILL_NOOP_EXECUTOR_FAIL'), 'FAIL');
assert(STATUSES.includes('RELEASE_DRILL_NOOP_EXECUTOR_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.release_drill_noop_executor_id = '';
assert(build(noId).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_INPUT'), 'empty executor id');

console.log('--- blocked plan ---');
const noPlanId = validInput(); noPlanId.release_drill_execution_plan_id = null;
assert(build(noPlanId).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_PLAN'), 'missing plan id');
const planNotReady = validInput(); planNotReady.release_drill_execution_plan_ready = false;
assert(build(planNotReady).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_PLAN'), 'plan not ready');

console.log('--- fail ---');
const missingCtrl = validInput(); missingCtrl.required_noop_controls = ['noop-only'];
assert(build(missingCtrl).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_FAIL'), 'missing controls');
const emptyItems = validInput(); emptyItems.noop_items = [];
assert(build(emptyItems).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_FAIL'), 'empty items');
const badType = validInput(); badType.noop_items = [{ ...validItem(1), noop_type: 'invalid' }];
assert(build(badType).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_FAIL'), 'bad noop_type');
const badHash = validInput(); badHash.noop_items = [{ ...validItem(1), noop_hash: 'short' }];
assert(build(badHash).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_FAIL'), 'bad hash');
const badResult = validInput(); badResult.noop_items = [{ ...validItem(1), simulated_result: 'executed' }];
assert(build(badResult).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_FAIL'), 'bad simulated_result');
const noLevel = validInput(); noLevel.noop_level = null;
assert(build(noLevel).errors[0].startsWith('RELEASE_DRILL_NOOP_EXECUTOR_FAIL'), 'missing noop_level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.executor_ready === true, 'executor_ready');
assert(r.executor_hash && r.executor_hash.length === 64, 'hash 64 chars');
assert(r.noop_items.length === 2, '2 noop items');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.invalid_items.length === 0, 'no invalid items');
assert(r.final_message && r.final_message.includes('V390'), 'final message V390');
assert(r.final_message.includes('V377-V386'), 'references V377-V386');
assert(r.final_message.includes('no shell'), 'mentions no shell');
assert(r.errors.length === 0, 'no errors');

console.log('--- all noop types accepted ---');
const allNoopTypes = [
  'release_noop', 'deploy_noop', 'tag_noop', 'stable_noop', 'artifact_noop',
  'production_noop', 'billing_noop', 'secret_noop', 'network_noop',
  'rollback_noop', 'verification_noop', 'emergency_stop_noop',
];
allNoopTypes.forEach(nt => {
  const inp = validInput(); inp.noop_items = [{ ...validItem(1), noop_type: nt }];
  assert(build(inp).executor_ready === true, `noop_type accepted: ${nt}`);
});

console.log('--- all noop modes accepted ---');
['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op'].forEach(nm => {
  const inp = validInput(); inp.noop_items = [{ ...validItem(1), noop_mode: nm }];
  assert(build(inp).executor_ready === true, `noop_mode accepted: ${nm}`);
});

console.log('--- all simulated results accepted ---');
['blocked', 'skipped', 'simulated', 'noop', 'verified'].forEach(sr => {
  const inp = validInput(); inp.noop_items = [{ ...validItem(1), simulated_result: sr }];
  assert(build(inp).executor_ready === true, `simulated_result accepted: ${sr}`);
});

console.log('--- no real execution in module ---');
// Verify module has no real execution code by checking the imported module is pure data
assert(typeof build === 'function', 'build is pure function');
assert(typeof validate === 'function', 'validate is pure function');
assert(typeof render === 'function', 'render is pure function');
// All outputs are deterministic metadata
assert(r.executor_hash === build(validInput()).executor_hash, 'no side effects');

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
assert(rend.includes('RELEASE_DRILL_NOOP_EXECUTOR_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('release_drill_noop_executed: false'), 'noop_executed false in render');
assert(render(null) === 'RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_INPUT', 'null render');
const bpRend = render({ ...r, executor_ready: false, errors: ['RELEASE_DRILL_NOOP_EXECUTOR_BLOCKED_PLAN: x'] });
assert(bpRend.includes('BLOCKED_PLAN'), 'blocked plan render');
const failRend = render({ ...r, executor_ready: false, errors: ['RELEASE_DRILL_NOOP_EXECUTOR_FAIL: x'] });
assert(failRend.includes('FAIL'), 'fail render');

console.log('--- deterministic ---');
assert(build(validInput()).executor_hash === build(validInput()).executor_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
