#!/usr/bin/env node
/**
 * Human One-Shot Tag Receipt Import Gate — Unit Tests V97.0
 */

import {
  IMPORT_GATE_STATUSES,
  evaluateHumanOneShotTagReceiptImportGate,
  validateHumanOneShotTagReceiptImportGate,
  renderHumanOneShotTagReceiptImportGate,
} from '../human-one-shot-tag-receipt-import-gate.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-19T09:00:00.000Z';
const SHA     = 'abc1234def567890abc12345';
const PACKAGE = {
  package_ready:       true,
  command_package_id:  'pkg-id-000000000000000000000000',
  target_tag:          'v1.0.0',
  git_head:            SHA,
  evidence_receipt_id: 'receipt-001',
  rollback_anchor_id:  'anchor-001',
};
const DRY_RUN_RECEIPT = {
  human_receipt_id:     'hr-001',
  schema_version:       'v97.0',
  target_tag:           'v1.0.0',
  git_head:             SHA,
  evidence_receipt_id:  'receipt-001',
  rollback_anchor_id:   'anchor-001',
  executed_by:          'operator',
  executed_at:          TS,
  tag_created:          false,
  git_push_performed:   false,
  local_tag_verified:   false,
  remote_tag_verified:  false,
  local_tag_head:       null,
  remote_tag_head:      null,
  deploy_performed:     false,
  stable_promoted:      false,
  release_performed:    false,
};
const REAL_TAG_RECEIPT = {
  ...DRY_RUN_RECEIPT,
  tag_created:         true,
  git_push_performed:  true,
  local_tag_verified:  true,
  remote_tag_verified: true,
  local_tag_head:      SHA,
  remote_tag_head:     SHA,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(IMPORT_GATE_STATUSES),                                                      '[A-01] statuses array');
assert(IMPORT_GATE_STATUSES.length === 11,                                                       '[A-02] 11 statuses');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_COMMAND_PACKAGE'),                     '[A-03] BLOCKED_COMMAND_PACKAGE');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_MISSING_RECEIPT'),                     '[A-04] BLOCKED_MISSING_RECEIPT');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_TAG'),                                 '[A-05] BLOCKED_TAG');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_HEAD'),                                '[A-06] BLOCKED_HEAD');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_EVIDENCE'),                            '[A-07] BLOCKED_EVIDENCE');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_ROLLBACK'),                            '[A-08] BLOCKED_ROLLBACK');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_DEPLOY'),                              '[A-09] BLOCKED_DEPLOY');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_STABLE'),                              '[A-10] BLOCKED_STABLE');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_BLOCKED_RELEASE'),                             '[A-11] BLOCKED_RELEASE');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_READY_DRY_RUN_RECEIPT'),                       '[A-12] READY_DRY_RUN_RECEIPT');
assert(IMPORT_GATE_STATUSES.includes('IMPORT_GATE_READY_REAL_TAG_RECEIPT'),                      '[A-13] READY_REAL_TAG_RECEIPT');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateHumanOneShotTagReceiptImportGate({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                  '[B-01] returns object');
assert(fix.gate_status      === 'IMPORT_GATE_READY_DRY_RUN_RECEIPT',                            '[B-02] fixture=DRY_RUN_RECEIPT');
assert(fix.gate_ready       === true,                                                            '[B-03] gate_ready=true');
assert(fix.schema_version   === 'v97.0',                                                         '[B-04] schema=v97.0');
assert(typeof fix.gate_id   === 'string' && fix.gate_id.length === 24,                          '[B-05] id 24 chars');
assert(fix.blocking_reason  === null,                                                            '[B-06] blocking=null');
assert(fix.package_verified === true,                                                            '[B-07] package_verified=true');
assert(fix.receipt_verified === true,                                                            '[B-08] receipt_verified=true');
assert(fix.is_real_tag_receipt === false,                                                        '[B-09] fixture is dry_run');
assert(fix.created_at       === TS,                                                              '[B-10] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.deploy_performed             === false, '[C-02] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-03] stable_promoted=false');
assert(fix.release_performed            === false, '[C-04] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-05] real_execution_not_performed=true');

// ─── Suite D: BLOCKED_COMMAND_PACKAGE ─────────────────────────────
console.log('\n[Suite D] BLOCKED_COMMAND_PACKAGE');
const bNoPkg = evaluateHumanOneShotTagReceiptImportGate({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoPkg.gate_status   === 'IMPORT_GATE_BLOCKED_COMMAND_PACKAGE',                          '[D-01] no package → BLOCKED_COMMAND_PACKAGE');
assert(bNoPkg.gate_ready    === false,                                                           '[D-02] ready=false');
const bBadPkg = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode: false,
  command_package_result: { package_ready: false },
  _mock_timestamp: TS,
});
assert(bBadPkg.gate_status  === 'IMPORT_GATE_BLOCKED_COMMAND_PACKAGE',                          '[D-03] bad pkg → BLOCKED_COMMAND_PACKAGE');

