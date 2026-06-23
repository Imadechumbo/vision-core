#!/usr/bin/env node
/**
 * Human One-Shot Tag Receipt Verifier — Unit Tests V97.1
 */

import {
  RECEIPT_VERIFY_STATUSES,
  verifyHumanOneShotTagReceipt,
  validateHumanOneShotTagReceiptVerification,
  renderHumanOneShotTagReceiptVerification,
} from '../human-one-shot-tag-receipt-verifier.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-19T10:00:00.000Z';
const SHA     = 'abc1234def567890abc12345';
const GATE_DRY = { gate_ready: true, is_real_tag_receipt: false, target_tag: 'v1.0.0' };
const GATE_REAL = { gate_ready: true, is_real_tag_receipt: true,  target_tag: 'v1.0.0' };
const SNAPSHOT  = { preflight_ready: true, git_head: SHA, target_tag: 'v1.0.0' };
const PACKAGE   = { package_ready: true, git_head: SHA, target_tag: 'v1.0.0' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_VERIFY_STATUSES),                                                   '[A-01] statuses array');
assert(RECEIPT_VERIFY_STATUSES.length === 11,                                                    '[A-02] 11 statuses');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_IMPORT_GATE'),                   '[A-03] BLOCKED_IMPORT_GATE');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_SNAPSHOT'),                      '[A-04] BLOCKED_SNAPSHOT');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_COMMAND_PACKAGE'),               '[A-05] BLOCKED_COMMAND_PACKAGE');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD'),                    '[A-06] BLOCKED_LOCAL_HEAD');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_REMOTE_HEAD'),                   '[A-07] BLOCKED_REMOTE_HEAD');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_WORKTREE'),                      '[A-08] BLOCKED_WORKTREE');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_DEPLOY'),                        '[A-09] BLOCKED_DEPLOY');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_STABLE'),                        '[A-10] BLOCKED_STABLE');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_BLOCKED_RELEASE'),                       '[A-11] BLOCKED_RELEASE');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_DRY_RUN_CONFIRMED'),                     '[A-12] DRY_RUN_CONFIRMED');
assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_REAL_TAG_CONFIRMED'),                    '[A-13] REAL_TAG_CONFIRMED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = verifyHumanOneShotTagReceipt({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                  '[B-01] returns object');
assert(fix.verify_status     === 'RECEIPT_VERIFY_DRY_RUN_CONFIRMED',                            '[B-02] fixture=DRY_RUN_CONFIRMED');
assert(fix.verify_ready      === true,                                                           '[B-03] verify_ready=true');
assert(fix.schema_version    === 'v97.1',                                                        '[B-04] schema=v97.1');
assert(typeof fix.verify_id  === 'string' && fix.verify_id.length === 24,                       '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                                           '[B-06] blocking=null');
assert(fix.import_gate_verified === true,                                                        '[B-07] import_gate_verified=true');
assert(fix.snapshot_verified    === true,                                                        '[B-08] snapshot_verified=true');
assert(fix.command_package_verified === true,                                                    '[B-09] command_package_verified=true');
assert(fix.is_real_tag_verified === false,                                                       '[B-10] fixture is dry_run');
assert(fix.worktree_clean    === true,                                                           '[B-11] worktree_clean=true');
assert(fix.created_at        === TS,                                                             '[B-12] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[C-02] tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: BLOCKED_IMPORT_GATE ─────────────────────────────────
console.log('\n[Suite D] BLOCKED_IMPORT_GATE');
const bNoGate = verifyHumanOneShotTagReceipt({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoGate.verify_status  === 'RECEIPT_VERIFY_BLOCKED_IMPORT_GATE',                         '[D-01] no gate → BLOCKED_IMPORT_GATE');
assert(bNoGate.verify_ready   === false,                                                         '[D-02] ready=false');
const bBadGate = verifyHumanOneShotTagReceipt({
  fixture_mode: false,
  import_gate_result: { gate_ready: false },
  _mock_timestamp: TS,
});
assert(bBadGate.verify_status === 'RECEIPT_VERIFY_BLOCKED_IMPORT_GATE',                         '[D-03] bad gate → BLOCKED_IMPORT_GATE');

// ─── Suite E: BLOCKED_SNAPSHOT ────────────────────────────────────
console.log('\n[Suite E] BLOCKED_SNAPSHOT');
const bNoSnap = verifyHumanOneShotTagReceipt({
  fixture_mode: false,
  import_gate_result: GATE_DRY,
  _mock_timestamp: TS,
});
assert(bNoSnap.verify_status  === 'RECEIPT_VERIFY_BLOCKED_SNAPSHOT',                            '[E-01] no snapshot → BLOCKED_SNAPSHOT');
assert(bNoSnap.import_gate_verified === true,                                                    '[E-02] gate passed');

// ─── Suite F: BLOCKED_COMMAND_PACKAGE ─────────────────────────────
console.log('\n[Suite F] BLOCKED_COMMAND_PACKAGE');
const bNoPkg = verifyHumanOneShotTagReceipt({
  fixture_mode:       false,
  import_gate_result: GATE_DRY,
  snapshot_result:    SNAPSHOT,
  _mock_timestamp:    TS,
});
assert(bNoPkg.verify_status  === 'RECEIPT_VERIFY_BLOCKED_COMMAND_PACKAGE',                      '[F-01] no pkg → BLOCKED_COMMAND_PACKAGE');
assert(bNoPkg.snapshot_verified === true,                                                        '[F-02] snapshot passed');

// ─── Suite G: BLOCKED_LOCAL_HEAD (real tag) ───────────────────────
console.log('\n[Suite G] BLOCKED_LOCAL_HEAD');
const bLocalHead = verifyHumanOneShotTagReceipt({
  fixture_mode:              false,
  import_gate_result:        GATE_REAL,
  snapshot_result:           SNAPSHOT,
  command_package_result:    PACKAGE,
  observed_local_tag_head:   'wrong000',
  observed_remote_tag_head:  SHA,
  observed_worktree_clean:   true,
  _mock_timestamp:           TS,
});
assert(bLocalHead.verify_status === 'RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD',                        '[G-01] local mismatch → BLOCKED_LOCAL_HEAD');

const bNoLocal = verifyHumanOneShotTagReceipt({
  fixture_mode:           false,
  import_gate_result:     GATE_REAL,
  snapshot_result:        SNAPSHOT,
  command_package_result: PACKAGE,
  observed_worktree_clean: true,
  _mock_timestamp:        TS,
});
assert(bNoLocal.verify_status === 'RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD',                          '[G-02] no local head → BLOCKED_LOCAL_HEAD');

// ─── Suite H: BLOCKED_REMOTE_HEAD (real tag) ──────────────────────
console.log('\n[Suite H] BLOCKED_REMOTE_HEAD');
const bRemoteHead = verifyHumanOneShotTagReceipt({
  fixture_mode:              false,
  import_gate_result:        GATE_REAL,
  snapshot_result:           SNAPSHOT,
  command_package_result:    PACKAGE,
  observed_local_tag_head:   SHA,
  observed_remote_tag_head:  'deadbeef',
  observed_worktree_clean:   true,
  _mock_timestamp:           TS,
});
assert(bRemoteHead.verify_status === 'RECEIPT_VERIFY_BLOCKED_REMOTE_HEAD',                      '[H-01] remote mismatch → BLOCKED_REMOTE_HEAD');
assert(bRemoteHead.local_head_matched === true,                                                  '[H-02] local passed before remote');

// ─── Suite I: BLOCKED_WORKTREE ────────────────────────────────────
console.log('\n[Suite I] BLOCKED_WORKTREE');
const bDirty = verifyHumanOneShotTagReceipt({
  fixture_mode:           false,
  import_gate_result:     GATE_DRY,
  snapshot_result:        SNAPSHOT,
  command_package_result: PACKAGE,
  observed_worktree_clean: false,
  _mock_timestamp:        TS,
});
assert(bDirty.verify_status === 'RECEIPT_VERIFY_BLOCKED_WORKTREE',                              '[I-01] dirty → BLOCKED_WORKTREE');

// ─── Suite J: BLOCKED_DEPLOY/STABLE/RELEASE ───────────────────────
console.log('\n[Suite J] BLOCKED_DEPLOY/STABLE/RELEASE');
const bDeploy = verifyHumanOneShotTagReceipt({
  fixture_mode: false,
  import_gate_result: GATE_DRY, snapshot_result: SNAPSHOT,
  command_package_result: PACKAGE, observed_worktree_clean: true,
  observed_deploy_performed: true, _mock_timestamp: TS,
});
assert(bDeploy.verify_status === 'RECEIPT_VERIFY_BLOCKED_DEPLOY',                               '[J-01] deploy → BLOCKED_DEPLOY');

const bStable = verifyHumanOneShotTagReceipt({
  fixture_mode: false,
  import_gate_result: GATE_DRY, snapshot_result: SNAPSHOT,
  command_package_result: PACKAGE, observed_worktree_clean: true,
  observed_stable_promoted: true, _mock_timestamp: TS,
});
assert(bStable.verify_status === 'RECEIPT_VERIFY_BLOCKED_STABLE',                               '[J-02] stable → BLOCKED_STABLE');

const bRelease = verifyHumanOneShotTagReceipt({
  fixture_mode: false,
  import_gate_result: GATE_DRY, snapshot_result: SNAPSHOT,
  command_package_result: PACKAGE, observed_worktree_clean: true,
  observed_release_performed: true, _mock_timestamp: TS,
});
assert(bRelease.verify_status === 'RECEIPT_VERIFY_BLOCKED_RELEASE',                             '[J-03] release → BLOCKED_RELEASE');

// ─── Suite K: DRY_RUN_CONFIRMED ───────────────────────────────────
console.log('\n[Suite K] DRY_RUN_CONFIRMED');
const dryConf = verifyHumanOneShotTagReceipt({
  fixture_mode:           false,
  import_gate_result:     GATE_DRY,
  snapshot_result:        SNAPSHOT,
  command_package_result: PACKAGE,
  observed_worktree_clean: true,
  _mock_timestamp:        TS,
});
assert(dryConf.verify_status      === 'RECEIPT_VERIFY_DRY_RUN_CONFIRMED',                       '[K-01] dry-run → DRY_RUN_CONFIRMED');
assert(dryConf.verify_ready       === true,                                                      '[K-02] ready=true');
assert(dryConf.is_real_tag_verified === false,                                                   '[K-03] is_real_tag=false');
assert(dryConf.actual_real_tag_created === false,                                                '[K-04] actual_tag=false');

// ─── Suite L: REAL_TAG_CONFIRMED ──────────────────────────────────
console.log('\n[Suite L] REAL_TAG_CONFIRMED');
const realConf = verifyHumanOneShotTagReceipt({
  fixture_mode:              false,
  import_gate_result:        GATE_REAL,
  snapshot_result:           SNAPSHOT,
  command_package_result:    PACKAGE,
  observed_local_tag_head:   SHA,
  observed_remote_tag_head:  SHA,
  observed_worktree_clean:   true,
  _mock_timestamp:           TS,
});
assert(realConf.verify_status      === 'RECEIPT_VERIFY_REAL_TAG_CONFIRMED',                     '[L-01] real tag → REAL_TAG_CONFIRMED');
assert(realConf.verify_ready       === true,                                                     '[L-02] ready=true');
assert(realConf.is_real_tag_verified === true,                                                   '[L-03] is_real_tag=true');
assert(realConf.local_head_matched  === true,                                                    '[L-04] local_head_matched=true');
assert(realConf.remote_head_matched === true,                                                    '[L-05] remote_head_matched=true');
assert(realConf.actual_real_tag_created === false,                                               '[L-06] actual_real_tag_created=false (verifier records, not executes)');

// ─── Suite M: Deterministic ID ────────────────────────────────────
console.log('\n[Suite M] Deterministic ID');
const m1 = verifyHumanOneShotTagReceipt({ fixture_mode: true, _mock_timestamp: TS });
const m2 = verifyHumanOneShotTagReceipt({ fixture_mode: true, _mock_timestamp: TS });
assert(m1.verify_id === m2.verify_id,                                                            '[M-01] deterministic id');

// ─── Suite N: Validate + Render ───────────────────────────────────
console.log('\n[Suite N] Validate + Render');
assert(validateHumanOneShotTagReceiptVerification(fix).length === 0,                            '[N-01] fixture passes validation');
assert(validateHumanOneShotTagReceiptVerification(null).length > 0,                             '[N-02] null fails validation');
const mut = { ...fix, actual_real_tag_created: true };
assert(validateHumanOneShotTagReceiptVerification(mut).length > 0,                              '[N-03] actual_tag=true fails');
const rendered = renderHumanOneShotTagReceiptVerification(fix);
assert(typeof rendered === 'string',                                                             '[N-04] render returns string');
assert(rendered.includes('RECEIPT_VERIFY_DRY_RUN_CONFIRMED'),                                   '[N-05] status in output');
assert(rendered.includes('actual_real_tag_created   : false'),                                  '[N-06] actual_tag=false in output');
assert(rendered.includes('deploy_performed          : false'),                                   '[N-07] deploy=false in output');
assert(renderHumanOneShotTagReceiptVerification(null) === 'human_one_shot_tag_receipt_verifier: null', '[N-08] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nhuman-one-shot-tag-receipt-verifier: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
