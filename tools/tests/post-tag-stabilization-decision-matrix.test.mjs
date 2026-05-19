#!/usr/bin/env node
/**
 * Post-Tag Stabilization Decision Matrix — Unit Tests V98.1
 */

import {
  POST_TAG_DECISION_STATUSES,
  buildPostTagStabilizationDecisionMatrix,
  validatePostTagStabilizationDecisionMatrix,
  renderPostTagStabilizationDecisionMatrix,
} from '../post-tag-stabilization-decision-matrix.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS          = '2026-05-19T12:00:00.000Z';
const SHA         = 'abc1234def567890abc12345';
const LEDGER      = { ledger_ready: true, ledger_id: 'l-001', hash_chain_valid: true };
const VERIFIER_DRY  = { verify_ready: true, is_real_tag_verified: false, target_tag: 'v1.0.0', git_head: SHA };
const VERIFIER_REAL = { verify_ready: true, is_real_tag_verified: true,  target_tag: 'v1.0.0', git_head: SHA };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(POST_TAG_DECISION_STATUSES),                                                 '[A-01] statuses array');
assert(POST_TAG_DECISION_STATUSES.length === 6,                                                   '[A-02] 6 statuses');
assert(POST_TAG_DECISION_STATUSES.includes('POST_TAG_DECISION_BLOCKED_LEDGER'),                   '[A-03] BLOCKED_LEDGER');
assert(POST_TAG_DECISION_STATUSES.includes('POST_TAG_DECISION_BLOCKED_RECEIPT'),                  '[A-04] BLOCKED_RECEIPT');
assert(POST_TAG_DECISION_STATUSES.includes('POST_TAG_DECISION_COMMAND_READY'),                    '[A-05] COMMAND_READY');
assert(POST_TAG_DECISION_STATUSES.includes('POST_TAG_DECISION_DRY_RUN_CONFIRMED'),                '[A-06] DRY_RUN_CONFIRMED');
assert(POST_TAG_DECISION_STATUSES.includes('POST_TAG_DECISION_REAL_TAG_CONFIRMED'),               '[A-07] REAL_TAG_CONFIRMED');
assert(POST_TAG_DECISION_STATUSES.includes('POST_TAG_DECISION_READY_FOR_STABLE_REVIEW_PHASE'),    '[A-08] READY_FOR_STABLE_REVIEW_PHASE');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildPostTagStabilizationDecisionMatrix({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                   '[B-01] returns object');
assert(fix.decision_status  === 'POST_TAG_DECISION_DRY_RUN_CONFIRMED',                           '[B-02] fixture=DRY_RUN_CONFIRMED');
assert(fix.decision_ready   === true,                                                             '[B-03] decision_ready=true');
assert(fix.schema_version   === 'v98.1',                                                          '[B-04] schema=v98.1');
assert(typeof fix.decision_id === 'string' && fix.decision_id.length === 24,                     '[B-05] id 24 chars');
assert(fix.blocking_reason  === null,                                                             '[B-06] blocking=null');
assert(fix.ledger_verified  === true,                                                             '[B-07] ledger_verified=true');
assert(fix.receipt_verified === true,                                                             '[B-08] receipt_verified=true');
assert(fix.real_tag_confirmed === false,                                                          '[B-09] fixture dry_run=false real_tag');
assert(fix.stable_review_phase_allowed === false,                                                 '[B-10] stable_review=false in dry-run');
assert(Array.isArray(fix.blocked_actions) && fix.blocked_actions.length >= 5,                    '[B-11] blocked_actions array');
assert(Array.isArray(fix.safe_next_actions) && fix.safe_next_actions.length >= 2,                '[B-12] safe_next_actions array');
assert(fix.created_at       === TS,                                                               '[B-13] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[C-02] tag_created=false');
assert(fix.stable_promoted              === false, '[C-03] stable_promoted=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.release_performed            === false, '[C-05] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-06] real_execution_not_performed=true');

// ─── Suite D: Blocked actions present ────────────────────────────
console.log('\n[Suite D] Blocked actions');
assert(fix.blocked_actions.includes('auto_stable'),                                               '[D-01] auto_stable blocked');
assert(fix.blocked_actions.includes('auto_deploy'),                                               '[D-02] auto_deploy blocked');
assert(fix.blocked_actions.includes('auto_release'),                                              '[D-03] auto_release blocked');
assert(fix.blocked_actions.includes('force_push'),                                                '[D-04] force_push blocked');

// ─── Suite E: BLOCKED_LEDGER ──────────────────────────────────────
console.log('\n[Suite E] BLOCKED_LEDGER');
const bNoLedger = buildPostTagStabilizationDecisionMatrix({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoLedger.decision_status === 'POST_TAG_DECISION_BLOCKED_LEDGER',                         '[E-01] no ledger → BLOCKED_LEDGER');
assert(bNoLedger.decision_ready  === false,                                                       '[E-02] ready=false');
const bBadLedger = buildPostTagStabilizationDecisionMatrix({
  fixture_mode:  false,
  ledger_result: { ledger_ready: false },
  _mock_timestamp: TS,
});
assert(bBadLedger.decision_status === 'POST_TAG_DECISION_BLOCKED_LEDGER',                        '[E-03] bad ledger → BLOCKED_LEDGER');

// ─── Suite F: BLOCKED_RECEIPT ─────────────────────────────────────
console.log('\n[Suite F] BLOCKED_RECEIPT');
const bNoVerifier = buildPostTagStabilizationDecisionMatrix({
  fixture_mode:  false,
  ledger_result: LEDGER,
  _mock_timestamp: TS,
});
assert(bNoVerifier.decision_status === 'POST_TAG_DECISION_BLOCKED_RECEIPT',                      '[F-01] no verifier → BLOCKED_RECEIPT');
assert(bNoVerifier.ledger_verified === true,                                                      '[F-02] ledger passed before receipt');

// ─── Suite G: DRY_RUN_CONFIRMED ───────────────────────────────────
console.log('\n[Suite G] DRY_RUN_CONFIRMED');
const dryDecision = buildPostTagStabilizationDecisionMatrix({
  fixture_mode:    false,
  ledger_result:   LEDGER,
  verifier_result: VERIFIER_DRY,
  _mock_timestamp: TS,
});
assert(dryDecision.decision_status          === 'POST_TAG_DECISION_DRY_RUN_CONFIRMED',           '[G-01] dry-run → DRY_RUN_CONFIRMED');
assert(dryDecision.decision_ready           === true,                                             '[G-02] ready=true');
assert(dryDecision.real_tag_confirmed       === false,                                            '[G-03] real_tag=false');
assert(dryDecision.stable_review_phase_allowed === false,                                         '[G-04] stable_review=false for dry-run');
assert(dryDecision.stable_promoted          === false,                                            '[G-05] stable_promoted=false');
assert(dryDecision.safe_next_actions.some(a => a.includes('real_tag')),                          '[G-06] safe action includes real_tag');

// ─── Suite H: REAL_TAG_CONFIRMED ──────────────────────────────────
console.log('\n[Suite H] REAL_TAG_CONFIRMED');
const realDecision = buildPostTagStabilizationDecisionMatrix({
  fixture_mode:    false,
  ledger_result:   LEDGER,
  verifier_result: VERIFIER_REAL,
  _mock_timestamp: TS,
});
assert(realDecision.decision_status          === 'POST_TAG_DECISION_REAL_TAG_CONFIRMED',         '[H-01] real tag → REAL_TAG_CONFIRMED');
assert(realDecision.decision_ready           === true,                                            '[H-02] ready=true');
assert(realDecision.real_tag_confirmed       === true,                                            '[H-03] real_tag=true');
assert(realDecision.stable_review_phase_allowed === true,                                         '[H-04] stable_review=true only for real tag');
assert(realDecision.stable_promoted          === false,                                           '[H-05] stable_promoted=false still');
assert(realDecision.deploy_performed         === false,                                           '[H-06] deploy=false');
assert(realDecision.release_performed        === false,                                           '[H-07] release=false');
assert(realDecision.safe_next_actions.some(a => a.includes('stable_review')),                    '[H-08] stable_review in safe actions');
assert(realDecision.actual_real_tag_created  === false,                                           '[H-09] actual_tag=false even when real confirmed');

// ─── Suite I: Deterministic ID ────────────────────────────────────
console.log('\n[Suite I] Deterministic ID');
const i1 = buildPostTagStabilizationDecisionMatrix({ fixture_mode: true, _mock_timestamp: TS });
const i2 = buildPostTagStabilizationDecisionMatrix({ fixture_mode: true, _mock_timestamp: TS });
assert(i1.decision_id === i2.decision_id,                                                         '[I-01] deterministic id');

// ─── Suite J: Validate ────────────────────────────────────────────
console.log('\n[Suite J] Validate');
assert(validatePostTagStabilizationDecisionMatrix(fix).length === 0,                             '[J-01] fixture passes validation');
assert(validatePostTagStabilizationDecisionMatrix(null).length > 0,                              '[J-02] null fails validation');
const mut1 = { ...fix, stable_promoted: true };
assert(validatePostTagStabilizationDecisionMatrix(mut1).length > 0,                              '[J-03] stable_promoted=true fails');
const mut2 = { ...fix, stable_review_phase_allowed: true, real_tag_confirmed: false };
assert(validatePostTagStabilizationDecisionMatrix(mut2).length > 0,                              '[J-04] stable_review without real_tag fails');
assert(validatePostTagStabilizationDecisionMatrix(realDecision).length === 0,                    '[J-05] real tag decision passes validation');

// ─── Suite K: Render ─────────────────────────────────────────────
console.log('\n[Suite K] Render');
const rendered = renderPostTagStabilizationDecisionMatrix(fix);
assert(typeof rendered === 'string',                                                              '[K-01] returns string');
assert(rendered.includes('POST_TAG_DECISION_DRY_RUN_CONFIRMED'),                                 '[K-02] status in output');
assert(rendered.includes('stable_promoted              : false'),                                 '[K-03] stable=false in output');
assert(rendered.includes('deploy_performed             : false'),                                 '[K-04] deploy=false in output');
assert(rendered.includes('BLOCKED: auto_stable'),                                                 '[K-05] auto_stable blocked in output');
assert(rendered.includes('SAFE NEXT ACTIONS'),                                                    '[K-06] safe actions section');
assert(renderPostTagStabilizationDecisionMatrix(null) === 'post_tag_stabilization_decision_matrix: null', '[K-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npost-tag-stabilization-decision-matrix: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