// ─── Suite E: BLOCKED_MISSING_RECEIPT ─────────────────────────────
console.log('\n[Suite E] BLOCKED_MISSING_RECEIPT');
const bNoReceipt = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  _mock_timestamp:        TS,
});
assert(bNoReceipt.gate_status === 'IMPORT_GATE_BLOCKED_MISSING_RECEIPT',                        '[E-01] no receipt → BLOCKED_MISSING_RECEIPT');
assert(bNoReceipt.package_verified === true,                                                     '[E-02] package passed');

// ─── Suite F: BLOCKED_TAG ─────────────────────────────────────────
console.log('\n[Suite F] BLOCKED_TAG');
const bBadTag = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          { ...DRY_RUN_RECEIPT, target_tag: 'v9.9.9' },
  _mock_timestamp:        TS,
});
assert(bBadTag.gate_status === 'IMPORT_GATE_BLOCKED_TAG',                                       '[F-01] tag mismatch → BLOCKED_TAG');

// ─── Suite G: BLOCKED_HEAD ────────────────────────────────────────
console.log('\n[Suite G] BLOCKED_HEAD');
const bBadHead = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          { ...DRY_RUN_RECEIPT, git_head: 'deadbeef' },
  _mock_timestamp:        TS,
});
assert(bBadHead.gate_status === 'IMPORT_GATE_BLOCKED_HEAD',                                     '[G-01] head mismatch → BLOCKED_HEAD');
assert(bBadHead.tag_matched === true,                                                            '[G-02] tag passed before head');

// ─── Suite H: BLOCKED_EVIDENCE ────────────────────────────────────
console.log('\n[Suite H] BLOCKED_EVIDENCE');
const bBadEvidence = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          { ...DRY_RUN_RECEIPT, evidence_receipt_id: 'wrong-receipt' },
  _mock_timestamp:        TS,
});
assert(bBadEvidence.gate_status === 'IMPORT_GATE_BLOCKED_EVIDENCE',                             '[H-01] evidence mismatch → BLOCKED_EVIDENCE');

// ─── Suite I: BLOCKED_ROLLBACK ────────────────────────────────────
console.log('\n[Suite I] BLOCKED_ROLLBACK');
const bBadRollback = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          { ...DRY_RUN_RECEIPT, rollback_anchor_id: 'wrong-anchor' },
  _mock_timestamp:        TS,
});
assert(bBadRollback.gate_status === 'IMPORT_GATE_BLOCKED_ROLLBACK',                             '[I-01] rollback mismatch → BLOCKED_ROLLBACK');

// ─── Suite J: BLOCKED_DEPLOY ──────────────────────────────────────
console.log('\n[Suite J] BLOCKED_DEPLOY');
const bDeploy = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          { ...DRY_RUN_RECEIPT, deploy_performed: true },
  _mock_timestamp:        TS,
});
assert(bDeploy.gate_status === 'IMPORT_GATE_BLOCKED_DEPLOY',                                    '[J-01] deploy=true → BLOCKED_DEPLOY');

