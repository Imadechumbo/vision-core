#!/usr/bin/env node
/**
 * Real Tag One-Shot Contract — Unit Tests V76.0
 */

import {
  createRealTagOneShotContract,
  validateRealTagOneShotContract,
  normalizeRealTagOneShotContract,
  renderRealTagOneShotContractSummary,
  TAG_ONE_SHOT_CONTRACT_STATUSES,
  REQUIRED_CONFIRMATION_PHRASE,
} from '../real-tag-one-shot-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T08:00:00.000Z';

const GOOD_BASELINE = {
  real_manual_exec_baseline_status: 'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY',
  baseline_id: 'baseline-test-id-123456',
};

const GOOD_GATE = {
  tag_gate_status: 'TAG_GATE_READY_REQUIRES_COMMAND',
  tag_gate_id: 'gate-test-id-654321',
};

const GOOD_PARAMS = {
  real_manual_exec_baseline: GOOD_BASELINE,
  tag_gate: GOOD_GATE,
  target_tag: 'v1.2.3',
  target_version: '1.2.3',
  git_head: 'abc1234def5678901234567890123456789012ab',
  evidence_receipt_id: 'receipt-test-id-abc',
  evidence_source: 'go-core',
  requested_by: 'test-user',
  requester_role: 'release-manager',
  human_confirmation_phrase: REQUIRED_CONFIRMATION_PHRASE,
  _mock_timestamp: TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_ONE_SHOT_CONTRACT_STATUSES),                               '[A-01] statuses array');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.length === 9,                                 '[A-02] 9 statuses');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_MISSING'),    '[A-03] MISSING');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_INVALID'),    '[A-04] INVALID');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_EXPIRED'),    '[A-05] EXPIRED');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_BLOCKED_BASELINE'), '[A-06] BLOCKED_BASELINE');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_GATE'), '[A-07] BLOCKED_TAG_GATE');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_BLOCKED_EVIDENCE'), '[A-08] BLOCKED_EVIDENCE');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_NAME'), '[A-09] BLOCKED_TAG_NAME');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_PHRASE_MISMATCH'),  '[A-10] PHRASE_MISMATCH');
