#!/usr/bin/env node
/**
 * Unlock Human Authority Contract — Unit Tests V61.1
 */

import {
  createUnlockHumanAuthorityContract,
  validateUnlockHumanAuthorityContract,
  bindUnlockAuthorityToContract,
  renderUnlockHumanAuthoritySummary,
  UNLOCK_AUTHORITY_STATUSES,
  REQUIRED_CONFIRMATION_PHRASE,
  AUTHORITY_DENIED_CAPABILITIES,
} from '../unlock-human-authority-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const VALID_PARAMS = {
  unlock_contract_id:           'contract-abc',
  confirmed_by:                 'engineer-1',
  confirmer_role:               'release_authority',
  authority_decision:           'approved',
  authority_scope:              'review_full_manual_release_unlock',
  confirmation_phrase:          REQUIRED_CONFIRMATION_PHRASE,
  evidence_acknowledged:        true,
  lock_acknowledged:            true,
  production_risk_acknowledged: true,
  rollback_acknowledged:        true,
  _mock_timestamp:              TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_AUTHORITY_STATUSES),                                    '[A-01] statuses array');
assert(UNLOCK_AUTHORITY_STATUSES.length === 7,                                      '[A-02] 7 statuses');
assert(UNLOCK_AUTHORITY_STATUSES.includes('UNLOCK_AUTHORITY_MISSING'),             '[A-03] MISSING');
assert(UNLOCK_AUTHORITY_STATUSES.includes('UNLOCK_AUTHORITY_INVALID'),             '[A-04] INVALID');
assert(UNLOCK_AUTHORITY_STATUSES.includes('UNLOCK_AUTHORITY_REJECTED'),            '[A-05] REJECTED');
assert(UNLOCK_AUTHORITY_STATUSES.includes('UNLOCK_AUTHORITY_PHRASE_MISMATCH'),     '[A-06] PHRASE_MISMATCH');
assert(UNLOCK_AUTHORITY_STATUSES.includes('UNLOCK_AUTHORITY_READY_REVIEW'),        '[A-07] READY_REVIEW');

assert(typeof REQUIRED_CONFIRMATION_PHRASE === 'string',                            '[A-08] phrase is string');
assert(REQUIRED_CONFIRMATION_PHRASE.includes('UNLOCK REVIEW ONLY'),                '[A-09] phrase contains UNLOCK REVIEW ONLY');
assert(REQUIRED_CONFIRMATION_PHRASE.includes('DOES NOT EXECUTE'),                  '[A-10] phrase contains DOES NOT EXECUTE');

assert(Array.isArray(AUTHORITY_DENIED_CAPABILITIES),                                '[A-11] denied_capabilities array');
assert(AUTHORITY_DENIED_CAPABILITIES.length === 8,                                  '[A-12] 8 denied capabilities');
assert(AUTHORITY_DENIED_CAPABILITIES.includes('release_execution'),                '[A-13] release_execution denied');
assert(AUTHORITY_DENIED_CAPABILITIES.includes('go_core_override'),                 '[A-14] go_core_override denied');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = createUnlockHumanAuthorityContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                             '[B-01] returns object');
assert(fixture.authority_status          === 'UNLOCK_AUTHORITY_READY_REVIEW',      '[B-02] status=READY_REVIEW');
assert(fixture.authority_ready           === true,                                  '[B-03] authority_ready=true');
assert(fixture.schema_version            === 'v61.1',                             '[B-04] schema=v61.1');
assert(typeof fixture.unlock_authority_id === 'string' && fixture.unlock_authority_id.length === 24, '[B-05] id 24 chars');
assert(fixture.authority_decision        === 'approved',                            '[B-06] decision=approved');
assert(fixture.confirmation_phrase       === REQUIRED_CONFIRMATION_PHRASE,          '[B-07] phrase exact match');
assert(fixture.evidence_acknowledged     === true,                                  '[B-08] evidence_acknowledged=true');
assert(fixture.lock_acknowledged         === true,                                  '[B-09] lock_acknowledged=true');
assert(fixture.production_risk_acknowledged === true,                               '[B-10] risk_acknowledged=true');
assert(fixture.rollback_acknowledged     === true,                                  '[B-11] rollback_acknowledged=true');
assert(Array.isArray(fixture.denied_capabilities) && fixture.denied_capabilities.length === 8, '[B-12] 8 denied');
assert(fixture.production_execution_locked === true,                                '[B-13] locked=true');
assert(fixture.unlock_executed           === false,                                 '[B-14] unlock_executed=false');
assert(fixture.unlock_review_only        === true,                                  '[B-15] review_only=true');
assert(fixture.blocking_reason           === null,                                  '[B-16] blocking_reason=null');

// ─── Suite C: Blocked cases ────────────────────────────────────────
console.log('\n[Suite C] Blocked cases');
const rejected = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, authority_decision: 'denied' });
assert(rejected.authority_status         === 'UNLOCK_AUTHORITY_REJECTED',          '[C-01] denied → REJECTED');
assert(rejected.authority_ready          === false,                                 '[C-02] ready=false');

const noDecision = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, authority_decision: undefined });
assert(noDecision.authority_status       === 'UNLOCK_AUTHORITY_REJECTED',          '[C-03] no decision → REJECTED');

