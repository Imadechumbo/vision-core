#!/usr/bin/env node
/**
 * Sandbox Operation Policy — Unit Tests V51.1
 */

import {
  createSandboxOperationPolicy,
  evaluateSandboxOperation,
  validateSandboxOperationPolicy,
  renderSandboxOperationPolicy,
  POLICY_STATUSES,
  SANDBOX_ALLOWED_OPERATIONS,
  SANDBOX_BLOCKED_OPERATIONS,
} from '../sandbox-operation-policy.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';
const FIXTURE_POLICY = createSandboxOperationPolicy({ fixture_mode: true, _mock_timestamp: TS });

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(POLICY_STATUSES),                                     '[A-01] statuses array');
assert(POLICY_STATUSES.length === 4,                                       '[A-02] 4 statuses');
assert(POLICY_STATUSES.includes('POLICY_BLOCKED_SANDBOX'),                 '[A-03] BLOCKED_SANDBOX');
assert(POLICY_STATUSES.includes('POLICY_BLOCKED_OPERATION'),               '[A-04] BLOCKED_OPERATION');
assert(POLICY_STATUSES.includes('POLICY_BLOCKED_WRITE_ROOT'),              '[A-05] BLOCKED_WRITE_ROOT');
assert(POLICY_STATUSES.includes('POLICY_ALLOWED_SIMULATION'),              '[A-06] ALLOWED_SIMULATION');
assert(Array.isArray(SANDBOX_ALLOWED_OPERATIONS),                          '[A-07] allowed ops array');
assert(SANDBOX_ALLOWED_OPERATIONS.length === 8,                            '[A-08] 8 allowed ops');
assert(SANDBOX_ALLOWED_OPERATIONS.includes('simulate_tag_name'),           '[A-09] simulate_tag_name allowed');
assert(SANDBOX_ALLOWED_OPERATIONS.includes('write_sandbox_report'),        '[A-10] write_sandbox_report allowed');
assert(Array.isArray(SANDBOX_BLOCKED_OPERATIONS),                          '[A-11] blocked ops array');
assert(SANDBOX_BLOCKED_OPERATIONS.length === 9,                            '[A-12] 9 blocked ops');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('git_tag_create'),              '[A-13] git_tag_create blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('git_push'),                    '[A-14] git_push blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('deploy_execute'),              '[A-15] deploy_execute blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('stable_promote'),              '[A-16] stable_promote blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('production_write'),            '[A-17] production_write blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('secret_read'),                 '[A-18] secret_read blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('token_export'),                '[A-19] token_export blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('evidence_override'),           '[A-20] evidence_override blocked');
assert(SANDBOX_BLOCKED_OPERATIONS.includes('go_core_override'),            '[A-21] go_core_override blocked');

// ─── Suite B: Fixture policy ──────────────────────────────────────
console.log('\n[Suite B] Fixture policy');
assert(FIXTURE_POLICY.policy_status      === 'POLICY_ALLOWED_SIMULATION', '[B-01] status=ALLOWED');
assert(FIXTURE_POLICY.policy_ready       === true,                         '[B-02] ready=true');
assert(FIXTURE_POLICY.deploy_allowed     === false,                        '[B-03] deploy=false');
assert(FIXTURE_POLICY.promotion_allowed  === false,                        '[B-04] promotion=false');
assert(FIXTURE_POLICY.stable_allowed     === false,                        '[B-05] stable=false');
assert(FIXTURE_POLICY.tag_allowed        === false,                        '[B-06] tag=false');
assert(FIXTURE_POLICY.release_execution_allowed === false,                 '[B-07] exec=false');
assert(FIXTURE_POLICY.release_performed  === false,                        '[B-08] release_performed=false');
assert(FIXTURE_POLICY.tag_created        === false,                        '[B-09] tag_created=false');
assert(FIXTURE_POLICY.stable_promoted    === false,                        '[B-10] stable_promoted=false');
assert(FIXTURE_POLICY.deploy_performed   === false,                        '[B-11] deploy_performed=false');
assert(FIXTURE_POLICY.safe_simulation_only === true,                       '[B-12] safe_sim_only=true');
assert(FIXTURE_POLICY.sandbox_only       === true,                         '[B-13] sandbox_only=true');
assert(FIXTURE_POLICY.rehearsal_only     === true,                         '[B-14] rehearsal_only=true');
assert(FIXTURE_POLICY.schema_version     === 'v51.1',                      '[B-15] schema=v51.1');

// ─── Suite C: Missing sandbox blocked ────────────────────────────
console.log('\n[Suite C] Blocked — missing sandbox');
const noSandbox = createSandboxOperationPolicy({ _mock_timestamp: TS });
assert(noSandbox.policy_status           === 'POLICY_BLOCKED_SANDBOX',    '[C-01] no sandbox → BLOCKED');
assert(noSandbox.policy_ready            === false,                        '[C-02] ready=false');
assert(noSandbox.deploy_allowed          === false,                        '[C-03] deploy=false');

