import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render
} from '../../software-factory/software-factory-runtime-evidence-receipt-contract.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidReceiptSchemas() {
  const base = {
    execution_performed: false,
    receipt_schema_only: true,
    requires_human_authorization: true,
    required_fields: [
      'commit_hash',
      'version',
      'environment',
      'timestamp',
      'result',
      'evidence_hash',
      'human_authority'
    ]
  };

  return [
    { ...base, id: 'runtime-truth-probe-receipt-schema',          proof: 'Runtime truth probe result evidence schema' },
    { ...base, id: 'smoke-flow-validator-receipt-schema',          proof: 'Smoke flow validator result evidence schema' },
    { ...base, id: 'rollback-readiness-verifier-receipt-schema',   proof: 'Rollback readiness verifier result evidence schema' },
    { ...base, id: 'auto-rollback-drill-receipt-schema',           proof: 'Auto rollback drill result evidence schema' },
    { ...base, id: 'stable-promotion-controller-receipt-schema',   proof: 'Stable promotion controller receipt schema' },
    { ...base, id: 'pass-gold-receipt-schema',                     proof: 'PASS GOLD receipt schema' },
    { ...base, id: 'production-watchdog-receipt-schema',           proof: 'Production watchdog monitoring receipt schema' }
  ];
}

function makeValidEvidenceReceiptContract() {
  return {
    runtime_truth_receipt_schema_declared: true,
    smoke_flow_receipt_schema_declared: true,
    rollback_readiness_receipt_schema_declared: true,
    auto_rollback_drill_receipt_schema_declared: true,
    stable_promotion_receipt_schema_declared: true,
    pass_gold_receipt_schema_declared: true,
    production_watchdog_receipt_schema_declared: true,
    commit_hash_required: true,
    version_required: true,
    environment_required: true,
    timestamp_required: true,
    exit_code_required: true,
    stdout_summary_required: true,
    stderr_summary_required: true,
    evidence_hash_required: true,
    human_authority_required: true,
    no_runtime_execution: true,
    no_command_execution: true,
    no_endpoint_probe: true,
    no_production_target: true,
    no_secret_or_billing_access: true,
    v471_remains_blocked: true
  };
}

function makeValidControls() {
  return [
    'rta5-required',
    'runtime-evidence-receipt-contract-only',
    'evidence-schema-only',
    'no-runtime-execution',
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
    runtime_probe_permission_matrix_ready: true,
    evidence_receipt_contract: makeValidEvidenceReceiptContract(),
    receipt_schemas: makeValidReceiptSchemas(),
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

assert.strictEqual(STATUSES.READY, 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_READY');
assert.strictEqual(STATUSES.BLOCKED_INPUT, 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_BLOCKED_INPUT');
assert.strictEqual(STATUSES.BLOCKED_PERMISSION_MATRIX, 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_BLOCKED_PERMISSION_MATRIX');
assert.strictEqual(STATUSES.FAIL, 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_FAIL');

// ---------------------------------------------------------------------------
// 2. Invalid input cases
// ---------------------------------------------------------------------------

// null input -> BLOCKED_INPUT
{
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'null input -> BLOCKED_INPUT');
  assert.ok(r.errors.includes('INPUT_NOT_OBJECT'), 'null -> INPUT_NOT_OBJECT');
}

// array input -> BLOCKED_INPUT
{
  const r = build([]);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'array input -> BLOCKED_INPUT');
}

// runtime_probe_permission_matrix_ready false -> BLOCKED_PERMISSION_MATRIX
{
  const r = build({ ...makeValidInput(), runtime_probe_permission_matrix_ready: false });
  assert.strictEqual(r.status, STATUSES.BLOCKED_PERMISSION_MATRIX, 'matrix_ready false -> BLOCKED_PERMISSION_MATRIX');
  assert.ok(r.errors.includes('RUNTIME_PROBE_PERMISSION_MATRIX_NOT_READY'));
}

// runtime_probe_permission_matrix_ready missing -> BLOCKED_PERMISSION_MATRIX
{
  const inp = makeValidInput();
  delete inp.runtime_probe_permission_matrix_ready;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.BLOCKED_PERMISSION_MATRIX, 'matrix_ready missing -> BLOCKED_PERMISSION_MATRIX');
}

// evidence_receipt_contract missing -> BLOCKED_INPUT
{
  const inp = makeValidInput();
  delete inp.evidence_receipt_contract;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'contract missing -> BLOCKED_INPUT');
}

// evidence_receipt_contract not object -> BLOCKED_INPUT
{
  const r = build({ ...makeValidInput(), evidence_receipt_contract: 'bad' });
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'contract not object -> BLOCKED_INPUT');
}

// evidence_receipt_contract is array -> BLOCKED_INPUT
{
  const r = build({ ...makeValidInput(), evidence_receipt_contract: [] });
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'contract array -> BLOCKED_INPUT');
}

