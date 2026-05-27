import assert from 'assert';
import {
  STATUSES,
  build,
  validate,
  render
} from '../../software-factory/software-factory-runtime-discovery-dry-run-manifest.mjs';

console.log('Testing RTA-4 Runtime Discovery Dry-Run Manifest...');

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_DRY_RUN_MANIFEST = {
  package_scripts_manifest_declared: true,
  local_boot_manifest_declared: true,
  health_endpoint_manifest_declared: true,
  readiness_endpoint_manifest_declared: true,
  version_endpoint_manifest_declared: true,
  smoke_test_manifest_declared: true,
  rollback_readiness_manifest_declared: true,
  watchdog_signal_manifest_declared: true,
  execution_order_declared: true,
  evidence_capture_declared: true,
  abort_conditions_declared: true,
  human_authorization_required: true,
  no_command_execution: true,
  no_endpoint_probe: true,
  no_network_probe: true,
  no_production_target: true,
  no_secret_loading: true,
  no_deploy_release_or_stable: true,
  v471_remains_blocked: true
};

const REQUIRED_STEP_IDS = [
  'package-scripts-inventory-step',
  'local-boot-command-review-step',
  'health-endpoint-review-step',
  'readiness-endpoint-review-step',
  'version-endpoint-review-step',
  'smoke-test-review-step',
  'rollback-readiness-review-step',
  'watchdog-signal-review-step',
  'evidence-capture-review-step',
  'abort-conditions-review-step',
  'human-authorization-review-step',
  'v471-blocked-review-step'
];

const VALID_DRY_RUN_STEPS = REQUIRED_STEP_IDS.map(id => ({
  id,
  type: 'review',
  description: `Review step for ${id}`,
  execution_allowed: false,
  endpoint_probe_allowed: false,
  production_target: false,
  requires_human_authorization: true
}));

