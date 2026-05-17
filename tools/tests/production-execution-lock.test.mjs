#!/usr/bin/env node
/**
 * Production Execution Lock — Unit Tests V56.1
 */

import {
  createProductionExecutionLock,
  validateProductionExecutionLock,
  evaluateProductionExecutionLock,
  renderProductionExecutionLock,
  PRODUCTION_LOCK_STATUSES,
  LOCKED_CAPABILITIES,
} from '../production-execution-lock.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PRODUCTION_LOCK_STATUSES),                                         '[A-01] PRODUCTION_LOCK_STATUSES array');
assert(PRODUCTION_LOCK_STATUSES.length === 5,                                           '[A-02] 5 statuses');
assert(PRODUCTION_LOCK_STATUSES.includes('PRODUCTION_LOCK_MISSING'),                   '[A-03] MISSING');
assert(PRODUCTION_LOCK_STATUSES.includes('PRODUCTION_LOCK_INVALID'),                   '[A-04] INVALID');
assert(PRODUCTION_LOCK_STATUSES.includes('PRODUCTION_LOCK_EXPIRED'),                   '[A-05] EXPIRED');
assert(PRODUCTION_LOCK_STATUSES.includes('PRODUCTION_LOCK_BLOCKED_GATE'),              '[A-06] BLOCKED_GATE');
assert(PRODUCTION_LOCK_STATUSES.includes('PRODUCTION_LOCK_ACTIVE'),                    '[A-07] ACTIVE');

