import assert from 'node:assert';
import { STATUSES, build, validate, render } from '../../software-factory/software-factory-vision-core-final-state-ledger.mjs';

const REQUIRED_LEDGER_FIELDS = [
  'governance_closure_bound',
  'runtime_authorization_bound',
  'rtp_review_bound',
  'pass_gold_real_not_claimed',
  'stable_promotion_blocked',
  'release_blocked',
  'deploy_blocked',
  'tag_blocked',
  'production_untouched',
  'billing_blocked',
  'secrets_blocked',
  'network_blocked',
  'rollback_blocked',
  'v471_blocked',
  'rta10_blocked',
  'next_human_decision_required'
];

const REQUIRED_SEQUENCES = ['V466-V470', 'RTA-0-RTA-9', 'RTP-0-RTP-2'];

const REQUIRED_CONTROLS = [
  'v466-v470-bound',
  'rta0-rta9-bound',
  'rtp0-rtp2-bound',
  'no-rta10',
  'no-v471',
  'no-rc0-yet',
  'no-rte0-yet',
  'pass-gold-real-not-claimed',
  'stable-promotion-blocked',
  'no-release',
  'no-deploy',
  'no-tag',
  'no-production-touch',
  'no-billing-access',
  'no-secret-access',
  'no-network-execution',
  'no-rollback-execution',
  'next-human-decision-required'
];

function makeValidLedger() {
  const ledger = {};
  for (const field of REQUIRED_LEDGER_FIELDS) {
    ledger[field] = true;
  }
  return ledger;
}

function makeValidInput() {
  return {
    v466_v470_closure_complete: true,
    rta_sequence_complete: true,
    rta_final_gate: true,
    rta10_allowed: false,
    rtp_review_ready: true,
    pass_gold_real_review_ready: true,
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    final_state_ledger: makeValidLedger(),
    completed_sequences: [...REQUIRED_SEQUENCES],
    allowed_next_paths: ['RTE', 'RC'],
    required_controls: [...REQUIRED_CONTROLS]
  };
}

function pass(msg) {
  console.log(`✓ PASS: ${msg}`);
}

function fail(msg) {
  console.log(`✗ FAIL: ${msg}`);
  throw new Error(msg);
}

console.log('=== UNIFY-0 Vision Core Final State Ledger Tests ===\n');

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

// STATUSES values
assert.strictEqual(STATUSES.READY, 'VISION_CORE_FINAL_STATE_LEDGER_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'VISION_CORE_FINAL_STATE_LEDGER_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_RTP_REVIEW, 'VISION_CORE_FINAL_STATE_LEDGER_BLOCKED_RTP_REVIEW');
assert.strictEqual(STATUSES.FAIL, 'VISION_CORE_FINAL_STATE_LEDGER_FAIL');
pass('STATUSES values correct');

// null input → BLOCKED_INPUT
console.log('\n--- Input validation ---');
{
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'null → BLOCKED_INPUT');
  assert.strictEqual(r.ready, false);
  assert.strictEqual(r.blocked_input, true);
  assert.ok(r.errors.includes('INPUT_NOT_OBJECT'));
  pass('null input → BLOCKED_INPUT with INPUT_NOT_OBJECT');
}

// v466_v470_closure_complete false → FAIL
{
  const input = makeValidInput();
  input.v466_v470_closure_complete = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.strictEqual(r.ready, false);
  assert.ok(r.errors.includes('V466_V470_CLOSURE_NOT_COMPLETE'));
  pass('v466_v470_closure_complete false → FAIL V466_V470_CLOSURE_NOT_COMPLETE');
}

// rta_sequence_complete false → FAIL
{
  const input = makeValidInput();
  input.rta_sequence_complete = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTA_SEQUENCE_NOT_COMPLETE'));
  pass('rta_sequence_complete false → FAIL RTA_SEQUENCE_NOT_COMPLETE');
}

// rta_final_gate false → FAIL
{
  const input = makeValidInput();
  input.rta_final_gate = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTA_SEQUENCE_NOT_COMPLETE'));
  pass('rta_final_gate false → FAIL RTA_SEQUENCE_NOT_COMPLETE');
}

// rta10_allowed true → FAIL
{
  const input = makeValidInput();
  input.rta10_allowed = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTA10_MUST_REMAIN_BLOCKED'));
  pass('rta10_allowed true → FAIL RTA10_MUST_REMAIN_BLOCKED');
}

// rtp_review_ready false → BLOCKED_RTP_REVIEW
{
  const input = makeValidInput();
  input.rtp_review_ready = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_RTP_REVIEW);
  assert.strictEqual(r.ready, false);
  assert.strictEqual(r.blocked_rtp_review, true);
  assert.ok(r.errors.includes('RTP_REVIEW_NOT_READY'));
  pass('rtp_review_ready false → BLOCKED_RTP_REVIEW');
}

