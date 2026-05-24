import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-drill-execution-plan.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'release-drill-plan-required',
  'scope-binding-required',
  'plan-is-metadata-only',
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
    plan_id: `plan-step-${n}`,
    plan_type: 'release_step',
    plan_mode: 'no-op',
    plan_hash: VALID_HASH.slice(0, 63) + String(n % 10),
    order: n,
  };
}

function validInput() {
  return {
    release_drill_execution_plan_id: 'exec-plan-v389-001',
    release_drill_scope_binder_id: 'scope-binder-v388-001',
    release_drill_scope_binder_ready: true,
    plan_items: [validItem(1), validItem(2), validItem(3)],
    plan_level: 'supervised-drill-metadata-only',
    required_plan_controls: [...ALL_CONTROLS],
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

console.log('\n=== release-drill-execution-plan tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE'), 'B_SCOPE');
assert(STATUSES.includes('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'FAIL');
assert(STATUSES.includes('RELEASE_DRILL_EXECUTION_PLAN_READY'), 'READY');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.release_drill_execution_plan_id = '';
assert(build(noId).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT'), 'empty plan id');

console.log('--- blocked scope ---');
const noScopeId = validInput(); noScopeId.release_drill_scope_binder_id = null;
assert(build(noScopeId).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE'), 'missing scope id');
const scopeNotReady = validInput(); scopeNotReady.release_drill_scope_binder_ready = false;
assert(build(scopeNotReady).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE'), 'scope not ready');

console.log('--- fail ---');
const missingCtrl = validInput(); missingCtrl.required_plan_controls = ['no-real-release'];
assert(build(missingCtrl).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'missing controls');
const emptyItems = validInput(); emptyItems.plan_items = [];
assert(build(emptyItems).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'empty items');
const badType = validInput(); badType.plan_items = [{ ...validItem(1), plan_type: 'invalid' }];
assert(build(badType).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'bad plan_type');
const badHash = validInput(); badHash.plan_items = [{ ...validItem(1), plan_hash: 'short' }];
assert(build(badHash).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'bad hash');
const zeroOrder = validInput(); zeroOrder.plan_items = [{ ...validItem(1), order: 0 }];
assert(build(zeroOrder).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'zero order');
const negOrder = validInput(); negOrder.plan_items = [{ ...validItem(1), order: -1 }];
assert(build(negOrder).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'negative order');
const noLevel = validInput(); noLevel.plan_level = null;
assert(build(noLevel).errors[0].startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'), 'missing plan_level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.plan_ready === true, 'plan_ready');
assert(r.plan_hash && r.plan_hash.length === 64, 'hash 64 chars');
assert(r.plan_items.length === 3, '3 plan items');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.invalid_items.length === 0, 'no invalid items');
assert(r.final_message && r.final_message.includes('V389'), 'final message V389');
assert(r.final_message.includes('V377-V386'), 'references V377-V386');
assert(r.errors.length === 0, 'no errors');

console.log('--- all plan types accepted ---');
const allPlanTypes = [
  'release_step', 'deploy_step', 'tag_step', 'stable_step', 'artifact_step',
  'production_step', 'billing_step', 'secret_step', 'network_step',
  'rollback_step', 'verification_step', 'emergency_stop_step',
];
allPlanTypes.forEach(pt => {
  const inp = validInput(); inp.plan_items = [{ ...validItem(1), plan_type: pt }];
  assert(build(inp).plan_ready === true, `plan_type accepted: ${pt}`);
});

console.log('--- all plan modes accepted ---');
['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op'].forEach(pm => {
  const inp = validInput(); inp.plan_items = [{ ...validItem(1), plan_mode: pm }];
  assert(build(inp).plan_ready === true, `plan_mode accepted: ${pm}`);
});

console.log('--- positive integer orders accepted ---');
[1, 5, 100, 999].forEach(o => {
  const inp = validInput(); inp.plan_items = [{ ...validItem(1), order: o }];
  assert(build(inp).plan_ready === true, `order ${o} accepted`);
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
assert(rend.includes('RELEASE_DRILL_EXECUTION_PLAN_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('release_drill_plan_published: false'), 'plan_published false in render');
assert(render(null) === 'RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT', 'null render');
const bsRend = render({ ...r, plan_ready: false, errors: ['RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE: x'] });
assert(bsRend.includes('BLOCKED_SCOPE'), 'blocked scope render');
const failRend = render({ ...r, plan_ready: false, errors: ['RELEASE_DRILL_EXECUTION_PLAN_FAIL: x'] });
assert(failRend.includes('FAIL'), 'fail render');

console.log('--- deterministic ---');
assert(build(validInput()).plan_hash === build(validInput()).plan_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
