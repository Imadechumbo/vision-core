import assert from 'assert';
import {
  STATUSES,
  build,
  validate,
  render
} from '../../software-factory/software-factory-runtime-discovery-evidence-binder.mjs';

console.log('Testing RTA-2 Runtime Discovery Evidence Binder...');

// Test STATUSES exported
console.log('✓ Testing STATUSES exported...');
assert.strictEqual(typeof STATUSES, 'object');
assert.strictEqual(STATUSES.READY, 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_DISCOVERY_PLAN, 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_BLOCKED_DISCOVERY_PLAN');
assert.strictEqual(STATUSES.FAIL, 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_FAIL');

// Test build exported
console.log('✓ Testing build exported...');
assert.strictEqual(typeof build, 'function');

// Test validate exported
console.log('✓ Testing validate exported...');
assert.strictEqual(typeof validate, 'function');

// Test render exported
console.log('✓ Testing render exported...');
assert.strictEqual(typeof render, 'function');

// Test null input → BLOCKED_INPUT
console.log('✓ Testing null input → BLOCKED_INPUT...');
const nullResult = build(null);
assert.strictEqual(nullResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(nullResult.ready, false);
assert.deepStrictEqual(nullResult.errors, ['INPUT_NOT_OBJECT']);

// Test supervised_runtime_discovery_plan_ready false → BLOCKED_DISCOVERY_PLAN
console.log('✓ Testing supervised_runtime_discovery_plan_ready false → BLOCKED_DISCOVERY_PLAN...');
const discoveryPlanResult = build({
  supervised_runtime_discovery_plan_ready: false,
  evidence_binder: {},
  evidence_receipts: [],
  required_controls: []
});
assert.strictEqual(discoveryPlanResult.status, STATUSES.BLOCKED_DISCOVERY_PLAN);
assert.strictEqual(discoveryPlanResult.ready, false);
assert.deepStrictEqual(discoveryPlanResult.errors, ['SUPERVISED_RUNTIME_DISCOVERY_PLAN_NOT_READY']);

// Test evidence_binder missing/not object → BLOCKED_INPUT
console.log('✓ Testing evidence_binder missing → BLOCKED_INPUT...');
const missingBinderResult = build({
  supervised_runtime_discovery_plan_ready: true,
  evidence_receipts: [],
  required_controls: []
});
assert.strictEqual(missingBinderResult.status, STATUSES.FAIL);
assert.strictEqual(missingBinderResult.ready, false);
assert.ok(missingBinderResult.errors.includes('INPUT_NOT_OBJECT'));

// Test evidence_receipts not array → BLOCKED_INPUT
console.log('✓ Testing evidence_receipts not array → BLOCKED_INPUT...');
const receiptsArrayResult = build({
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: true
  },
  evidence_receipts: 'not an array',
  required_controls: []
});
assert.strictEqual(receiptsArrayResult.status, STATUSES.FAIL);
assert.strictEqual(receiptsArrayResult.ready, false);
assert.deepStrictEqual(receiptsArrayResult.errors, ['INPUT_NOT_OBJECT']);

// Test required_controls not array → BLOCKED_INPUT
console.log('✓ Testing required_controls not array → BLOCKED_INPUT...');
const controlsArrayResult = build({
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: true
  },
  evidence_receipts: [],
  required_controls: 'not an array'
});
assert.strictEqual(controlsArrayResult.status, STATUSES.FAIL);
assert.strictEqual(controlsArrayResult.ready, false);
assert.deepStrictEqual(controlsArrayResult.errors, ['INPUT_NOT_OBJECT']);

// Test each required evidence binder field false/missing → FAIL
console.log('✓ Testing evidence binder field missing → FAIL...');
const fieldTestInput = {
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: false // This should fail
  },
  evidence_receipts: [],
  required_controls: []
};
const fieldResult = build(fieldTestInput);
assert.strictEqual(fieldResult.status, STATUSES.FAIL);
assert.strictEqual(fieldResult.ready, false);
assert.ok(fieldResult.errors.includes('REQUIRED_EVIDENCE_BINDER_FIELD_NOT_TRUE: v471_blocked_bound'));

// Test invalid evidence receipt → FAIL
console.log('✓ Testing invalid evidence receipt → FAIL...');
const invalidReceiptInput = {
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: true
  },
  evidence_receipts: [{}], // Invalid receipt
  required_controls: []
};
const invalidReceiptResult = build(invalidReceiptInput);
assert.strictEqual(invalidReceiptResult.status, STATUSES.FAIL);
assert.strictEqual(invalidReceiptResult.ready, false);
assert.ok(invalidReceiptResult.errors.includes('INVALID_EVIDENCE_RECEIPT'));

