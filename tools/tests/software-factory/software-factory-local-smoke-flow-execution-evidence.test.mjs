import assert from 'node:assert';
import { STATUSES, build, validate, render } from '../../software-factory/software-factory-local-smoke-flow-execution-evidence.mjs';

const REQUIRED_SMOKE_FLOW_FIELDS = [
  'local_scope_declared',
  'operator_supervision_declared',
  'smoke_flow_declared',
  'smoke_flow_execution_external_to_module',
  'evidence_capture_declared',
  'stdout_capture_declared',
  'stderr_capture_declared',
  'exit_code_capture_declared',
  'started_at_required',
  'completed_at_required',
  'runtime_truth_dependency_bound',
  'production_scope_blocked',
  'external_network_blocked',
  'secrets_blocked',
  'billing_blocked',
  'deploy_release_tag_stable_blocked',
  'rollback_blocked',
  'pass_gold_real_not_claimed',
  'v471_blocked',
  'rta10_blocked'
];

const REQUIRED_CONTROLS = [
  'rte0-required',
  'rte-path-chosen',
  'local-smoke-flow-execution-evidence-only',
  'manual-supervised-local-only',
  'smoke-flow-execution-external-to-module',
  'no-module-runtime-execution',
  'no-module-smoke-execution',
  'no-endpoint-probe',
  'no-production-target',
  'no-external-network',
  'no-secret-loading',
  'no-billing-access',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-rollback-execution',
  'pass-gold-real-not-claimed',
  'v471-blocked',
  'rta10-blocked'
];

function makeValidSmokeFlow() {
  const flow = {};
  for (const field of REQUIRED_SMOKE_FLOW_FIELDS) {
    flow[field] = true;
  }
  return flow;
}

function makeValidReceipt() {
  return {
    operator_id: 'operator-001',
    execution_mode: 'manual-supervised-local',
    target_environment: 'local',
    smoke_flow_id: 'smoke-flow-rte1-001',
    smoke_flow_description: 'Local smoke flow execution for runtime truth verification',
    runtime_truth_receipt_id: 'rte0-receipt-001',
    command_executed_by_module: false,
    smoke_flow_executed_by_module: false,
    endpoint_probe_performed_by_module: false,
    production_target: false,
    external_network_used: false,
    secrets_used: false,
    billing_used: false,
    rollback_used: false,
    deploy_used: false,
    release_used: false,
    tag_used: false,
    stable_promotion_used: false
  };
}

function makeValidInput() {
  return {
    local_runtime_truth_execution_ready: true,
    runtime_truth_execution_review_ready: true,
    chosen_path: 'RTE',
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    local_smoke_flow_execution_evidence: makeValidSmokeFlow(),
    operator_smoke_flow_receipt: makeValidReceipt(),
    required_controls: [...REQUIRED_CONTROLS]
  };
}

function pass(msg) {
  console.log(`✓ PASS: ${msg}`);
}

console.log('=== RTE-1 Local Smoke Flow Execution Evidence Tests ===\n');

// Exports
console.log('--- Exports ---');
assert.ok(STATUSES, 'STATUSES exported');
assert.strictEqual(typeof STATUSES, 'object');
assert.ok(build, 'build exported');
assert.strictEqual(typeof build, 'function');
assert.ok(validate, 'validate exported');
assert.strictEqual(typeof validate, 'function');
assert.ok(render, 'render exported');
assert.strictEqual(typeof render, 'function');
pass('STATUSES, build, validate, render exported');

assert.strictEqual(STATUSES.READY, 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_RTE0, 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_BLOCKED_RTE0');
assert.strictEqual(STATUSES.FAIL, 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_FAIL');
pass('STATUSES values correct');

// null input → BLOCKED_INPUT
console.log('\n--- Input validation ---');
{
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.strictEqual(r.ready, false);
  assert.strictEqual(r.blocked_input, true);
  assert.ok(r.errors.includes('INPUT_NOT_OBJECT'));
  pass('null input → BLOCKED_INPUT INPUT_NOT_OBJECT');
}

// local_runtime_truth_execution_ready false → BLOCKED_RTE0
{
  const input = makeValidInput();
  input.local_runtime_truth_execution_ready = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_RTE0);
  assert.strictEqual(r.ready, false);
  assert.strictEqual(r.blocked_rte0, true);
  assert.ok(r.errors.includes('RTE0_LOCAL_RUNTIME_TRUTH_EXECUTION_NOT_READY'));
  pass('local_runtime_truth_execution_ready false → BLOCKED_RTE0');
}

// runtime_truth_execution_review_ready false → BLOCKED_RTE0
{
  const input = makeValidInput();
  input.runtime_truth_execution_review_ready = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_RTE0);
  assert.ok(r.errors.includes('RTE0_LOCAL_RUNTIME_TRUTH_EXECUTION_NOT_READY'));
  pass('runtime_truth_execution_review_ready false → BLOCKED_RTE0');
}

