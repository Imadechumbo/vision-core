#!/usr/bin/env node
/**
 * Unlock Contract Authority Binding — Unit Tests V61.2
 */

import {
  bindUnlockContractAuthority,
  validateUnlockContractAuthorityBinding,
  renderUnlockContractAuthorityBinding,
  UNLOCK_BINDING_STATUSES,
} from '../unlock-contract-authority-binding.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const FIXTURE_CONTRACT = {
  contract_ready:      true,
  unlock_contract_id:  'contract-abc',
  contract_status:     'UNLOCK_CONTRACT_READY_REVIEW',
  requested_scope:     'review_full_manual_release_unlock',
};
const FIXTURE_AUTHORITY = {
  authority_ready:              true,
  unlock_authority_id:          'authority-abc',
  authority_status:             'UNLOCK_AUTHORITY_READY_REVIEW',
  authority_scope:              'review_full_manual_release_unlock',
  evidence_acknowledged:        true,
  lock_acknowledged:            true,
  production_risk_acknowledged: true,
  rollback_acknowledged:        true,
};
const FIXTURE_BASELINE = {
  baseline_ready:   true,
  baseline_status:  'REAL_GATE_BASELINE_READY',
  baseline_version: 'v60.0',
};

const VALID_PARAMS = {
  unlock_contract:    FIXTURE_CONTRACT,
  unlock_authority:   FIXTURE_AUTHORITY,
  real_gate_baseline: FIXTURE_BASELINE,
  _mock_timestamp:    TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_BINDING_STATUSES),                                      '[A-01] statuses array');
