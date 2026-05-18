#!/usr/bin/env node
/**
 * Real Tag Human Runbook — Unit Tests V91.0
 */

import {
  RUNBOOK_STATUSES,
  buildRealTagHumanRunbook,
  validateRealTagHumanRunbook,
  renderRealTagHumanRunbook,
} from '../real-tag-human-runbook.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T02:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RUNBOOK_STATUSES),                                   '[A-01] statuses array');
assert(RUNBOOK_STATUSES.length === 4,                                     '[A-02] 4 statuses');
assert(RUNBOOK_STATUSES.includes('RUNBOOK_BLOCKED_BASELINE'),             '[A-03] BLOCKED_BASELINE');
assert(RUNBOOK_STATUSES.includes('RUNBOOK_BLOCKED_EVIDENCE'),             '[A-04] BLOCKED_EVIDENCE');
assert(RUNBOOK_STATUSES.includes('RUNBOOK_BLOCKED_TARGET'),               '[A-05] BLOCKED_TARGET');
assert(RUNBOOK_STATUSES.includes('RUNBOOK_READY'),                        '[A-06] RUNBOOK_READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                           '[B-01] returns object');
assert(fix.runbook_status      === 'RUNBOOK_READY',                       '[B-02] RUNBOOK_READY');
assert(fix.runbook_ready       === true,                                  '[B-03] ready=true');
assert(fix.schema_version      === 'v91.0',                               '[B-04] schema=v91.0');
assert(typeof fix.runbook_id === 'string' && fix.runbook_id.length === 24,'[B-05] id 24 chars');
assert(fix.blocking_reason     === null,                                  '[B-06] blocking=null');
assert(fix.human_required      === true,                                  '[B-07] human_required=true');
assert(fix.local_interactive_only === true,                               '[B-08] local_interactive_only=true');
assert(fix.ci_blocked          === true,                                  '[B-09] ci_blocked=true');
assert(fix.created_at          === TS,                                    '[B-10] created_at=TS');
assert(Array.isArray(fix.pre_checks),                                     '[B-11] pre_checks array');
assert(fix.pre_checks.length   === 8,                                     '[B-12] 8 pre_checks');
assert(Array.isArray(fix.post_checks),                                    '[B-13] post_checks array');
assert(fix.post_checks.length  === 8,                                     '[B-14] 8 post_checks');
assert(Array.isArray(fix.rollback_commands),                              '[B-15] rollback_commands array');
assert(fix.rollback_commands.length === 4,                                '[B-16] 4 rollback_commands');
assert(Array.isArray(fix.blocked_actions),                                '[B-17] blocked_actions array');
assert(fix.blocked_actions.length === 7,                                  '[B-18] 7 blocked_actions');
assert(typeof fix.dry_run_command === 'string',                           '[B-19] dry_run_command string');
assert(fix.dry_run_command.includes('--dry-run'),                         '[B-20] dry_run_command has --dry-run');
assert(typeof fix.real_execution_command_template === 'string',           '[B-21] command_template string');
assert(fix.real_execution_command_template.includes('--real-tag-one-shot'),'[B-22] template has --real-tag-one-shot');
assert(fix.real_execution_command_template.includes('--execute-real-tag'),'[B-23] template has --execute-real-tag');
assert(fix.real_execution_command_template.includes('--dry-run=false'),   '[B-24] template has --dry-run=false');
assert(fix.required_modules_count === 8,                                  '[B-25] 8 required_modules');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Non-fixture blocked states ─────────────────────────
console.log('\n[Suite D] Blocked states (non-fixture)');

const bBase = buildRealTagHumanRunbook({ fixture_mode: false, _mock_timestamp: TS });
assert(bBase.runbook_status === 'RUNBOOK_BLOCKED_BASELINE',               '[D-01] no baseline → BLOCKED_BASELINE');
assert(bBase.runbook_ready  === false,                                    '[D-02] ready=false');
assert(bBase.blocking_reason === 'baseline_not_ready',                    '[D-03] reason=baseline_not_ready');
assert(bBase.tag_created    === false,                                    '[D-04] tag_created=false in blocked');
assert(bBase.human_required === true,                                     '[D-05] human_required=true in blocked');

const bBase2 = buildRealTagHumanRunbook({
  fixture_mode: false,
  baseline_status: 'WRONG_STATUS',
  _mock_timestamp: TS,
});
assert(bBase2.runbook_status === 'RUNBOOK_BLOCKED_BASELINE',              '[D-06] wrong baseline → BLOCKED_BASELINE');
assert(bBase2.baseline_status === 'WRONG_STATUS',                         '[D-07] wrong baseline stored');

const bEv = buildRealTagHumanRunbook({
  fixture_mode: false,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  _mock_timestamp: TS,
});
assert(bEv.runbook_status  === 'RUNBOOK_BLOCKED_EVIDENCE',                '[D-08] no evidence → BLOCKED_EVIDENCE');
assert(bEv.blocking_reason === 'evidence_receipt_missing_or_invalid',     '[D-09] reason=evidence_missing');

const bEvShort = buildRealTagHumanRunbook({
  fixture_mode: false,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  evidence_receipt: 'short',
  _mock_timestamp: TS,
});
assert(bEvShort.runbook_status === 'RUNBOOK_BLOCKED_EVIDENCE',            '[D-10] short receipt → BLOCKED_EVIDENCE');

const bTag = buildRealTagHumanRunbook({
  fixture_mode: false,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  evidence_receipt: 'valid-receipt-id-long-enough',
  _mock_timestamp: TS,
});
assert(bTag.runbook_status  === 'RUNBOOK_BLOCKED_TARGET',                 '[D-11] no tag → BLOCKED_TARGET');
assert(bTag.blocking_reason === 'target_tag_missing_or_invalid',          '[D-12] reason=target_missing');

const bTagInvalid = buildRealTagHumanRunbook({
  fixture_mode: false,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  evidence_receipt: 'valid-receipt-id-long-enough',
  target_tag: 'not-a-valid-tag',
  _mock_timestamp: TS,
});
assert(bTagInvalid.runbook_status === 'RUNBOOK_BLOCKED_TARGET',           '[D-13] invalid tag format → BLOCKED_TARGET');

// ─── Suite E: Non-fixture READY ───────────────────────────────────
console.log('\n[Suite E] Non-fixture READY');
const ready = buildRealTagHumanRunbook({
  fixture_mode: false,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  evidence_receipt: 'valid-receipt-id-long-enough',
  target_tag: 'v99.0.0',
  git_head: 'abc123def456',
  rollback_anchor: 'anchor-id-abc',
  _mock_timestamp: TS,
});
assert(ready.runbook_status  === 'RUNBOOK_READY',                         '[E-01] non-fixture READY');
assert(ready.runbook_ready   === true,                                    '[E-02] ready=true');
assert(ready.blocking_reason === null,                                    '[E-03] blocking=null');
assert(ready.real_execution_command_template.includes('v99.0.0'),        '[E-04] template has target_tag');
assert(ready.real_execution_command_template.includes('abc123def456'),   '[E-05] template has git_head');
assert(ready.tag_created     === false,                                   '[E-06] tag_created=false even when READY');

// valid tag formats
const readyWithSuffix = buildRealTagHumanRunbook({
  fixture_mode: false,
  baseline_status: 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  evidence_receipt: 'valid-receipt-id-long-enough',
  target_tag: 'v1.2.3-rc1',
  _mock_timestamp: TS,
});
assert(readyWithSuffix.runbook_status === 'RUNBOOK_READY',                '[E-07] tag with suffix READY');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const f1 = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });
const f2 = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });
assert(f1.runbook_id === f2.runbook_id,                                   '[F-01] deterministic id');

