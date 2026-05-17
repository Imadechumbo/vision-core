#!/usr/bin/env node
/**
 * Production Unlock Contract — Unit Tests V61.0
 */

import {
  createProductionUnlockContract,
  validateProductionUnlockContract,
  normalizeProductionUnlockContract,
  renderProductionUnlockContractSummary,
  UNLOCK_CONTRACT_STATUSES,
  UNLOCK_REQUESTED_SCOPES,
} from '../production-unlock-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const VALID_PARAMS = {
  lock_id:             'lock-abc',
  gate_id:             'gate-abc',
  finalizer_id:        'fin-abc',
  locked_report_id:    'rpt-abc',
  requested_by:        'engineer-1',
  requester_role:      'release_engineer',
  requested_scope:     'review_full_manual_release_unlock',
  target_version:      '1.0.0',
  target_branch:       'main',
  git_head:            'abc123',
  evidence_receipt_id: 'receipt-abc',
  evidence_source:     'go-core',
  _mock_timestamp:     TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_CONTRACT_STATUSES),                                     '[A-01] statuses array');
assert(UNLOCK_CONTRACT_STATUSES.length === 8,                                       '[A-02] 8 statuses');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_MISSING'),               '[A-03] MISSING');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_INVALID'),               '[A-04] INVALID');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_EXPIRED'),               '[A-05] EXPIRED');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_BLOCKED_LOCK'),          '[A-06] BLOCKED_LOCK');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_BLOCKED_GATE'),          '[A-07] BLOCKED_GATE');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_BLOCKED_EVIDENCE'),      '[A-08] BLOCKED_EVIDENCE');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_BLOCKED_SCOPE'),         '[A-09] BLOCKED_SCOPE');
assert(UNLOCK_CONTRACT_STATUSES.includes('UNLOCK_CONTRACT_READY_REVIEW'),          '[A-10] READY_REVIEW');

assert(Array.isArray(UNLOCK_REQUESTED_SCOPES),                                      '[A-11] scopes array');
assert(UNLOCK_REQUESTED_SCOPES.length === 5,                                        '[A-12] 5 scopes');
assert(UNLOCK_REQUESTED_SCOPES.includes('review_release_execution_unlock'),         '[A-13] release scope');
assert(UNLOCK_REQUESTED_SCOPES.includes('review_full_manual_release_unlock'),       '[A-14] full scope');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = createProductionUnlockContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                             '[B-01] returns object');
assert(fixture.contract_status           === 'UNLOCK_CONTRACT_READY_REVIEW',       '[B-02] status=READY_REVIEW');
assert(fixture.contract_ready            === true,                                  '[B-03] contract_ready=true');
assert(fixture.schema_version            === 'v61.0',                             '[B-04] schema=v61.0');
assert(typeof fixture.unlock_contract_id === 'string' && fixture.unlock_contract_id.length === 24, '[B-05] id 24 chars');
assert(fixture.evidence_source           === 'go-core',                            '[B-06] source=go-core');
assert(fixture.production_execution_locked === true,                               '[B-07] locked=true');
assert(fixture.unlock_executed           === false,                                 '[B-08] unlock_executed=false');
assert(fixture.unlock_review_only        === true,                                  '[B-09] review_only=true');
assert(fixture.unlock_requested          === true,                                  '[B-10] unlock_requested=true');
assert(fixture.blocking_reason           === null,                                  '[B-11] blocking_reason=null');
assert(typeof fixture.expires_at         === 'string',                              '[B-12] expires_at set');

// ─── Suite C: Blocked cases ────────────────────────────────────────
console.log('\n[Suite C] Blocked cases');
const noLock = createProductionUnlockContract({ ...VALID_PARAMS, lock_id: undefined });
assert(noLock.contract_status            === 'UNLOCK_CONTRACT_BLOCKED_LOCK',       '[C-01] no lock → BLOCKED_LOCK');
assert(noLock.contract_ready             === false,                                 '[C-02] ready=false');

const noGate = createProductionUnlockContract({ ...VALID_PARAMS, gate_id: undefined });
assert(noGate.contract_status            === 'UNLOCK_CONTRACT_BLOCKED_GATE',       '[C-03] no gate → BLOCKED_GATE');

const noEvidence = createProductionUnlockContract({ ...VALID_PARAMS, evidence_receipt_id: undefined });
assert(noEvidence.contract_status        === 'UNLOCK_CONTRACT_BLOCKED_EVIDENCE',   '[C-04] no receipt → BLOCKED_EVIDENCE');

const badSource = createProductionUnlockContract({ ...VALID_PARAMS, evidence_source: 'backend' });
assert(badSource.contract_status         === 'UNLOCK_CONTRACT_BLOCKED_EVIDENCE',   '[C-05] backend source → BLOCKED_EVIDENCE');