const notReady = createSandboxOperationPolicy({ sandbox: { sandbox_ready: false }, _mock_timestamp: TS });
assert(notReady.policy_status            === 'POLICY_BLOCKED_SANDBOX',    '[C-04] not-ready sandbox blocked');

// ─── Suite D: Policy from ready sandbox ──────────────────────────
console.log('\n[Suite D] Policy from ready sandbox');
const readySandbox = { sandbox_ready: true, sandbox_id: 'sid-001' };
const policy = createSandboxOperationPolicy({ sandbox: readySandbox });
assert(policy.policy_status              === 'POLICY_ALLOWED_SIMULATION', '[D-01] ready sandbox → ALLOWED');
assert(policy.sandbox_id                 === 'sid-001',                    '[D-02] sandbox_id propagated');
assert(Array.isArray(policy.allowed_operations),                           '[D-03] allowed_operations array');
assert(Array.isArray(policy.blocked_operations),                           '[D-04] blocked_operations array');

// ─── Suite E: Evaluate — allowed simulation ops ───────────────────
console.log('\n[Suite E] Evaluate allowed ops');
for (const op of SANDBOX_ALLOWED_OPERATIONS) {
  const r = evaluateSandboxOperation({ policy: FIXTURE_POLICY, operation: op });
  assert(r.operation_allowed === true,  `[E] ${op}: allowed`);
  assert(r.operation_blocked === false, `[E] ${op}: not blocked`);
  assert(r.deploy_allowed    === false, `[E] ${op}: deploy=false`);
}

// ─── Suite F: Evaluate — blocked destructive ops ─────────────────
console.log('\n[Suite F] Evaluate blocked ops');
for (const op of SANDBOX_BLOCKED_OPERATIONS) {
  const r = evaluateSandboxOperation({ policy: FIXTURE_POLICY, operation: op });
  assert(r.operation_allowed === false, `[F] ${op}: not allowed`);
  assert(r.operation_blocked === true,  `[F] ${op}: blocked`);
  assert(r.deploy_allowed    === false, `[F] ${op}: deploy=false`);
  assert(r.tag_created       === false, `[F] ${op}: tag_created=false`);
}

// ─── Suite G: Evaluate — invalid write root ───────────────────────
console.log('\n[Suite G] Evaluate — write root');
const badWriteRoot = evaluateSandboxOperation({
  policy: FIXTURE_POLICY,
  operation: 'write_sandbox_report',
  write_root: '/var/production/releases',
});
assert(badWriteRoot.operation_allowed    === false,                        '[G-01] bad write root blocked');
assert(badWriteRoot.operation_blocked    === true,                         '[G-02] blocked=true');
assert(badWriteRoot.deploy_allowed       === false,                        '[G-03] deploy=false');

const goodWriteRoot = evaluateSandboxOperation({
  policy: FIXTURE_POLICY,
  operation: 'write_sandbox_report',
  write_root: 'temp/sandbox/reports',
});
assert(goodWriteRoot.operation_allowed   === true,                         '[G-04] good write root allowed');

// ─── Suite H: No policy ───────────────────────────────────────────
console.log('\n[Suite H] No policy');
const noPol = evaluateSandboxOperation({ operation: 'simulate_tag_name' });
assert(noPol.operation_allowed           === false,                        '[H-01] no policy → blocked');
assert(noPol.deploy_allowed              === false,                        '[H-02] deploy=false');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
const valNull = validateSandboxOperationPolicy(null);
assert(valNull.policy_ready              === false,                        '[I-01] null → not ready');
const valGood = validateSandboxOperationPolicy(FIXTURE_POLICY);
assert(valGood.policy_ready              === true,                         '[I-02] valid → ready');
assert(valGood.deploy_allowed            === false,                        '[I-03] deploy=false');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const summary = renderSandboxOperationPolicy(FIXTURE_POLICY);
assert(typeof summary                    === 'string',                     '[J-01] string');
assert(summary.includes('POLICY_ALLOWED_SIMULATION'),                      '[J-02] has status');
assert(renderSandboxOperationPolicy(null) === 'policy: null',              '[J-03] null');

// ─── Suite K: Invariants across all ──────────────────────────────
console.log('\n[Suite K] Invariants');
const all = [FIXTURE_POLICY, noSandbox, notReady, policy, valNull, valGood];
for (const r of all) {
  assert(r.deploy_allowed            === false, `[K] ${r.policy_status}: deploy=false`);
  assert(r.release_performed         === false, `[K] ${r.policy_status}: release_performed=false`);
  assert(r.tag_created               === false, `[K] ${r.policy_status}: tag_created=false`);
  assert(r.deploy_performed          === false, `[K] ${r.policy_status}: deploy_performed=false`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nsandbox-operation-policy: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
