#!/usr/bin/env node
/**
 * Real Tag One-Shot Execution Controller — Unit Tests V86.0
 */

import {
  EXECUTION_CONTROLLER_STATUSES,
  REAL_TAG_EXEC_CTRL_CONFIRMATION_PHRASE,
  createRealTagExecutionContext,
  validateRealTagExecutionContext,
  evaluateRealTagExecutionController,
  renderRealTagExecutionControllerSummary,
} from '../real-tag-one-shot-execution-controller.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS  = '2026-05-18T22:00:00.000Z';
const TAG = 'v1.0.0-test';
const HEAD = 'abc1234def567890abc123';
const RECEIPT = 'rcpt-go-core-001';
const ROLLBACK = 'rbk-anchor-001';

const GOOD_PARAMS = {
  baseline_status:       'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION',
  ci:                    false,
  local_interactive_only: true,
  worktree_clean:        true,
  local_tag_exists:      false,
  remote_tag_exists:     false,
  evidence_source:       'go-core',
  confirmation_phrase:   REAL_TAG_EXEC_CTRL_CONFIRMATION_PHRASE,
  dry_run:               true,
  execute_real_tag:      false,
  target_tag:            TAG,
  git_head:              HEAD,
  evidence_receipt_id:   RECEIPT,
  rollback_anchor_id:    ROLLBACK,
  _mock_timestamp:       TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(EXECUTION_CONTROLLER_STATUSES),                                           '[A-01] statuses array');
assert(EXECUTION_CONTROLLER_STATUSES.length === 11,                                            '[A-02] 11 statuses');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_BASELINE'),          '[A-03] BLOCKED_BASELINE');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_CI'),                '[A-04] BLOCKED_CI');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_INTERACTIVE'),       '[A-05] BLOCKED_INTERACTIVE');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_WORKTREE'),          '[A-06] BLOCKED_WORKTREE');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_LOCAL_TAG_EXISTS'),  '[A-07] BLOCKED_LOCAL_TAG_EXISTS');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_REMOTE_TAG_EXISTS'), '[A-08] BLOCKED_REMOTE_TAG_EXISTS');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_EVIDENCE'),          '[A-09] BLOCKED_EVIDENCE');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_CONFIRMATION'),      '[A-10] BLOCKED_CONFIRMATION');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_BLOCKED_DRY_RUN'),           '[A-11] BLOCKED_DRY_RUN');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_READY_DRY_RUN'),             '[A-12] READY_DRY_RUN');
assert(EXECUTION_CONTROLLER_STATUSES.includes('REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION'), '[A-13] READY_FOR_LOCAL_REAL_EXECUTION');
assert(typeof REAL_TAG_EXEC_CTRL_CONFIRMATION_PHRASE === 'string',                             '[A-14] phrase is string');
assert(REAL_TAG_EXEC_CTRL_CONFIRMATION_PHRASE.includes('LOCAL INTERACTIVE'),                   '[A-15] phrase has LOCAL INTERACTIVE');

// ─── Suite B: createRealTagExecutionContext ────────────────────────
console.log('\n[Suite B] createRealTagExecutionContext');
const ctx = createRealTagExecutionContext({
  baseline_status:       'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION',
  ci:                    false,
  local_interactive_only: true,
  worktree_clean:        true,
  local_tag_exists:      false,
  remote_tag_exists:     false,
  evidence_source:       'go-core',
  confirmation_phrase:   REAL_TAG_EXEC_CTRL_CONFIRMATION_PHRASE,
  target_tag:            TAG,
  git_head:              HEAD,
  evidence_receipt_id:   RECEIPT,
  rollback_anchor_id:    ROLLBACK,
  _mock_timestamp:       TS,
});
assert(ctx !== null && typeof ctx === 'object',                                                '[B-01] returns object');
assert(ctx.baseline_status === 'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION',           '[B-02] baseline_status');
assert(ctx.ci              === false,                                                          '[B-03] ci=false');
assert(ctx.local_interactive_only === true,                                                    '[B-04] local_interactive=true');
assert(ctx.worktree_clean  === true,                                                           '[B-05] worktree_clean=true');
assert(ctx.evidence_source === 'go-core',                                                      '[B-06] evidence_source');
assert(ctx.target_tag      === TAG,                                                            '[B-07] target_tag');
assert(ctx.created_at      === TS,                                                             '[B-08] created_at=TS');

// ─── Suite C: validateRealTagExecutionContext ──────────────────────
console.log('\n[Suite C] validateRealTagExecutionContext');
const validCtx = createRealTagExecutionContext({
  target_tag: TAG, git_head: HEAD, evidence_receipt_id: RECEIPT,
  rollback_anchor_id: ROLLBACK, evidence_source: 'go-core', _mock_timestamp: TS,
});
const r_valid = validateRealTagExecutionContext(validCtx);
assert(r_valid.valid === true,                                                                 '[C-01] valid context');
assert(r_valid.errors.length === 0,                                                            '[C-02] no errors');

