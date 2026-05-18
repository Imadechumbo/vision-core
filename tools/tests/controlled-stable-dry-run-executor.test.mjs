#!/usr/bin/env node
/**
 * Controlled Stable Dry-Run Executor — Unit Tests V74.1
 */

import {
  runControlledStableDryRun,
  renderControlledStableDryRunSummary,
  STABLE_DRY_RUN_STATUSES,
} from '../controlled-stable-dry-run-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';

const GOOD_GATE = {
  stable_gate_status: 'STABLE_GATE_READY_REQUIRES_COMMAND',
  stable_gate_id: 'sg-id',
  target_stable_ref: 'stable',
  target_tag: 'v1.2.3',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(STABLE_DRY_RUN_STATUSES),                                         '[A-01] statuses array');
assert(STABLE_DRY_RUN_STATUSES.length === 3,                                           '[A-02] 3 statuses');
assert(STABLE_DRY_RUN_STATUSES.includes('STABLE_DRY_RUN_READY'),                      '[A-03] READY');
assert(STABLE_DRY_RUN_STATUSES.includes('STABLE_DRY_RUN_BLOCKED_GATE'),               '[A-04] BLOCKED_GATE');
assert(STABLE_DRY_RUN_STATUSES.includes('STABLE_DRY_RUN_BLOCKED_NOT_DRY_RUN'),        '[A-05] BLOCKED_NOT_DRY_RUN');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runControlledStableDryRun({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.stable_dry_run_status  === 'STABLE_DRY_RUN_READY',                         '[B-02] status=READY');
assert(fix.stable_dry_run_ready   === true,                                            '[B-03] ready=true');
assert(fix.schema_version         === 'v74.1',                                         '[B-04] schema=v74.1');
assert(typeof fix.stable_dry_run_id === 'string' && fix.stable_dry_run_id.length === 24, '[B-05] id 24 chars');
assert(typeof fix.simulated_stable_command === 'string' && fix.simulated_stable_command.length > 0, '[B-06] simulated_command set');
assert(typeof fix.simulated_push_command === 'string',                                 '[B-07] push_command set');
assert(typeof fix.stable_receipt_preview_id === 'string',                              '[B-08] receipt_preview set');
assert(typeof fix.rollback_note === 'string',                                          '[B-09] rollback_note set');
assert(fix.blocking_reason        === null,                                            '[B-10] blocking_reason=null');
assert(fix.created_at             === TS,                                              '[B-11] created_at=TS');

// ─── Suite C: Blocked — not dry run ───────────────────────────────
console.log('\n[Suite C] Not dry run');
const notDry = runControlledStableDryRun({ stable_gate: GOOD_GATE, dry_run: false, _mock_timestamp: TS });
assert(notDry.stable_dry_run_status === 'STABLE_DRY_RUN_BLOCKED_NOT_DRY_RUN',        '[C-01] BLOCKED_NOT_DRY_RUN');

// ─── Suite D: Blocked — bad gate ──────────────────────────────────
console.log('\n[Suite D] Bad gate');
const noGate = runControlledStableDryRun({ dry_run: true, _mock_timestamp: TS });
assert(noGate.stable_dry_run_status === 'STABLE_DRY_RUN_BLOCKED_GATE',               '[D-01] BLOCKED_GATE (null)');

const badGate = runControlledStableDryRun({ stable_gate: { stable_gate_status: 'BLOCKED' }, dry_run: true, _mock_timestamp: TS });
assert(badGate.stable_dry_run_status === 'STABLE_DRY_RUN_BLOCKED_GATE',              '[D-02] BLOCKED_GATE (bad status)');

// ─── Suite E: Full dry-run ready ──────────────────────────────────
console.log('\n[Suite E] Full dry-run ready');
const ready = runControlledStableDryRun({ stable_gate: GOOD_GATE, dry_run: true, _mock_timestamp: TS });
assert(ready.stable_dry_run_ready   === true,                                          '[E-01] ready=true');
assert(ready.stable_dry_run_status  === 'STABLE_DRY_RUN_READY',                       '[E-02] status=READY');
assert(ready.simulated_stable_command.includes('stable'),                              '[E-03] ref in command');
assert(ready.simulated_stable_command.includes('v1.2.3'),                              '[E-04] tag in command');
assert(ready.simulated_push_command.includes('stable'),                                '[E-05] ref in push command');
assert(ready.rollback_note.includes('stable'),                                         '[E-06] ref in rollback note');
assert(typeof ready.stable_receipt_preview_id === 'string',                            '[E-07] receipt preview');

// ─── Suite F: Invariants ──────────────────────────────────────────
console.log('\n[Suite F] Invariants');
assert(fix.stable_promoted          === false, '[F-01] stable_promoted=false');
assert(fix.git_push_performed       === false, '[F-02] push=false');
assert(fix.production_execution_locked === true, '[F-03] locked=true');
assert(fix.unlock_executed          === false, '[F-04] unlock=false');
assert(fix.real_command_required    === true,  '[F-05] real_command_required=true');
assert(fix.deploy_allowed           === false, '[F-06] deploy_allowed=false');
assert(fix.promotion_allowed        === false, '[F-07] promotion_allowed=false');
assert(fix.stable_allowed           === false, '[F-08] stable_allowed=false');
assert(fix.tag_created              === false, '[F-09] tag_created=false');
assert(fix.release_execution_allowed === false, '[F-10] release_exec=false');
assert(fix.release_performed        === false, '[F-11] release_performed=false');
assert(fix.deploy_performed         === false, '[F-12] deploy_performed=false');

assert(noGate.stable_promoted       === false, '[F-13] blocked: stable=false');
assert(noGate.git_push_performed    === false, '[F-14] blocked: push=false');
assert(noGate.production_execution_locked === true, '[F-15] blocked: locked=true');

// ─── Suite G: Render ─────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderControlledStableDryRunSummary(fix);
assert(typeof rendered === 'string',                                                    '[G-01] returns string');
assert(rendered.includes('STABLE_DRY_RUN_READY'),                                     '[G-02] status in output');
assert(rendered.includes('stable_promoted                : false'),                   '[G-03] stable=false in output');
assert(rendered.includes('git_push_performed             : false'),                   '[G-04] push=false in output');
assert(rendered.includes('real_command_required          : true'),                    '[G-05] real_command in output');
assert(renderControlledStableDryRunSummary(null) === 'controlled_stable_dry_run: null', '[G-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-stable-dry-run-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