assert(Array.isArray(LOCKED_CAPABILITIES),                                               '[A-08] LOCKED_CAPABILITIES array');
assert(LOCKED_CAPABILITIES.length === 8,                                                 '[A-09] 8 locked capabilities');
assert(LOCKED_CAPABILITIES.includes('release_execute'),                                  '[A-10] release_execute');
assert(LOCKED_CAPABILITIES.includes('deploy_execute'),                                   '[A-11] deploy_execute');
assert(LOCKED_CAPABILITIES.includes('tag_create'),                                       '[A-12] tag_create');
assert(LOCKED_CAPABILITIES.includes('stable_promote'),                                   '[A-13] stable_promote');
assert(LOCKED_CAPABILITIES.includes('git_push'),                                         '[A-14] git_push');
assert(LOCKED_CAPABILITIES.includes('production_write'),                                 '[A-15] production_write');
assert(LOCKED_CAPABILITIES.includes('evidence_override'),                                '[A-16] evidence_override');
assert(LOCKED_CAPABILITIES.includes('go_core_override'),                                 '[A-17] go_core_override');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = createProductionExecutionLock({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                 '[B-01] returns object');
assert(fixture.lock_status               === 'PRODUCTION_LOCK_ACTIVE',                 '[B-02] lock_status=ACTIVE');
assert(fixture.lock_active               === true,                                      '[B-03] lock_active=true');
assert(fixture.schema_version            === 'v56.1',                                  '[B-04] schema_version=v56.1');
assert(typeof fixture.lock_id            === 'string' && fixture.lock_id.length > 0,   '[B-05] lock_id string');
assert(Array.isArray(fixture.locked_capabilities),                                      '[B-06] locked_capabilities array');
assert(fixture.locked_capabilities.length === 8,                                        '[B-07] 8 locked capabilities');
assert(fixture.unlock_required           === true,                                      '[B-08] unlock_required=true');
assert(fixture.unlock_contract_required  === true,                                      '[B-09] unlock_contract_required=true');
assert(fixture.unlock_contract_id        === null,                                      '[B-10] unlock_contract_id=null');
assert(fixture.production_execution_locked === true,                                    '[B-11] production_execution_locked=true');
assert(fixture.deploy_allowed            === false,                                     '[B-12] deploy_allowed=false');
assert(fixture.promotion_allowed         === false,                                     '[B-13] promotion_allowed=false');
assert(fixture.stable_allowed            === false,                                     '[B-14] stable_allowed=false');
assert(fixture.tag_allowed               === false,                                     '[B-15] tag_allowed=false');
assert(fixture.release_execution_allowed === false,                                     '[B-16] exec_allowed=false');
assert(fixture.release_performed         === false,                                     '[B-17] release_performed=false');
assert(fixture.tag_created               === false,                                     '[B-18] tag_created=false');
assert(fixture.stable_promoted           === false,                                     '[B-19] stable_promoted=false');
assert(fixture.deploy_performed          === false,                                     '[B-20] deploy_performed=false');
assert(fixture.blocking_reason           === null,                                      '[B-21] blocking_reason=null');

// ─── Suite C: Blocked — missing gate ─────────────────────────────
console.log('\n[Suite C] Blocked cases');
const noGate = createProductionExecutionLock({ _mock_timestamp: TS });
assert(noGate.lock_status                === 'PRODUCTION_LOCK_BLOCKED_GATE',           '[C-01] no gate → BLOCKED_GATE');
assert(noGate.lock_active                === false,                                     '[C-02] lock_active=false');
assert(noGate.production_execution_locked === true,                                     '[C-03] lock preserved');
assert(noGate.unlock_required            === true,                                      '[C-04] unlock_required preserved');

// ─── Suite D: Active lock ─────────────────────────────────────────
console.log('\n[Suite D] Active lock');
const lock = createProductionExecutionLock({ gate_id: 'gate-abc', _mock_timestamp: TS });
assert(lock.lock_status                  === 'PRODUCTION_LOCK_ACTIVE',                 '[D-01] lock_status=ACTIVE');
assert(lock.lock_active                  === true,                                      '[D-02] lock_active=true');
assert(lock.gate_id                      === 'gate-abc',                               '[D-03] gate_id preserved');
assert(lock.unlock_contract_id           === null,                                      '[D-04] unlock_contract_id=null');
assert(lock.production_execution_locked  === true,                                      '[D-05] locked=true');

// ─── Suite E: All capabilities locked ────────────────────────────
console.log('\n[Suite E] All capabilities locked');
for (const cap of LOCKED_CAPABILITIES) {
  assert(lock.locked_capabilities.includes(cap), `[E] capability ${cap} in lock`);
}

// ─── Suite F: validateProductionExecutionLock ─────────────────────
console.log('\n[Suite F] validateProductionExecutionLock');
const vNull = validateProductionExecutionLock(null);
assert(vNull.lock_status                 === 'PRODUCTION_LOCK_MISSING',                '[F-01] null → MISSING');

const vBadSchema = validateProductionExecutionLock({ schema_version: 'v1.0', lock_id: 'x', production_execution_locked: true, unlock_contract_required: true, locked_capabilities: ['a'], unlock_contract_id: null });
assert(vBadSchema.lock_status            === 'PRODUCTION_LOCK_INVALID',                '[F-02] bad schema → INVALID');

const vNoLock = validateProductionExecutionLock({ schema_version: 'v56.1', lock_id: 'x', production_execution_locked: false, unlock_contract_required: true, locked_capabilities: ['a'], unlock_contract_id: null });
assert(vNoLock.lock_status               === 'PRODUCTION_LOCK_INVALID',                '[F-03] lock=false → INVALID');

const vBadUnlock = validateProductionExecutionLock({ schema_version: 'v56.1', lock_id: 'x', production_execution_locked: true, unlock_contract_required: true, locked_capabilities: ['a'], unlock_contract_id: 'some-id' });
assert(vBadUnlock.lock_status            === 'PRODUCTION_LOCK_INVALID',                '[F-04] non-null unlock_contract_id → INVALID');

const vValid = validateProductionExecutionLock(lock);
assert(vValid.valid                      === true,                                      '[F-05] valid lock passes');
assert(vValid.production_execution_locked === true,                                     '[F-06] lock preserved in validation');

// ─── Suite G: evaluateProductionExecutionLock ─────────────────────
console.log('\n[Suite G] evaluateProductionExecutionLock');
const evalRelease = evaluateProductionExecutionLock(lock, 'release_execute');
assert(evalRelease.allowed               === false,                                     '[G-01] release_execute not allowed');
assert(evalRelease.blocked               === true,                                      '[G-02] release_execute blocked=true');
assert(evalRelease.production_execution_locked === true,                                '[G-03] lock preserved in eval');

const evalDeploy = evaluateProductionExecutionLock(lock, 'deploy_execute');
assert(evalDeploy.allowed                === false,                                     '[G-04] deploy_execute not allowed');
assert(evalDeploy.blocked                === true,                                      '[G-05] deploy_execute blocked=true');

const evalNoLock = evaluateProductionExecutionLock(null, 'release_execute');
assert(evalNoLock.allowed                === false,                                     '[G-06] no lock → not allowed');
assert(evalNoLock.production_execution_locked === true,                                 '[G-07] default locked without active lock');

// ─── Suite H: renderProductionExecutionLock ──────────────────────
console.log('\n[Suite H] renderProductionExecutionLock');
const rendered = renderProductionExecutionLock(lock);
assert(typeof rendered                   === 'string',                                  '[H-01] returns string');
assert(rendered.includes('PRODUCTION_LOCK_ACTIVE'),                                    '[H-02] contains status');
assert(rendered.includes('production_execution_locked  : true'),                       '[H-03] lock in output');
assert(rendered.includes('unlock_contract_required     : true'),                       '[H-04] unlock_contract_required in output');
assert(rendered.includes('release_execution_allowed    : false'),                      '[H-05] exec_allowed in output');

assert(renderProductionExecutionLock(null) === 'lock: null',                           '[H-06] null → "lock: null"');

// ─── Suite I: Deterministic lock_id ──────────────────────────────
console.log('\n[Suite I] Deterministic lock_id');
const a = createProductionExecutionLock({ gate_id: 'gate-abc', _mock_timestamp: TS });
const b = createProductionExecutionLock({ gate_id: 'gate-abc', _mock_timestamp: TS });
assert(a.lock_id === b.lock_id,                                                         '[I-01] same inputs → same lock_id');

const c = createProductionExecutionLock({ gate_id: 'gate-abc', _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.lock_id !== c.lock_id,                                                         '[I-02] diff timestamp → diff lock_id');

// ─── Suite J: Invariants ─────────────────────────────────────────
console.log('\n[Suite J] Invariants');
const cases = [fixture, noGate, lock];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[J] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[J] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[J] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[J] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[J] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[J] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[J] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[J] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[J] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[J] case ${i}: production_execution_locked=true`);
  assert(o.unlock_required             === true,  `[J] case ${i}: unlock_required=true`);
  assert(o.unlock_contract_required    === true,  `[J] case ${i}: unlock_contract_required=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nproduction-execution-lock: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
