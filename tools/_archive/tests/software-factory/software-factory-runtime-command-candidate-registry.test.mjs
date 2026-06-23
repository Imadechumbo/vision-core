import assert from 'assert';
import {
  STATUSES,
  build,
  validate,
  render
} from '../../software-factory/software-factory-runtime-command-candidate-registry.mjs';

console.log('Testing RTA-3 Runtime Command Candidate Registry...');

// Test STATUSES exported
console.log('✓ Testing STATUSES exported...');
assert.strictEqual(typeof STATUSES, 'object');
assert.strictEqual(STATUSES.READY, 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_EVIDENCE_BINDER, 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_BLOCKED_EVIDENCE_BINDER');
assert.strictEqual(STATUSES.FAIL, 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_FAIL');

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

// Test runtime_discovery_evidence_binder_ready false → BLOCKED_EVIDENCE_BINDER
console.log('✓ Testing runtime_discovery_evidence_binder_ready false → BLOCKED_EVIDENCE_BINDER...');
const evidenceBinderResult = build({
  runtime_discovery_evidence_binder_ready: false,
  command_candidate_registry: {},
  candidates: [],
  required_controls: []
});
assert.strictEqual(evidenceBinderResult.status, STATUSES.BLOCKED_EVIDENCE_BINDER);
assert.strictEqual(evidenceBinderResult.ready, false);
assert.deepStrictEqual(evidenceBinderResult.errors, ['RUNTIME_DISCOVERY_EVIDENCE_BINDER_NOT_READY']);

// Test command_candidate_registry missing/not object → BLOCKED_INPUT
console.log('✓ Testing command_candidate_registry missing → BLOCKED_INPUT...');
const missingRegistryResult = build({
  runtime_discovery_evidence_binder_ready: true,
  candidates: [],
  required_controls: []
});
assert.strictEqual(missingRegistryResult.status, STATUSES.FAIL);
assert.strictEqual(missingRegistryResult.ready, false);
assert.deepStrictEqual(missingRegistryResult.errors, ['INPUT_NOT_OBJECT']);

// Test candidates not array → BLOCKED_INPUT
console.log('✓ Testing candidates not array → BLOCKED_INPUT...');
const candidatesArrayResult = build({
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: 'not an array',
  required_controls: []
});
assert.strictEqual(candidatesArrayResult.status, STATUSES.FAIL);
assert.strictEqual(candidatesArrayResult.ready, false);
assert.deepStrictEqual(candidatesArrayResult.errors, ['INPUT_NOT_OBJECT']);

// Test required_controls not array → BLOCKED_INPUT
console.log('✓ Testing required_controls not array → BLOCKED_INPUT...');
const controlsArrayResult = build({
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: [],
  required_controls: 'not an array'
});
assert.strictEqual(controlsArrayResult.status, STATUSES.FAIL);
assert.strictEqual(controlsArrayResult.ready, false);
assert.deepStrictEqual(controlsArrayResult.errors, ['INPUT_NOT_OBJECT']);

// Test each required registry field false/missing → FAIL
console.log('✓ Testing registry field missing → FAIL...');
const fieldTestInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: false // This should fail
  },
  candidates: [],
  required_controls: []
};
const fieldResult = build(fieldTestInput);
assert.strictEqual(fieldResult.status, STATUSES.FAIL);
assert.strictEqual(fieldResult.ready, false);
assert.ok(fieldResult.errors.includes('REQUIRED_COMMAND_REGISTRY_FIELD_NOT_TRUE: v471_remains_blocked'));

// Test invalid runtime command candidate → FAIL
console.log('✓ Testing invalid runtime command candidate → FAIL...');
const invalidCandidateInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: [{}], // Invalid candidate
  required_controls: []
};
const invalidCandidateResult = build(invalidCandidateInput);
assert.strictEqual(invalidCandidateResult.status, STATUSES.FAIL);
assert.strictEqual(invalidCandidateResult.ready, false);
assert.ok(invalidCandidateResult.errors.includes('INVALID_RUNTIME_COMMAND_CANDIDATE'));