const r_null = validateRealTagExecutionContext(null);
assert(r_null.valid === false,                                                                 '[C-03] null → invalid');

const r_notag = validateRealTagExecutionContext({ target_tag: 'notstartsv', git_head: HEAD, evidence_receipt_id: RECEIPT, rollback_anchor_id: ROLLBACK, evidence_source: 'go-core' });
assert(r_notag.errors.includes('target_tag_invalid'),                                         '[C-04] tag not starting with v');

const r_nores = validateRealTagExecutionContext({ target_tag: TAG, git_head: 'abc', evidence_receipt_id: RECEIPT, rollback_anchor_id: ROLLBACK, evidence_source: 'go-core' });
assert(r_nores.errors.includes('git_head_invalid'),                                           '[C-05] short git_head invalid');

const r_noreceipt = validateRealTagExecutionContext({ target_tag: TAG, git_head: HEAD, rollback_anchor_id: ROLLBACK, evidence_source: 'go-core' });
assert(r_noreceipt.errors.includes('evidence_receipt_id_missing'),                            '[C-06] missing receipt');

const r_norollback = validateRealTagExecutionContext({ target_tag: TAG, git_head: HEAD, evidence_receipt_id: RECEIPT, evidence_source: 'go-core' });
assert(r_norollback.errors.includes('rollback_anchor_id_missing'),                            '[C-07] missing rollback');

const r_badevi = validateRealTagExecutionContext({ target_tag: TAG, git_head: HEAD, evidence_receipt_id: RECEIPT, rollback_anchor_id: ROLLBACK, evidence_source: 'backend' });
assert(r_badevi.errors.includes('evidence_source_must_be_go_core'),                           '[C-08] evidence_source not go-core');