// receipt_schemas not array -> BLOCKED_INPUT
{
  const r = build({ ...makeValidInput(), receipt_schemas: 'bad' });
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'receipt_schemas not array -> BLOCKED_INPUT');
}

// required_controls not array -> BLOCKED_INPUT
{
  const r = build({ ...makeValidInput(), required_controls: 'bad' });
  assert.strictEqual(r.status, STATUSES.BLOCKED_INPUT, 'required_controls not array -> BLOCKED_INPUT');
}

// ---------------------------------------------------------------------------
// 3. Contract field failures
// ---------------------------------------------------------------------------

const CONTRACT_FIELDS = [
  'runtime_truth_receipt_schema_declared',
  'smoke_flow_receipt_schema_declared',
  'rollback_readiness_receipt_schema_declared',
  'auto_rollback_drill_receipt_schema_declared',
  'stable_promotion_receipt_schema_declared',
  'pass_gold_receipt_schema_declared',
  'production_watchdog_receipt_schema_declared',
  'commit_hash_required',
  'version_required',
  'environment_required',
  'timestamp_required',
  'exit_code_required',
  'stdout_summary_required',
  'stderr_summary_required',
  'evidence_hash_required',
  'human_authority_required',
  'no_runtime_execution',
  'no_command_execution',
  'no_endpoint_probe',
  'no_production_target',
  'no_secret_or_billing_access',
  'v471_remains_blocked'
];

for (const field of CONTRACT_FIELDS) {
  const inp = makeValidInput();
  inp.evidence_receipt_contract = { ...makeValidEvidenceReceiptContract(), [field]: false };
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, `contract.${field}=false -> FAIL`);
  assert.ok(r.errors.some(e => e.includes(field)), `error mentions ${field}`);
}

// missing field -> FAIL
{
  const inp = makeValidInput();
  const c = makeValidEvidenceReceiptContract();
  delete c.v471_remains_blocked;
  inp.evidence_receipt_contract = c;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'missing contract field -> FAIL');
}

// ---------------------------------------------------------------------------
// 4. Receipt schema validation failures
// ---------------------------------------------------------------------------

// invalid schema (missing id) -> FAIL
{
  const inp = makeValidInput();
  inp.receipt_schemas = [
    {
      proof: 'x',
      required_fields: ['commit_hash', 'version', 'environment', 'timestamp', 'result', 'evidence_hash', 'human_authority'],
      execution_performed: false,
      receipt_schema_only: true,
      requires_human_authorization: true
    }
  ];
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'missing id -> FAIL');
  assert.ok(r.errors.includes('INVALID_RUNTIME_EVIDENCE_RECEIPT_SCHEMA'), 'INVALID_RUNTIME_EVIDENCE_RECEIPT_SCHEMA');
}

// invalid schema (empty id) -> FAIL
{
  const inp = makeValidInput();
  const schemas = makeValidReceiptSchemas();
  schemas[0] = { ...schemas[0], id: '' };
  inp.receipt_schemas = schemas;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'empty id -> FAIL');
}