// chosen_path not RTE → FAIL
{
  const input = makeValidInput();
  input.chosen_path = 'RC';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE_PATH_NOT_CHOSEN'));
  pass('chosen_path RC → FAIL RTE_PATH_NOT_CHOSEN');
}

// pass_gold_real_achieved true → FAIL
{
  const input = makeValidInput();
  input.pass_gold_real_achieved = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE1'));
  pass('pass_gold_real_achieved true → FAIL PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE1');
}

// stable_promotion_allowed true → FAIL
{
  const input = makeValidInput();
  input.stable_promotion_allowed = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('STABLE_PROMOTION_MUST_REMAIN_BLOCKED'));
  pass('stable_promotion_allowed true → FAIL STABLE_PROMOTION_MUST_REMAIN_BLOCKED');
}

// local_smoke_flow_execution_evidence missing → BLOCKED_INPUT
{
  const input = makeValidInput();
  delete input.local_smoke_flow_execution_evidence;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_MISSING_OR_NOT_OBJECT'));
  pass('local_smoke_flow_execution_evidence missing → BLOCKED_INPUT');
}

// local_smoke_flow_execution_evidence not object → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.local_smoke_flow_execution_evidence = 'bad';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  pass('local_smoke_flow_execution_evidence not object → BLOCKED_INPUT');
}

// operator_smoke_flow_receipt missing → BLOCKED_INPUT
{
  const input = makeValidInput();
  delete input.operator_smoke_flow_receipt;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('OPERATOR_SMOKE_FLOW_RECEIPT_MISSING_OR_NOT_OBJECT'));
  pass('operator_smoke_flow_receipt missing → BLOCKED_INPUT');
}

// operator_smoke_flow_receipt not object → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt = 42;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  pass('operator_smoke_flow_receipt not object → BLOCKED_INPUT');
}

// required_controls not array → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.required_controls = 'bad';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('REQUIRED_CONTROLS_NOT_ARRAY'));
  pass('required_controls not array → BLOCKED_INPUT');
}

// Each required smoke flow field false → FAIL
console.log('\n--- Required smoke flow field validation ---');
for (const field of REQUIRED_SMOKE_FLOW_FIELDS) {
  const input = makeValidInput();
  input.local_smoke_flow_execution_evidence[field] = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL, `${field}=false should FAIL`);
  assert.ok(r.errors.includes(`REQUIRED_LOCAL_SMOKE_FLOW_EXECUTION_FIELD_NOT_TRUE: ${field}`));
  pass(`smoke flow field ${field}=false → FAIL`);
}

// Each required smoke flow field missing → FAIL
for (const field of REQUIRED_SMOKE_FLOW_FIELDS) {
  const input = makeValidInput();
  delete input.local_smoke_flow_execution_evidence[field];
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL, `${field} missing should FAIL`);
  assert.ok(r.errors.includes(`REQUIRED_LOCAL_SMOKE_FLOW_EXECUTION_FIELD_NOT_TRUE: ${field}`));
  pass(`smoke flow field ${field} missing → FAIL`);
}

