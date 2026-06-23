#!/usr/bin/env node
/**
 * Controlled Real Tag Dry-Run Executor — Unit Tests V73.1
 */

import {
  runControlledRealTagDryRun,
  renderControlledRealTagDryRunSummary,
  TAG_DRY_RUN_STATUSES,
} from '../controlled-real-tag-dry-run-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';

const GOOD_GATE = {
  tag_gate_status: 'TAG_GATE_READY_REQUIRES_COMMAND',
  tag_gate_id: 'tg-id',
  target_tag: 'v1.2.3',
  git_head: 'abc1234',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_DRY_RUN_STATUSES),                                            '[A-01] statuses array');
assert(TAG_DRY_RUN_STATUSES.length === 3,                                              '[A-02] 3 statuses');
assert(TAG_DRY_RUN_STATUSES.includes('TAG_DRY_RUN_READY'),                             '[A-03] READY');
assert(TAG_DRY_RUN_STATUSES.includes('TAG_DRY_RUN_BLOCKED_GATE'),                     '[A-04] BLOCKED_GATE');
assert(TAG_DRY_RUN_STATUSES.includes('TAG_DRY_RUN_BLOCKED_NOT_DRY_RUN'),              '[A-05] BLOCKED_NOT_DRY_RUN');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runControlledRealTagDryRun({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.tag_dry_run_status  === 'TAG_DRY_RUN_READY',                               '[B-02] status=READY');
assert(fix.tag_dry_run_ready   === true,                                               '[B-03] ready=true');
assert(fix.schema_version      === 'v73.1',                                            '[B-04] schema=v73.1');
assert(typeof fix.tag_dry_run_id === 'string' && fix.tag_dry_run_id.length === 24,    '[B-05] id 24 chars');
assert(typeof fix.simulated_command === 'string' && fix.simulated_command.length > 0, '[B-06] simulated_command set');
assert(typeof fix.simulated_push_command === 'string',                                 '[B-07] push_command set');
assert(typeof fix.tag_receipt_preview_id === 'string',                                 '[B-08] receipt_preview set');
assert(typeof fix.rollback_note === 'string',                                          '[B-09] rollback_note set');
assert(fix.blocking_reason     === null,                                               '[B-10] blocking_reason=null');
assert(fix.created_at          === TS,                                                 '[B-11] created_at=TS');

// ─── Suite C: Blocked — not dry run ───────────────────────────────
console.log('\n[Suite C] Not dry run');
const notDry = runControlledRealTagDryRun({ tag_gate: GOOD_GATE, dry_run: false, _mock_timestamp: TS });
assert(notDry.tag_dry_run_status === 'TAG_DRY_RUN_BLOCKED_NOT_DRY_RUN',              '[C-01] BLOCKED_NOT_DRY_RUN');

// ─── Suite D: Blocked — bad gate ──────────────────────────────────
console.log('\n[Suite D] Bad gate');
const noGate = runControlledRealTagDryRun({ dry_run: true, _mock_timestamp: TS });
assert(noGate.tag_dry_run_status === 'TAG_DRY_RUN_BLOCKED_GATE',                     '[D-01] BLOCKED_GATE (null)');

const badGate = runControlledRealTagDryRun({ tag_gate: { tag_gate_status: 'BLOCKED' }, dry_run: true, _mock_timestamp: TS });
assert(badGate.tag_dry_run_status === 'TAG_DRY_RUN_BLOCKED_GATE',                    '[D-02] BLOCKED_GATE (bad status)');

// ─── Suite E: Full dry-run ready ──────────────────────────────────
console.log('\n[Suite E] Full dry-run ready');
const ready = runControlledRealTagDryRun({ tag_gate: GOOD_GATE, dry_run: true, _mock_timestamp: TS });
assert(ready.tag_dry_run_ready   === true,                                             '[E-01] ready=true');
assert(ready.tag_dry_run_status  === 'TAG_DRY_RUN_READY',                             '[E-02] status=READY');
assert(ready.simulated_command.includes('v1.2.3'),                                    '[E-03] tag in command');
assert(ready.simulated_command.includes('abc1234'),                                   '[E-04] head in command');
assert(ready.simulated_push_command.includes('v1.2.3'),                               '[E-05] tag in push command');
assert(ready.rollback_note.includes('v1.2.3'),                                        '[E-06] tag in rollback note');

// ─── Suite F: Invariants ──────────────────────────────────────────
console.log('\n[Suite F] Invariants');
assert(fix.tag_created              === false, '[F-01] tag_created=false');
assert(fix.git_push_performed       === false, '[F-02] push=false');
assert(fix.production_execution_locked === true, '[F-03] locked=true');
assert(fix.unlock_executed          === false, '[F-04] unlock=false');
assert(fix.real_command_required    === true,  '[F-05] real_command_required=true');
assert(fix.deploy_allowed           === false, '[F-06] deploy_allowed=false');
assert(fix.promotion_allowed        === false, '[F-07] promotion_allowed=false');
assert(fix.stable_allowed           === false, '[F-08] stable_allowed=false');
assert(fix.release_execution_allowed === false, '[F-09] release_exec=false');
assert(fix.release_performed        === false, '[F-10] release_performed=false');
assert(fix.stable_promoted          === false, '[F-11] stable_promoted=false');
assert(fix.deploy_performed         === false, '[F-12] deploy_performed=false');

assert(noGate.tag_created           === false, '[F-13] blocked: tag=false');
assert(noGate.git_push_performed    === false, '[F-14] blocked: push=false');
assert(noGate.production_execution_locked === true, '[F-15] blocked: locked=true');

// ─── Suite G: Render ─────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderControlledRealTagDryRunSummary(fix);
assert(typeof rendered === 'string',                                                    '[G-01] returns string');
assert(rendered.includes('TAG_DRY_RUN_READY'),                                        '[G-02] status in output');
assert(rendered.includes('tag_created                    : false'),                   '[G-03] tag=false in output');
assert(rendered.includes('git_push_performed             : false'),                   '[G-04] push=false in output');
assert(rendered.includes('real_command_required          : true'),                    '[G-05] real_command in output');
assert(renderControlledRealTagDryRunSummary(null) === 'controlled_real_tag_dry_run: null', '[G-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-real-tag-dry-run-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