// Test missing required evidence receipt → FAIL
console.log('✓ Testing missing required evidence receipt → FAIL...');
const missingReceiptInput = {
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: true
  },
  evidence_receipts: [{
    id: 'some-receipt',
    type: 'test',
    bound: true,
    execution_performed: false
  }],
  required_controls: []
};
const missingReceiptResult = build(missingReceiptInput);
assert.strictEqual(missingReceiptResult.status, STATUSES.FAIL);
assert.strictEqual(missingReceiptResult.ready, false);
assert.ok(missingReceiptResult.errors.some(error => error.startsWith('MISSING_REQUIRED_EVIDENCE_RECEIPT:')));

// Test receipt execution_performed true → FAIL
console.log('✓ Testing receipt execution_performed true → FAIL...');
const executionPerformedInput = {
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: true
  },
  evidence_receipts: [{
    id: 'no-runtime-execution-receipt',
    type: 'evidence',
    bound: true,
    execution_performed: true // Should fail
  }],
  required_controls: []
};
const executionPerformedResult = build(executionPerformedInput);
assert.strictEqual(executionPerformedResult.status, STATUSES.FAIL);
assert.strictEqual(executionPerformedResult.ready, false);
assert.ok(executionPerformedResult.errors.includes('EVIDENCE_RECEIPT_MUST_NOT_EXECUTE: no-runtime-execution-receipt'));

// Test missing required control → FAIL
console.log('✓ Testing missing required control → FAIL...');
const missingControlInput = {
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: true
  },
  evidence_receipts: [
    {
      id: 'no-runtime-execution-receipt',
      type: 'evidence',
      bound: true,
      execution_performed: false
    }
  ],
  required_controls: 'not an array' // Invalid
};
const missingControlResult = build(missingControlInput);
assert.strictEqual(missingControlResult.status, STATUSES.FAIL);
assert.strictEqual(missingControlResult.ready, false);
assert.deepStrictEqual(missingControlResult.errors, ['INPUT_NOT_OBJECT']);

// Test valid input → READY
console.log('✓ Testing valid input → READY...');
const validEvidenceReceipts = [
  'package-scripts-inventory-receipt',
  'local-boot-command-candidates-receipt',
  'health-endpoint-candidates-receipt',
  'readiness-endpoint-candidates-receipt',
  'version-endpoint-candidates-receipt',
  'smoke-test-candidates-receipt',
  'rollback-readiness-candidates-receipt',
  'watchdog-signal-candidates-receipt',
  'evidence-capture-plan-receipt',
  'no-runtime-execution-receipt',
  'no-network-probe-receipt',
  'no-production-target-receipt',
  'no-secret-loading-receipt',
  'no-deploy-release-stable-receipt',
  'v471-blocked-receipt'
].map(id => ({
  id,
  type: 'evidence',
  bound: true,
  execution_performed: false
}));

const validRequiredControls = [
  'rta1-required',
  'runtime-discovery-evidence-only',
  'evidence-binding-only',
  'no-runtime-execution',
  'no-network-probe',
  'no-production-target',
  'no-secret-loading',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-real-rollback',
  'v471-blocked',
  'human-authorization-required-before-runtime'
];

const validInput = {
  supervised_runtime_discovery_plan_ready: true,
  evidence_binder: {
    package_scripts_inventory_bound: true,
    local_boot_command_candidates_bound: true,
    health_endpoint_candidates_bound: true,
    readiness_endpoint_candidates_bound: true,
    version_endpoint_candidates_bound: true,
    smoke_test_candidates_bound: true,
    rollback_readiness_candidates_bound: true,
    watchdog_signal_candidates_bound: true,
    evidence_capture_plan_bound: true,
    no_runtime_execution_bound: true,
    no_network_probe_bound: true,
    no_production_target_bound: true,
    no_secret_loading_bound: true,
    no_deploy_release_or_stable_bound: true,
    v471_blocked_bound: true
  },
  evidence_receipts: validEvidenceReceipts,
  required_controls: validRequiredControls
};