const VALID_REQUIRED_CONTROLS = [
  'rta3-required',
  'runtime-discovery-dry-run-manifest-only',
  'dry-run-metadata-only',
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

const VALID_INPUT = {
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
};

// ── STATUSES ─────────────────────────────────────────────────────────────────

console.log('✓ Testing STATUSES exported...');
assert.strictEqual(typeof STATUSES, 'object');
assert.strictEqual(STATUSES.READY, 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_CANDIDATE_REGISTRY, 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_BLOCKED_CANDIDATE_REGISTRY');
assert.strictEqual(STATUSES.FAIL, 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_FAIL');

// ── Exports ───────────────────────────────────────────────────────────────────

console.log('✓ Testing build exported...');
assert.strictEqual(typeof build, 'function');

console.log('✓ Testing validate exported...');
assert.strictEqual(typeof validate, 'function');

console.log('✓ Testing render exported...');
assert.strictEqual(typeof render, 'function');

// ── Input guard — not object ──────────────────────────────────────────────────

console.log('✓ Testing null input → BLOCKED_INPUT...');
const nullResult = build(null);
assert.strictEqual(nullResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(nullResult.ready, false);
assert.deepStrictEqual(nullResult.errors, ['INPUT_NOT_OBJECT']);

console.log('✓ Testing array input → BLOCKED_INPUT...');
const arrayResult = build([]);
assert.strictEqual(arrayResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(arrayResult.ready, false);
assert.deepStrictEqual(arrayResult.errors, ['INPUT_NOT_OBJECT']);

// ── Candidate registry guard ──────────────────────────────────────────────────

console.log('✓ Testing runtime_command_candidate_registry_ready false → BLOCKED_CANDIDATE_REGISTRY...');
const blockedRegistryResult = build({
  runtime_command_candidate_registry_ready: false,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(blockedRegistryResult.status, STATUSES.BLOCKED_CANDIDATE_REGISTRY);
assert.strictEqual(blockedRegistryResult.ready, false);
assert.deepStrictEqual(blockedRegistryResult.errors, ['RUNTIME_COMMAND_CANDIDATE_REGISTRY_NOT_READY']);

console.log('✓ Testing runtime_command_candidate_registry_ready missing → BLOCKED_CANDIDATE_REGISTRY...');
const missingRegistryResult = build({
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(missingRegistryResult.status, STATUSES.BLOCKED_CANDIDATE_REGISTRY);
assert.strictEqual(missingRegistryResult.ready, false);

// ── dry_run_manifest guard ────────────────────────────────────────────────────

console.log('✓ Testing dry_run_manifest missing → BLOCKED_INPUT...');
const missingManifestResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(missingManifestResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(missingManifestResult.ready, false);

console.log('✓ Testing dry_run_manifest not object → BLOCKED_INPUT...');
const manifestNotObjectResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: 'not-object',
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(manifestNotObjectResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(manifestNotObjectResult.ready, false);

console.log('✓ Testing dry_run_manifest is array → BLOCKED_INPUT...');
const manifestIsArrayResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: [],
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(manifestIsArrayResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(manifestIsArrayResult.ready, false);

// ── dry_run_steps guard ───────────────────────────────────────────────────────

console.log('✓ Testing dry_run_steps not array → BLOCKED_INPUT...');
const stepsNotArrayResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: 'not-array',
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(stepsNotArrayResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(stepsNotArrayResult.ready, false);

// ── required_controls guard ───────────────────────────────────────────────────

console.log('✓ Testing required_controls not array → BLOCKED_INPUT...');
const controlsNotArrayResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: 'not-array'
});
assert.strictEqual(controlsNotArrayResult.status, STATUSES.BLOCKED_INPUT);
assert.strictEqual(controlsNotArrayResult.ready, false);

// ── dry_run_manifest field validation ────────────────────────────────────────

console.log('✓ Testing dry_run_manifest field false → FAIL...');
const manifestFieldFalseResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: { ...VALID_DRY_RUN_MANIFEST, v471_remains_blocked: false },
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(manifestFieldFalseResult.status, STATUSES.FAIL);
assert.strictEqual(manifestFieldFalseResult.ready, false);
assert.ok(manifestFieldFalseResult.errors.includes('REQUIRED_DRY_RUN_MANIFEST_FIELD_NOT_TRUE: v471_remains_blocked'));

console.log('✓ Testing dry_run_manifest field missing → FAIL...');
const manifestFieldMissingResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: { ...VALID_DRY_RUN_MANIFEST, no_command_execution: undefined },
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(manifestFieldMissingResult.status, STATUSES.FAIL);
assert.ok(manifestFieldMissingResult.errors.includes('REQUIRED_DRY_RUN_MANIFEST_FIELD_NOT_TRUE: no_command_execution'));

// ── dry_run_steps validation ─────────────────────────────────────────────────

console.log('✓ Testing invalid dry_run_step (empty object) → FAIL...');
const invalidStepResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: [{}],
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(invalidStepResult.status, STATUSES.FAIL);
assert.strictEqual(invalidStepResult.ready, false);
assert.ok(invalidStepResult.errors.includes('INVALID_DRY_RUN_STEP'));

console.log('✓ Testing step missing description → FAIL...');
const stepNoDescResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: [{
    id: 'package-scripts-inventory-step',
    type: 'review',
    description: '',
    execution_allowed: false,
    endpoint_probe_allowed: false,
    production_target: false,
    requires_human_authorization: true
  }],
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(stepNoDescResult.status, STATUSES.FAIL);
assert.ok(stepNoDescResult.errors.includes('INVALID_DRY_RUN_STEP'));

console.log('✓ Testing missing required step id → FAIL...');
const missingStepResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: [{
    id: 'some-other-step',
    type: 'review',
    description: 'Some step',
    execution_allowed: false,
    endpoint_probe_allowed: false,
    production_target: false,
    requires_human_authorization: true
  }],
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(missingStepResult.status, STATUSES.FAIL);
assert.ok(missingStepResult.errors.some(e => e.startsWith('MISSING_REQUIRED_DRY_RUN_STEP:')));

console.log('✓ Testing step execution_allowed true → FAIL...');
const stepExecResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS.map((s, i) =>
    i === 0 ? { ...s, execution_allowed: true } : s
  ),
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(stepExecResult.status, STATUSES.FAIL);
assert.ok(stepExecResult.errors.some(e => e.startsWith('DRY_RUN_STEP_EXECUTION_MUST_REMAIN_BLOCKED:')));

console.log('✓ Testing step endpoint_probe_allowed true → FAIL...');
const stepProbeResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS.map((s, i) =>
    i === 0 ? { ...s, endpoint_probe_allowed: true } : s
  ),
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(stepProbeResult.status, STATUSES.FAIL);
assert.ok(stepProbeResult.errors.some(e => e.startsWith('DRY_RUN_STEP_ENDPOINT_PROBE_MUST_REMAIN_BLOCKED:')));

console.log('✓ Testing step production_target true → FAIL...');
const stepProdResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS.map((s, i) =>
    i === 0 ? { ...s, production_target: true } : s
  ),
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(stepProdResult.status, STATUSES.FAIL);
assert.ok(stepProdResult.errors.some(e => e.startsWith('DRY_RUN_STEP_MUST_NOT_TARGET_PRODUCTION:')));

console.log('✓ Testing step requires_human_authorization false → FAIL...');
const stepHumanResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS.map((s, i) =>
    i === 0 ? { ...s, requires_human_authorization: false } : s
  ),
  required_controls: VALID_REQUIRED_CONTROLS
});
assert.strictEqual(stepHumanResult.status, STATUSES.FAIL);
assert.ok(stepHumanResult.errors.some(e => e.startsWith('DRY_RUN_STEP_REQUIRES_HUMAN_AUTHORIZATION:')));

// ── required_controls validation ──────────────────────────────────────────────

console.log('✓ Testing missing required control → FAIL...');
const missingControlResult = build({
  runtime_command_candidate_registry_ready: true,
  dry_run_manifest: VALID_DRY_RUN_MANIFEST,
  dry_run_steps: VALID_DRY_RUN_STEPS,
  required_controls: VALID_REQUIRED_CONTROLS.filter(c => c !== 'v471-blocked')
});
assert.strictEqual(missingControlResult.status, STATUSES.FAIL);
assert.ok(missingControlResult.errors.includes('MISSING_REQUIRED_CONTROL: v471-blocked'));

// ── READY result ──────────────────────────────────────────────────────────────

console.log('✓ Testing valid input → READY...');
const validResult = build(VALID_INPUT);
assert.strictEqual(validResult.status, STATUSES.READY);
assert.strictEqual(validResult.ready, true);
assert.strictEqual(validResult.module_version, 'RTA-4');
assert.strictEqual(validResult.runtime_discovery_dry_run_manifest_ready, true);
assert.strictEqual(validResult.runtime_command_candidate_registry_ready, true);
assert.strictEqual(validResult.dry_run_metadata_only, true);
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
assert.strictEqual(validResult.evidence_hash.length, 64);
assert.strictEqual(
  validResult.final_message,
  'RTA-4 runtime discovery dry-run manifest prepared. Dry-run remains metadata-only; command and endpoint execution require explicit human authorization.'
);

console.log('✓ Testing module_version === RTA-4...');
assert.strictEqual(validResult.module_version, 'RTA-4');

console.log('✓ Testing dry_run_metadata_only true...');
assert.strictEqual(validResult.dry_run_metadata_only, true);

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

console.log('✓ Testing evidence_hash is 64 chars...');
assert.strictEqual(validResult.evidence_hash.length, 64);

console.log('✓ Testing evidence_hash deterministic...');
const validResult2 = build(VALID_INPUT);
assert.strictEqual(validResult.evidence_hash, validResult2.evidence_hash);

console.log('✓ Testing final_message exact...');
assert.strictEqual(
  validResult.final_message,
  'RTA-4 runtime discovery dry-run manifest prepared. Dry-run remains metadata-only; command and endpoint execution require explicit human authorization.'
);

// ── validate() ────────────────────────────────────────────────────────────────

console.log('✓ Testing validate READY → true...');
assert.strictEqual(validate(validResult), true);

console.log('✓ Testing validate blocked → false...');
assert.strictEqual(validate(nullResult), false);
assert.strictEqual(validate(blockedRegistryResult), false);
assert.strictEqual(validate(manifestFieldFalseResult), false);

console.log('✓ Testing validate null → false...');
assert.strictEqual(validate(null), false);

console.log('✓ Testing validate with dangerous flag true → false...');
assert.strictEqual(validate({ ...validResult, command_execution_allowed: true }), false);
assert.strictEqual(validate({ ...validResult, endpoint_probe_allowed: true }), false);
assert.strictEqual(validate({ ...validResult, runtime_execution_authorized: true }), false);
assert.strictEqual(validate({ ...validResult, v471_allowed: true }), false);
assert.strictEqual(validate({ ...validResult, release_allowed: true }), false);
assert.strictEqual(validate({ ...validResult, production_touched: true }), false);
assert.strictEqual(validate({ ...validResult, billing_execution_allowed: true }), false);
assert.strictEqual(validate({ ...validResult, secret_access_allowed: true }), false);
assert.strictEqual(validate({ ...validResult, network_allowed: true }), false);
assert.strictEqual(validate({ ...validResult, rollback_execution_allowed: true }), false);

console.log('✓ Testing validate evidence_hash wrong length → false...');
assert.strictEqual(validate({ ...validResult, evidence_hash: 'tooshort' }), false);

// ── render() ─────────────────────────────────────────────────────────────────

console.log('✓ Testing render contains RTA-4 Runtime Discovery Dry-Run Manifest...');
const rendered = render(validResult);
assert.ok(rendered.includes('RTA-4 Runtime Discovery Dry-Run Manifest'));

console.log('✓ Testing render contains RTA-3 command candidate registry...');
assert.ok(rendered.includes('RTA-3 command candidate registry'));

console.log('✓ Testing render contains dry-run remains metadata-only...');
assert.ok(rendered.includes('dry-run remains metadata-only'));

console.log('✓ Testing render contains command and endpoint execution require explicit human authorization...');
assert.ok(rendered.includes('command and endpoint execution require explicit human authorization'));

console.log('✓ Testing render contains V471 blocked...');
assert.ok(rendered.includes('V471 blocked'));

console.log('✓ Testing render contains final_message...');
assert.ok(rendered.includes(validResult.final_message));

console.log('✓ Testing render contains REGRA ABSOLUTA...');
assert.ok(rendered.includes('REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));

console.log('\n✅ All tests passed!');
