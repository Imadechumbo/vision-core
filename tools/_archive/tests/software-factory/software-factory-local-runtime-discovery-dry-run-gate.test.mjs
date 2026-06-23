import assert from 'assert';
import {
  STATUSES,
  build,
  validate,
  render
} from '../../software-factory/software-factory-local-runtime-discovery-dry-run-gate.mjs';

console.log('Testing RTA-7 Local Runtime Discovery Dry-Run Gate...');

// Test STATUSES exported
console.log('✓ Testing STATUSES exported...');
assert.strictEqual(typeof STATUSES, 'object');
assert.strictEqual(STATUSES.READY, 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_EVIDENCE_CONTRACT, 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_BLOCKED_EVIDENCE_CONTRACT');
assert.strictEqual(STATUSES.FAIL, 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_FAIL');

// Test build exported
console.log('✓ Testing build exported...');
assert.strictEqual(typeof build, 'function');

// Test validate exported
console.log('✓ Testing validate exported...');
assert.strictEqual(typeof validate, 'function');

// Test render exported
console.log('✓ Testing render exported...');
assert.strictEqual(typeof render, 'function');

// Test dependency false blocks
console.log('✓ Testing dependency false blocks...');
const dependencyResult = build({
  runtime_evidence_receipt_contract_ready: false,
  required_controls: []
});
assert.strictEqual(dependencyResult.status, STATUSES.BLOCKED_EVIDENCE_CONTRACT);
assert.strictEqual(dependencyResult.ready, false);
assert.deepStrictEqual(dependencyResult.errors, ['RUNTIME_EVIDENCE_RECEIPT_CONTRACT_NOT_READY']);

// Test invalid dry-run gate input blocks/fails
console.log('✓ Testing invalid dry-run gate input blocks/fails...');
const invalidInputResult = build(null);
assert.strictEqual(invalidInputResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(invalidInputResult.ready, false);
assert.deepStrictEqual(invalidInputResult.errors, ['INPUT_NOT_OBJECT']);

// Test missing controls fail
console.log('✓ Testing missing controls fail...');
const missingControlsResult = build({
  runtime_evidence_receipt_contract_ready: true,
  required_controls: 'not an array'
});
assert.strictEqual(missingControlsResult.status, STATUSES.FAIL);
assert.strictEqual(missingControlsResult.ready, false);
assert.deepStrictEqual(missingControlsResult.errors, ['INPUT_NOT_OBJECT']);

// Test valid input ready
console.log('✓ Testing valid input ready...');
const validRequiredControls = [
  'rta6-required',
  'runtime-dry-run-gate-only',
  'local-dry-run-gate-only',
  'no-runtime-execution',
  'no-command-execution',
  'no-endpoint-probe',
  'no-network-probe',
  'no-production-target',
  'no-secret-loading',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-real-rollback',
  'v471-blocked',
  'rta9-required-before-execution'
];

const validInput = {
  runtime_evidence_receipt_contract_ready: true,
  required_controls: validRequiredControls
};

const validResult = build(validInput);
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
assert.strictEqual(validResult.module_version, 'RTA-7');

// Test all dangerous flags false
console.log('✓ Testing all dangerous flags false...');
assert.strictEqual(validResult.runtime_execution_authorized, false);
assert.strictEqual(validResult.runtime_discovery_execution_allowed, false);
assert.strictEqual(validResult.command_execution_allowed, false);
assert.strictEqual(validResult.endpoint_probe_allowed, false);
assert.strictEqual(validResult.pass_gold_real_achieved, false);
assert.strictEqual(validResult.v471_allowed, false);
assert.strictEqual(validResult.release_allowed, false);
assert.strictEqual(validResult.deploy_allowed, false);
assert.strictEqual(validResult.tag_allowed, false);
assert.strictEqual(validResult.stable_promotion_allowed, false);
assert.strictEqual(validResult.production_touched, false);
assert.strictEqual(validResult.billing_execution_allowed, false);
assert.strictEqual(validResult.secret_access_allowed, false);
assert.strictEqual(validResult.network_allowed, false);
assert.strictEqual(validResult.rollback_execution_allowed, false);

// Test evidence_hash deterministic
console.log('✓ Testing evidence_hash deterministic...');
const validResult2 = build(validInput);
assert.strictEqual(validResult.evidence_hash, validResult2.evidence_hash);
assert.strictEqual(validResult.evidence_hash.length, 64);

// Test final_message exact
console.log('✓ Testing final_message exact...');
assert.strictEqual(validResult.final_message, 'RTA-7 local runtime discovery dry-run gate prepared. Dry-run gate remains metadata-only; runtime execution requires RTA-9 and explicit human authorization.');

// Test validate READY true
console.log('✓ Testing validate READY true...');
assert.strictEqual(validate(validResult), true);

// Test validate blocked/invalid false
console.log('✓ Testing validate blocked/invalid false...');
assert.strictEqual(validate(dependencyResult), false);
assert.strictEqual(validate(invalidInputResult), false);

// Test render contains RTA-7
console.log('✓ Testing render contains RTA-7...');
const rendered = render(validResult);
assert.ok(rendered.includes('RTA-7 Local Runtime Discovery Dry-Run Gate'));

// Test render contains RTA-6 evidence contract
console.log('✓ Testing render contains RTA-6 evidence contract...');
assert.ok(rendered.includes('RTA-6 evidence contract'));

// Test render contains V471 blocked
console.log('✓ Testing render contains V471 blocked...');
assert.ok(rendered.includes('V471 blocked'));

// Test render contains REGRA ABSOLUTA
console.log('✓ Testing render contains REGRA ABSOLUTA...');
assert.ok(rendered.includes('REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));

console.log('\n✅ All tests passed!');