// invalid schema (empty proof) -> FAIL
{
  const inp = makeValidInput();
  const schemas = makeValidReceiptSchemas();
  schemas[0] = { ...schemas[0], proof: '' };
  inp.receipt_schemas = schemas;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'empty proof -> FAIL');
}

// invalid schema (empty required_fields array) -> FAIL
{
  const inp = makeValidInput();
  const schemas = makeValidReceiptSchemas();
  schemas[0] = { ...schemas[0], required_fields: [] };
  inp.receipt_schemas = schemas;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'empty required_fields -> FAIL');
}

// missing required schema id -> FAIL
{
  const inp = makeValidInput();
  inp.receipt_schemas = makeValidReceiptSchemas().filter(s => s.id !== 'runtime-truth-probe-receipt-schema');
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'missing required schema id -> FAIL');
  assert.ok(
    r.errors.some(e => e.includes('MISSING_REQUIRED_RUNTIME_EVIDENCE_RECEIPT_SCHEMA') && e.includes('runtime-truth-probe-receipt-schema')),
    'MISSING_REQUIRED_RUNTIME_EVIDENCE_RECEIPT_SCHEMA: runtime-truth-probe-receipt-schema'
  );
}

// schema execution_performed true -> FAIL
{
  const inp = makeValidInput();
  const schemas = makeValidReceiptSchemas();
  schemas[0] = { ...schemas[0], execution_performed: true };
  inp.receipt_schemas = schemas;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'execution_performed true -> FAIL');
  assert.ok(
    r.errors.some(e => e.includes('RECEIPT_SCHEMA_MUST_NOT_EXECUTE')),
    'RECEIPT_SCHEMA_MUST_NOT_EXECUTE error'
  );
}

// schema receipt_schema_only false -> FAIL
{
  const inp = makeValidInput();
  const schemas = makeValidReceiptSchemas();
  schemas[0] = { ...schemas[0], receipt_schema_only: false };
  inp.receipt_schemas = schemas;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'receipt_schema_only false -> FAIL');
  assert.ok(
    r.errors.some(e => e.includes('RECEIPT_SCHEMA_ONLY_REQUIRED')),
    'RECEIPT_SCHEMA_ONLY_REQUIRED error'
  );
}

// schema requires_human_authorization false -> FAIL
{
  const inp = makeValidInput();
  const schemas = makeValidReceiptSchemas();
  schemas[0] = { ...schemas[0], requires_human_authorization: false };
  inp.receipt_schemas = schemas;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'requires_human_authorization false -> FAIL');
  assert.ok(
    r.errors.some(e => e.includes('RECEIPT_SCHEMA_REQUIRES_HUMAN_AUTHORIZATION')),
    'RECEIPT_SCHEMA_REQUIRES_HUMAN_AUTHORIZATION error'
  );
}

// missing required receipt field -> FAIL
{
  const inp = makeValidInput();
  const schemas = makeValidReceiptSchemas();
  schemas[0] = {
    ...schemas[0],
    required_fields: ['commit_hash', 'version', 'environment', 'timestamp', 'result', 'evidence_hash']
    // missing: human_authority
  };
  inp.receipt_schemas = schemas;
  const r = build(inp);
  assert.strictEqual(r.status, STATUSES.FAIL, 'missing required_fields entry -> FAIL');
  assert.ok(
    r.errors.some(e => e.includes('MISSING_REQUIRED_RECEIPT_FIELD') && e.includes('human_authority')),
    'MISSING_REQUIRED_RECEIPT_FIELD: <id>:human_authority'
  );
}

// ---------------------------------------------------------------------------
// 5. Control list failures
// ---------------------------------------------------------------------------

const ALL_CONTROLS = [
  'rta5-required',
  'runtime-evidence-receipt-contract-only',
  'evidence-schema-only',
  'no-runtime-execution',
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
  assert.strictEqual(r.status, STATUSES.FAIL, `missing control ${control} -> FAIL`);
  assert.ok(
    r.errors.some(e => e.includes('MISSING_REQUIRED_CONTROL') && e.includes(control)),
    `MISSING_REQUIRED_CONTROL: ${control}`
  );
}