// pass_gold_real_review_ready false → BLOCKED_RTP_REVIEW
{
  const input = makeValidInput();
  input.pass_gold_real_review_ready = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_RTP_REVIEW);
  assert.ok(r.errors.includes('RTP_REVIEW_NOT_READY'));
  pass('pass_gold_real_review_ready false → BLOCKED_RTP_REVIEW');
}

// pass_gold_real_achieved true → FAIL
{
  const input = makeValidInput();
  input.pass_gold_real_achieved = true;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_UNIFY0'));
  pass('pass_gold_real_achieved true → FAIL PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_UNIFY0');
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

// final_state_ledger missing → BLOCKED_INPUT
{
  const input = makeValidInput();
  delete input.final_state_ledger;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('FINAL_STATE_LEDGER_MISSING_OR_NOT_OBJECT'));
  pass('final_state_ledger missing → BLOCKED_INPUT');
}

// final_state_ledger not object → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.final_state_ledger = 'bad';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  pass('final_state_ledger not object → BLOCKED_INPUT');
}

// completed_sequences not array → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.completed_sequences = 'not-array';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('COMPLETED_SEQUENCES_NOT_ARRAY'));
  pass('completed_sequences not array → BLOCKED_INPUT');
}

// allowed_next_paths not array → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.allowed_next_paths = 'not-array';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('ALLOWED_NEXT_PATHS_NOT_ARRAY'));
  pass('allowed_next_paths not array → BLOCKED_INPUT');
}

// required_controls not array → BLOCKED_INPUT
{
  const input = makeValidInput();
  input.required_controls = 'not-array';
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('REQUIRED_CONTROLS_NOT_ARRAY'));
  pass('required_controls not array → BLOCKED_INPUT');
}

// Each required ledger field false/missing → FAIL
console.log('\n--- Required ledger field validation ---');
for (const field of REQUIRED_LEDGER_FIELDS) {
  const input = makeValidInput();
  input.final_state_ledger[field] = false;
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL, `${field}=false should FAIL`);
  assert.ok(r.errors.includes(`REQUIRED_FINAL_STATE_LEDGER_FIELD_NOT_TRUE: ${field}`));
  pass(`ledger field ${field}=false → FAIL`);
}

for (const field of REQUIRED_LEDGER_FIELDS) {
  const input = makeValidInput();
  delete input.final_state_ledger[field];
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL, `${field} missing should FAIL`);
  assert.ok(r.errors.includes(`REQUIRED_FINAL_STATE_LEDGER_FIELD_NOT_TRUE: ${field}`));
  pass(`ledger field ${field} missing → FAIL`);
}

// Missing completed sequence → FAIL
console.log('\n--- Completed sequence validation ---');
for (const seq of REQUIRED_SEQUENCES) {
  const input = makeValidInput();
  input.completed_sequences = REQUIRED_SEQUENCES.filter(s => s !== seq);
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes(`MISSING_COMPLETED_SEQUENCE: ${seq}`));
  pass(`missing sequence ${seq} → FAIL`);
}

// Invalid next path → FAIL
console.log('\n--- Next path validation ---');
{
  const input = makeValidInput();
  input.allowed_next_paths = ['RTE', 'RC', 'INVALID_PATH'];
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('INVALID_NEXT_PATH: INVALID_PATH'));
  pass('invalid next path → FAIL INVALID_NEXT_PATH');
}

// Missing RTE path → FAIL
{
  const input = makeValidInput();
  input.allowed_next_paths = ['RC'];
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_ALLOWED_NEXT_PATH: RTE'));
  pass('missing RTE next path → FAIL MISSING_ALLOWED_NEXT_PATH: RTE');
}

// Missing RC path → FAIL
{
  const input = makeValidInput();
  input.allowed_next_paths = ['RTE'];
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_ALLOWED_NEXT_PATH: RC'));
  pass('missing RC next path → FAIL MISSING_ALLOWED_NEXT_PATH: RC');
}

// Missing required control → FAIL
console.log('\n--- Required control validation ---');
{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'no-rta10');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: no-rta10'));
  pass('missing required control no-rta10 → FAIL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'no-v471');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: no-v471'));
  pass('missing required control no-v471 → FAIL');
}

{
  const input = makeValidInput();
  input.required_controls = REQUIRED_CONTROLS.filter(c => c !== 'next-human-decision-required');
  const r = build(input);
  assert.strictEqual(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('MISSING_REQUIRED_CONTROL: next-human-decision-required'));
  pass('missing required control next-human-decision-required → FAIL');
}

// Valid input → READY
console.log('\n--- Valid input ---');
const validResult = build(makeValidInput());
assert.strictEqual(validResult.status, STATUSES.READY, 'valid input → READY');
assert.strictEqual(validResult.ready, true);
pass('valid input → READY');

// module_version
assert.strictEqual(validResult.module_version, 'UNIFY-0');
pass('module_version === UNIFY-0');

