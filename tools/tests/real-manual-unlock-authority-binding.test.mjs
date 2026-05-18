#!/usr/bin/env node
/**
 * Real Manual Unlock Authority Binding — Unit Tests V71.1
 */

import {
  bindRealManualUnlockAuthority,
  validateRealManualUnlockAuthorityBinding,
  renderRealManualUnlockAuthorityBinding,
  REAL_UNLOCK_BINDING_STATUSES,
} from '../real-manual-unlock-authority-binding.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';
const FUTURE = '2026-05-18T14:00:00.000Z';

const GOOD_CONTRACT = {
  contract_status: 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW',
  unlock_execution_contract_id: 'uc-id',
  requested_unlock_scope: 'unlock_for_full_manual_execution_review',
  expires_at: FUTURE,
};
const GOOD_AUTHORITY = {
  authority_status: 'CONTROLLED_AUTHORITY_READY_REVIEW',
  controlled_authority_id: 'ca-id',
  acknowledgements: ['evidence_reviewed', 'production_risk_understood', 'rollback_plan_reviewed', 'unlock_governance_reviewed'],
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_UNLOCK_BINDING_STATUSES),                                    '[A-01] statuses array');
assert(REAL_UNLOCK_BINDING_STATUSES.length === 5,                                      '[A-02] 5 statuses');
assert(REAL_UNLOCK_BINDING_STATUSES.includes('REAL_UNLOCK_BINDING_READY_ARMED_REVIEW'), '[A-03] READY_ARMED_REVIEW');
assert(REAL_UNLOCK_BINDING_STATUSES.includes('REAL_UNLOCK_BINDING_BLOCKED_CONTRACT'),  '[A-04] BLOCKED_CONTRACT');
assert(REAL_UNLOCK_BINDING_STATUSES.includes('REAL_UNLOCK_BINDING_BLOCKED_AUTHORITY'), '[A-05] BLOCKED_AUTHORITY');
assert(REAL_UNLOCK_BINDING_STATUSES.includes('REAL_UNLOCK_BINDING_BLOCKED_SCOPE'),     '[A-06] BLOCKED_SCOPE');
assert(REAL_UNLOCK_BINDING_STATUSES.includes('REAL_UNLOCK_BINDING_BLOCKED_TEMPORAL'),  '[A-07] BLOCKED_TEMPORAL');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = bindRealManualUnlockAuthority({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.binding_status  === 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW',              '[B-02] status=READY_ARMED_REVIEW');
assert(fix.binding_ready   === true,                                                   '[B-03] binding_ready=true');
assert(fix.schema_version  === 'v71.1',                                               '[B-04] schema=v71.1');
assert(typeof fix.binding_id === 'string' && fix.binding_id.length === 24,            '[B-05] id 24 chars');
assert(fix.real_unlock_review_ready === true,                                          '[B-06] real_unlock_review_ready=true');
assert(fix.contract_valid   === true,                                                  '[B-07] contract_valid=true');
assert(fix.authority_valid  === true,                                                  '[B-08] authority_valid=true');
assert(fix.blocking_reason  === null,                                                  '[B-09] blocking_reason=null');
assert(fix.created_at       === TS,                                                    '[B-10] created_at=TS');

// ─── Suite C: Missing contract ────────────────────────────────────
console.log('\n[Suite C] Missing contract');
const noC = bindRealManualUnlockAuthority({ controlled_authority: GOOD_AUTHORITY, _mock_timestamp: TS });
assert(noC.binding_ready   === false,                                                  '[C-01] blocked');
assert(noC.binding_status  === 'REAL_UNLOCK_BINDING_BLOCKED_CONTRACT',                '[C-02] BLOCKED_CONTRACT');

const badC = bindRealManualUnlockAuthority({ unlock_execution_contract: { contract_status: 'BLOCKED' }, controlled_authority: GOOD_AUTHORITY, _mock_timestamp: TS });
assert(badC.binding_status === 'REAL_UNLOCK_BINDING_BLOCKED_CONTRACT',                '[C-03] bad contract status blocked');

// ─── Suite D: Missing authority ───────────────────────────────────
console.log('\n[Suite D] Missing authority');
const noA = bindRealManualUnlockAuthority({ unlock_execution_contract: GOOD_CONTRACT, _mock_timestamp: TS });
assert(noA.binding_status === 'REAL_UNLOCK_BINDING_BLOCKED_AUTHORITY',                '[D-01] BLOCKED_AUTHORITY');

const badA = bindRealManualUnlockAuthority({ unlock_execution_contract: GOOD_CONTRACT, controlled_authority: { authority_status: 'BLOCKED' }, _mock_timestamp: TS });
assert(badA.binding_status === 'REAL_UNLOCK_BINDING_BLOCKED_AUTHORITY',               '[D-02] bad authority blocked');

// ─── Suite E: Missing scope ───────────────────────────────────────
console.log('\n[Suite E] Missing scope');
const noScope = bindRealManualUnlockAuthority({
  unlock_execution_contract: { ...GOOD_CONTRACT, requested_unlock_scope: null },
  controlled_authority: GOOD_AUTHORITY,
  _mock_timestamp: TS,
});
assert(noScope.binding_status === 'REAL_UNLOCK_BINDING_BLOCKED_SCOPE',                '[E-01] BLOCKED_SCOPE');

// ─── Suite F: Expired contract ────────────────────────────────────
console.log('\n[Suite F] Expired contract');
const expired = bindRealManualUnlockAuthority({
  unlock_execution_contract: { ...GOOD_CONTRACT, expires_at: '2020-01-01T00:00:00.000Z' },
  controlled_authority: GOOD_AUTHORITY,
  _mock_timestamp: TS,
});
assert(expired.binding_status === 'REAL_UNLOCK_BINDING_BLOCKED_TEMPORAL',             '[F-01] BLOCKED_TEMPORAL');

// ─── Suite G: Full binding ready ──────────────────────────────────
console.log('\n[Suite G] Full binding ready');
const ready = bindRealManualUnlockAuthority({
  unlock_execution_contract: GOOD_CONTRACT,
  controlled_authority:      GOOD_AUTHORITY,
  _mock_timestamp:           TS,
});
assert(ready.binding_ready   === true,                                                 '[G-01] binding_ready=true');
assert(ready.binding_status  === 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW',            '[G-02] status=READY_ARMED_REVIEW');
assert(ready.real_unlock_review_ready === true,                                        '[G-03] review_ready=true');
assert(ready.unlock_execution_contract_id === 'uc-id',                                '[G-04] contract_id set');
assert(ready.controlled_authority_id      === 'ca-id',                                '[G-05] authority_id set');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.production_execution_locked === true,  '[H-01] locked=true');
assert(fix.unlock_executed             === false, '[H-02] unlock_executed=false');
assert(fix.real_execution_armed        === false, '[H-03] armed=false');
assert(fix.dry_run_required            === true,  '[H-04] dry_run_required=true');
assert(fix.manual_execution_only       === true,  '[H-05] manual_execution_only=true');
assert(fix.deploy_allowed              === false, '[H-06] deploy_allowed=false');
assert(fix.promotion_allowed           === false, '[H-07] promotion_allowed=false');
assert(fix.stable_allowed              === false, '[H-08] stable_allowed=false');
assert(fix.tag_allowed                 === false, '[H-09] tag_allowed=false');
assert(fix.release_execution_allowed   === false, '[H-10] release_exec=false');
assert(fix.release_performed           === false, '[H-11] release_performed=false');
assert(fix.tag_created                 === false, '[H-12] tag_created=false');
assert(fix.stable_promoted             === false, '[H-13] stable_promoted=false');
assert(fix.deploy_performed            === false, '[H-14] deploy_performed=false');

assert(noC.production_execution_locked === true,  '[H-15] blocked: locked=true');
assert(noC.unlock_executed             === false, '[H-16] blocked: unlock=false');
assert(noC.real_execution_armed        === false, '[H-17] blocked: armed=false');

// ─── Suite I: validateRealManualUnlockAuthorityBinding ────────────
console.log('\n[Suite I] Validate');
const vFix = validateRealManualUnlockAuthorityBinding(fix);
assert(vFix.valid  === true,  '[I-01] fixture valid');
assert(vFix.reason === null,  '[I-02] reason null');

const vNull = validateRealManualUnlockAuthorityBinding(null);
assert(vNull.valid === false, '[I-03] null invalid');

// ─── Suite J: renderRealManualUnlockAuthorityBinding ──────────────
console.log('\n[Suite J] Render');
const rendered = renderRealManualUnlockAuthorityBinding(fix);
assert(typeof rendered === 'string',                                                   '[J-01] returns string');
assert(rendered.includes('REAL_UNLOCK_BINDING_READY_ARMED_REVIEW'),                   '[J-02] status in output');
assert(rendered.includes('production_execution_locked   : true'),                     '[J-03] lock in output');
assert(rendered.includes('real_execution_armed          : false'),                    '[J-04] armed=false');
assert(rendered.includes('unlock_executed               : false'),                    '[J-05] unlock=false');
assert(renderRealManualUnlockAuthorityBinding(null) === 'real_manual_unlock_authority_binding: null', '[J-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-manual-unlock-authority-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