// ---------------------------------------------------------------------------
// 6. Valid READY result
// ---------------------------------------------------------------------------

const validResult = build(makeValidInput());

assert.strictEqual(validResult.status, STATUSES.READY, 'valid input -> READY');
assert.strictEqual(validResult.module_version, 'RTA-6', 'module_version === RTA-6');
assert.strictEqual(validResult.ready, true, 'ready true');
assert.strictEqual(validResult.runtime_evidence_receipt_contract_ready, true, 'runtime_evidence_receipt_contract_ready true');
assert.strictEqual(validResult.evidence_receipt_contract_only, true, 'evidence_receipt_contract_only true');
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
  'RTA-6 runtime evidence receipt contract prepared. Evidence receipts remain schema-only; runtime execution requires RTA-9 and explicit human authorization.',
  'final_message exact'
);

// ---------------------------------------------------------------------------
// 7. validate()
// ---------------------------------------------------------------------------

assert.strictEqual(validate(validResult), true, 'validate READY -> true');
assert.strictEqual(validate(null), false, 'validate null -> false');
assert.strictEqual(validate({}), false, 'validate empty -> false');

{
  const blocked = build({ ...makeValidInput(), runtime_probe_permission_matrix_ready: false });
  assert.strictEqual(validate(blocked), false, 'validate BLOCKED_PERMISSION_MATRIX -> false');
}

{
  const failResult = build({ ...makeValidInput(), evidence_receipt_contract: null });
  assert.strictEqual(validate(failResult), false, 'validate BLOCKED_INPUT -> false');
}

// dangerous flag mutations
{
  const m = { ...validResult, runtime_execution_authorized: true };
  assert.strictEqual(validate(m), false, 'validate runtime_execution_authorized true -> false');
}

{
  const m = { ...validResult, v471_allowed: true };
  assert.strictEqual(validate(m), false, 'validate v471_allowed true -> false');
}

{
  const m = { ...validResult, release_allowed: true };
  assert.strictEqual(validate(m), false, 'validate release_allowed true -> false');
}

{
  const m = { ...validResult, evidence_receipt_contract_only: false };
  assert.strictEqual(validate(m), false, 'validate evidence_receipt_contract_only false -> false');
}

{
  const m = { ...validResult, evidence_hash: 'short' };
  assert.strictEqual(validate(m), false, 'validate short evidence_hash -> false');
}

// ---------------------------------------------------------------------------
// 8. render()
// ---------------------------------------------------------------------------

const rendered = render(validResult);

assert.ok(typeof rendered === 'string', 'render returns string');
assert.ok(rendered.includes('RTA-6'), 'render contains RTA-6');
assert.ok(
  rendered.includes('RTA-5 runtime probe permission matrix'),
  'render contains RTA-5 runtime probe permission matrix'
);
assert.ok(
  rendered.toLowerCase().includes('evidence receipts remain schema-only') ||
  rendered.includes('evidence receipts remain schema-only'),
  'render contains evidence receipts remain schema-only'
);
assert.ok(
  rendered.includes('runtime execution requires RTA-9') ||
  rendered.includes('Runtime execution requires RTA-9'),
  'render contains runtime execution requires RTA-9'
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
assert.ok(rendered.includes('REGRA ABSOLUTA'), 'render contains REGRA ABSOLUTA');
assert.ok(
  rendered.includes('não promove') || rendered.includes('nao promove'),
  'render contains REGRA ABSOLUTA content'
);

// render with null
{
  const r = render(null);
  assert.ok(typeof r === 'string', 'render(null) returns string');
}

// render with blocked result
{
  const blocked = build({ ...makeValidInput(), runtime_probe_permission_matrix_ready: false });
  const r = render(blocked);
  assert.ok(typeof r === 'string', 'render(blocked) returns string');
}

// ---------------------------------------------------------------------------
// All tests passed
// ---------------------------------------------------------------------------

console.log('All RTA-6 runtime-evidence-receipt-contract tests passed.');
