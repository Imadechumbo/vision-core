#!/usr/bin/env node
/**
 * Real Tag Verified State Classifier — Unit Tests V103.0
 */

import {
  VERIFIED_STATE_STATUSES,
  classifyRealTagVerifiedState,
  validateRealTagVerifiedState,
  renderRealTagVerifiedStateClassifier,
} from '../real-tag-verified-state-classifier.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS  = '2026-05-19T17:00:00.000Z';
const SHA = 'abc1234def567890abc12345';

const DRY_IMPORT  = { import_ready: true, import_status: 'MANUAL_RECEIPT_IMPORT_DRY_RUN',  is_real_tag: false, target_tag: 'v1.0.0', git_head: SHA };
const REAL_IMPORT = { import_ready: true, import_status: 'MANUAL_RECEIPT_IMPORT_REAL_TAG', is_real_tag: true,  target_tag: 'v1.0.0', git_head: SHA };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(VERIFIED_STATE_STATUSES),                                        '[A-01] statuses array');
assert(VERIFIED_STATE_STATUSES.length === 5,                                          '[A-02] 5 statuses');
assert(VERIFIED_STATE_STATUSES.includes('VERIFIED_STATE_BLOCKED_IMPORT'),             '[A-03] BLOCKED_IMPORT');
assert(VERIFIED_STATE_STATUSES.includes('VERIFIED_STATE_COMMAND_SEALED'),             '[A-04] COMMAND_SEALED');
assert(VERIFIED_STATE_STATUSES.includes('VERIFIED_STATE_DRY_RUN_IMPORTED'),           '[A-05] DRY_RUN_IMPORTED');
assert(VERIFIED_STATE_STATUSES.includes('VERIFIED_STATE_REAL_TAG_IMPORTED'),          '[A-06] REAL_TAG_IMPORTED');
assert(VERIFIED_STATE_STATUSES.includes('VERIFIED_STATE_REAL_TAG_VERIFIED'),          '[A-07] REAL_TAG_VERIFIED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = classifyRealTagVerifiedState({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.verified_state        === 'VERIFIED_STATE_DRY_RUN_IMPORTED',              '[B-02] fixture=DRY_RUN_IMPORTED');
assert(fix.state_ready           === true,                                            '[B-03] state_ready=true');
assert(fix.schema_version        === 'v103.0',                                        '[B-04] schema=v103.0');
assert(typeof fix.state_id === 'string' && fix.state_id.length === 24,               '[B-05] id 24 chars');
assert(fix.blocking_reason       === null,                                            '[B-06] blocking=null');
assert(fix.real_tag_verified     === false,                                           '[B-07] fixture dry-run: real_tag_verified=false');
assert(fix.stable_review_eligible === false,                                          '[B-08] fixture dry-run: stable_review_eligible=false');
assert(Array.isArray(fix.safe_next_actions) && fix.safe_next_actions.length >= 1,    '[B-09] safe_next_actions array');
assert(Array.isArray(fix.blocked_actions) && fix.blocked_actions.length >= 3,        '[B-10] blocked_actions array');
assert(fix.created_at            === TS,                                              '[B-11] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[C-02] tag_created=false');
assert(fix.stable_promoted              === false, '[C-03] stable_promoted=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.release_performed            === false, '[C-05] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-06] real_execution_not_performed=true');

// ─── Suite D: BLOCKED_IMPORT ──────────────────────────────────────
console.log('\n[Suite D] BLOCKED_IMPORT');
const bNoImport = classifyRealTagVerifiedState({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoImport.verified_state === 'VERIFIED_STATE_BLOCKED_IMPORT',                 '[D-01] no import → BLOCKED_IMPORT');
assert(bNoImport.state_ready    === false,                                            '[D-02] ready=false');
const bBadImport = classifyRealTagVerifiedState({
  fixture_mode: false, import_result: { import_ready: false }, _mock_timestamp: TS,
});
assert(bBadImport.verified_state === 'VERIFIED_STATE_BLOCKED_IMPORT',                '[D-03] bad import → BLOCKED_IMPORT');

// ─── Suite E: DRY_RUN_IMPORTED ────────────────────────────────────
console.log('\n[Suite E] DRY_RUN_IMPORTED');
const dryState = classifyRealTagVerifiedState({
  fixture_mode: false, import_result: DRY_IMPORT, _mock_timestamp: TS,
});
assert(dryState.verified_state         === 'VERIFIED_STATE_DRY_RUN_IMPORTED',        '[E-01] dry-run → DRY_RUN_IMPORTED');
assert(dryState.state_ready            === true,                                      '[E-02] ready=true');
assert(dryState.real_tag_verified      === false,                                     '[E-03] real_tag_verified=false');
assert(dryState.stable_review_eligible === false,                                     '[E-04] stable_review_eligible=false');
assert(dryState.target_tag             === 'v1.0.0',                                  '[E-05] target_tag preserved');
assert(dryState.stable_promoted        === false,                                     '[E-06] stable=false');

// ─── Suite F: REAL_TAG_VERIFIED ───────────────────────────────────
console.log('\n[Suite F] REAL_TAG_VERIFIED');
const realState = classifyRealTagVerifiedState({
  fixture_mode: false, import_result: REAL_IMPORT, _mock_timestamp: TS,
});
assert(realState.verified_state         === 'VERIFIED_STATE_REAL_TAG_VERIFIED',      '[F-01] real tag → REAL_TAG_VERIFIED');
assert(realState.state_ready            === true,                                     '[F-02] ready=true');
assert(realState.real_tag_verified      === true,                                     '[F-03] real_tag_verified=true');
assert(realState.stable_review_eligible === true,                                     '[F-04] stable_review_eligible=true');
assert(realState.stable_promoted        === false,                                    '[F-05] stable=false even when verified');
assert(realState.deploy_performed       === false,                                    '[F-06] deploy=false');
assert(realState.actual_real_tag_created === false,                                   '[F-07] actual_tag=false');

// ─── Suite G: stable_review_eligible guard ────────────────────────
console.log('\n[Suite G] stable_review_eligible guard');
assert(dryState.stable_review_eligible  === false,                                   '[G-01] dry-run: not eligible');
assert(realState.stable_review_eligible === true,                                    '[G-02] real tag: eligible');
assert(realState.stable_promoted        === false,                                   '[G-03] eligible != promoted');

// ─── Suite H: Validate ────────────────────────────────────────────
console.log('\n[Suite H] Validate');
assert(validateRealTagVerifiedState(fix).length === 0,                               '[H-01] fixture passes');
assert(validateRealTagVerifiedState(null).length > 0,                                '[H-02] null fails');
assert(validateRealTagVerifiedState({ ...fix, stable_promoted: true }).length > 0,   '[H-03] stable=true fails');
assert(validateRealTagVerifiedState({ ...fix, stable_review_eligible: true, real_tag_verified: false }).length > 0, '[H-04] eligible without verified fails');
assert(validateRealTagVerifiedState(realState).length === 0,                         '[H-05] real state passes');

// ─── Suite I: Render ─────────────────────────────────────────────
console.log('\n[Suite I] Render');
const rendered = renderRealTagVerifiedStateClassifier(fix);
assert(typeof rendered === 'string',                                                  '[I-01] returns string');
assert(rendered.includes('VERIFIED_STATE_DRY_RUN_IMPORTED'),                        '[I-02] status in output');
assert(rendered.includes('stable_promoted          : false'),                        '[I-03] stable=false in output');
assert(rendered.includes('actual_real_tag_created  : false'),                        '[I-04] actual_tag=false in output');
assert(rendered.includes('SAFE NEXT ACTIONS'),                                       '[I-05] safe actions section');
assert(rendered.includes('BLOCKED: auto_stable_promotion'),                          '[I-06] blocked actions present');
assert(renderRealTagVerifiedStateClassifier(null) === 'real_tag_verified_state_classifier: null', '[I-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-verified-state-classifier: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
