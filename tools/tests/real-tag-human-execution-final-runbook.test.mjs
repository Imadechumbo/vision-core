#!/usr/bin/env node
/**
 * Real Tag Human Execution Final Runbook — Unit Tests V101.0
 */

import {
  FINAL_RUNBOOK_STATUSES,
  buildRealTagHumanExecutionFinalRunbook,
  validateRealTagHumanExecutionFinalRunbook,
  renderRealTagHumanExecutionFinalRunbook,
} from '../real-tag-human-execution-final-runbook.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS       = '2026-05-19T15:00:00.000Z';
const SHA      = 'abc1234def567890abc12345';
const BASELINE = { tag_operation_baseline_ready: true, baseline_id: 'baseline-test-001' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(FINAL_RUNBOOK_STATUSES),                                         '[A-01] statuses array');
assert(FINAL_RUNBOOK_STATUSES.length === 5,                                            '[A-02] 5 statuses');
assert(FINAL_RUNBOOK_STATUSES.includes('FINAL_RUNBOOK_BLOCKED_BASELINE'),             '[A-03] BLOCKED_BASELINE');
assert(FINAL_RUNBOOK_STATUSES.includes('FINAL_RUNBOOK_BLOCKED_TARGET'),               '[A-04] BLOCKED_TARGET');
assert(FINAL_RUNBOOK_STATUSES.includes('FINAL_RUNBOOK_BLOCKED_EVIDENCE'),             '[A-05] BLOCKED_EVIDENCE');
assert(FINAL_RUNBOOK_STATUSES.includes('FINAL_RUNBOOK_BLOCKED_ROLLBACK'),             '[A-06] BLOCKED_ROLLBACK');
assert(FINAL_RUNBOOK_STATUSES.includes('FINAL_RUNBOOK_READY'),                        '[A-07] FINAL_RUNBOOK_READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagHumanExecutionFinalRunbook({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.runbook_status            === 'FINAL_RUNBOOK_READY',                       '[B-02] fixture=READY');
assert(fix.runbook_ready             === true,                                        '[B-03] runbook_ready=true');
assert(fix.schema_version            === 'v101.0',                                    '[B-04] schema=v101.0');
assert(typeof fix.runbook_id === 'string' && fix.runbook_id.length === 24,            '[B-05] id 24 chars');
assert(fix.blocking_reason           === null,                                        '[B-06] blocking=null');
assert(fix.target_tag                === 'v1.0.0',                                    '[B-07] target_tag=v1.0.0');
assert(fix.evidence_source           === 'go-core',                                   '[B-08] evidence=go-core');
assert(fix.rollback_anchor_id        === 'anchor-fixture-001',                        '[B-09] rollback_anchor present');
assert(fix.human_required            === true,                                        '[B-10] human_required=true');
assert(fix.local_interactive_only    === true,                                        '[B-11] local_interactive=true');
assert(fix.ci_blocked                === true,                                        '[B-12] ci_blocked=true');
assert(Array.isArray(fix.pre_execution_checklist) && fix.pre_execution_checklist.length >= 4, '[B-13] pre_checklist array');
assert(Array.isArray(fix.exact_manual_commands) && fix.exact_manual_commands.length >= 2,    '[B-14] exact_commands array');
assert(Array.isArray(fix.post_execution_checklist) && fix.post_execution_checklist.length >= 3, '[B-15] post_checklist array');
assert(Array.isArray(fix.rollback_commands) && fix.rollback_commands.length >= 1,    '[B-16] rollback_cmds array');
assert(typeof fix.human_receipt_instructions === 'string',                            '[B-17] receipt_instructions string');
assert(Array.isArray(fix.forbidden_actions) && fix.forbidden_actions.length >= 4,    '[B-18] forbidden_actions array');
assert(fix.created_at                === TS,                                          '[B-19] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.git_push_performed           === false, '[C-02] git_push_performed=false');
assert(fix.actual_real_tag_created      === false, '[C-03] actual_real_tag_created=false');
assert(fix.actual_git_push_performed    === false, '[C-04] actual_git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-05] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-06] stable_promoted=false');
assert(fix.release_performed            === false, '[C-07] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-08] real_execution_not_performed=true');

// ─── Suite D: BLOCKED cases ────────────────────────────────────────
console.log('\n[Suite D] BLOCKED cases');
const bNoBaseline = buildRealTagHumanExecutionFinalRunbook({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoBaseline.runbook_status === 'FINAL_RUNBOOK_BLOCKED_BASELINE',               '[D-01] no baseline → BLOCKED_BASELINE');
assert(bNoBaseline.runbook_ready  === false,                                          '[D-02] ready=false');
assert(bNoBaseline.tag_created    === false,                                          '[D-03] tag=false in blocked');

const bBadBaseline = buildRealTagHumanExecutionFinalRunbook({
  fixture_mode: false, baseline_result: { tag_operation_baseline_ready: false }, _mock_timestamp: TS,
});
assert(bBadBaseline.runbook_status === 'FINAL_RUNBOOK_BLOCKED_BASELINE',              '[D-04] bad baseline → BLOCKED_BASELINE');

const bBadTag = buildRealTagHumanExecutionFinalRunbook({
  fixture_mode: false, baseline_result: BASELINE, target_tag: 'notstartwithv', _mock_timestamp: TS,
});
assert(bBadTag.runbook_status === 'FINAL_RUNBOOK_BLOCKED_TARGET',                     '[D-05] bad tag → BLOCKED_TARGET');

const bBadEvidence = buildRealTagHumanExecutionFinalRunbook({
  fixture_mode: false, baseline_result: BASELINE, target_tag: 'v1.0.0',
  evidence_source: 'backend', _mock_timestamp: TS,
});
assert(bBadEvidence.runbook_status === 'FINAL_RUNBOOK_BLOCKED_EVIDENCE',              '[D-06] backend evidence → BLOCKED_EVIDENCE');

const bNoRollback = buildRealTagHumanExecutionFinalRunbook({
  fixture_mode: false, baseline_result: BASELINE, target_tag: 'v1.0.0',
  evidence_source: 'go-core', rollback_anchor_id: null, _mock_timestamp: TS,
});
assert(bNoRollback.runbook_status === 'FINAL_RUNBOOK_BLOCKED_ROLLBACK',               '[D-07] missing rollback → BLOCKED_ROLLBACK');

// ─── Suite E: Full ready case ──────────────────────────────────────
console.log('\n[Suite E] Full ready case');
const ready = buildRealTagHumanExecutionFinalRunbook({
  fixture_mode:       false,
  baseline_result:    BASELINE,
  target_tag:         'v1.0.0',
  git_head:           SHA,
  evidence_receipt_id: 'receipt-001',
  evidence_source:    'go-core',
  rollback_anchor_id: 'anchor-001',
  _mock_timestamp:    TS,
});
assert(ready.runbook_status === 'FINAL_RUNBOOK_READY',                                '[E-01] full params → READY');
assert(ready.runbook_ready  === true,                                                 '[E-02] ready=true');
assert(ready.target_tag     === 'v1.0.0',                                             '[E-03] target_tag preserved');
assert(ready.git_head       === SHA,                                                  '[E-04] git_head preserved');
assert(ready.evidence_source === 'go-core',                                           '[E-05] evidence=go-core');
assert(ready.rollback_anchor_id === 'anchor-001',                                     '[E-06] rollback anchor preserved');
assert(ready.exact_manual_commands.some(c => c.includes('v1.0.0')),                  '[E-07] tag in commands');
assert(ready.exact_manual_commands.some(c => c.includes(SHA)),                       '[E-08] head in commands');
assert(ready.rollback_commands.some(c => c.includes('v1.0.0')),                      '[E-09] tag in rollback');
assert(ready.tag_created        === false,                                            '[E-10] tag=false in ready');
assert(ready.stable_promoted    === false,                                            '[E-11] stable=false in ready');
assert(ready.human_required     === true,                                             '[E-12] human_required=true in ready');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const f1 = buildRealTagHumanExecutionFinalRunbook({ fixture_mode: true, _mock_timestamp: TS });
const f2 = buildRealTagHumanExecutionFinalRunbook({ fixture_mode: true, _mock_timestamp: TS });
assert(f1.runbook_id === f2.runbook_id,                                               '[F-01] deterministic id');

// ─── Suite G: Validate ────────────────────────────────────────────
console.log('\n[Suite G] Validate');
assert(validateRealTagHumanExecutionFinalRunbook(fix).length === 0,                   '[G-01] fixture passes');
assert(validateRealTagHumanExecutionFinalRunbook(null).length > 0,                    '[G-02] null fails');
assert(validateRealTagHumanExecutionFinalRunbook({ ...fix, tag_created: true }).length > 0,       '[G-03] tag=true fails');
assert(validateRealTagHumanExecutionFinalRunbook({ ...fix, stable_promoted: true }).length > 0,   '[G-04] stable=true fails');
assert(validateRealTagHumanExecutionFinalRunbook({ ...fix, human_required: false }).length > 0,   '[G-05] human_required=false fails');
assert(validateRealTagHumanExecutionFinalRunbook({ ...fix, ci_blocked: false }).length > 0,       '[G-06] ci_blocked=false fails');
assert(validateRealTagHumanExecutionFinalRunbook(ready).length === 0,                 '[G-07] ready passes');

// ─── Suite H: Render ─────────────────────────────────────────────
console.log('\n[Suite H] Render');
const rendered = renderRealTagHumanExecutionFinalRunbook(fix);
assert(typeof rendered === 'string',                                                  '[H-01] returns string');
assert(rendered.includes('FINAL_RUNBOOK_READY'),                                      '[H-02] status in output');
assert(rendered.includes('tag_created              : false'),                         '[H-03] tag=false in output');
assert(rendered.includes('stable_promoted          : false'),                         '[H-04] stable=false in output');
assert(rendered.includes('EXACT MANUAL COMMANDS'),                                    '[H-05] commands section');
assert(rendered.includes('PRE-EXECUTION CHECKLIST'),                                  '[H-06] pre-checklist section');
assert(rendered.includes('ROLLBACK COMMANDS'),                                        '[H-07] rollback section');
assert(rendered.includes('BLOCKED: auto_deploy'),                                     '[H-08] forbidden actions present');
assert(renderRealTagHumanExecutionFinalRunbook(null) === 'real_tag_human_execution_final_runbook: null', '[H-09] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-execution-final-runbook: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
