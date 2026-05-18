#!/usr/bin/env node
/**
 * Real Tag Manual Command Builder — Unit Tests V82.1
 */

import {
  buildRealTagManualCommands,
  validateRealTagManualCommands,
  renderRealTagManualCommandPreview,
  MANUAL_COMMAND_BUILDER_STATUSES,
} from '../real-tag-manual-command-builder.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T18:30:00.000Z';

const READY_LOCK = {
  safety_lock_ready: true,
  target_tag: 'v3.0.0',
  target_git_head: 'cafebabe1234567890123456789012345678beef',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_COMMAND_BUILDER_STATUSES),                               '[A-01] statuses array');
assert(MANUAL_COMMAND_BUILDER_STATUSES.length === 4,                                 '[A-02] 4 statuses');
assert(MANUAL_COMMAND_BUILDER_STATUSES.includes('MANUAL_COMMAND_BLOCKED_SAFETY_LOCK'), '[A-03] BLOCKED_SAFETY_LOCK');
assert(MANUAL_COMMAND_BUILDER_STATUSES.includes('MANUAL_COMMAND_BLOCKED_TAG'),       '[A-04] BLOCKED_TAG');
assert(MANUAL_COMMAND_BUILDER_STATUSES.includes('MANUAL_COMMAND_BLOCKED_HEAD'),      '[A-05] BLOCKED_HEAD');
assert(MANUAL_COMMAND_BUILDER_STATUSES.includes('MANUAL_COMMAND_READY_PREVIEW'),     '[A-06] READY_PREVIEW');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagManualCommands({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version       === 'v82.1',                                         '[B-02] schema=v82.1');
assert(fix.command_builder_status === 'MANUAL_COMMAND_READY_PREVIEW',               '[B-03] READY_PREVIEW');
assert(fix.command_preview_ready === true,                                           '[B-04] preview_ready=true');
assert(typeof fix.builder_id === 'string' && fix.builder_id.length === 24,          '[B-05] id 24 chars');
assert(fix.blocking_reason      === null,                                            '[B-06] blocking=null');
assert(fix.target_tag           === 'v1.2.3',                                        '[B-07] target_tag fixture');
assert(fix.tag_command.includes('v1.2.3'),                                           '[B-08] tag_command has tag');
assert(fix.tag_command.includes('git tag -a'),                                       '[B-09] tag_command format');
assert(fix.push_command.includes('refs/tags/v1.2.3'),                               '[B-10] push_command format');
assert(fix.rollback_tag_command.includes('git tag -d'),                             '[B-11] rollback_tag format');
assert(fix.rollback_push_command.includes(':refs/tags/'),                            '[B-12] rollback_push format');
assert(fix.created_at           === TS,                                              '[B-13] created_at=TS');
assert(fix.commands_execute_now === false,                                           '[B-14] execute_now=false');

// ─── Suite C: Blocked Safety Lock ────────────────────────────────
console.log('\n[Suite C] Blocked Safety Lock');
const blockedC1 = buildRealTagManualCommands({ _mock_timestamp: TS });
assert(blockedC1.command_builder_status === 'MANUAL_COMMAND_BLOCKED_SAFETY_LOCK',   '[C-01] null lock blocked');
assert(blockedC1.command_preview_ready  === false,                                   '[C-02] not ready');
assert(blockedC1.blocking_reason        === 'safety_lock_not_ready',                 '[C-03] reason');
assert(blockedC1.tag_command            === null,                                    '[C-04] tag_command=null when blocked');

const blockedC2 = buildRealTagManualCommands({
  safety_lock: { safety_lock_ready: false }, _mock_timestamp: TS,
});
assert(blockedC2.command_builder_status === 'MANUAL_COMMAND_BLOCKED_SAFETY_LOCK',   '[C-05] false lock blocked');

// ─── Suite D: Blocked Tag ─────────────────────────────────────────
console.log('\n[Suite D] Blocked Tag');
const blockedD1 = buildRealTagManualCommands({
  safety_lock: { safety_lock_ready: true, target_tag: null, target_git_head: 'abc' },
  _mock_timestamp: TS,
});
assert(blockedD1.command_builder_status === 'MANUAL_COMMAND_BLOCKED_TAG',           '[D-01] null tag blocked');
assert(blockedD1.blocking_reason        === 'target_tag_invalid_or_missing',         '[D-02] reason');

const blockedD2 = buildRealTagManualCommands({
  safety_lock: { safety_lock_ready: true, target_tag: '1.0.0', target_git_head: 'abc' },
  _mock_timestamp: TS,
});
assert(blockedD2.command_builder_status === 'MANUAL_COMMAND_BLOCKED_TAG',           '[D-03] no-v tag blocked');

// ─── Suite E: Blocked Head ────────────────────────────────────────
console.log('\n[Suite E] Blocked Head');
const blockedE = buildRealTagManualCommands({
  safety_lock: { safety_lock_ready: true, target_tag: 'v1.0.0', target_git_head: null },
  _mock_timestamp: TS,
});
assert(blockedE.command_builder_status === 'MANUAL_COMMAND_BLOCKED_HEAD',           '[E-01] null head blocked');
assert(blockedE.blocking_reason        === 'target_git_head_missing',                '[E-02] reason');

// ─── Suite F: Valid using lock fields ─────────────────────────────
console.log('\n[Suite F] Valid (tag/head from lock)');
const validLock = buildRealTagManualCommands({
  safety_lock: READY_LOCK, _mock_timestamp: TS,
});
assert(validLock.command_builder_status === 'MANUAL_COMMAND_READY_PREVIEW',         '[F-01] status READY');
assert(validLock.command_preview_ready  === true,                                    '[F-02] ready=true');
assert(validLock.target_tag             === READY_LOCK.target_tag,                  '[F-03] tag from lock');
assert(validLock.target_git_head        === READY_LOCK.target_git_head,             '[F-04] head from lock');
assert(validLock.tag_command.includes(READY_LOCK.target_tag),                       '[F-05] tag in command');
assert(validLock.tag_command.includes(READY_LOCK.target_git_head),                  '[F-06] head in command');
assert(validLock.tag_command.includes('PASS GOLD verified'),                         '[F-07] message in command');

// ─── Suite G: Valid with explicit override ────────────────────────
console.log('\n[Suite G] Valid (explicit tag/head override)');
const validOverride = buildRealTagManualCommands({
  safety_lock: READY_LOCK,
  target_tag: 'v4.0.0',
  target_git_head: '1111111111111111111111111111111111111111',
  _mock_timestamp: TS,
});
assert(validOverride.target_tag      === 'v4.0.0',                                  '[G-01] explicit tag used');
assert(validOverride.target_git_head === '1111111111111111111111111111111111111111', '[G-02] explicit head used');
assert(validOverride.push_command.includes('refs/tags/v4.0.0'),                     '[G-03] push has explicit tag');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(validLock.commands_execute_now === false, '[H-01] execute_now=false');
assert(validLock.tag_created          === false, '[H-02] tag_created=false');
assert(validLock.git_push_performed   === false, '[H-03] push=false');
assert(validLock.deploy_performed     === false, '[H-04] deploy=false');
assert(validLock.stable_promoted      === false, '[H-05] stable=false');
assert(validLock.release_performed    === false, '[H-06] release=false');
assert(fix.commands_execute_now       === false, '[H-07] fixture: execute_now=false');
assert(fix.tag_created                === false, '[H-08] fixture: tag=false');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
assert(validateRealTagManualCommands(null).valid === false,                          '[I-01] null → invalid');
assert(validateRealTagManualCommands({ ...validLock, command_builder_status: 'BAD' }).valid === false, '[I-02] unknown status');
assert(validateRealTagManualCommands({ ...validLock, commands_execute_now: true }).valid === false, '[I-03] execute=true → invalid');
assert(validateRealTagManualCommands({ ...validLock, tag_created: true }).valid === false, '[I-04] tag=true → invalid');
assert(validateRealTagManualCommands({ ...validLock, git_push_performed: true }).valid === false, '[I-05] push=true → invalid');
assert(validateRealTagManualCommands(validLock).valid === true,                      '[I-06] valid → valid');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderRealTagManualCommandPreview(fix);
assert(typeof rendered === 'string',                                                 '[J-01] returns string');
assert(rendered.includes('MANUAL_COMMAND_READY_PREVIEW'),                           '[J-02] status in output');
assert(rendered.includes('commands_execute_now      : false'),                      '[J-03] execute=false');
assert(rendered.includes('tag_created               : false'),                      '[J-04] tag=false');
assert(rendered.includes('git_push_performed        : false'),                      '[J-05] push=false');
assert(rendered.includes('git tag -a'),                                              '[J-06] tag_command in output');
assert(rendered.includes('git push origin'),                                         '[J-07] push_command in output');
assert(renderRealTagManualCommandPreview(null) === 'real_tag_manual_command_builder: null', '[J-08] null → string');

// ─── Suite K: Deterministic ID ────────────────────────────────────
console.log('\n[Suite K] Deterministic ID');
const d1 = buildRealTagManualCommands({ fixture_mode: true, _mock_timestamp: TS });
const d2 = buildRealTagManualCommands({ fixture_mode: true, _mock_timestamp: TS });
assert(d1.builder_id === d2.builder_id,                                              '[K-01] deterministic id');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-command-builder: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