// ─── Suite G: Pre/post check content ──────────────────────────────
console.log('\n[Suite G] Check content');
assert(fix.pre_checks.some(c => c.includes('EXEC_BASELINE_READY')),      '[G-01] pre_check: baseline status');
assert(fix.pre_checks.some(c => c.includes('evidence_receipt')),         '[G-02] pre_check: evidence_receipt');
assert(fix.pre_checks.some(c => c.includes('ci=false')),                 '[G-03] pre_check: ci=false');
assert(fix.post_checks.some(c => c.includes('real_tag_created')),        '[G-04] post_check: real_tag_created');
assert(fix.post_checks.some(c => c.includes('deploy_to_production')),    '[G-05] post_check: deploy blocked');
assert(fix.rollback_commands.some(c => c.includes('git tag -d')),        '[G-06] rollback: git tag -d');
assert(fix.rollback_commands.some(c => c.includes(':refs/tags/')),       '[G-07] rollback: remote delete');
assert(fix.blocked_actions.includes('deploy_to_production'),             '[G-08] blocked: deploy');
assert(fix.blocked_actions.includes('promote_to_stable'),                '[G-09] blocked: stable');
assert(fix.blocked_actions.includes('run_in_ci'),                        '[G-10] blocked: ci');

// ─── Suite H: Validate ────────────────────────────────────────────
console.log('\n[Suite H] Validate');
const vOk = validateRealTagHumanRunbook(fix);
assert(vOk.valid === true,                                                '[H-01] fixture valid=true');

