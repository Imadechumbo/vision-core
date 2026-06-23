import assert from 'node:assert/strict';
import { STATUSES, build, validate, render } from '../../software-factory/software-factory-runtime-probe-permission-matrix.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidProbePermissions() {
  return [
    {
      id: 'runtime-truth-probe-permission',
      proof: 'Proof that product responds to health signal',
      scope: 'local',
      permission_level: 'blocked-until-rta9',
      execution_allowed: false,
      endpoint_probe_allowed: false,
      production_target: false,
      requires_human_authorization: true
    },
    {
      id: 'smoke-flow-validator-permission',
      proof: 'Proof that main product flow works',
      scope: 'local-or-staging',
      permission_level: 'blocked-until-rta9',
      execution_allowed: false,
      endpoint_probe_allowed: false,
      production_target: false,
      requires_human_authorization: true
    },
    {
      id: 'rollback-readiness-verifier-permission',
      proof: 'Proof that prior restorable version exists',
      scope: 'local-or-staging',
      permission_level: 'blocked-until-rta9',
      execution_allowed: false,
      endpoint_probe_allowed: false,
      production_target: false,
      requires_human_authorization: true
    },
    {
      id: 'auto-rollback-drill-permission',
      proof: 'Proof that rollback works in controlled environment',
      scope: 'local-or-staging',
      permission_level: 'human-authorization-required',
      execution_allowed: false,
      endpoint_probe_allowed: false,
      production_target: false,
      requires_human_authorization: true
    },
    {
      id: 'stable-promotion-controller-permission',
      proof: 'Gated by all prior proofs + human approval',
      scope: 'controlled',
      permission_level: 'human-authorization-required',
      execution_allowed: false,
      endpoint_probe_allowed: false,
      production_target: false,
      requires_human_authorization: true
    },
    {
      id: 'pass-gold-receipt-permission',
      proof: 'Receipt generated only after all proofs pass + E approved',
      scope: 'controlled',
      permission_level: 'human-authorization-required',
      execution_allowed: false,
      endpoint_probe_allowed: false,
      production_target: false,
      requires_human_authorization: true
    },
    {
      id: 'production-watchdog-permission',
      proof: 'Post-promotion monitoring with rollback trigger',
      scope: 'post-promotion-only',
      permission_level: 'human-authorization-required',
      execution_allowed: false,
      endpoint_probe_allowed: false,
      production_target: false,
      requires_human_authorization: true
    }
  ];
}

function makeValidPermissionMatrix() {
  return {
    runtime_truth_probe_permission_declared: true,
    smoke_flow_validator_permission_declared: true,
    rollback_readiness_permission_declared: true,
    auto_rollback_drill_permission_declared: true,
    stable_promotion_permission_declared: true,
    pass_gold_receipt_permission_declared: true,
    production_watchdog_permission_declared: true,
    local_only_scope_declared: true,
    production_scope_blocked: true,
    command_execution_blocked_until_rta9: true,
    endpoint_probe_blocked_until_rta9: true,
    human_authorization_required: true,
    no_deploy_release_or_stable: true,
    no_secret_or_billing_access: true,
    no_real_rollback_execution: true,
    v471_remains_blocked: true
  };
}

function makeValidControls() {
  return [
    'rta4-required',
    'runtime-probe-permission-matrix-only',
    'permission-declaration-only',
    'no-command-execution',
    'no-endpoint-probe',
    'no-network-probe',
    'no-production-target',
    'no-secret-loading',
    'no-billing-access',
    'no-deploy-execution',
    'no-release-execution',
    'no-tag-creation',
    'no-stable-promotion',
    'no-real-rollback',
    'v471-blocked',
    'rta9-required-before-execution',
    'human-authorization-required-before-runtime'
  ];
}

function makeValidInput() {
  return {
    runtime_discovery_dry_run_manifest_ready: true,
    permission_matrix: makeValidPermissionMatrix(),
    probe_permissions: makeValidProbePermissions(),
    required_controls: makeValidControls()
  };
}

// ---------------------------------------------------------------------------
// 1. Exports
// ---------------------------------------------------------------------------

assert.ok(STATUSES, 'STATUSES exported');
assert.ok(typeof build === 'function', 'build exported');
assert.ok(typeof validate === 'function', 'validate exported');
assert.ok(typeof render === 'function', 'render exported');

assert.strictEqual(STATUSES.READY, 'RUNTIME_PROBE_PERMISSION_MATRIX_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'RUNTIME_PROBE_PERMISSION_MATRIX_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_DRY_RUN_MANIFEST, 'RUNTIME_PROBE_PERMISSION_MATRIX_BLOCKED_DRY_RUN_MANIFEST');
assert.strictEqual(STATUSES.FAIL, 'RUNTIME_PROBE_PERMISSION_MATRIX_FAIL');

