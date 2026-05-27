import assert from 'assert';
import {
  STATUSES,
  build,
  validate,
  render
} from '../../software-factory/software-factory-human-runtime-authorization-gate.mjs';

console.log('Testing RTA-8 Human Runtime Authorization Gate...');

// Test STATUSES exported
console.log('✓ Testing STATUSES exported...');
assert.strictEqual(typeof STATUSES, 'object');
assert.strictEqual(STATUSES.READY, 'HUMAN_RUNTIME_AUTHORIZATION_GATE_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'HUMAN_RUNTIME_AUTHORIZATION_GATE_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_DRY_RUN_GATE, 'HUMAN_RUNTIME_AUTHORIZATION_GATE_BLOCKED_DRY_RUN_GATE');
assert.strictEqual(STATUSES.FAIL, 'HUMAN_RUNTIME_AUTHORIZATION_GATE_FAIL');

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
  local_runtime_discovery_dry_run_gate_ready: false,
  human_authorization_metadata: {},
  required_controls: []
});
assert.strictEqual(dependencyResult.status, STATUSES.BLOCKED_DRY_RUN_GATE);
assert.strictEqual(dependencyResult.ready, false);
assert.deepStrictEqual(dependencyResult.errors, ['LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_NOT_READY']);

// Test missing authorization metadata blocks/fails
console.log('✓ Testing missing authorization metadata blocks/fails...');
const missingAuthResult = build({
  local_runtime_discovery_dry_run_gate_ready: true,
  human_authorization_metadata: null,
  required_controls: []
});
assert.strictEqual(missingAuthResult.status, STATUSES.FAIL);
assert.strictEqual(missingAuthResult.ready, false);
assert.deepStrictEqual(missingAuthResult.errors, ['HUMAN_AUTHORIZATION_METADATA_REQUIRED']);

// Test implicit authorization rejected
console.log('✓ Testing implicit authorization rejected...');
const implicitAuthResult = build({
  local_runtime_discovery_dry_run_gate_ready: true,
  human_authorization_metadata: {
    explicit: false,
    implicit: true,
    timeout_consent: false,
    timestamp: '2024-01-01T00:00:00Z',
    principal: 'user',
    scope: ['runtime']
  },
  required_controls: []
});
assert.strictEqual(implicitAuthResult.status, STATUSES.FAIL);
assert.strictEqual(implicitAuthResult.ready, false);
assert.ok(implicitAuthResult.errors.includes('EXPLICIT_AUTHORIZATION_REQUIRED'));

// Test timeout/assumed consent rejected
console.log('✓ Testing timeout/assumed consent rejected...');
const timeoutConsentResult = build({
  local_runtime_discovery_dry_run_gate_ready: true,
  human_authorization_metadata: {
    explicit: true,
    implicit: false,
    timeout_consent: true,
    timestamp: '2024-01-01T00:00:00Z',
    principal: 'user',
    scope: ['runtime']
  },
  required_controls: []
});
assert.strictEqual(timeoutConsentResult.status, STATUSES.FAIL);
assert.strictEqual(timeoutConsentResult.ready, false);
assert.ok(timeoutConsentResult.errors.includes('TIMEOUT_CONSENT_REJECTED'));

// Test valid explicit authorization metadata ready
console.log('✓ Testing valid explicit authorization metadata ready...');
const validRequiredControls = [
  'rta7-required',
  'human-runtime-authorization-gate-only',
  'human-authorization-required',
  'human-authorization-record-required',
  'human-authorization-metadata-only',
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
  local_runtime_discovery_dry_run_gate_ready: true,
  human_authorization_metadata: {
    explicit: true,
    implicit: false,
    timeout_consent: false,
    timestamp: '2024-01-01T00:00:00Z',
    principal: 'human-operator',
    scope: ['runtime-authorization', 'dry-run-verification']
  },
  required_controls: validRequiredControls
};

const validResult = build(validInput);
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
assert.strictEqual(validResult.module_version, 'RTA-8');

// Test runtime_execution_authorized remains false
console.log('✓ Testing runtime_execution_authorized remains false...');
assert.strictEqual(validResult.runtime_execution_authorized, false);

// Test rta9_required_before_execution true
console.log('✓ Testing rta9_required_before_execution true...');
assert.strictEqual(validResult.rta9_required_before_execution, true);

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
assert.strictEqual(validResult.final_message, 'RTA-8 human runtime authorization gate prepared. Runtime execution remains blocked until explicit human authorization is bound and RTA-9 validates the phase.');

// Test validate READY true
console.log('✓ Testing validate READY true...');
assert.strictEqual(validate(validResult), true);

// Test validate blocked/invalid false
console.log('✓ Testing validate blocked/invalid false...');
assert.strictEqual(validate(dependencyResult), false);
assert.strictEqual(validate(missingAuthResult), false);

// Test render contains RTA-8
console.log('✓ Testing render contains RTA-8...');
const rendered = render(validResult);
assert.ok(rendered.includes('RTA-8 Human Runtime Authorization Gate'));

// Test render contains human authorization
console.log('✓ Testing render contains human authorization...');
assert.ok(rendered.includes('human authorization required'));

// Test render contains V471 blocked
console.log('✓ Testing render contains V471 blocked...');
assert.ok(rendered.includes('V471 blocked'));

// Test render contains REGRA ABSOLUTA
console.log('✓ Testing render contains REGRA ABSOLUTA...');
assert.ok(rendered.includes('REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));

console.log('\n✅ All tests passed!');