// Invalid operator smoke flow receipt fields
console.log('\n--- Operator smoke flow receipt validation ---');

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.operator_id = '';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('OPERATOR_ID_MUST_BE_NON_EMPTY_STRING'));
  pass('operator_id empty → FAIL OPERATOR_ID_MUST_BE_NON_EMPTY_STRING');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.execution_mode = 'automated';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('EXECUTION_MODE_MUST_BE_MANUAL_SUPERVISED_LOCAL'));
  pass('execution_mode invalid → FAIL EXECUTION_MODE_MUST_BE_MANUAL_SUPERVISED_LOCAL');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.target_environment = 'production';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('TARGET_ENVIRONMENT_MUST_BE_LOCAL'));
  pass('target_environment production → FAIL TARGET_ENVIRONMENT_MUST_BE_LOCAL');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.smoke_flow_id = '';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('SMOKE_FLOW_ID_MUST_BE_NON_EMPTY_STRING'));
  pass('smoke_flow_id empty → FAIL SMOKE_FLOW_ID_MUST_BE_NON_EMPTY_STRING');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.smoke_flow_description = '   ';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('SMOKE_FLOW_DESCRIPTION_MUST_BE_NON_EMPTY_STRING'));
  pass('smoke_flow_description whitespace → FAIL SMOKE_FLOW_DESCRIPTION_MUST_BE_NON_EMPTY_STRING');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.runtime_truth_receipt_id = '';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RUNTIME_TRUTH_RECEIPT_ID_MUST_BE_NON_EMPTY_STRING'));
  pass('runtime_truth_receipt_id empty → FAIL RUNTIME_TRUTH_RECEIPT_ID_MUST_BE_NON_EMPTY_STRING');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.command_executed_by_module = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('COMMAND_EXECUTED_BY_MODULE_MUST_BE_FALSE'));
  pass('command_executed_by_module true → FAIL COMMAND_EXECUTED_BY_MODULE_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.smoke_flow_executed_by_module = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('SMOKE_FLOW_EXECUTED_BY_MODULE_MUST_BE_FALSE'));
  pass('smoke_flow_executed_by_module true → FAIL SMOKE_FLOW_EXECUTED_BY_MODULE_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.endpoint_probe_performed_by_module = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('ENDPOINT_PROBE_PERFORMED_BY_MODULE_MUST_BE_FALSE'));
  pass('endpoint_probe_performed_by_module true → FAIL ENDPOINT_PROBE_PERFORMED_BY_MODULE_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.production_target = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PRODUCTION_TARGET_MUST_BE_FALSE'));
  pass('production_target true → FAIL PRODUCTION_TARGET_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.external_network_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('EXTERNAL_NETWORK_USED_MUST_BE_FALSE'));
  pass('external_network_used true → FAIL EXTERNAL_NETWORK_USED_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.secrets_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('SECRETS_USED_MUST_BE_FALSE'));
  pass('secrets_used true → FAIL SECRETS_USED_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.billing_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('BILLING_USED_MUST_BE_FALSE'));
  pass('billing_used true → FAIL BILLING_USED_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.rollback_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('ROLLBACK_USED_MUST_BE_FALSE'));
  pass('rollback_used true → FAIL ROLLBACK_USED_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.deploy_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('DEPLOY_USED_MUST_BE_FALSE'));
  pass('deploy_used true → FAIL DEPLOY_USED_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.release_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RELEASE_USED_MUST_BE_FALSE'));
  pass('release_used true → FAIL RELEASE_USED_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.tag_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('TAG_USED_MUST_BE_FALSE'));
  pass('tag_used true → FAIL TAG_USED_MUST_BE_FALSE');
}

{
  const input = makeValidInput();
  input.operator_smoke_flow_receipt.stable_promotion_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('STABLE_PROMOTION_USED_MUST_BE_FALSE'));
  pass('stable_promotion_used true → FAIL STABLE_PROMOTION_USED_MUST_BE_FALSE');
}

// Missing required control → FAIL
console.log('\n--- Required control validation ---');
{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'rte0-required');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: rte0-required'));
  pass('missing rte0-required → FAIL MISSING_REQUIRED_CONTROL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'no-module-smoke-execution');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: no-module-smoke-execution'));
  pass('missing no-module-smoke-execution → FAIL MISSING_REQUIRED_CONTROL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'pass-gold-real-not-claimed');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: pass-gold-real-not-claimed'));
  pass('missing pass-gold-real-not-claimed → FAIL MISSING_REQUIRED_CONTROL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'smoke-flow-execution-external-to-module');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: smoke-flow-execution-external-to-module'));
  pass('missing smoke-flow-execution-external-to-module → FAIL MISSING_REQUIRED_CONTROL');
}

// Valid input → READY
console.log('\n--- Valid input ---');
const validResult = build(makeValidInput());
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
pass('valid input → READY');

assert.strictEqual(validResult.module_version, 'RTE-1');
pass('module_version === RTE-1');

assert.strictEqual(validResult.local_smoke_flow_execution_evidence_ready, true);
pass('local_smoke_flow_execution_evidence_ready true');

assert.strictEqual(validResult.smoke_flow_execution_external_to_module, true);
pass('smoke_flow_execution_external_to_module true');

assert.strictEqual(validResult.smoke_flow_executed_by_module, false);
pass('smoke_flow_executed_by_module false');

assert.strictEqual(validResult.command_executed_by_module, false);
pass('command_executed_by_module false');

assert.strictEqual(validResult.runtime_execution_performed_by_module, false);
pass('runtime_execution_performed_by_module false');