// ─── Suite D: Fixture mode — READY_DRY_RUN ────────────────────────
console.log('\n[Suite D] Fixture mode — READY_DRY_RUN');
const fix = evaluateRealTagExecutionController({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                '[D-01] returns object');
assert(fix.controller_status          === 'REAL_TAG_EXEC_CTRL_READY_DRY_RUN',                '[D-02] status=READY_DRY_RUN');
assert(fix.execution_controller_ready === true,                                                '[D-03] ready=true');
assert(fix.dry_run_authorized         === true,                                                '[D-04] dry_run_authorized=true');
assert(fix.real_execution_authorized  === false,                                               '[D-05] real_exec_authorized=false');
assert(fix.blocking_reason            === null,                                                '[D-06] blocking=null');
assert(fix.baseline_status_verified   === true,                                                '[D-07] baseline_verified=true');
assert(fix.ci_check_passed            === true,                                                '[D-08] ci_check=true');
assert(fix.confirmation_check_passed  === true,                                                '[D-09] confirmation=true');
assert(fix.created_at                 === TS,                                                  '[D-10] created_at=TS');
assert(typeof fix.controller_id === 'string' && fix.controller_id.length === 24,             '[D-11] id 24 chars');
assert(fix.schema_version             === 'v86.0',                                            '[D-12] schema=v86.0');

// ─── Suite E: Fixture mode — READY_FOR_LOCAL_REAL_EXECUTION ───────
console.log('\n[Suite E] Fixture mode — READY_FOR_LOCAL_REAL_EXECUTION');
const fixReal = evaluateRealTagExecutionController({
  fixture_mode: true, execute_real_tag: true, dry_run: false, _mock_timestamp: TS,
});
assert(fixReal.controller_status          === 'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION', '[E-01] READY_FOR_LOCAL_REAL_EXECUTION');
assert(fixReal.execution_controller_ready === true,                                               '[E-02] ready=true');
assert(fixReal.dry_run_authorized         === false,                                              '[E-03] dry_run_authorized=false');
assert(fixReal.real_execution_authorized  === true,                                               '[E-04] real_exec_authorized=true');
assert(fixReal.tag_created                === false,                                              '[E-05] tag_created=false');
assert(fixReal.git_push_performed         === false,                                              '[E-06] push=false');
assert(fixReal.deploy_performed           === false,                                              '[E-07] deploy=false');
assert(fixReal.stable_promoted            === false,                                              '[E-08] stable=false');

// ─── Suite F: Block scenarios (non-fixture) ────────────────────────
console.log('\n[Suite F] Block scenarios');
const b_baseline = evaluateRealTagExecutionController({ ...GOOD_PARAMS, baseline_status: 'WRONG', fixture_mode: false });
assert(b_baseline.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_BASELINE',                '[F-01] BLOCKED_BASELINE');

const b_ci = evaluateRealTagExecutionController({ ...GOOD_PARAMS, ci: true, fixture_mode: false });
assert(b_ci.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_CI',                            '[F-02] BLOCKED_CI');

const b_interactive = evaluateRealTagExecutionController({ ...GOOD_PARAMS, local_interactive_only: false, fixture_mode: false });
assert(b_interactive.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_INTERACTIVE',          '[F-03] BLOCKED_INTERACTIVE');

const b_worktree = evaluateRealTagExecutionController({ ...GOOD_PARAMS, worktree_clean: false, fixture_mode: false });
assert(b_worktree.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_WORKTREE',                '[F-04] BLOCKED_WORKTREE');

const b_local = evaluateRealTagExecutionController({ ...GOOD_PARAMS, local_tag_exists: true, fixture_mode: false });
assert(b_local.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_LOCAL_TAG_EXISTS',           '[F-05] BLOCKED_LOCAL_TAG');

const b_remote = evaluateRealTagExecutionController({ ...GOOD_PARAMS, remote_tag_exists: true, fixture_mode: false });
assert(b_remote.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_REMOTE_TAG_EXISTS',         '[F-06] BLOCKED_REMOTE_TAG');

const b_evi = evaluateRealTagExecutionController({ ...GOOD_PARAMS, evidence_source: 'backend', fixture_mode: false });
assert(b_evi.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_EVIDENCE',                     '[F-07] BLOCKED_EVIDENCE');

const b_conf = evaluateRealTagExecutionController({ ...GOOD_PARAMS, confirmation_phrase: 'wrong', fixture_mode: false });
assert(b_conf.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_CONFIRMATION',                '[F-08] BLOCKED_CONFIRMATION');

const b_dryrun = evaluateRealTagExecutionController({ ...GOOD_PARAMS, execute_real_tag: true, dry_run: true, fixture_mode: false });
assert(b_dryrun.controller_status === 'REAL_TAG_EXEC_CTRL_BLOCKED_DRY_RUN',                   '[F-09] BLOCKED_DRY_RUN');

// ─── Suite G: Non-fixture READY states ────────────────────────────
console.log('\n[Suite G] Non-fixture READY states');
const g_dry = evaluateRealTagExecutionController({ ...GOOD_PARAMS, execute_real_tag: false, dry_run: true, fixture_mode: false });
assert(g_dry.controller_status          === 'REAL_TAG_EXEC_CTRL_READY_DRY_RUN',               '[G-01] non-fixture READY_DRY_RUN');
assert(g_dry.execution_controller_ready === true,                                              '[G-02] ready=true');
assert(g_dry.dry_run_authorized         === true,                                              '[G-03] dry_run_authorized=true');

const g_real = evaluateRealTagExecutionController({ ...GOOD_PARAMS, execute_real_tag: true, dry_run: false, fixture_mode: false });
assert(g_real.controller_status          === 'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION', '[G-04] non-fixture READY_FOR_LOCAL_REAL_EXECUTION');
assert(g_real.real_execution_authorized  === true,                                             '[G-05] real_exec_authorized=true');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.tag_created                  === false, '[H-01] tag_created=false (fixture)');
assert(fix.git_push_performed           === false, '[H-02] push=false (fixture)');
assert(fix.deploy_performed             === false, '[H-03] deploy=false (fixture)');
assert(fix.stable_promoted              === false, '[H-04] stable=false (fixture)');
assert(fix.release_performed            === false, '[H-05] release=false (fixture)');
assert(fix.real_execution_not_performed === true,  '[H-06] not_performed=true (fixture)');
assert(b_baseline.tag_created           === false, '[H-07] tag_created=false (blocked)');
assert(b_ci.tag_created                 === false, '[H-08] tag_created=false (ci blocked)');
assert(g_real.tag_created               === false, '[H-09] tag_created=false (ready real)');
assert(g_real.git_push_performed        === false, '[H-10] push=false (ready real)');

// ─── Suite I: Deterministic ID ────────────────────────────────────
console.log('\n[Suite I] Deterministic ID');
const i1 = evaluateRealTagExecutionController({ fixture_mode: true, _mock_timestamp: TS });
const i2 = evaluateRealTagExecutionController({ fixture_mode: true, _mock_timestamp: TS });
assert(i1.controller_id === i2.controller_id,                                                 '[I-01] deterministic id');
assert(i1.controller_id.length === 24,                                                        '[I-02] id length 24');

// ─── Suite J: renderRealTagExecutionControllerSummary ─────────────
console.log('\n[Suite J] Render');
const rendered = renderRealTagExecutionControllerSummary(fix);
assert(typeof rendered === 'string',                                                           '[J-01] returns string');
assert(rendered.includes('REAL_TAG_EXEC_CTRL_READY_DRY_RUN'),                                 '[J-02] status in output');
assert(rendered.includes('tag_created                   : false'),                             '[J-03] tag=false');
assert(rendered.includes('git_push_performed            : false'),                             '[J-04] push=false');
assert(rendered.includes('real_execution_not_performed  : true'),                              '[J-05] not_performed=true');
assert(rendered.includes('execution_controller_ready'),                                        '[J-06] ready field');
assert(rendered.includes('dry_run_authorized'),                                                '[J-07] dry_run_authorized field');
assert(rendered.includes('real_execution_authorized'),                                         '[J-08] real_exec field');
assert(renderRealTagExecutionControllerSummary(null) === 'real_tag_execution_controller: null', '[J-09] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-execution-controller: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
