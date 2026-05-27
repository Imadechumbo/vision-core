import assert from 'node:assert';
import { STATUSES, build, validate, render } from '../../software-factory/software-factory-local-runtime-truth-execution.mjs';

const REQUIRED_EXECUTION_FIELDS = [
  'local_scope_declared',
  'operator_supervision_declared',
  'local_runtime_command_declared',
  'command_execution_external_to_module',
  'evidence_capture_declared',
  'stdout_capture_declared',
  'stderr_capture_declared',
  'exit_code_capture_declared',
  'started_at_required',
  'completed_at_required',
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
  'unify0-required',
  'rte-path-chosen',
  'local-runtime-truth-execution-only',
  'manual-supervised-local-only',
  'command-execution-external-to-module',
  'no-module-runtime-execution',
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

function makeValidExecution() {
  const execution = {};
  for (const field of REQUIRED_EXECUTION_FIELDS) {
    execution[field] = true;
  }
  return execution;
}

function makeValidReceipt() {
  return {
    operator_id: 'operator-001',
    execution_mode: 'manual-supervised-local',
    target_environment: 'local',
    command_id: 'cmd-rte0-001',
    command_text: 'node --version',
    command_executed_by_module: false,
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
    vision_core_final_state_ledger_ready: true,
    unified_state: 'REVIEW_READY_NOT_EXECUTED',
    chosen_path: 'RTE',
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    local_runtime_truth_execution: makeValidExecution(),
    operator_execution_receipt: makeValidReceipt(),
    required_controls: [...REQUIRED_CONTROLS]
  };
}

function pass(msg) {
  console.log(`✓ PASS: ${msg}`);
}

console.log('=== RTE-0 Local Runtime Truth Execution Tests ===\n');

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

assert.strictEqual(STATUSES.READY, 'LOCAL_RUNTIME_TRUTH_EXECUTION_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'LOCAL_RUNTIME_TRUTH_EXECUTION_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_UNIFY_LEDGER, 'LOCAL_RUNTIME_TRUTH_EXECUTION_BLOCKED_UNIFY_LEDGER');
assert.strictEqual(STATUSES.FAIL, 'LOCAL_RUNTIME_TRUTH_EXECUTION_FAIL');
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

// vision_core_final_state_ledger_ready false → BLOCKED_UNIFY_LEDGER
{
  const input = makeValidInput();
  input.vision_core_final_state_ledger_ready = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_UNIFY_LEDGER);
  assert.strictEqual(r.ready, false);
  assert.strictEqual(r.blocked_unify_ledger, true);
  assert.ok(r.errors.includes('UNIFY0_FINAL_STATE_LEDGER_NOT_READY'));
  pass('vision_core_final_state_ledger_ready false → BLOCKED_UNIFY_LEDGER');
}

// unified_state invalid → FAIL
{
  const input = makeValidInput();
  input.unified_state = 'INVALID_STATE';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('UNIFIED_STATE_MUST_BE_REVIEW_READY_NOT_EXECUTED'));
  pass('unified_state invalid → FAIL UNIFIED_STATE_MUST_BE_REVIEW_READY_NOT_EXECUTED');
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

{
  const input = makeValidInput();
  input.chosen_path = '';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE_PATH_NOT_CHOSEN'));
  pass('chosen_path empty → FAIL RTE_PATH_NOT_CHOSEN');
}

// pass_gold_real_achieved true → FAIL
{
  const input = makeValidInput();
  input.pass_gold_real_achieved = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE0'));
  pass('pass_gold_real_achieved true → FAIL PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE0');
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

// local_runtime_truth_execution missing → BLOCKED_INPUT
{
  const input = makeValidInput();
  delete input.local_runtime_truth_execution;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('LOCAL_RUNTIME_TRUTH_EXECUTION_MISSING_OR_NOT_OBJECT'));
  pass('local_runtime_truth_execution missing → BLOCKED_INPUT');
}

// local_runtime_truth_execution not object → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.local_runtime_truth_execution = 'bad';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  pass('local_runtime_truth_execution not object → BLOCKED_INPUT');
}

// operator_execution_receipt missing → BLOCKED_INPUT
{
  const input = makeValidInput();
  delete input.operator_execution_receipt;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('OPERATOR_EXECUTION_RECEIPT_MISSING_OR_NOT_OBJECT'));
  pass('operator_execution_receipt missing → BLOCKED_INPUT');
}

// operator_execution_receipt not object → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.operator_execution_receipt = 42;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  pass('operator_execution_receipt not object → BLOCKED_INPUT');
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

