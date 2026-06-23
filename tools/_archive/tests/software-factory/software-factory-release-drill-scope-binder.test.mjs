import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-drill-scope-binder.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'release-drill-scope-required',
  'supervised-command-required',
  'scope-is-metadata-only',
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

function makeHash(n) { const b = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678'; return b.slice(0, 63) + String(n % 10); }

function validItem(n) {
  return {
    scope_id: `scope-${n}`,
    scope_type: 'release_scope',
    scope_mode: 'no-op',
    scope_hash: makeHash(n),
  };
}

function validInput() {
  return {
    release_drill_scope_binder_id: 'scope-binder-v388-001',
    supervised_release_drill_command_contract_id: 'drill-cmd-v387-001',
    supervised_release_drill_command_contract_ready: true,
    scope_items: [validItem(1), validItem(2)],
    scope_level: 'supervised-drill-metadata-only',
    required_scope_controls: [...ALL_CONTROLS],
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

console.log('\n=== release-drill-scope-binder tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND'), 'B_COMMAND');
assert(STATUSES.includes('RELEASE_DRILL_SCOPE_BINDER_FAIL'), 'FAIL');
assert(STATUSES.includes('RELEASE_DRILL_SCOPE_BINDER_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.release_drill_scope_binder_id = '';
assert(build(noId).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT'), 'empty binder id');

console.log('--- blocked command ---');
const noCmdId = validInput(); noCmdId.supervised_release_drill_command_contract_id = null;
assert(build(noCmdId).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND'), 'missing cmd id');
const cmdNotReady = validInput(); cmdNotReady.supervised_release_drill_command_contract_ready = false;
assert(build(cmdNotReady).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND'), 'cmd not ready');

console.log('--- fail ---');
const missingCtrl = validInput(); missingCtrl.required_scope_controls = ['no-real-release'];
assert(build(missingCtrl).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_FAIL'), 'missing controls');
const emptyItems = validInput(); emptyItems.scope_items = [];
assert(build(emptyItems).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_FAIL'), 'empty items');
const badScopeType = validInput(); badScopeType.scope_items = [{ ...validItem(1), scope_type: 'invalid' }];
assert(build(badScopeType).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_FAIL'), 'bad scope type');
const badHash = validInput(); badHash.scope_items = [{ ...validItem(1), scope_hash: 'tooshort' }];
assert(build(badHash).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_FAIL'), 'bad hash');
const noLevel = validInput(); noLevel.scope_level = null;
assert(build(noLevel).errors[0].startsWith('RELEASE_DRILL_SCOPE_BINDER_FAIL'), 'missing scope_level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.binder_ready === true, 'binder_ready');
assert(r.binder_hash && r.binder_hash.length === 64, 'hash 64 chars');
assert(r.scope_items.length === 2, '2 scope items');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.invalid_items.length === 0, 'no invalid items');
assert(r.final_message && r.final_message.includes('V388'), 'final message V388');
assert(r.final_message.includes('V377-V386'), 'references V377-V386');
assert(r.errors.length === 0, 'no errors');

console.log('--- all scope types accepted ---');
const allScopeTypes = [
  'release_scope', 'deployment_scope', 'tag_scope', 'stable_scope', 'artifact_scope',
  'production_scope', 'billing_scope', 'secret_scope', 'network_scope',
  'rollback_scope', 'audit_scope', 'emergency_stop_scope',
];
allScopeTypes.forEach(st => {
  const inp = validInput(); inp.scope_items = [{ ...validItem(1), scope_type: st }];
  assert(build(inp).binder_ready === true, `scope_type accepted: ${st}`);
});

console.log('--- all scope modes accepted ---');
['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op'].forEach(sm => {
  const inp = validInput(); inp.scope_items = [{ ...validItem(1), scope_mode: sm }];
  assert(build(inp).binder_ready === true, `scope_mode accepted: ${sm}`);
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
assert(rend.includes('RELEASE_DRILL_SCOPE_BINDER_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('release_drill_scope_bound: false'), 'scope_bound false in render');
assert(render(null) === 'RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT', 'null render');
const bcRend = render({ ...r, binder_ready: false, errors: ['RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND: x'] });
assert(bcRend.includes('BLOCKED_COMMAND'), 'blocked command render');
const failRend = render({ ...r, binder_ready: false, errors: ['RELEASE_DRILL_SCOPE_BINDER_FAIL: x'] });
assert(failRend.includes('FAIL'), 'fail render');

console.log('--- deterministic ---');
assert(build(validInput()).binder_hash === build(validInput()).binder_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