// ─── Suite K: BLOCKED_STABLE ──────────────────────────────────────
console.log('\n[Suite K] BLOCKED_STABLE');
const bStable = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          { ...DRY_RUN_RECEIPT, stable_promoted: true },
  _mock_timestamp:        TS,
});
assert(bStable.gate_status === 'IMPORT_GATE_BLOCKED_STABLE',                                    '[K-01] stable=true → BLOCKED_STABLE');

// ─── Suite L: BLOCKED_RELEASE ─────────────────────────────────────
console.log('\n[Suite L] BLOCKED_RELEASE');
const bRelease = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          { ...DRY_RUN_RECEIPT, release_performed: true },
  _mock_timestamp:        TS,
});
assert(bRelease.gate_status === 'IMPORT_GATE_BLOCKED_RELEASE',                                  '[L-01] release=true → BLOCKED_RELEASE');

// ─── Suite M: DRY_RUN_RECEIPT ready ───────────────────────────────
console.log('\n[Suite M] DRY_RUN_RECEIPT ready');
const dryReady = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          DRY_RUN_RECEIPT,
  _mock_timestamp:        TS,
});
assert(dryReady.gate_status       === 'IMPORT_GATE_READY_DRY_RUN_RECEIPT',                      '[M-01] dry-run receipt → READY_DRY_RUN_RECEIPT');
assert(dryReady.gate_ready        === true,                                                      '[M-02] gate_ready=true');
assert(dryReady.is_real_tag_receipt === false,                                                   '[M-03] is_real_tag=false');
assert(dryReady.actual_real_tag_created === false,                                               '[M-04] actual_tag=false');

// ─── Suite N: REAL_TAG_RECEIPT ready ──────────────────────────────
console.log('\n[Suite N] REAL_TAG_RECEIPT ready');
const realReady = evaluateHumanOneShotTagReceiptImportGate({
  fixture_mode:           false,
  command_package_result: PACKAGE,
  human_receipt:          REAL_TAG_RECEIPT,
  _mock_timestamp:        TS,
});
assert(realReady.gate_status       === 'IMPORT_GATE_READY_REAL_TAG_RECEIPT',                    '[N-01] real tag receipt → READY_REAL_TAG_RECEIPT');
assert(realReady.gate_ready        === true,                                                     '[N-02] gate_ready=true');
assert(realReady.is_real_tag_receipt === true,                                                   '[N-03] is_real_tag=true');
assert(realReady.actual_real_tag_created === false,                                              '[N-04] actual_real_tag_created still false (gate records, not executes)');
assert(realReady.receipt_tag_created === true,                                                   '[N-05] receipt_tag_created=true (from receipt)');

// ─── Suite O: Deterministic ID ────────────────────────────────────
console.log('\n[Suite O] Deterministic ID');
const o1 = evaluateHumanOneShotTagReceiptImportGate({ fixture_mode: true, _mock_timestamp: TS });
const o2 = evaluateHumanOneShotTagReceiptImportGate({ fixture_mode: true, _mock_timestamp: TS });
assert(o1.gate_id === o2.gate_id,                                                                '[O-01] deterministic id');

// ─── Suite P: Validate + Render ───────────────────────────────────
console.log('\n[Suite P] Validate + Render');
assert(validateHumanOneShotTagReceiptImportGate(fix).length === 0,                              '[P-01] fixture passes validation');
assert(validateHumanOneShotTagReceiptImportGate(null).length > 0,                               '[P-02] null fails validation');
const rendered = renderHumanOneShotTagReceiptImportGate(fix);
assert(typeof rendered === 'string',                                                             '[P-03] render returns string');
assert(rendered.includes('IMPORT_GATE_READY_DRY_RUN_RECEIPT'),                                  '[P-04] status in output');
assert(rendered.includes('actual_real_tag_created    : false'),                                  '[P-05] actual_tag=false in output');
assert(rendered.includes('deploy_performed           : false'),                                  '[P-06] deploy=false in output');
assert(renderHumanOneShotTagReceiptImportGate(null) === 'human_one_shot_tag_receipt_import_gate: null', '[P-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nhuman-one-shot-tag-receipt-import-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
