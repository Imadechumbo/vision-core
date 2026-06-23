#!/usr/bin/env node
/**
 * Final One-Tag Human Command Package — Unit Tests V96.1
 */

import {
  COMMAND_PACKAGE_STATUSES,
  buildFinalOneTagHumanCommandPackage,
  validateFinalOneTagHumanCommandPackage,
  renderFinalOneTagHumanCommandPackage,
} from '../final-one-tag-human-command-package.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS       = '2026-05-19T08:00:00.000Z';
const SHA      = 'abc1234def567890abc12345';
const SNAPSHOT = {
  preflight_ready:    true,
  snapshot_id:        'snap-id-000000000000000000000000',
  target_tag:         'v1.0.0',
  git_head:           SHA,
  evidence_receipt_id: 'receipt-001',
  rollback_anchor_id: 'anchor-001',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(COMMAND_PACKAGE_STATUSES),                                                  '[A-01] statuses array');
assert(COMMAND_PACKAGE_STATUSES.length === 4,                                                    '[A-02] 4 statuses');
assert(COMMAND_PACKAGE_STATUSES.includes('COMMAND_PACKAGE_BLOCKED_SNAPSHOT'),                    '[A-03] BLOCKED_SNAPSHOT');
assert(COMMAND_PACKAGE_STATUSES.includes('COMMAND_PACKAGE_BLOCKED_COMMANDS'),                    '[A-04] BLOCKED_COMMANDS');
assert(COMMAND_PACKAGE_STATUSES.includes('COMMAND_PACKAGE_BLOCKED_ROLLBACK'),                    '[A-05] BLOCKED_ROLLBACK');
assert(COMMAND_PACKAGE_STATUSES.includes('COMMAND_PACKAGE_READY_FOR_HUMAN_ONE_TAG_OPERATION'),   '[A-06] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildFinalOneTagHumanCommandPackage({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                  '[B-01] returns object');
assert(fix.package_status    === 'COMMAND_PACKAGE_READY_FOR_HUMAN_ONE_TAG_OPERATION',            '[B-02] READY status');
assert(fix.package_ready     === true,                                                           '[B-03] package_ready=true');
assert(fix.schema_version    === 'v96.1',                                                        '[B-04] schema=v96.1');
assert(typeof fix.command_package_id === 'string' && fix.command_package_id.length === 24,      '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                                           '[B-06] blocking=null');
assert(fix.human_must_run_manually === true,                                                     '[B-07] human_must_run_manually=true');
assert(fix.copy_paste_safe   === true,                                                           '[B-08] copy_paste_safe=true');
assert(Array.isArray(fix.preflight_commands) && fix.preflight_commands.length >= 4,             '[B-09] preflight_commands array');
assert(Array.isArray(fix.real_tag_commands)  && fix.real_tag_commands.length >= 2,              '[B-10] real_tag_commands array');
assert(Array.isArray(fix.verification_commands) && fix.verification_commands.length >= 3,       '[B-11] verification_commands array');
assert(Array.isArray(fix.rollback_commands)  && fix.rollback_commands.length >= 2,              '[B-12] rollback_commands array');
assert(fix.human_receipt_template !== null && typeof fix.human_receipt_template === 'object',   '[B-13] receipt template object');
assert(Array.isArray(fix.forbidden_commands) && fix.forbidden_commands.length >= 5,             '[B-14] forbidden_commands array');
assert(typeof fix.command_block === 'string' && fix.command_block.length > 0,                   '[B-15] command_block string');
assert(fix.created_at === TS,                                                                    '[B-16] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ─────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Commands content ────────────────────────────────────
console.log('\n[Suite D] Commands content');
assert(fix.real_tag_commands.some(c => c.includes('git tag -a')),                               '[D-01] tag command present');
assert(fix.real_tag_commands.some(c => c.includes('git push origin refs/tags/')),               '[D-02] push command present');
assert(fix.verification_commands.some(c => c.includes('git rev-parse')),                        '[D-03] rev-parse present');
assert(fix.verification_commands.some(c => c.includes('ls-remote')),                            '[D-04] ls-remote present');
assert(fix.rollback_commands.some(c => c.includes('git tag -d')),                               '[D-05] tag delete in rollback');
assert(fix.rollback_commands.some(c => c.includes('git push origin :refs/tags/')),              '[D-06] remote delete in rollback');
assert(fix.forbidden_commands.includes('deploy'),                                                '[D-07] deploy forbidden');
assert(fix.forbidden_commands.includes('stable_promotion'),                                      '[D-08] stable_promotion forbidden');
assert(fix.forbidden_commands.includes('release_creation'),                                      '[D-09] release_creation forbidden');
assert(fix.command_block.includes('git tag -a'),                                                 '[D-10] command_block has tag cmd');

// ─── Suite E: Receipt template ────────────────────────────────────
console.log('\n[Suite E] Receipt template');
const t = fix.human_receipt_template;
assert(t.schema_version    === 'v97.0',                                                          '[E-01] template schema=v97.0');
assert('target_tag'        in t,                                                                 '[E-02] target_tag field');
assert('git_head'          in t,                                                                 '[E-03] git_head field');
assert('evidence_receipt_id' in t,                                                              '[E-04] evidence_receipt_id field');
assert('rollback_anchor_id' in t,                                                               '[E-05] rollback_anchor_id field');
assert('executed_by'       in t,                                                                 '[E-06] executed_by field');
assert('executed_at'       in t,                                                                 '[E-07] executed_at field');
assert(t.deploy_performed  === false,                                                            '[E-08] template deploy=false');
assert(t.stable_promoted   === false,                                                            '[E-09] template stable=false');
assert(t.release_performed === false,                                                            '[E-10] template release=false');

// ─── Suite F: BLOCKED_SNAPSHOT ────────────────────────────────────
console.log('\n[Suite F] BLOCKED_SNAPSHOT');
const bNoSnap = buildFinalOneTagHumanCommandPackage({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoSnap.package_status  === 'COMMAND_PACKAGE_BLOCKED_SNAPSHOT',                          '[F-01] no snapshot → BLOCKED_SNAPSHOT');
assert(bNoSnap.package_ready   === false,                                                        '[F-02] ready=false');
assert(bNoSnap.tag_created     === false,                                                        '[F-03] tag_created=false');

const bBadSnap = buildFinalOneTagHumanCommandPackage({
  fixture_mode:    false,
  snapshot_result: { preflight_ready: false },
  _mock_timestamp: TS,
});
assert(bBadSnap.package_status === 'COMMAND_PACKAGE_BLOCKED_SNAPSHOT',                          '[F-04] bad snapshot → BLOCKED_SNAPSHOT');

// ─── Suite G: BLOCKED_COMMANDS ────────────────────────────────────
console.log('\n[Suite G] BLOCKED_COMMANDS');
const bNoTag = buildFinalOneTagHumanCommandPackage({
  fixture_mode:    false,
  snapshot_result: { preflight_ready: true, git_head: SHA, rollback_anchor_id: 'anc' },
  _mock_timestamp: TS,
});
assert(bNoTag.package_status === 'COMMAND_PACKAGE_BLOCKED_COMMANDS',                            '[G-01] no target_tag → BLOCKED_COMMANDS');

// ─── Suite H: BLOCKED_ROLLBACK ────────────────────────────────────
console.log('\n[Suite H] BLOCKED_ROLLBACK');
const bNoRollback = buildFinalOneTagHumanCommandPackage({
  fixture_mode:    false,
  snapshot_result: { preflight_ready: true, target_tag: 'v1.0.0', git_head: SHA },
  _mock_timestamp: TS,
});
assert(bNoRollback.package_status === 'COMMAND_PACKAGE_BLOCKED_ROLLBACK',                       '[H-01] no rollback → BLOCKED_ROLLBACK');
assert(bNoRollback.rollback_anchor_id === null,                                                  '[H-02] rollback_anchor_id=null');

// ─── Suite I: Non-fixture READY ───────────────────────────────────
console.log('\n[Suite I] Non-fixture READY');
const ready = buildFinalOneTagHumanCommandPackage({
  fixture_mode:    false,
  snapshot_result: SNAPSHOT,
  _mock_timestamp: TS,
});
assert(ready.package_status  === 'COMMAND_PACKAGE_READY_FOR_HUMAN_ONE_TAG_OPERATION',           '[I-01] non-fixture READY');
assert(ready.package_ready   === true,                                                           '[I-02] ready=true');
assert(ready.target_tag      === 'v1.0.0',                                                      '[I-03] target_tag propagated');
assert(ready.rollback_anchor_id === 'anchor-001',                                               '[I-04] rollback propagated');
assert(ready.snapshot_id     === SNAPSHOT.snapshot_id,                                          '[I-05] snapshot_id propagated');
assert(ready.snapshot_verified === true,                                                         '[I-06] snapshot_verified=true');

// ─── Suite J: Deterministic ID ────────────────────────────────────
console.log('\n[Suite J] Deterministic ID');
const j1 = buildFinalOneTagHumanCommandPackage({ fixture_mode: true, _mock_timestamp: TS });
const j2 = buildFinalOneTagHumanCommandPackage({ fixture_mode: true, _mock_timestamp: TS });
assert(j1.command_package_id === j2.command_package_id,                                         '[J-01] deterministic id');

// ─── Suite K: Validate ────────────────────────────────────────────
console.log('\n[Suite K] Validate');
assert(validateFinalOneTagHumanCommandPackage(fix).length === 0,                                '[K-01] fixture passes validation');
assert(validateFinalOneTagHumanCommandPackage(null).length > 0,                                 '[K-02] null fails validation');
const mut = { ...fix, tag_created: true };
assert(validateFinalOneTagHumanCommandPackage(mut).length > 0,                                  '[K-03] tag_created=true fails');

// ─── Suite L: Render ─────────────────────────────────────────────
console.log('\n[Suite L] Render');
const rendered = renderFinalOneTagHumanCommandPackage(fix);
assert(typeof rendered === 'string',                                                             '[L-01] returns string');
assert(rendered.includes('COMMAND_PACKAGE_READY_FOR_HUMAN_ONE_TAG_OPERATION'),                  '[L-02] status in output');
assert(rendered.includes('tag_created             : false'),                                     '[L-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created : false'),                                     '[L-04] actual_tag=false');
assert(rendered.includes('human_must_run_manually : true'),                                      '[L-05] human_manual=true');
assert(rendered.includes('BLOCKED: deploy'),                                                     '[L-06] deploy blocked in output');
assert(rendered.includes('git tag -a'),                                                          '[L-07] tag cmd in output');
assert(renderFinalOneTagHumanCommandPackage(null) === 'final_one_tag_human_command_package: null', '[L-08] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nfinal-one-tag-human-command-package: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