// ---------------------------------------------------------------------------
// 2. Invalid input cases
// ---------------------------------------------------------------------------

// null input → BLOCKED_INPUT
{
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'null input → BLOCKED_INPUT');
  assert.ok(r.errors.includes('INPUT_NOT_OBJECT'), 'null → INPUT_NOT_OBJECT');
}

// array input → BLOCKED_INPUT
{
  const r = build([]);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'array input → BLOCKED_INPUT');
}

// runtime_discovery_dry_run_manifest_ready false → BLOCKED_DRY_RUN_MANIFEST
{
  const r = build({ ...makeValidInput(), runtime_discovery_dry_run_manifest_ready: false });
  assert.strictEqual(r.status, STATUSES.BLOCKED_DRY_RUN_MANIFEST, 'manifest_ready false → BLOCKED_DRY_RUN_MANIFEST');
  assert.ok(r.errors.includes('RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_NOT_READY'));
}

// runtime_discovery_dry_run_manifest_ready missing → BLOCKED_DRY_RUN_MANIFEST
{
  const inp = makeValidInput();
  delete inp.runtime_discovery_dry_run_manifest_ready;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.BLOCKED_DRY_RUN_MANIFEST, 'manifest_ready missing → BLOCKED_DRY_RUN_MANIFEST');
}

// permission_matrix missing → BLOCKED_INPUT
{
  const inp = makeValidInput();
  delete inp.permission_matrix;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'permission_matrix missing → BLOCKED_INPUT');
}

// permission_matrix not object → BLOCKED_INPUT
{
  const r = build({ ...makeValidInput(), permission_matrix: 'bad' });
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'permission_matrix not object → BLOCKED_INPUT');
}

// probe_permissions not array → BLOCKED_INPUT
{
  const r = build({ ...makeValidInput(), probe_permissions: 'bad' });
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'probe_permissions not array → BLOCKED_INPUT');
}

// required_controls not array → BLOCKED_INPUT
{
  const r = build({ ...makeValidInput(), required_controls: 'bad' });
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'required_controls not array → BLOCKED_INPUT');
}

// ---------------------------------------------------------------------------
// 3. Permission matrix field failures
// ---------------------------------------------------------------------------

const MATRIX_FIELDS = [
  'runtime_truth_probe_permission_declared',
  'smoke_flow_validator_permission_declared',
  'rollback_readiness_permission_declared',
  'auto_rollback_drill_permission_declared',
  'stable_promotion_permission_declared',
  'pass_gold_receipt_permission_declared',
  'production_watchdog_permission_declared',
  'local_only_scope_declared',
  'production_scope_blocked',
  'command_execution_blocked_until_rta9',
  'endpoint_probe_blocked_until_rta9',
  'human_authorization_required',
  'no_deploy_release_or_stable',
  'no_secret_or_billing_access',
  'no_real_rollback_execution',
  'v471_remains_blocked'
];

for (const field of MATRIX_FIELDS) {
  const inp = makeValidInput();
  inp.permission_matrix = { ...makeValidPermissionMatrix(), [field]: false };
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, `permission_matrix.${field}=false → FAIL`);
  assert.ok(
    r.errors.some(e => e.includes(field)),
    `error mentions ${field}`
  );
}

// permission_matrix field missing → FAIL
{
  const inp = makeValidInput();
  const m = makeValidPermissionMatrix();
  delete m.v471_remains_blocked;
  inp.permission_matrix = m;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'missing matrix field → FAIL');
}

// ---------------------------------------------------------------------------
// 4. Probe permission validation failures
// ---------------------------------------------------------------------------

// invalid probe permission (missing id) → FAIL
{
  const inp = makeValidInput();
  inp.probe_permissions = [
    { proof: 'x', scope: 'local', permission_level: 'blocked-until-rta9', execution_allowed: false, endpoint_probe_allowed: false, production_target: false, requires_human_authorization: true }
  ];
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'missing id → FAIL');
  assert.ok(r.errors.includes('INVALID_RUNTIME_PROBE_PERMISSION'), 'INVALID_RUNTIME_PROBE_PERMISSION error');
}

// invalid probe permission (empty id) → FAIL
{
  const inp = makeValidInput();
  const perms = makeValidProbePermissions();
  perms[0] = { ...perms[0], id: '' };
  inp.probe_permissions = perms;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'empty id → FAIL');
}

// invalid probe permission (invalid permission_level) → FAIL
{
  const inp = makeValidInput();
  const perms = makeValidProbePermissions();
  perms[0] = { ...perms[0], permission_level: 'unrestricted' };
  inp.probe_permissions = perms;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'invalid permission_level → FAIL');
}