const validResult = build(validInput);
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
assert.strictEqual(validResult.module_version, 'RTA-2');
assert.strictEqual(validResult.runtime_discovery_evidence_binder_ready, true);
assert.strictEqual(validResult.evidence_binding_only, true);
assert.strictEqual(validResult.runtime_execution_authorized, false);
assert.strictEqual(validResult.runtime_discovery_execution_allowed, false);
assert.strictEqual(validResult.pass_gold_real_achieved, false);
assert.strictEqual(validResult.v471_allowed, false);
assert.strictEqual(validResult.evidence_hash.length, 64);
assert.strictEqual(validResult.final_message, 'RTA-2 runtime discovery evidence binder prepared. Evidence binding remains metadata-only; runtime execution requires explicit human authorization.');

// Test module_version === 'RTA-2'
console.log('✓ Testing module_version === RTA-2...');
assert.strictEqual(validResult.module_version, 'RTA-2');

// Test runtime_discovery_evidence_binder_ready true
console.log('✓ Testing runtime_discovery_evidence_binder_ready true...');
assert.strictEqual(validResult.runtime_discovery_evidence_binder_ready, true);

// Test evidence_binding_only true
console.log('✓ Testing evidence_binding_only true...');
assert.strictEqual(validResult.evidence_binding_only, true);

// Test runtime_execution_authorized false
console.log('✓ Testing runtime_execution_authorized false...');
assert.strictEqual(validResult.runtime_execution_authorized, false);

// Test runtime_discovery_execution_allowed false
console.log('✓ Testing runtime_discovery_execution_allowed false...');
assert.strictEqual(validResult.runtime_discovery_execution_allowed, false);

// Test pass_gold_real_achieved false
console.log('✓ Testing pass_gold_real_achieved false...');
assert.strictEqual(validResult.pass_gold_real_achieved, false);

// Test v471_allowed false
console.log('✓ Testing v471_allowed false...');
assert.strictEqual(validResult.v471_allowed, false);

// Test all dangerous flags false
console.log('✓ Testing all dangerous flags false...');
assert.strictEqual(validResult.release_allowed, false);
assert.strictEqual(validResult.deploy_allowed, false);
assert.strictEqual(validResult.tag_allowed, false);
assert.strictEqual(validResult.stable_promotion_allowed, false);
assert.strictEqual(validResult.production_touched, false);
assert.strictEqual(validResult.billing_execution_allowed, false);
assert.strictEqual(validResult.secret_access_allowed, false);
assert.strictEqual(validResult.network_allowed, false);
assert.strictEqual(validResult.rollback_execution_allowed, false);

// Test evidence_hash is 64 chars
console.log('✓ Testing evidence_hash is 64 chars...');
assert.strictEqual(validResult.evidence_hash.length, 64);

// Test evidence_hash deterministic
console.log('✓ Testing evidence_hash deterministic...');
const validResult2 = build(validInput);
assert.strictEqual(validResult.evidence_hash, validResult2.evidence_hash);

// Test final_message exact
console.log('✓ Testing final_message exact...');
assert.strictEqual(validResult.final_message, 'RTA-2 runtime discovery evidence binder prepared. Evidence binding remains metadata-only; runtime execution requires explicit human authorization.');

// Test validate READY → true
console.log('✓ Testing validate READY → true...');
assert.strictEqual(validate(validResult), true);

// Test validate blocked/invalid → false
console.log('✓ Testing validate blocked/invalid → false...');
assert.strictEqual(validate(nullResult), false);
assert.strictEqual(validate(discoveryPlanResult), false);
assert.strictEqual(validate(fieldResult), false);

// Test render contains RTA-2
console.log('✓ Testing render contains RTA-2...');
const rendered = render(validResult);
assert.ok(rendered.includes('RTA-2 Runtime Discovery Evidence Binder'));

// Test render contains RTA-1 supervised discovery
console.log('✓ Testing render contains RTA-1 supervised discovery...');
assert.ok(rendered.includes('RTA-1 supervised discovery'));

// Test render contains evidence binding remains metadata-only
console.log('✓ Testing render contains evidence binding remains metadata-only...');
assert.ok(rendered.includes('evidence binding remains metadata-only'));

// Test render contains runtime execution requires explicit human authorization
console.log('✓ Testing render contains runtime execution requires explicit human authorization...');
assert.ok(rendered.includes('runtime execution requires explicit human authorization'));

// Test render contains V471 blocked
console.log('✓ Testing render contains V471 blocked...');
assert.ok(rendered.includes('V471 blocked'));

// Test render contains final_message
console.log('✓ Testing render contains final_message...');
assert.ok(rendered.includes(validResult.final_message));

// Test render contains REGRA ABSOLUTA
console.log('✓ Testing render contains REGRA ABSOLUTA...');
assert.ok(rendered.includes('REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));

console.log('\n✅ All tests passed!');