// Test missing required runtime command candidate → FAIL
console.log('✓ Testing missing required runtime command candidate → FAIL...');
const missingCandidateInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: [{
    id: 'some-candidate',
    type: 'test',
    source: 'test',
    command_or_endpoint: 'test',
    execution_allowed: false,
    production_target: false,
    requires_human_authorization: true
  }],
  required_controls: []
};
const missingCandidateResult = build(missingCandidateInput);
assert.strictEqual(missingCandidateResult.status, STATUSES.FAIL);
assert.strictEqual(missingCandidateResult.ready, false);
assert.ok(missingCandidateResult.errors.some(error => error.startsWith('MISSING_REQUIRED_RUNTIME_COMMAND_CANDIDATE:')));

// Test candidate execution_allowed true → FAIL
console.log('✓ Testing candidate execution_allowed true → FAIL...');
const executionAllowedInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: [{
    id: 'package-scripts-candidate',
    type: 'command',
    source: 'package.json',
    command_or_endpoint: 'npm start',
    execution_allowed: true, // Should fail
    production_target: false,
    requires_human_authorization: true
  }],
  required_controls: []
};
const executionAllowedResult = build(executionAllowedInput);
assert.strictEqual(executionAllowedResult.status, STATUSES.FAIL);
assert.strictEqual(executionAllowedResult.ready, false);
assert.ok(executionAllowedResult.errors.includes('CANDIDATE_EXECUTION_MUST_REMAIN_BLOCKED: package-scripts-candidate'));

// Test candidate production_target true → FAIL
console.log('✓ Testing candidate production_target true → FAIL...');
const productionTargetInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: [{
    id: 'package-scripts-candidate',
    type: 'command',
    source: 'package.json',
    command_or_endpoint: 'npm start',
    execution_allowed: false,
    production_target: true, // Should fail
    requires_human_authorization: true
  }],
  required_controls: []
};
const productionTargetResult = build(productionTargetInput);
assert.strictEqual(productionTargetResult.status, STATUSES.FAIL);
assert.strictEqual(productionTargetResult.ready, false);
assert.ok(productionTargetResult.errors.includes('CANDIDATE_MUST_NOT_TARGET_PRODUCTION: package-scripts-candidate'));

// Test candidate requires_human_authorization false → FAIL
console.log('✓ Testing candidate requires_human_authorization false → FAIL...');
const humanAuthInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: [{
    id: 'package-scripts-candidate',
    type: 'command',
    source: 'package.json',
    command_or_endpoint: 'npm start',
    execution_allowed: false,
    production_target: false,
    requires_human_authorization: false // Should fail
  }],
  required_controls: []
};
const humanAuthResult = build(humanAuthInput);
assert.strictEqual(humanAuthResult.status, STATUSES.FAIL);
assert.strictEqual(humanAuthResult.ready, false);
assert.ok(humanAuthResult.errors.includes('CANDIDATE_REQUIRES_HUMAN_AUTHORIZATION: package-scripts-candidate'));

// Test missing required control → FAIL
console.log('✓ Testing missing required control → FAIL...');
const missingControlInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: [],
  required_controls: 'not an array'
};
const missingControlResult = build(missingControlInput);
assert.strictEqual(missingControlResult.status, STATUSES.FAIL);
assert.strictEqual(missingControlResult.ready, false);
assert.deepStrictEqual(missingControlResult.errors, ['INPUT_NOT_OBJECT']);

// Test valid input → READY
console.log('✓ Testing valid input → READY...');
const validCandidates = [
  'package-scripts-candidate',
  'local-boot-command-candidate',
  'health-endpoint-candidate',
  'readiness-endpoint-candidate',
  'version-endpoint-candidate',
  'smoke-test-candidate',
  'rollback-readiness-candidate',
  'watchdog-signal-candidate'
].map(id => ({
  id,
  type: 'command',
  source: 'discovery',
  command_or_endpoint: 'candidate',
  execution_allowed: false,
  production_target: false,
  requires_human_authorization: true
}));

const validRequiredControls = [
  'rta2-required',
  'runtime-command-candidate-registry-only',
  'command-registration-only',
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
  'human-authorization-required-before-runtime'
];