assert.strictEqual(validResult.endpoint_probe_performed_by_module, false);
pass('endpoint_probe_performed_by_module false');

assert.strictEqual(validResult.pass_gold_real_achieved, false);
pass('pass_gold_real_achieved false');

assert.strictEqual(validResult.stable_promotion_allowed, false);
pass('stable_promotion_allowed false');

assert.strictEqual(validResult.release_allowed, false);
assert.strictEqual(validResult.deploy_allowed, false);
assert.strictEqual(validResult.tag_allowed, false);
pass('release_allowed/deploy_allowed/tag_allowed all false');

assert.strictEqual(validResult.production_touched, false);
pass('production_touched false');

assert.strictEqual(validResult.v471_allowed, false);
pass('v471_allowed false');

assert.strictEqual(validResult.rta10_allowed, false);
pass('rta10_allowed false');

assert.strictEqual(validResult.billing_execution_allowed, false);
assert.strictEqual(validResult.secret_access_allowed, false);
assert.strictEqual(validResult.network_allowed, false);
assert.strictEqual(validResult.rollback_execution_allowed, false);
pass('billing/secret/network/rollback all false');

assert.strictEqual(validResult.runtime_truth_dependency_bound, true);
pass('runtime_truth_dependency_bound true');

assert.strictEqual(typeof validResult.evidence_hash, 'string');
assert.strictEqual(validResult.evidence_hash.length, 64);
pass('evidence_hash is 64 chars');

{
  const r1 = build(makeValidInput());
  const r2 = build(makeValidInput());
  assert.strictEqual(r1.evidence_hash, r2.evidence_hash);
  pass('evidence_hash deterministic for same input');
}

const EXPECTED_FINAL_MESSAGE = 'RTE-1 local smoke flow execution evidence prepared. Smoke flow execution is manual-supervised-local and external to the module; PASS GOLD REAL is not claimed.';
assert.strictEqual(validResult.final_message, EXPECTED_FINAL_MESSAGE);
pass('final_message exact');

// validate()
console.log('\n--- validate() ---');
assert.strictEqual(validate(validResult), true);
pass('validate READY → true');

{
  const r = build(null);
  assert.strictEqual(validate(r), false);
  pass('validate BLOCKED_INPUT → false');
}

{
  const r = build({ ...makeValidInput(), local_runtime_truth_execution_ready: false });
  assert.strictEqual(validate(r), false);
  pass('validate BLOCKED_RTE0 → false');
}

{
  const r = build({ ...makeValidInput(), chosen_path: 'RC' });
  assert.strictEqual(validate(r), false);
  pass('validate FAIL (wrong path) → false');
}

{
  const r = build({ ...makeValidInput(), pass_gold_real_achieved: true });
  assert.strictEqual(validate(r), false);
  pass('validate FAIL (PASS GOLD REAL) → false');
}

assert.strictEqual(validate(null), false);
pass('validate null → false');

// render()
console.log('\n--- render() ---');
const rendered = render(validResult);
assert.strictEqual(typeof rendered, 'string');

assert.ok(rendered.includes('RTE-1 Local Smoke Flow Execution Evidence'));
pass('render contains RTE-1 Local Smoke Flow Execution Evidence');

assert.ok(rendered.includes('RTE-0 local runtime truth execution'));
pass('render contains RTE-0 local runtime truth execution');

assert.ok(rendered.includes('Path A RTE selected'));
pass('render contains Path A RTE selected');

assert.ok(rendered.includes('manual-supervised-local'));
pass('render contains manual-supervised-local');

assert.ok(rendered.includes('Smoke flow execution is external to the module'));
pass('render contains smoke flow execution is external to the module');

assert.ok(rendered.includes('PASS GOLD REAL is not claimed'));
pass('render contains PASS GOLD REAL is not claimed');

assert.ok(rendered.includes('Stable promotion remains blocked'));
pass('render contains stable promotion remains blocked');

assert.ok(rendered.includes('Production untouched'));
pass('render contains production untouched');

assert.ok(rendered.includes('V471 blocked'));
pass('render contains V471 blocked');

assert.ok(rendered.includes('RTA-10 blocked'));
pass('render contains RTA-10 blocked');

assert.ok(rendered.includes('REGRA ABSOLUTA'));
pass('render contains REGRA ABSOLUTA');

assert.ok(rendered.includes(EXPECTED_FINAL_MESSAGE));
pass('render contains exact final_message');

console.log('\n=== All RTE-1 Tests Completed Successfully ===');
