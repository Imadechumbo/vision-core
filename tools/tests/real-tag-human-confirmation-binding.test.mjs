#!/usr/bin/env node
/**
 * Real Tag Human Confirmation Binding — Unit Tests V76.1
 */

import {
  bindRealTagHumanConfirmation,
  validateRealTagHumanConfirmationBinding,
  renderRealTagHumanConfirmationBinding,
  TAG_CONFIRMATION_STATUSES,
  REQUIRED_BINDING_PHRASE,
} from '../real-tag-human-confirmation-binding.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T09:00:00.000Z';

const GOOD_CONTRACT = {
  one_shot_contract_status: 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',
  one_shot_contract_id:     'contract-test-id-abc123',
  target_tag:               'v1.2.3',
  git_head:                 'abc1234def5678901234567890123456789012ab',
  evidence_receipt_id:      'receipt-test-id-xyz',
};

const GOOD_PARAMS = {
  one_shot_contract:              GOOD_CONTRACT,
  confirmed_by:                   'test-human',
  confirmer_role:                 'release-manager',
  confirmation_decision:          'approved',
  confirmation_phrase:            REQUIRED_BINDING_PHRASE,
  target_tag_confirmed:           'v1.2.3',
  git_head_confirmed:             'abc1234def5678901234567890123456789012ab',
  evidence_receipt_confirmed:     'receipt-test-id-xyz',
  no_deploy_confirmed:            true,
  no_stable_promotion_confirmed:  true,
  no_release_confirmed:           true,
  rollback_anchor_confirmed:      true,
  _mock_timestamp:                TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_CONFIRMATION_STATUSES),                                       '[A-01] statuses array');
assert(TAG_CONFIRMATION_STATUSES.length === 6,                                         '[A-02] 6 statuses');
assert(TAG_CONFIRMATION_STATUSES.includes('TAG_CONFIRMATION_BLOCKED_CONTRACT'),        '[A-03] BLOCKED_CONTRACT');
assert(TAG_CONFIRMATION_STATUSES.includes('TAG_CONFIRMATION_REJECTED'),                '[A-04] REJECTED');
assert(TAG_CONFIRMATION_STATUSES.includes('TAG_CONFIRMATION_EXPIRED'),                 '[A-05] EXPIRED');
assert(TAG_CONFIRMATION_STATUSES.includes('TAG_CONFIRMATION_PHRASE_MISMATCH'),         '[A-06] PHRASE_MISMATCH');
assert(TAG_CONFIRMATION_STATUSES.includes('TAG_CONFIRMATION_TARGET_MISMATCH'),         '[A-07] TARGET_MISMATCH');
assert(TAG_CONFIRMATION_STATUSES.includes('TAG_CONFIRMATION_READY_REVIEW'),            '[A-08] READY_REVIEW');
assert(typeof REQUIRED_BINDING_PHRASE === 'string' && REQUIRED_BINDING_PHRASE.length > 0, '[A-09] phrase string');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = bindRealTagHumanConfirmation({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.binding_status        === 'TAG_CONFIRMATION_READY_REVIEW',                 '[B-02] status=READY_REVIEW');
assert(fix.binding_ready         === true,                                             '[B-03] ready=true');
assert(fix.schema_version        === 'v76.1',                                          '[B-04] schema=v76.1');
assert(typeof fix.binding_id === 'string' && fix.binding_id.length === 24,            '[B-05] id 24 chars');
assert(fix.real_tag_review_ready === true,                                             '[B-06] review_ready=true');
assert(fix.created_at            === TS,                                               '[B-07] created_at=TS');
assert(fix.blocking_reason       === null,                                             '[B-08] blocking=null');

// ─── Suite C: Blocked contract ─────────────────────────────────────
console.log('\n[Suite C] Blocked contract');
const noContract = bindRealTagHumanConfirmation({ _mock_timestamp: TS });
assert(noContract.binding_status === 'TAG_CONFIRMATION_BLOCKED_CONTRACT',             '[C-01] BLOCKED_CONTRACT null');

const badContract = bindRealTagHumanConfirmation({
  ...GOOD_PARAMS,
  one_shot_contract: { one_shot_contract_status: 'TAG_ONE_SHOT_CONTRACT_BLOCKED_BASELINE' },
});
assert(badContract.binding_status === 'TAG_CONFIRMATION_BLOCKED_CONTRACT',            '[C-02] BLOCKED_CONTRACT bad status');

// ─── Suite D: Rejected ─────────────────────────────────────────────
console.log('\n[Suite D] Rejected');
const rejected = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, confirmation_decision: 'rejected' });
assert(rejected.binding_status === 'TAG_CONFIRMATION_REJECTED',                       '[D-01] REJECTED');

const noDecision = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, confirmation_decision: null });
assert(noDecision.binding_status === 'TAG_CONFIRMATION_REJECTED',                     '[D-02] REJECTED null decision');

// ─── Suite E: Expired ──────────────────────────────────────────────
console.log('\n[Suite E] Expired');
const expired = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, force_expired: true });
assert(expired.binding_status === 'TAG_CONFIRMATION_EXPIRED',                         '[E-01] EXPIRED');