// Each required execution field false → FAIL
console.log('\n--- Required execution field validation ---');
for (const field of REQUIRED_EXECUTION_FIELDS) {
  const input = makeValidInput();
  input.local_runtime_truth_execution[field] = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL, `${field}=false should FAIL`);
  assert.ok(r.errors.includes(`REQUIRED_LOCAL_RUNTIME_TRUTH_EXECUTION_FIELD_NOT_TRUE: ${field}`));
  pass(`execution field ${field}=false → FAIL`);
}

// Each required execution field missing → FAIL
for (const field of REQUIRED_EXECUTION_FIELDS) {
  const input = makeValidInput();
  delete input.local_runtime_truth_execution[field];
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL, `${field} missing should FAIL`);
  assert.ok(r.errors.includes(`REQUIRED_LOCAL_RUNTIME_TRUTH_EXECUTION_FIELD_NOT_TRUE: ${field}`));
  pass(`execution field ${field} missing → FAIL`);
}

// Invalid operator execution receipt fields
console.log('\n--- Operator execution receipt validation ---');

// operator_id empty string → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.operator_id = '';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('OPERATOR_ID_MUST_BE_NON_EMPTY_STRING'));
  pass('operator_id empty → FAIL OPERATOR_ID_MUST_BE_NON_EMPTY_STRING');
}

// execution_mode invalid → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.execution_mode = 'automated';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('EXECUTION_MODE_MUST_BE_MANUAL_SUPERVISED_LOCAL'));
  pass('execution_mode invalid → FAIL EXECUTION_MODE_MUST_BE_MANUAL_SUPERVISED_LOCAL');
}

// target_environment not local → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.target_environment = 'production';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('TARGET_ENVIRONMENT_MUST_BE_LOCAL'));
  pass('target_environment production → FAIL TARGET_ENVIRONMENT_MUST_BE_LOCAL');
}

// command_id empty → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.command_id = '';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('COMMAND_ID_MUST_BE_NON_EMPTY_STRING'));
  pass('command_id empty → FAIL COMMAND_ID_MUST_BE_NON_EMPTY_STRING');
}

// command_text empty → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.command_text = '   ';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('COMMAND_TEXT_MUST_BE_NON_EMPTY_STRING'));
  pass('command_text whitespace → FAIL COMMAND_TEXT_MUST_BE_NON_EMPTY_STRING');
}

// command_executed_by_module true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.command_executed_by_module = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('COMMAND_EXECUTED_BY_MODULE_MUST_BE_FALSE'));
  pass('command_executed_by_module true → FAIL COMMAND_EXECUTED_BY_MODULE_MUST_BE_FALSE');
}

// production_target true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.production_target = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PRODUCTION_TARGET_MUST_BE_FALSE'));
  pass('production_target true → FAIL PRODUCTION_TARGET_MUST_BE_FALSE');
}

// external_network_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.external_network_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('EXTERNAL_NETWORK_USED_MUST_BE_FALSE'));
  pass('external_network_used true → FAIL EXTERNAL_NETWORK_USED_MUST_BE_FALSE');
}

// secrets_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.secrets_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('SECRETS_USED_MUST_BE_FALSE'));
  pass('secrets_used true → FAIL SECRETS_USED_MUST_BE_FALSE');
}

// billing_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.billing_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('BILLING_USED_MUST_BE_FALSE'));
  pass('billing_used true → FAIL BILLING_USED_MUST_BE_FALSE');
}

// rollback_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.rollback_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('ROLLBACK_USED_MUST_BE_FALSE'));
  pass('rollback_used true → FAIL ROLLBACK_USED_MUST_BE_FALSE');
}

// deploy_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.deploy_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('DEPLOY_USED_MUST_BE_FALSE'));
  pass('deploy_used true → FAIL DEPLOY_USED_MUST_BE_FALSE');
}

// release_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.release_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RELEASE_USED_MUST_BE_FALSE'));
  pass('release_used true → FAIL RELEASE_USED_MUST_BE_FALSE');
}

// tag_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.tag_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('TAG_USED_MUST_BE_FALSE'));
  pass('tag_used true → FAIL TAG_USED_MUST_BE_FALSE');
}

// stable_promotion_used true → FAIL
{
  const input = makeValidInput();
  input.operator_execution_receipt.stable_promotion_used = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('STABLE_PROMOTION_USED_MUST_BE_FALSE'));
  pass('stable_promotion_used true → FAIL STABLE_PROMOTION_USED_MUST_BE_FALSE');
}