assert(TAG_ONE_SHOT_CONTRACT_STATUSES.includes('TAG_ONE_SHOT_CONTRACT_READY_REVIEW'),     '[A-11] READY_REVIEW');
assert(typeof REQUIRED_CONFIRMATION_PHRASE === 'string' && REQUIRED_CONFIRMATION_PHRASE.length > 0, '[A-12] phrase string');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createRealTagOneShotContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                     '[B-01] returns object');
assert(fix.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',       '[B-02] status=READY_REVIEW');
assert(fix.one_shot_contract_ready  === true,                                       '[B-03] ready=true');
assert(fix.schema_version           === 'v76.0',                                    '[B-04] schema=v76.0');
assert(typeof fix.one_shot_contract_id === 'string' && fix.one_shot_contract_id.length === 24, '[B-05] id 24 chars');
assert(fix.evidence_source          === 'go-core',                                  '[B-06] source=go-core');
assert(fix.target_tag               === 'v1.2.3',                                   '[B-07] tag present');
assert(fix.blocking_reason          === null,                                       '[B-08] blocking_reason=null');
assert(fix.created_at               === TS,                                         '[B-09] created_at=TS');
assert(fix.human_confirmation_phrase === REQUIRED_CONFIRMATION_PHRASE,              '[B-10] phrase match');

// ─── Suite C: Missing fields ──────────────────────────────────────
console.log('\n[Suite C] Missing fields');
const missing = createRealTagOneShotContract({ _mock_timestamp: TS });
assert(missing.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_MISSING',        '[C-01] MISSING status');
assert(missing.one_shot_contract_ready  === false,                                  '[C-02] ready=false');

// ─── Suite D: Expired ────────────────────────────────────────────
console.log('\n[Suite D] Expired');
const expired = createRealTagOneShotContract({ ...GOOD_PARAMS, force_expired: true });
assert(expired.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_EXPIRED',        '[D-01] EXPIRED status');

// ─── Suite E: Blocked baseline ──────────────────────────────────
console.log('\n[Suite E] Blocked baseline');
const badBaseline = createRealTagOneShotContract({
  ...GOOD_PARAMS,
  real_manual_exec_baseline: { real_manual_exec_baseline_status: 'BLOCKED' },
});
assert(badBaseline.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_BLOCKED_BASELINE', '[E-01] BLOCKED_BASELINE');

const nullBaseline = createRealTagOneShotContract({ ...GOOD_PARAMS, real_manual_exec_baseline: null });
assert(nullBaseline.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_BLOCKED_BASELINE', '[E-02] BLOCKED_BASELINE null');

// ─── Suite F: Blocked tag gate ──────────────────────────────────
console.log('\n[Suite F] Blocked tag gate');
const badGate = createRealTagOneShotContract({
  ...GOOD_PARAMS,
  tag_gate: { tag_gate_status: 'BLOCKED' },
});
assert(badGate.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_GATE', '[F-01] BLOCKED_TAG_GATE');

const nullGate = createRealTagOneShotContract({ ...GOOD_PARAMS, tag_gate: null });
assert(nullGate.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_GATE', '[F-02] BLOCKED_TAG_GATE null');

// ─── Suite G: Blocked evidence ──────────────────────────────────
console.log('\n[Suite G] Blocked evidence');
const backendSource = createRealTagOneShotContract({ ...GOOD_PARAMS, evidence_source: 'backend' });
assert(backendSource.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_BLOCKED_EVIDENCE', '[G-01] BLOCKED_EVIDENCE backend');

const noSource = createRealTagOneShotContract({ ...GOOD_PARAMS, evidence_source: null });
assert(noSource.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_BLOCKED_EVIDENCE', '[G-02] BLOCKED_EVIDENCE null');

// ─── Suite H: Blocked tag name ──────────────────────────────────
console.log('\n[Suite H] Blocked tag name');
const noV = createRealTagOneShotContract({ ...GOOD_PARAMS, target_tag: '1.2.3' });
assert(noV.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_BLOCKED_TAG_NAME',   '[H-01] BLOCKED_TAG_NAME no v');

// ─── Suite I: Phrase mismatch ───────────────────────────────────
console.log('\n[Suite I] Phrase mismatch');
const badPhrase = createRealTagOneShotContract({ ...GOOD_PARAMS, human_confirmation_phrase: 'wrong phrase' });
assert(badPhrase.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_PHRASE_MISMATCH', '[I-01] PHRASE_MISMATCH');

const noPhrase = createRealTagOneShotContract({ ...GOOD_PARAMS, human_confirmation_phrase: null });
assert(noPhrase.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_PHRASE_MISMATCH', '[I-02] PHRASE_MISMATCH null');

// ─── Suite J: Valid contract ────────────────────────────────────
console.log('\n[Suite J] Valid contract');
const valid = createRealTagOneShotContract(GOOD_PARAMS);
assert(valid.one_shot_contract_ready  === true,                                     '[J-01] ready=true');
assert(valid.one_shot_contract_status === 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',     '[J-02] READY_REVIEW');
assert(valid.target_tag               === 'v1.2.3',                                 '[J-03] tag preserved');
assert(valid.evidence_source          === 'go-core',                                '[J-04] source=go-core');
assert(valid.real_manual_exec_baseline_id === 'baseline-test-id-123456',            '[J-05] baseline id');
assert(valid.tag_gate_id              === 'gate-test-id-654321',                    '[J-06] gate id');

// ─── Suite K: Invariants ─────────────────────────────────────────
console.log('\n[Suite K] Invariants');
assert(fix.real_execution_allowed   === false, '[K-01] real_exec=false');
assert(fix.real_execution_armed     === false, '[K-02] armed=false');
assert(fix.tag_created              === false, '[K-03] tag_created=false');
assert(fix.git_push_performed       === false, '[K-04] push=false');
assert(fix.deploy_performed         === false, '[K-05] deploy=false');
assert(fix.stable_promoted          === false, '[K-06] stable=false');
assert(fix.release_performed        === false, '[K-07] release=false');
assert(fix.dry_run_required         === true,  '[K-08] dry_run=true');
assert(fix.rollback_anchor_required === true,  '[K-09] rollback_anchor=true');

assert(valid.real_execution_allowed === false, '[K-10] valid: real_exec=false');
assert(valid.tag_created            === false, '[K-11] valid: tag_created=false');
assert(valid.git_push_performed     === false, '[K-12] valid: push=false');

assert(missing.real_execution_allowed === false, '[K-13] missing: real_exec=false');
assert(missing.tag_created            === false, '[K-14] missing: tag_created=false');

// ─── Suite L: Validate ──────────────────────────────────────────
console.log('\n[Suite L] Validate');
const vr = validateRealTagOneShotContract(fix);
assert(vr.valid === true,                                                           '[L-01] valid=true');
assert(validateRealTagOneShotContract(null).valid === false,                        '[L-02] null invalid');
assert(validateRealTagOneShotContract({ one_shot_contract_status: 'BAD', real_execution_allowed: false, tag_created: false, git_push_performed: false }).valid === false, '[L-03] bad status');

// ─── Suite M: Normalize ─────────────────────────────────────────
console.log('\n[Suite M] Normalize');
const norm = normalizeRealTagOneShotContract({ one_shot_contract_status: 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW', real_execution_allowed: true });
assert(norm.real_execution_allowed === false,                                       '[M-01] normalize clears real_exec');
assert(normalizeRealTagOneShotContract(null) === null,                              '[M-02] null→null');

// ─── Suite N: Deterministic ID ──────────────────────────────────
console.log('\n[Suite N] Deterministic ID');
const n1 = createRealTagOneShotContract({ fixture_mode: true, _mock_timestamp: TS });
const n2 = createRealTagOneShotContract({ fixture_mode: true, _mock_timestamp: TS });
assert(n1.one_shot_contract_id === n2.one_shot_contract_id,                        '[N-01] deterministic id');

// ─── Suite O: Render ─────────────────────────────────────────────
console.log('\n[Suite O] Render');
const rendered = renderRealTagOneShotContractSummary(fix);
assert(typeof rendered === 'string',                                                '[O-01] returns string');
assert(rendered.includes('TAG_ONE_SHOT_CONTRACT_READY_REVIEW'),                    '[O-02] status in output');
assert(rendered.includes('real_execution_allowed      : false'),                   '[O-03] real_exec in output');
assert(rendered.includes('tag_created                 : false'),                   '[O-04] tag=false');
assert(rendered.includes('git_push_performed          : false'),                   '[O-05] push=false');
assert(rendered.includes('dry_run_required            : true'),                    '[O-06] dry_run in output');
assert(rendered.includes('rollback_anchor_required    : true'),                    '[O-07] rollback in output');
assert(renderRealTagOneShotContractSummary(null) === 'real_tag_one_shot_contract: null', '[O-08] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