const vNull = validateRealTagHumanRunbook(null);
assert(vNull.valid === false,                                             '[H-02] null → invalid');
assert(vNull.reason === 'null_or_not_object',                             '[H-03] null → reason');

const vTagTrue = validateRealTagHumanRunbook({ ...fix, tag_created: true });
assert(vTagTrue.valid === false,                                          '[H-04] tag_created=true → invalid');

const vActualTrue = validateRealTagHumanRunbook({ ...fix, actual_real_tag_created: true });
assert(vActualTrue.valid === false,                                       '[H-05] actual_real_tag_created=true → invalid');

const vPushTrue = validateRealTagHumanRunbook({ ...fix, git_push_performed: true });
assert(vPushTrue.valid === false,                                         '[H-06] git_push_performed=true → invalid');

const vHumanFalse = validateRealTagHumanRunbook({ ...fix, human_required: false });
assert(vHumanFalse.valid === false,                                       '[H-07] human_required=false → invalid');

const vCiFalse = validateRealTagHumanRunbook({ ...fix, ci_blocked: false });
assert(vCiFalse.valid === false,                                          '[H-08] ci_blocked=false → invalid');

const vLocalFalse = validateRealTagHumanRunbook({ ...fix, local_interactive_only: false });
assert(vLocalFalse.valid === false,                                       '[H-09] local_interactive_only=false → invalid');

const vNoPreChecks = validateRealTagHumanRunbook({ ...fix, pre_checks: 'not-array' });
assert(vNoPreChecks.valid === false,                                      '[H-10] pre_checks not array → invalid');

const vBlockedOk = validateRealTagHumanRunbook(bBase);
assert(vBlockedOk.valid === true,                                         '[H-11] blocked result valid=true');

// ─── Suite I: Render ──────────────────────────────────────────────
console.log('\n[Suite I] Render');
const rendered = renderRealTagHumanRunbook(fix);
assert(typeof rendered === 'string',                                      '[I-01] returns string');
assert(rendered.includes('RUNBOOK_READY'),                                '[I-02] status in output');
assert(rendered.includes('tag_created                 : false'),          '[I-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created     : false'),          '[I-04] actual_tag=false');
assert(rendered.includes('git_push_performed          : false'),          '[I-05] push=false');
assert(rendered.includes('real_execution_not_performed: true'),           '[I-06] not_performed=true');
assert(rendered.includes('human_required'),                               '[I-07] human_required field');
assert(rendered.includes('ci_blocked'),                                   '[I-08] ci_blocked field');
assert(rendered.includes('DRY RUN COMMAND'),                              '[I-09] dry run section');
assert(rendered.includes('REAL EXECUTION COMMAND TEMPLATE'),              '[I-10] real exec section');
assert(rendered.includes('PRE-CHECKS'),                                   '[I-11] pre-checks section');
assert(rendered.includes('POST-CHECKS'),                                  '[I-12] post-checks section');
assert(rendered.includes('ROLLBACK COMMANDS'),                            '[I-13] rollback section');
assert(rendered.includes('BLOCKED ACTIONS'),                              '[I-14] blocked actions section');
assert(rendered.includes('BLOCKED: deploy_to_production'),                '[I-15] deploy blocked in render');

const renderedBlocked = renderRealTagHumanRunbook(bBase);
assert(typeof renderedBlocked === 'string',                               '[I-16] blocked renders');
assert(!renderedBlocked.includes('DRY RUN COMMAND'),                      '[I-17] blocked: no dry run section');

assert(renderRealTagHumanRunbook(null) === 'real_tag_human_runbook: null','[I-18] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-runbook: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