// vision_core_final_state_ledger_ready true
assert.strictEqual(validResult.vision_core_final_state_ledger_ready, true);
pass('vision_core_final_state_ledger_ready true');

// unified_state
assert.strictEqual(validResult.unified_state, 'REVIEW_READY_NOT_EXECUTED');
pass('unified_state === REVIEW_READY_NOT_EXECUTED');

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

// rc0_created false
assert.strictEqual(validResult.rc0_created, false);
pass('rc0_created false');

// rte0_created false
assert.strictEqual(validResult.rte0_created, false);
pass('rte0_created false');

// no_unify1_required true
assert.strictEqual(validResult.no_unify1_required, true);
pass('no_unify1_required true');

// allowed_next_paths exactly ['RTE','RC']
assert.ok(Array.isArray(validResult.allowed_next_paths));
assert.strictEqual(validResult.allowed_next_paths.length, 2);
assert.ok(validResult.allowed_next_paths.includes('RTE'));
assert.ok(validResult.allowed_next_paths.includes('RC'));
pass('allowed_next_paths exactly [RTE, RC]');

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
const EXPECTED_FINAL_MESSAGE = 'UNIFY-0 final state ledger prepared. Vision Core is review-ready but PASS GOLD REAL is not claimed; next human decision must choose RTE local execution or RC controlled closure.';
assert.strictEqual(validResult.final_message, EXPECTED_FINAL_MESSAGE);
pass('final_message exact');

// billing/secret/network/rollback false
assert.strictEqual(validResult.billing_execution_allowed, false);
assert.strictEqual(validResult.secret_access_allowed, false);
assert.strictEqual(validResult.network_allowed, false);
assert.strictEqual(validResult.rollback_execution_allowed, false);
pass('billing/secret/network/rollback all false');

// next_human_decision_required true
assert.strictEqual(validResult.next_human_decision_required, true);
pass('next_human_decision_required true');

// validate READY → true
console.log('\n--- validate() ---');
assert.strictEqual(validate(validResult), true);
pass('validate READY result → true');

// validate blocked → false
{
  const blocked = build(null);
  assert.strictEqual(validate(blocked), false);
  pass('validate BLOCKED_INPUT → false');
}

// validate FAIL → false
{
  const r = build({ ...makeValidInput(), v466_v470_closure_complete: false });
  assert.strictEqual(validate(r), false);
  pass('validate FAIL → false');
}

// validate BLOCKED_RTP_REVIEW → false
{
  const r = build({ ...makeValidInput(), rtp_review_ready: false });
  assert.strictEqual(validate(r), false);
  pass('validate BLOCKED_RTP_REVIEW → false');
}

// validate null → false
assert.strictEqual(validate(null), false);
pass('validate null → false');

// render output
console.log('\n--- render() ---');
const rendered = render(validResult);
assert.ok(typeof rendered === 'string');

assert.ok(rendered.includes('UNIFY-0 Vision Core Final State Ledger'), 'render contains UNIFY-0');
pass('render contains UNIFY-0');

assert.ok(rendered.includes('V466–V470'), 'render contains V466–V470');
pass('render contains V466–V470');

assert.ok(rendered.includes('RTA-0–RTA-9'), 'render contains RTA-0–RTA-9');
pass('render contains RTA-0–RTA-9');

assert.ok(rendered.includes('RTP-0–RTP-2'), 'render contains RTP-0–RTP-2');
pass('render contains RTP-0–RTP-2');

assert.ok(rendered.includes('PASS GOLD REAL is not claimed'), 'render contains PASS GOLD REAL is not claimed');
pass('render contains PASS GOLD REAL is not claimed');

assert.ok(rendered.includes('Stable promotion remains blocked'), 'render contains stable promotion remains blocked');
pass('render contains stable promotion remains blocked');

assert.ok(rendered.includes('V471 blocked'), 'render contains V471 blocked');
pass('render contains V471 blocked');

assert.ok(rendered.includes('RTA-10 blocked'), 'render contains RTA-10 blocked');
pass('render contains RTA-10 blocked');

assert.ok(rendered.includes('No UNIFY-1 required'), 'render contains No UNIFY-1 required');
pass('render contains No UNIFY-1 required');

assert.ok(rendered.includes('RTE local execution'), 'render contains RTE local execution');
assert.ok(rendered.includes('RC controlled closure'), 'render contains RC controlled closure');
pass('render contains RTE local execution and RC controlled closure');

assert.ok(rendered.includes('REGRA ABSOLUTA'), 'render contains REGRA ABSOLUTA');
pass('render contains REGRA ABSOLUTA');

assert.ok(rendered.includes(EXPECTED_FINAL_MESSAGE), 'render contains final_message');
pass('render contains exact final_message');

console.log('\n=== All UNIFY-0 Tests Completed Successfully ===');