const validInput = {
  runtime_discovery_evidence_binder_ready: true,
  command_candidate_registry: {
    package_scripts_candidates_registered: true,
    local_boot_command_candidates_registered: true,
    health_endpoint_candidates_registered: true,
    readiness_endpoint_candidates_registered: true,
    version_endpoint_candidates_registered: true,
    smoke_test_candidates_registered: true,
    rollback_readiness_candidates_registered: true,
    watchdog_signal_candidates_registered: true,
    candidate_execution_policy_registered: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_network_probe: true,
    no_production_target: true,
    no_secret_loading: true,
    no_deploy_release_or_stable: true,
    v471_remains_blocked: true
  },
  candidates: validCandidates,
  required_controls: validRequiredControls
};

const validResult = build(validInput);
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
assert.strictEqual(validResult.module_version, 'RTA-3');
assert.strictEqual(validResult.runtime_command_candidate_registry_ready, true);
assert.strictEqual(validResult.command_registration_only, true);
assert.strictEqual(validResult.runtime_execution_authorized, false);
assert.strictEqual(validResult.runtime_discovery_execution_allowed, false);
assert.strictEqual(validResult.command_execution_allowed, false);
assert.strictEqual(validResult.endpoint_probe_allowed, false);
assert.strictEqual(validResult.pass_gold_real_achieved, false);
assert.strictEqual(validResult.v471_allowed, false);
assert.strictEqual(validResult.evidence_hash.length, 64);
assert.strictEqual(validResult.final_message, 'RTA-3 runtime command candidate registry prepared. Command and endpoint execution remain blocked until explicit human authorization.');

// Test module_version === 'RTA-3'
console.log('✓ Testing module_version === RTA-3...');
assert.strictEqual(validResult.module_version, 'RTA-3');

// Test runtime_command_candidate_registry_ready true
console.log('✓ Testing runtime_command_candidate_registry_ready true...');
assert.strictEqual(validResult.runtime_command_candidate_registry_ready, true);

// Test command_registration_only true
console.log('✓ Testing command_registration_only true...');
assert.strictEqual(validResult.command_registration_only, true);

// Test runtime_execution_authorized false
console.log('✓ Testing runtime_execution_authorized false...');
assert.strictEqual(validResult.runtime_execution_authorized, false);

// Test runtime_discovery_execution_allowed false
console.log('✓ Testing runtime_discovery_execution_allowed false...');
assert.strictEqual(validResult.runtime_discovery_execution_allowed, false);

// Test command_execution_allowed false
console.log('✓ Testing command_execution_allowed false...');
assert.strictEqual(validResult.command_execution_allowed, false);

// Test endpoint_probe_allowed false
console.log('✓ Testing endpoint_probe_allowed false...');
assert.strictEqual(validResult.endpoint_probe_allowed, false);

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
assert.strictEqual(validResult.final_message, 'RTA-3 runtime command candidate registry prepared. Command and endpoint execution remain blocked until explicit human authorization.');

// Test validate READY → true
console.log('✓ Testing validate READY → true...');
assert.strictEqual(validate(validResult), true);

// Test validate blocked/invalid → false
console.log('✓ Testing validate blocked/invalid → false...');
assert.strictEqual(validate(nullResult), false);
assert.strictEqual(validate(evidenceBinderResult), false);
assert.strictEqual(validate(fieldResult), false);

// Test render contains RTA-3
console.log('✓ Testing render contains RTA-3...');
const rendered = render(validResult);
assert.ok(rendered.includes('RTA-3 Runtime Command Candidate Registry'));

// Test render contains RTA-2 evidence binder
console.log('✓ Testing render contains RTA-2 evidence binder...');
assert.ok(rendered.includes('RTA-2 evidence binder'));

// Test render contains command and endpoint execution remain blocked
console.log('✓ Testing render contains command and endpoint execution remain blocked...');
assert.ok(rendered.includes('command and endpoint execution remain blocked'));

// Test render contains explicit human authorization
console.log('✓ Testing render contains explicit human authorization...');
assert.ok(rendered.includes('explicit human authorization'));

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