// missing required runtime probe permission → FAIL
{
  const inp = makeValidInput();
  inp.probe_permissions = makeValidProbePermissions().filter(p => p.id !== 'runtime-truth-probe-permission');
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'missing required probe permission → FAIL');
  assert.ok(
    r.errors.some(e => e.includes('MISSING_REQUIRED_RUNTIME_PROBE_PERMISSION') && e.includes('runtime-truth-probe-permission')),
    'MISSING_REQUIRED_RUNTIME_PROBE_PERMISSION: runtime-truth-probe-permission'
  );
}

// probe execution_allowed true → FAIL
{
  const inp = makeValidInput();
  const perms = makeValidProbePermissions();
  perms[0] = { ...perms[0], execution_allowed: true };
  inp.probe_permissions = perms;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'execution_allowed true → FAIL');
  assert.ok(
    r.errors.some(e => e.includes('PROBE_PERMISSION_EXECUTION_MUST_REMAIN_BLOCKED')),
    'PROBE_PERMISSION_EXECUTION_MUST_REMAIN_BLOCKED error'
  );
}

// probe endpoint_probe_allowed true → FAIL
{
  const inp = makeValidInput();
  const perms = makeValidProbePermissions();
  perms[0] = { ...perms[0], endpoint_probe_allowed: true };
  inp.probe_permissions = perms;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'endpoint_probe_allowed true → FAIL');
  assert.ok(
    r.errors.some(e => e.includes('PROBE_PERMISSION_ENDPOINT_PROBE_MUST_REMAIN_BLOCKED')),
    'PROBE_PERMISSION_ENDPOINT_PROBE_MUST_REMAIN_BLOCKED error'
  );
}

// probe production_target true → FAIL
{
  const inp = makeValidInput();
  const perms = makeValidProbePermissions();
  perms[0] = { ...perms[0], production_target: true };
  inp.probe_permissions = perms;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'production_target true → FAIL');
  assert.ok(
    r.errors.some(e => e.includes('PROBE_PERMISSION_MUST_NOT_TARGET_PRODUCTION')),
    'PROBE_PERMISSION_MUST_NOT_TARGET_PRODUCTION error'
  );
}

// probe requires_human_authorization false → FAIL
{
  const inp = makeValidInput();
  const perms = makeValidProbePermissions();
  perms[0] = { ...perms[0], requires_human_authorization: false };
  inp.probe_permissions = perms;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'requires_human_authorization false → FAIL');
  assert.ok(
    r.errors.some(e => e.includes('PROBE_PERMISSION_REQUIRES_HUMAN_AUTHORIZATION')),
    'PROBE_PERMISSION_REQUIRES_HUMAN_AUTHORIZATION error'
  );
}

// ---------------------------------------------------------------------------
// 5. Control list failures
// ---------------------------------------------------------------------------

const ALL_CONTROLS = [
  'rta4-required',
  'runtime-probe-permission-matrix-only',
  'permission-declaration-only',
  'no-command-execution',
  'no-endpoint-probe',
  'no-network-probe',
  'no-production-target',
  'no-secret-loading',
  'no-billing-access',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-real-rollback',
  'v471-blocked',
  'rta9-required-before-execution',
  'human-authorization-required-before-runtime'
];

for (const control of ALL_CONTROLS) {
  const inp = makeValidInput();
  inp.required_controls = makeValidControls().filter(c => c !== control);
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, `missing control ${control} → FAIL`);
  assert.ok(
    r.errors.some(e => e.includes('MISSING_REQUIRED_CONTROL') && e.includes(control)),
    `MISSING_REQUIRED_CONTROL: ${control}`
  );
}

// ---------------------------------------------------------------------------
// 6. Valid READY result
// ---------------------------------------------------------------------------

const validResult = build(makeValidInput());

assert.strictEqual(validResult.status, STATUSES.READY, 'valid input → READY');
assert.strictEqual(validResult.module_version, 'RTA-5', 'module_version === RTA-5');
assert.strictEqual(validResult.ready, true, 'ready true');
assert.strictEqual(validResult.runtime_probe_permission_matrix_ready, true, 'runtime_probe_permission_matrix_ready true');
assert.strictEqual(validResult.permission_matrix_only, true, 'permission_matrix_only true');
assert.strictEqual(validResult.runtime_execution_authorized, false, 'runtime_execution_authorized false');
assert.strictEqual(validResult.runtime_discovery_execution_allowed, false, 'runtime_discovery_execution_allowed false');
assert.strictEqual(validResult.command_execution_allowed, false, 'command_execution_allowed false');
assert.strictEqual(validResult.endpoint_probe_allowed, false, 'endpoint_probe_allowed false');
assert.strictEqual(validResult.pass_gold_real_achieved, false, 'pass_gold_real_achieved false');
assert.strictEqual(validResult.v471_allowed, false, 'v471_allowed false');
assert.strictEqual(validResult.rta9_required_before_execution, true, 'rta9_required_before_execution true');