const badPhrase = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, confirmation_phrase: 'I approve this release' });
assert(badPhrase.authority_status        === 'UNLOCK_AUTHORITY_PHRASE_MISMATCH',   '[C-04] bad phrase → PHRASE_MISMATCH');

const noPhrase = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, confirmation_phrase: undefined });
assert(noPhrase.authority_status         === 'UNLOCK_AUTHORITY_PHRASE_MISMATCH',   '[C-05] no phrase → PHRASE_MISMATCH');

const noEvidence = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, evidence_acknowledged: false });
assert(noEvidence.authority_status       === 'UNLOCK_AUTHORITY_INVALID',           '[C-06] no evidence ack → INVALID');

const noLock = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, lock_acknowledged: false });
assert(noLock.authority_status           === 'UNLOCK_AUTHORITY_INVALID',           '[C-07] no lock ack → INVALID');

const noRisk = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, production_risk_acknowledged: false });
assert(noRisk.authority_status           === 'UNLOCK_AUTHORITY_INVALID',           '[C-08] no risk ack → INVALID');

const noRollback = createUnlockHumanAuthorityContract({ ...VALID_PARAMS, rollback_acknowledged: false });
assert(noRollback.authority_status       === 'UNLOCK_AUTHORITY_INVALID',           '[C-09] no rollback ack → INVALID');

// ─── Suite D: Valid authority ──────────────────────────────────────
console.log('\n[Suite D] Valid authority');
const full = createUnlockHumanAuthorityContract(VALID_PARAMS);
assert(full.authority_status             === 'UNLOCK_AUTHORITY_READY_REVIEW',      '[D-01] status=READY_REVIEW');
assert(full.authority_ready              === true,                                  '[D-02] ready=true');
assert(full.confirmation_phrase          === REQUIRED_CONFIRMATION_PHRASE,          '[D-03] phrase exact');
assert(Array.isArray(full.denied_capabilities) && full.denied_capabilities.length === 8, '[D-04] 8 denied');
assert(full.unlock_executed              === false,                                 '[D-05] unlock_executed=false');

// ─── Suite E: Cannot create evidence / override Go Core ───────────
console.log('\n[Suite E] Cannot create evidence or override Go Core');
assert(full.denied_capabilities.includes('evidence_override'),                      '[E-01] evidence_override denied');
assert(full.denied_capabilities.includes('go_core_override'),                      '[E-02] go_core_override denied');
assert(full.release_execution_allowed    === false,                                 '[E-03] exec_allowed=false');
assert(full.deploy_allowed               === false,                                 '[E-04] deploy_allowed=false');

// ─── Suite F: validateUnlockHumanAuthorityContract ─────────────────
console.log('\n[Suite F] Validate');
const vNull = validateUnlockHumanAuthorityContract(null);
assert(vNull.authority_status            === 'UNLOCK_AUTHORITY_MISSING',           '[F-01] null → MISSING');

const vBad = validateUnlockHumanAuthorityContract({ schema_version: 'v1.0' });
assert(vBad.authority_status             === 'UNLOCK_AUTHORITY_INVALID',           '[F-02] bad schema → INVALID');

const vBadPhrase = validateUnlockHumanAuthorityContract({ ...full, confirmation_phrase: 'wrong' });
assert(vBadPhrase.authority_status       === 'UNLOCK_AUTHORITY_PHRASE_MISMATCH',   '[F-03] bad phrase → PHRASE_MISMATCH');

const vValid = validateUnlockHumanAuthorityContract(full);
assert(vValid.valid                      === true,                                  '[F-04] valid passes');

// ─── Suite G: bindUnlockAuthorityToContract ────────────────────────
console.log('\n[Suite G] Bind');
const fakeContract = { contract_ready: true, unlock_contract_id: 'c-abc', contract_status: 'UNLOCK_CONTRACT_READY_REVIEW', requested_scope: 'review_full_manual_release_unlock' };
const bound = bindUnlockAuthorityToContract(full, fakeContract);
assert(bound.authority_bound             === true,                                  '[G-01] bound=true');
assert(bound.unlock_authority_id         === full.unlock_authority_id,              '[G-02] authority_id preserved');
assert(bound.unlock_contract_id          === 'c-abc',                              '[G-03] contract_id preserved');
assert(bound.production_execution_locked === true,                                  '[G-04] locked=true');

const badBind = bindUnlockAuthorityToContract(null, fakeContract);
assert(badBind.authority_ready           === false,                                 '[G-05] null authority → not bound');

// ─── Suite H: renderUnlockHumanAuthoritySummary ───────────────────
console.log('\n[Suite H] Render');
const rendered = renderUnlockHumanAuthoritySummary(full);
assert(typeof rendered                   === 'string',                              '[H-01] returns string');
assert(rendered.includes('UNLOCK_AUTHORITY_READY_REVIEW'),                         '[H-02] status in output');
assert(rendered.includes('production_execution_locked  : true'),                   '[H-03] lock in output');
assert(rendered.includes('unlock_executed              : false'),                   '[H-04] unlock_executed in output');
assert(renderUnlockHumanAuthoritySummary(null) === 'unlock_authority: null',       '[H-05] null → string');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
const cases = [fixture, rejected, badPhrase, noEvidence, full];
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
console.log(`\nunlock-human-authority-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
