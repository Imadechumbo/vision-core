import assert from 'assert';
import {
  STATUSES,
  build,
  validate,
  render
} from '../../software-factory/software-factory-runtime-authorization-phase-gate.mjs';

console.log('Testing RTA-9 Runtime Authorization Phase Gate...');

// Test STATUSES exported
console.log('✓ Testing STATUSES exported...');
assert.strictEqual(typeof STATUSES, 'object');
assert.strictEqual(STATUSES.READY, 'RUNTIME_AUTHORIZATION_PHASE_GATE_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'RUNTIME_AUTHORIZATION_PHASE_GATE_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_HUMAN_AUTH, 'RUNTIME_AUTHORIZATION_PHASE_GATE_BLOCKED_HUMAN_AUTH');
assert.strictEqual(STATUSES.FAIL, 'RUNTIME_AUTHORIZATION_PHASE_GATE_FAIL');

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
  human_runtime_authorization_gate_ready: false,
  rta_chain_metadata: {},
  required_controls: []
});
assert.strictEqual(dependencyResult.status, STATUSES.BLOCKED_HUMAN_AUTH);
assert.strictEqual(dependencyResult.ready, false);
assert.deepStrictEqual(dependencyResult.errors, ['HUMAN_RUNTIME_AUTHORIZATION_GATE_NOT_READY']);

// Test missing RTA chain metadata fails
console.log('✓ Testing missing RTA chain metadata fails...');
const missingRTAResult = build({
  human_runtime_authorization_gate_ready: true,
  rta_chain_metadata: null,
  required_controls: []
});
assert.strictEqual(missingRTAResult.status, STATUSES.FAIL);
assert.strictEqual(missingRTAResult.ready, false);
assert.deepStrictEqual(missingRTAResult.errors, ['RTA_CHAIN_METADATA_REQUIRED']);

// Test rta10_allowed true fails
console.log('✓ Testing rta10_allowed true fails...');
const invalidInput = {
  human_runtime_authorization_gate_ready: true,
  rta_chain_metadata: {
    'RTA-0': true,
    'RTA-1': true,
    'RTA-2': true,
    'RTA-3': true,
    'RTA-4': true,
    'RTA-5': true,
    'RTA-6': true,
    'RTA-7': true,
    'RTA-8': true
  },
  required_controls: []
};
const buildResult = build(invalidInput);
// Simulate rta10_allowed being true by modifying the result
buildResult.rta10_allowed = true;
const validationResult = validate(buildResult);
assert.strictEqual(validationResult, false);

// Test V471 allowed true fails
console.log('✓ Testing V471 allowed true fails...');
const v471AllowedResult = build(invalidInput);
// Simulate v471_allowed being true by modifying the result
v471AllowedResult.v471_allowed = true;
const v471Validation = validate(v471AllowedResult);
assert.strictEqual(v471Validation, false);

// Test invalid next path fails
console.log('✓ Testing invalid next path fails...');
const invalidNextPathInput = {
  human_runtime_authorization_gate_ready: true,
  rta_chain_metadata: {
    'RTA-0': true,
    'RTA-1': true,
    'RTA-2': true,
    'RTA-3': true,
    'RTA-4': true,
    'RTA-5': true,
    'RTA-6': true,
    'RTA-7': true,
    'RTA-8': true
  },
  required_controls: []
};
const invalidPathResult = build(invalidNextPathInput);
// Simulate invalid next path by modifying the result
invalidPathResult.allowed_next_paths = ['INVALID_PATH'];
const invalidPathValidation = validate(invalidPathResult);
assert.strictEqual(invalidPathValidation, false);

// Test valid input ready
console.log('✓ Testing valid input ready...');
const validRequiredControls = [
  'rta8-required',
  'runtime-authorization-phase-gate-only',
  'rta-final-gate',
  'rta-gate-sequence-complete',
  'next-path-required',
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
  'v471-blocked'
];

const validInput = {
  human_runtime_authorization_gate_ready: true,
  rta_chain_metadata: {
    'RTA-0': true,
    'RTA-1': true,
    'RTA-2': true,
    'RTA-3': true,
    'RTA-4': true,
    'RTA-5': true,
    'RTA-6': true,
    'RTA-7': true,
    'RTA-8': true
  },
  required_controls: validRequiredControls
};

const validResult = build(validInput);
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
assert.strictEqual(validResult.module_version, 'RTA-9');

// Test rta_final_gate true
console.log('✓ Testing rta_final_gate true...');
assert.strictEqual(validResult.rta_final_gate, true);

// Test rta_gate_sequence_complete true
console.log('✓ Testing rta_gate_sequence_complete true...');
assert.strictEqual(validResult.rta_gate_sequence_complete, true);

// Test allowed_next_paths exactly RTP and RC
console.log('✓ Testing allowed_next_paths exactly RTP and RC...');
assert.deepStrictEqual(validResult.allowed_next_paths, ['RTP', 'RC']);
assert.strictEqual(validResult.allowed_next_paths.length, 2);
assert.ok(validResult.allowed_next_paths.includes('RTP'));
assert.ok(validResult.allowed_next_paths.includes('RC'));

// Test runtime execution still false
console.log('✓ Testing runtime execution still false...');
assert.strictEqual(validResult.runtime_execution_authorized, false);

// Test all dangerous flags false
console.log('✓ Testing all dangerous flags false...');
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
assert.strictEqual(validResult.final_message, 'RTA-9 runtime authorization phase gate prepared. RTA gate sequence is complete; next step must choose RTP execution path or RC controlled closure path.');

// Test validate READY true
console.log('✓ Testing validate READY true...');
assert.strictEqual(validate(validResult), true);

// Test validate blocked/invalid false
console.log('✓ Testing validate blocked/invalid false...');
assert.strictEqual(validate(dependencyResult), false);
assert.strictEqual(validate(missingRTAResult), false);

// Test render contains RTA-9
console.log('✓ Testing render contains RTA-9...');
const rendered = render(validResult);
assert.ok(rendered.includes('RTA-9 Runtime Authorization Phase Gate'));

// Test render contains FINAL RTA GATE
console.log('✓ Testing render contains FINAL RTA GATE...');
assert.ok(rendered.includes('FINAL RTA GATE'));

// Test render contains NO RTA-10
console.log('✓ Testing render contains NO RTA-10...');
assert.ok(rendered.includes('NO RTA-10 ALLOWED'));

// Test render contains RTP execution path or RC controlled closure path
console.log('✓ Testing render contains RTP execution path or RC controlled closure path...');
assert.ok(rendered.includes('RTP execution path or RC controlled closure path'));

// Test render contains V471 blocked
console.log('✓ Testing render contains V471 blocked...');
assert.ok(rendered.includes('V471 blocked'));

// Test render contains REGRA ABSOLUTA
console.log('✓ Testing render contains REGRA ABSOLUTA...');
assert.ok(rendered.includes('REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));

console.log('\n✅ All tests passed!');