assert(UNLOCK_BINDING_STATUSES.length === 6,                                        '[A-02] 6 statuses');
assert(UNLOCK_BINDING_STATUSES.includes('UNLOCK_BINDING_BLOCKED_CONTRACT'),        '[A-03] BLOCKED_CONTRACT');
assert(UNLOCK_BINDING_STATUSES.includes('UNLOCK_BINDING_BLOCKED_AUTHORITY'),       '[A-04] BLOCKED_AUTHORITY');
assert(UNLOCK_BINDING_STATUSES.includes('UNLOCK_BINDING_BLOCKED_BASELINE'),        '[A-05] BLOCKED_BASELINE');
assert(UNLOCK_BINDING_STATUSES.includes('UNLOCK_BINDING_BLOCKED_SCOPE'),           '[A-06] BLOCKED_SCOPE');
assert(UNLOCK_BINDING_STATUSES.includes('UNLOCK_BINDING_BLOCKED_TEMPORAL'),        '[A-07] BLOCKED_TEMPORAL');
assert(UNLOCK_BINDING_STATUSES.includes('UNLOCK_BINDING_READY_REVIEW'),            '[A-08] READY_REVIEW');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = bindUnlockContractAuthority({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                             '[B-01] returns object');
assert(fixture.binding_status            === 'UNLOCK_BINDING_READY_REVIEW',        '[B-02] status=READY_REVIEW');
assert(fixture.binding_ready             === true,                                  '[B-03] binding_ready=true');
assert(fixture.schema_version            === 'v61.2',                             '[B-04] schema=v61.2');
assert(typeof fixture.binding_id         === 'string' && fixture.binding_id.length === 24, '[B-05] id 24 chars');
assert(fixture.contract_valid            === true,                                  '[B-06] contract_valid=true');
assert(fixture.authority_valid           === true,                                  '[B-07] authority_valid=true');
assert(fixture.baseline_ready            === true,                                  '[B-08] baseline_ready=true');
assert(fixture.unlock_review_ready       === true,                                  '[B-09] unlock_review_ready=true');
assert(fixture.production_execution_locked === true,                                '[B-10] locked=true');
assert(fixture.unlock_executed           === false,                                 '[B-11] unlock_executed=false');
assert(fixture.blocking_reason           === null,                                  '[B-12] blocking_reason=null');

// ─── Suite C: Blocked cases ────────────────────────────────────────
console.log('\n[Suite C] Blocked cases');
const noContract = bindUnlockContractAuthority({ ...VALID_PARAMS, unlock_contract: null });
assert(noContract.binding_status         === 'UNLOCK_BINDING_BLOCKED_CONTRACT',    '[C-01] no contract → BLOCKED_CONTRACT');
assert(noContract.binding_ready          === false,                                 '[C-02] ready=false');

const badContract = bindUnlockContractAuthority({ ...VALID_PARAMS, unlock_contract: { contract_ready: false } });
assert(badContract.binding_status        === 'UNLOCK_BINDING_BLOCKED_CONTRACT',    '[C-03] bad contract → BLOCKED_CONTRACT');

const noAuthority = bindUnlockContractAuthority({ ...VALID_PARAMS, unlock_authority: null });
assert(noAuthority.binding_status        === 'UNLOCK_BINDING_BLOCKED_AUTHORITY',   '[C-04] no authority → BLOCKED_AUTHORITY');

const badAuthority = bindUnlockContractAuthority({ ...VALID_PARAMS, unlock_authority: { authority_ready: false } });
assert(badAuthority.binding_status       === 'UNLOCK_BINDING_BLOCKED_AUTHORITY',   '[C-05] bad authority → BLOCKED_AUTHORITY');

const noBaseline = bindUnlockContractAuthority({ ...VALID_PARAMS, real_gate_baseline: null });
assert(noBaseline.binding_status         === 'UNLOCK_BINDING_BLOCKED_BASELINE',    '[C-06] no baseline → BLOCKED_BASELINE');

const badBaseline = bindUnlockContractAuthority({ ...VALID_PARAMS, real_gate_baseline: { baseline_ready: false } });
assert(badBaseline.binding_status        === 'UNLOCK_BINDING_BLOCKED_BASELINE',    '[C-07] bad baseline → BLOCKED_BASELINE');

const scopeMismatch = bindUnlockContractAuthority({
  ...VALID_PARAMS,
  unlock_authority: { ...FIXTURE_AUTHORITY, authority_scope: 'review_deploy_unlock' },
});
assert(scopeMismatch.binding_status      === 'UNLOCK_BINDING_BLOCKED_SCOPE',       '[C-08] scope mismatch → BLOCKED_SCOPE');

// ─── Suite D: Full binding ready review ───────────────────────────
console.log('\n[Suite D] Full binding ready review');
const full = bindUnlockContractAuthority(VALID_PARAMS);
assert(full.binding_status               === 'UNLOCK_BINDING_READY_REVIEW',        '[D-01] status=READY_REVIEW');
assert(full.binding_ready                === true,                                  '[D-02] binding_ready=true');
assert(full.unlock_contract_id           === 'contract-abc',                       '[D-03] contract_id preserved');
assert(full.unlock_authority_id          === 'authority-abc',                      '[D-04] authority_id preserved');
assert(full.unlock_review_ready          === true,                                  '[D-05] unlock_review_ready=true');
assert(full.unlock_executed              === false,                                 '[D-06] unlock_executed=false');
assert(full.evidence_acknowledged        === true,                                  '[D-07] evidence_acknowledged=true');
assert(full.production_execution_locked  === true,                                  '[D-08] locked=true');

// ─── Suite E: validateUnlockContractAuthorityBinding ──────────────
console.log('\n[Suite E] Validate');
const vNull = validateUnlockContractAuthorityBinding(null);
assert(vNull.binding_status              === 'UNLOCK_BINDING_BLOCKED_CONTRACT',    '[E-01] null → BLOCKED_CONTRACT');

const vBad = validateUnlockContractAuthorityBinding({ schema_version: 'v1.0' });
assert(vBad.binding_status               === 'UNLOCK_BINDING_BLOCKED_CONTRACT',    '[E-02] bad schema → BLOCKED_CONTRACT');

const vUnlocked = validateUnlockContractAuthorityBinding({ ...full, unlock_executed: true });
assert(vUnlocked.binding_status          === 'UNLOCK_BINDING_BLOCKED_CONTRACT',    '[E-03] unlock_executed=true → blocked');

const vValid = validateUnlockContractAuthorityBinding(full);
assert(vValid.valid                      === true,                                  '[E-04] valid passes');

// ─── Suite F: renderUnlockContractAuthorityBinding ─────────────────
console.log('\n[Suite F] Render');
const rendered = renderUnlockContractAuthorityBinding(full);
assert(typeof rendered                   === 'string',                              '[F-01] returns string');
assert(rendered.includes('UNLOCK_BINDING_READY_REVIEW'),                           '[F-02] status in output');
assert(rendered.includes('production_execution_locked  : true'),                   '[F-03] lock in output');
assert(rendered.includes('unlock_review_ready          : true'),                   '[F-04] review_ready in output');
assert(renderUnlockContractAuthorityBinding(null) === 'unlock_binding: null',      '[F-05] null → string');

// ─── Suite G: Invariants ──────────────────────────────────────────
console.log('\n[Suite G] Invariants');
const cases = [fixture, noContract, noAuthority, noBaseline, scopeMismatch, full];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[G] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[G] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[G] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[G] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[G] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[G] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[G] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[G] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[G] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[G] case ${i}: production_execution_locked=true`);
  assert(o.unlock_executed             === false, `[G] case ${i}: unlock_executed=false`);
  assert(o.unlock_review_only          === true,  `[G] case ${i}: unlock_review_only=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nunlock-contract-authority-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