// All dangerous flags false
assert.strictEqual(validResult.release_allowed, false, 'release_allowed false');
assert.strictEqual(validResult.deploy_allowed, false, 'deploy_allowed false');
assert.strictEqual(validResult.tag_allowed, false, 'tag_allowed false');
assert.strictEqual(validResult.stable_promotion_allowed, false, 'stable_promotion_allowed false');
assert.strictEqual(validResult.production_touched, false, 'production_touched false');
assert.strictEqual(validResult.billing_execution_allowed, false, 'billing_execution_allowed false');
assert.strictEqual(validResult.secret_access_allowed, false, 'secret_access_allowed false');
assert.strictEqual(validResult.network_allowed, false, 'network_allowed false');
assert.strictEqual(validResult.rollback_execution_allowed, false, 'rollback_execution_allowed false');

// evidence_hash
assert.ok(typeof validResult.evidence_hash === 'string', 'evidence_hash is string');
assert.strictEqual(validResult.evidence_hash.length, 64, 'evidence_hash length 64');

// evidence_hash deterministic
const validResult2 = build(makeValidInput());
assert.strictEqual(validResult.evidence_hash, validResult2.evidence_hash, 'evidence_hash deterministic');

// final_message exact
assert.strictEqual(
  validResult.final_message,
  'RTA-5 runtime probe permission matrix prepared. Probe execution remains blocked until RTA-9 and explicit human authorization.',
  'final_message exact'
);

// ---------------------------------------------------------------------------
// 7. validate()
// ---------------------------------------------------------------------------

assert.strictEqual(validate(validResult), true, 'validate READY → true');
assert.strictEqual(validate(null), false, 'validate null → false');
assert.strictEqual(validate({}), false, 'validate empty → false');

{
  const blocked = build({ ...makeValidInput(), runtime_discovery_dry_run_manifest_ready: false });
  assert.strictEqual(validate(blocked), false, 'validate BLOCKED_DRY_RUN_MANIFEST → false');
}

{
  const failResult = build({ ...makeValidInput(), permission_matrix: null });
  assert.strictEqual(validate(failResult), false, 'validate BLOCKED_INPUT → false');
}

// validate fails when dangerous flag true
{
  const mutated = { ...validResult, release_allowed: true };
  assert.strictEqual(validate(mutated), false, 'validate release_allowed true → false');
}

{
  const mutated = { ...validResult, runtime_execution_authorized: true };
  assert.strictEqual(validate(mutated), false, 'validate runtime_execution_authorized true → false');
}

{
  const mutated = { ...validResult, v471_allowed: true };
  assert.strictEqual(validate(mutated), false, 'validate v471_allowed true → false');
}

{
  const mutated = { ...validResult, evidence_hash: 'short' };
  assert.strictEqual(validate(mutated), false, 'validate short evidence_hash → false');
}

// ---------------------------------------------------------------------------
// 8. render()
// ---------------------------------------------------------------------------

const rendered = render(validResult);

assert.ok(typeof rendered === 'string', 'render returns string');
assert.ok(rendered.includes('RTA-5'), 'render contains RTA-5');
assert.ok(rendered.includes('RTA-4 dry-run manifest'), 'render contains RTA-4 dry-run manifest');
assert.ok(
  rendered.includes('probe execution remains blocked until RTA-9') ||
  rendered.includes('Probe execution remains blocked until RTA-9'),
  'render contains probe execution remains blocked until RTA-9'
);
assert.ok(
  rendered.includes('explicit human authorization'),
  'render contains explicit human authorization'
);
assert.ok(
  rendered.includes('V471 blocked') || rendered.includes('v471_allowed'),
  'render contains V471 blocked'
);
assert.ok(rendered.includes(validResult.final_message), 'render contains final_message');
assert.ok(
  rendered.includes('REGRA ABSOLUTA'),
  'render contains REGRA ABSOLUTA'
);
assert.ok(
  rendered.includes('SEM PASS GOLD REAL') || rendered.includes('não promove'),
  'render contains REGRA ABSOLUTA content'
);

// render with null
{
  const r = render(null);
  assert.ok(typeof r === 'string', 'render(null) returns string');
}

// render with blocked result
{
  const blocked = build({ ...makeValidInput(), runtime_discovery_dry_run_manifest_ready: false });
  const r = render(blocked);
  assert.ok(typeof r === 'string', 'render(blocked) returns string');
}

// ---------------------------------------------------------------------------
// All tests passed
// ---------------------------------------------------------------------------

console.log('All RTA-5 runtime-probe-permission-matrix tests passed.');
