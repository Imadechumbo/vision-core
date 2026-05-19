#!/usr/bin/env node
/**
 * Real Tag Stable Review Eligibility Gate — Unit Tests V103.1
 */

import {
  STABLE_REVIEW_ELIGIBILITY_STATUSES,
  evaluateRealTagStableReviewEligibility,
  validateRealTagStableReviewEligibility,
  renderRealTagStableReviewEligibilityGate,
} from '../real-tag-stable-review-eligibility-gate.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS  = '2026-05-19T17:30:00.000Z';
const SHA = 'abc1234def567890abc12345';

const DRY_STATE  = { state_ready: true, verified_state: 'VERIFIED_STATE_DRY_RUN_IMPORTED', real_tag_verified: false, target_tag: 'v1.0.0', git_head: SHA };
const REAL_STATE = { state_ready: true, verified_state: 'VERIFIED_STATE_REAL_TAG_VERIFIED', real_tag_verified: true, target_tag: 'v1.0.0', git_head: SHA };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(STABLE_REVIEW_ELIGIBILITY_STATUSES),                             '[A-01] statuses array');
assert(STABLE_REVIEW_ELIGIBILITY_STATUSES.length === 3,                               '[A-02] 3 statuses');
assert(STABLE_REVIEW_ELIGIBILITY_STATUSES.includes('STABLE_REVIEW_ELIGIBILITY_BLOCKED_STATE'), '[A-03] BLOCKED_STATE');
assert(STABLE_REVIEW_ELIGIBILITY_STATUSES.includes('STABLE_REVIEW_ELIGIBILITY_BLOCKED_TAG'),   '[A-04] BLOCKED_TAG');
assert(STABLE_REVIEW_ELIGIBILITY_STATUSES.includes('STABLE_REVIEW_ELIGIBILITY_READY_FOR_STABLE_REVIEW_PHASE'), '[A-05] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateRealTagStableReviewEligibility({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.eligibility_status === 'STABLE_REVIEW_ELIGIBILITY_READY_FOR_STABLE_REVIEW_PHASE', '[B-02] fixture=READY');
assert(fix.eligibility_ready  === true,                                               '[B-03] eligibility_ready=true');
assert(fix.schema_version     === 'v103.1',                                           '[B-04] schema=v103.1');
assert(typeof fix.eligibility_id === 'string' && fix.eligibility_id.length === 24,   '[B-05] id 24 chars');
assert(fix.blocking_reason    === null,                                               '[B-06] blocking=null');
assert(fix.real_tag_verified  === true,                                               '[B-07] fixture: real_tag_verified=true');
assert(fix.stable_review_phase_allowed === true,                                      '[B-08] stable_review_allowed=true in fixture');
assert(fix.next_phase_recommended === 'stable_review_contract',                       '[B-09] next_phase=stable_review_contract');
assert(fix.created_at         === TS,                                                 '[B-10] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.stable_promoted              === false, '[C-01] stable_promoted=false');
assert(fix.deploy_performed             === false, '[C-02] deploy_performed=false');
assert(fix.release_performed            === false, '[C-03] release_performed=false');
assert(fix.actual_real_tag_created      === false, '[C-04] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[C-05] tag_created=false');
assert(fix.real_execution_not_performed === true,  '[C-06] real_execution_not_performed=true');

// ─── Suite D: BLOCKED cases ────────────────────────────────────────
console.log('\n[Suite D] BLOCKED cases');
const bNoState = evaluateRealTagStableReviewEligibility({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoState.eligibility_status === 'STABLE_REVIEW_ELIGIBILITY_BLOCKED_STATE',    '[D-01] no state → BLOCKED_STATE');
assert(bNoState.eligibility_ready  === false,                                         '[D-02] ready=false');
assert(bNoState.stable_promoted    === false,                                         '[D-03] stable=false in blocked');

const bBadState = evaluateRealTagStableReviewEligibility({
  fixture_mode: false, state_result: { state_ready: false }, _mock_timestamp: TS,
});
assert(bBadState.eligibility_status === 'STABLE_REVIEW_ELIGIBILITY_BLOCKED_STATE',   '[D-04] bad state → BLOCKED_STATE');

const bDryRun = evaluateRealTagStableReviewEligibility({
  fixture_mode: false, state_result: DRY_STATE, _mock_timestamp: TS,
});
assert(bDryRun.eligibility_status === 'STABLE_REVIEW_ELIGIBILITY_BLOCKED_TAG',       '[D-05] dry-run → BLOCKED_TAG');
assert(bDryRun.eligibility_ready  === false,                                          '[D-06] dry-run: ready=false');
assert(bDryRun.stable_review_phase_allowed === false,                                 '[D-07] dry-run: stable_review=false');

// ─── Suite E: READY_FOR_STABLE_REVIEW_PHASE ────────────────────────
console.log('\n[Suite E] READY');
const ready = evaluateRealTagStableReviewEligibility({
  fixture_mode: false, state_result: REAL_STATE, _mock_timestamp: TS,
});
assert(ready.eligibility_status === 'STABLE_REVIEW_ELIGIBILITY_READY_FOR_STABLE_REVIEW_PHASE', '[E-01] real tag → READY');
assert(ready.eligibility_ready  === true,                                             '[E-02] ready=true');
assert(ready.real_tag_verified  === true,                                             '[E-03] real_tag_verified=true');
assert(ready.stable_review_phase_allowed === true,                                    '[E-04] stable_review_phase_allowed=true');
assert(ready.stable_promoted    === false,                                            '[E-05] stable_promoted=false still');
assert(ready.deploy_performed   === false,                                            '[E-06] deploy=false');
assert(ready.release_performed  === false,                                            '[E-07] release=false');
assert(ready.target_tag         === 'v1.0.0',                                         '[E-08] target_tag preserved');
assert(ready.next_phase_recommended === 'stable_review_contract',                     '[E-09] next_phase=stable_review_contract');

// ─── Suite F: Validate ────────────────────────────────────────────
console.log('\n[Suite F] Validate');
assert(validateRealTagStableReviewEligibility(fix).length === 0,                     '[F-01] fixture passes');
assert(validateRealTagStableReviewEligibility(null).length > 0,                      '[F-02] null fails');
assert(validateRealTagStableReviewEligibility({ ...fix, stable_promoted: true }).length > 0,  '[F-03] stable=true fails');
assert(validateRealTagStableReviewEligibility({ ...fix, stable_review_phase_allowed: true, real_tag_verified: false }).length > 0, '[F-04] allowed without verified fails');
assert(validateRealTagStableReviewEligibility(ready).length === 0,                   '[F-05] ready passes');

// ─── Suite G: Render ─────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderRealTagStableReviewEligibilityGate(fix);
assert(typeof rendered === 'string',                                                  '[G-01] returns string');
assert(rendered.includes('STABLE_REVIEW_ELIGIBILITY_READY_FOR_STABLE_REVIEW_PHASE'), '[G-02] status in output');
assert(rendered.includes('stable_promoted              : false'),                    '[G-03] stable=false in output');
assert(rendered.includes('stable_review_phase_allowed  : true'),                     '[G-04] allowed=true in fixture output');
assert(rendered.includes('actual_real_tag_created      : false'),                    '[G-05] actual_tag=false in output');
assert(renderRealTagStableReviewEligibilityGate(null) === 'real_tag_stable_review_eligibility_gate: null', '[G-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-stable-review-eligibility-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