// ─── Suite F: Phrase mismatch ──────────────────────────────────────
console.log('\n[Suite F] Phrase mismatch');
const badPhrase = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, confirmation_phrase: 'wrong' });
assert(badPhrase.binding_status === 'TAG_CONFIRMATION_PHRASE_MISMATCH',               '[F-01] PHRASE_MISMATCH');

const noPhrase = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, confirmation_phrase: null });
assert(noPhrase.binding_status === 'TAG_CONFIRMATION_PHRASE_MISMATCH',                '[F-02] PHRASE_MISMATCH null');

// ─── Suite G: Target mismatch ──────────────────────────────────────
console.log('\n[Suite G] Target mismatch');
const badTag = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, target_tag_confirmed: 'v9.9.9' });
assert(badTag.binding_status === 'TAG_CONFIRMATION_TARGET_MISMATCH',                  '[G-01] TARGET_MISMATCH tag');

const badHead = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, git_head_confirmed: 'wronghead' });
assert(badHead.binding_status === 'TAG_CONFIRMATION_TARGET_MISMATCH',                 '[G-02] TARGET_MISMATCH head');

const noDeployConfirm = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, no_deploy_confirmed: false });
assert(noDeployConfirm.binding_status === 'TAG_CONFIRMATION_TARGET_MISMATCH',         '[G-03] TARGET_MISMATCH deploy=false');

const noRollback = bindRealTagHumanConfirmation({ ...GOOD_PARAMS, rollback_anchor_confirmed: false });
assert(noRollback.binding_status === 'TAG_CONFIRMATION_TARGET_MISMATCH',              '[G-04] TARGET_MISMATCH rollback=false');

// ─── Suite H: Valid ready ──────────────────────────────────────────
console.log('\n[Suite H] Valid ready');
const valid = bindRealTagHumanConfirmation(GOOD_PARAMS);
assert(valid.binding_ready       === true,                                             '[H-01] ready=true');
assert(valid.binding_status      === 'TAG_CONFIRMATION_READY_REVIEW',                 '[H-02] READY_REVIEW');
assert(valid.real_tag_review_ready === true,                                           '[H-03] review_ready=true');
assert(valid.one_shot_contract_id === GOOD_CONTRACT.one_shot_contract_id,             '[H-04] contract_id preserved');
assert(valid.target_tag_confirmed === 'v1.2.3',                                       '[H-05] tag confirmed');
assert(valid.no_deploy_confirmed  === true,                                            '[H-06] no_deploy=true');
assert(valid.rollback_anchor_confirmed === true,                                       '[H-07] rollback=true');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
assert(fix.real_execution_allowed   === false, '[I-01] real_exec=false');
assert(fix.real_execution_armed     === false, '[I-02] armed=false');
assert(fix.tag_created              === false, '[I-03] tag_created=false');
assert(fix.git_push_performed       === false, '[I-04] push=false');
assert(fix.deploy_performed         === false, '[I-05] deploy=false');
assert(fix.stable_promoted          === false, '[I-06] stable=false');
assert(fix.release_performed        === false, '[I-07] release=false');

assert(valid.real_execution_allowed === false, '[I-08] valid: real_exec=false');
assert(valid.tag_created            === false, '[I-09] valid: tag_created=false');
assert(valid.git_push_performed     === false, '[I-10] valid: push=false');

assert(noContract.real_execution_allowed === false, '[I-11] blocked: real_exec=false');
assert(noContract.tag_created            === false, '[I-12] blocked: tag_created=false');

// ─── Suite J: Validate ────────────────────────────────────────────
console.log('\n[Suite J] Validate');
assert(validateRealTagHumanConfirmationBinding(fix).valid === true,                   '[J-01] valid=true');
assert(validateRealTagHumanConfirmationBinding(null).valid === false,                 '[J-02] null invalid');
assert(validateRealTagHumanConfirmationBinding({ binding_status: 'BAD', real_execution_allowed: false, tag_created: false, git_push_performed: false }).valid === false, '[J-03] bad status');

// ─── Suite K: Deterministic ID ───────────────────────────────────
console.log('\n[Suite K] Deterministic ID');
const k1 = bindRealTagHumanConfirmation({ fixture_mode: true, _mock_timestamp: TS });
const k2 = bindRealTagHumanConfirmation({ fixture_mode: true, _mock_timestamp: TS });
assert(k1.binding_id === k2.binding_id,                                               '[K-01] deterministic id');

// ─── Suite L: Render ─────────────────────────────────────────────
console.log('\n[Suite L] Render');
const rendered = renderRealTagHumanConfirmationBinding(fix);
assert(typeof rendered === 'string',                                                   '[L-01] returns string');
assert(rendered.includes('TAG_CONFIRMATION_READY_REVIEW'),                            '[L-02] status in output');
assert(rendered.includes('real_execution_allowed        : false'),                    '[L-03] real_exec in output');
assert(rendered.includes('tag_created                   : false'),                    '[L-04] tag=false');
assert(rendered.includes('git_push_performed            : false'),                    '[L-05] push=false');
assert(rendered.includes('real_tag_review_ready'),                                    '[L-06] review_ready in output');
assert(renderRealTagHumanConfirmationBinding(null) === 'real_tag_human_confirmation_binding: null', '[L-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-confirmation-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