// Missing required control → FAIL
console.log('\n--- Required control validation ---');
{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'unify0-required');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: unify0-required'));
  pass('missing unify0-required → FAIL MISSING_REQUIRED_CONTROL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'rte-path-chosen');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: rte-path-chosen'));
  pass('missing rte-path-chosen → FAIL MISSING_REQUIRED_CONTROL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'no-module-runtime-execution');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: no-module-runtime-execution'));
  pass('missing no-module-runtime-execution → FAIL MISSING_REQUIRED_CONTROL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'pass-gold-real-not-claimed');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: pass-gold-real-not-claimed'));
  pass('missing pass-gold-real-not-claimed → FAIL MISSING_REQUIRED_CONTROL');
}

// Valid input → READY
console.log('\n--- Valid input ---');
const validResult = build(makeValidInput());
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
pass('valid input → READY');

// module_version
assert.strictEqual(validResult.module_version, 'RTE-0');
pass('module_version === RTE-0');

// local_runtime_truth_execution_ready true
assert.strictEqual(validResult.local_runtime_truth_execution_ready, true);
pass('local_runtime_truth_execution_ready true');

// command_execution_external_to_module true
assert.strictEqual(validResult.command_execution_external_to_module, true);
pass('command_execution_external_to_module true');

// command_executed_by_module false
assert.strictEqual(validResult.command_executed_by_module, false);
pass('command_executed_by_module false');

// runtime_execution_performed_by_module false
assert.strictEqual(validResult.runtime_execution_performed_by_module, false);
pass('runtime_execution_performed_by_module false');

// endpoint_probe_performed_by_module false
assert.strictEqual(validResult.endpoint_probe_performed_by_module, false);
pass('endpoint_probe_performed_by_module false');

// pass_gold_real_achieved false
assert.strictEqual(validResult.pass_gold_real_achieved, false);
pass('pass_gold_real_achieved false');

// stable_promotion_allowed false
assert.strictEqual(validResult.stable_promotion_allowed, false);
pass('stable_promotion_allowed false');

// release/deploy/tag false
assert.strictEqual(validResult.release_allowed, false);
assert.strictEqual(validResult.deploy_allowed, false);
assert.strictEqual(validResult.tag_allowed, false);
pass('release_allowed/deploy_allowed/tag_allowed all false');

// production_touched false
assert.strictEqual(validResult.production_touched, false);
pass('production_touched false');

// v471_allowed false
assert.strictEqual(validResult.v471_allowed, false);
pass('v471_allowed false');

// rta10_allowed false
assert.strictEqual(validResult.rta10_allowed, false);
pass('rta10_allowed false');

// billing/secret/network/rollback false
assert.strictEqual(validResult.billing_execution_allowed, false);
assert.strictEqual(validResult.secret_access_allowed, false);
assert.strictEqual(validResult.network_allowed, false);
assert.strictEqual(validResult.rollback_execution_allowed, false);
pass('billing/secret/network/rollback all false');

// evidence_hash 64 chars
assert.strictEqual(typeof validResult.evidence_hash, 'string');
assert.strictEqual(validResult.evidence_hash.length, 64);
pass('evidence_hash is 64 chars');

// evidence_hash deterministic
{
  const r1 = build(makeValidInput());
  const r2 = build(makeValidInput());
  assert.strictEqual(r1.evidence_hash, r2.evidence_hash);
  pass('evidence_hash deterministic for same input');
}

// final_message exact
const EXPECTED_FINAL_MESSAGE = 'RTE-0 local runtime truth execution receipt prepared. Execution is manual-supervised-local and external to the module; PASS GOLD REAL is not claimed.';
assert.strictEqual(validResult.final_message, EXPECTED_FINAL_MESSAGE);
pass('final_message exact');

// unified_state
assert.strictEqual(validResult.unified_state, 'REVIEW_READY_NOT_EXECUTED');
pass('unified_state === REVIEW_READY_NOT_EXECUTED');

// chosen_path
assert.strictEqual(validResult.chosen_path, 'RTE');
pass('chosen_path === RTE');

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
  const r = build({ ...makeValidInput(), vision_core_final_state_ledger_ready: false });
  assert.strictEqual(validate(r), false);
  pass('validate BLOCKED_UNIFY_LEDGER → false');
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

assert.ok(rendered.includes('RTE-0 Local Runtime Truth Execution'));
pass('render contains RTE-0 Local Runtime Truth Execution');

assert.ok(rendered.includes('UNIFY-0 final state ledger'));
pass('render contains UNIFY-0 final state ledger');

assert.ok(rendered.includes('Path A RTE selected'));
pass('render contains Path A RTE selected');

assert.ok(rendered.includes('manual-supervised-local'));
pass('render contains manual-supervised-local');

assert.ok(rendered.includes('Execution is external to the module'));
pass('render contains execution is external to the module');

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

console.log('\n=== All RTE-0 Tests Completed Successfully ===');