const noScope = createProductionUnlockContract({ ...VALID_PARAMS, requested_scope: undefined });
assert(noScope.contract_status           === 'UNLOCK_CONTRACT_BLOCKED_SCOPE',      '[C-06] no scope → BLOCKED_SCOPE');

const badScope = createProductionUnlockContract({ ...VALID_PARAMS, requested_scope: 'do_release_now' });
assert(badScope.contract_status          === 'UNLOCK_CONTRACT_BLOCKED_SCOPE',      '[C-07] bad scope → BLOCKED_SCOPE');

// ─── Suite D: Valid contract ───────────────────────────────────────
console.log('\n[Suite D] Valid contract');
const full = createProductionUnlockContract(VALID_PARAMS);
assert(full.contract_status              === 'UNLOCK_CONTRACT_READY_REVIEW',       '[D-01] status=READY_REVIEW');
assert(full.contract_ready               === true,                                  '[D-02] contract_ready=true');
assert(full.lock_id                      === 'lock-abc',                           '[D-03] lock_id preserved');
assert(full.gate_id                      === 'gate-abc',                           '[D-04] gate_id preserved');
assert(full.requested_scope              === 'review_full_manual_release_unlock',   '[D-05] scope preserved');
assert(full.evidence_source              === 'go-core',                            '[D-06] source=go-core');
assert(typeof full.unlock_contract_id    === 'string',                              '[D-07] id string');
assert(full.production_execution_locked  === true,                                  '[D-08] locked=true');
assert(full.unlock_executed              === false,                                 '[D-09] unlock_executed=false');

// ─── Suite E: Deterministic ID ────────────────────────────────────
console.log('\n[Suite E] Deterministic ID');
const a = createProductionUnlockContract(VALID_PARAMS);
const b = createProductionUnlockContract(VALID_PARAMS);
assert(a.unlock_contract_id === b.unlock_contract_id,                               '[E-01] same inputs → same id');

const c = createProductionUnlockContract({ ...VALID_PARAMS, _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.unlock_contract_id !== c.unlock_contract_id,                               '[E-02] diff timestamp → diff id');

// ─── Suite F: validateProductionUnlockContract ─────────────────────
console.log('\n[Suite F] Validate');
const vNull = validateProductionUnlockContract(null);
assert(vNull.contract_status             === 'UNLOCK_CONTRACT_MISSING',            '[F-01] null → MISSING');

const vBad = validateProductionUnlockContract({ schema_version: 'v1.0' });
assert(vBad.contract_status              === 'UNLOCK_CONTRACT_INVALID',            '[F-02] bad schema → INVALID');

const vUnlocked = validateProductionUnlockContract({ ...full, unlock_executed: true });
assert(vUnlocked.contract_status         === 'UNLOCK_CONTRACT_INVALID',            '[F-03] unlock_executed=true → INVALID');

const vValid = validateProductionUnlockContract(full);
assert(vValid.valid                      === true,                                  '[F-04] valid passes');
assert(vValid.production_execution_locked === true,                                 '[F-05] lock preserved');

// ─── Suite G: normalizeProductionUnlockContract ────────────────────
console.log('\n[Suite G] Normalize');
const norm = normalizeProductionUnlockContract(full);
assert(norm.unlock_contract_id           === full.unlock_contract_id,              '[G-01] id preserved');
assert(norm.contract_ready               === true,                                  '[G-02] ready=true');
assert(norm.production_execution_locked  === true,                                  '[G-03] locked=true');

// ─── Suite H: renderProductionUnlockContractSummary ───────────────
console.log('\n[Suite H] Render');
const rendered = renderProductionUnlockContractSummary(full);
assert(typeof rendered                   === 'string',                              '[H-01] returns string');
assert(rendered.includes('UNLOCK_CONTRACT_READY_REVIEW'),                          '[H-02] status in output');
assert(rendered.includes('production_execution_locked  : true'),                   '[H-03] lock in output');
assert(rendered.includes('unlock_executed              : false'),                   '[H-04] unlock_executed in output');
assert(renderProductionUnlockContractSummary(null) === 'unlock_contract: null',    '[H-05] null → string');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
const cases = [fixture, noLock, noGate, noEvidence, badSource, badScope, full];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[I] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[I] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[I] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[I] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[I] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[I] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[I] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[I] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[I] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[I] case ${i}: production_execution_locked=true`);
  assert(o.unlock_executed             === false, `[I] case ${i}: unlock_executed=false`);
  assert(o.unlock_review_only          === true,  `[I] case ${i}: unlock_review_only=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nproduction-unlock-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
