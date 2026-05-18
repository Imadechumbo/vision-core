#!/usr/bin/env node
/**
 * Real Tag One-Shot Post-Execution Verifier — Unit Tests V87.0
 */

import {
  POST_EXEC_VERIFIER_STATUSES,
  runPostExecutionVerifier,
  validatePostExecutionVerifierResult,
  renderPostExecutionVerifierSummary,
} from '../real-tag-one-shot-post-execution-verifier.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS   = '2026-05-18T23:00:00.000Z';
const TAG  = 'v1.0.0-test';
const HEAD = 'abc1234def567890abc123';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(POST_EXEC_VERIFIER_STATUSES),                                      '[A-01] statuses array');
assert(POST_EXEC_VERIFIER_STATUSES.length === 9,                                        '[A-02] 9 statuses');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_BLOCKED_EXECUTOR'),       '[A-03] BLOCKED_EXECUTOR');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_BLOCKED_NOT_EXECUTED'),   '[A-04] BLOCKED_NOT_EXECUTED');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_BLOCKED_CI'),             '[A-05] BLOCKED_CI');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_BLOCKED_LOCAL_TAG_MISSING'), '[A-06] BLOCKED_LOCAL');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_BLOCKED_REMOTE_TAG_MISSING'), '[A-07] BLOCKED_REMOTE');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_BLOCKED_HEAD_MISMATCH'), '[A-08] BLOCKED_HEAD');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_BLOCKED_ADAPTER'),        '[A-09] BLOCKED_ADAPTER');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_SKIPPED_DRY_RUN'),        '[A-10] SKIPPED_DRY_RUN');
assert(POST_EXEC_VERIFIER_STATUSES.includes('POST_EXEC_VERIFY_PASSED'),                 '[A-11] PASSED');

// ─── Suite B: Fixture mode — SKIPPED_DRY_RUN ─────────────────────
console.log('\n[Suite B] Fixture mode — SKIPPED_DRY_RUN');
const fix = runPostExecutionVerifier({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                          '[B-01] returns object');
assert(fix.verifier_status      === 'POST_EXEC_VERIFY_SKIPPED_DRY_RUN',                '[B-02] SKIPPED_DRY_RUN');
assert(fix.verification_passed  === true,                                                '[B-03] passed=true');
assert(fix.dry_run_skipped      === true,                                                '[B-04] dry_run_skipped=true');
assert(fix.blocking_reason      === null,                                                '[B-05] blocking=null');
assert(fix.created_at           === TS,                                                  '[B-06] created_at=TS');
assert(typeof fix.verifier_id === 'string' && fix.verifier_id.length === 24,           '[B-07] id 24 chars');
assert(fix.schema_version       === 'v87.0',                                            '[B-08] schema=v87.0');

// ─── Suite C: Fixture mode — PASSED (executed) ────────────────────
console.log('\n[Suite C] Fixture mode — PASSED');
const fixPassed = runPostExecutionVerifier({
  fixture_mode:    true,
  executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED',
  tag_created:     true,
  _mock_timestamp: TS,
});
assert(fixPassed.verifier_status    === 'POST_EXEC_VERIFY_PASSED',                      '[C-01] PASSED');
assert(fixPassed.verification_passed=== true,                                            '[C-02] passed=true');
assert(fixPassed.dry_run_skipped    === false,                                           '[C-03] dry_run_skipped=false');
assert(fixPassed.local_tag_verified === true,                                            '[C-04] local_tag=true');
assert(fixPassed.remote_tag_verified=== true,                                            '[C-05] remote_tag=true');
assert(fixPassed.head_match_verified=== true,                                            '[C-06] head_match=true');
assert(fixPassed.tag_created        === false,                                           '[C-07] tag_created=false (verifier never creates)');
assert(fixPassed.git_push_performed === false,                                           '[C-08] push=false (verifier never pushes)');

// ─── Suite D: Block scenarios ──────────────────────────────────────
console.log('\n[Suite D] Block scenarios');
const d_exec = runPostExecutionVerifier({
  executor_ready: false, _mock_timestamp: TS,
});
assert(d_exec.verifier_status === 'POST_EXEC_VERIFY_BLOCKED_EXECUTOR',                  '[D-01] BLOCKED_EXECUTOR');

const d_notexec = runPostExecutionVerifier({
  executor_ready: true, executor_status: 'LOCAL_EXEC_BLOCKED_ADAPTER', tag_created: false,
  _mock_timestamp: TS,
});
assert(d_notexec.verifier_status === 'POST_EXEC_VERIFY_BLOCKED_NOT_EXECUTED',           '[D-02] BLOCKED_NOT_EXECUTED');

const d_ci = runPostExecutionVerifier({
  executor_ready: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED', tag_created: true,
  ci: true, _mock_timestamp: TS,
});
assert(d_ci.verifier_status === 'POST_EXEC_VERIFY_BLOCKED_CI',                          '[D-03] BLOCKED_CI');

const d_adapter = runPostExecutionVerifier({
  executor_ready: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED', tag_created: true,
  ci: false, target_tag: TAG, _mock_timestamp: TS,
});
assert(d_adapter.verifier_status === 'POST_EXEC_VERIFY_BLOCKED_ADAPTER',                '[D-04] BLOCKED_ADAPTER (no adapter)');

// ─── Suite E: Dry run skipped (non-fixture) ───────────────────────
console.log('\n[Suite E] Dry run skipped (non-fixture)');
const e_dry = runPostExecutionVerifier({
  executor_ready: true, executor_status: 'LOCAL_EXEC_DRY_RUN_COMPLETE',
  _mock_timestamp: TS,
});
assert(e_dry.verifier_status    === 'POST_EXEC_VERIFY_SKIPPED_DRY_RUN',                '[E-01] non-fixture SKIPPED_DRY_RUN');
assert(e_dry.verification_passed=== true,                                               '[E-02] passed=true');
assert(e_dry.dry_run_skipped    === true,                                               '[E-03] dry_run_skipped=true');

// ─── Suite F: Injectable spawn_adapter (mock PASSED) ─────────────
console.log('\n[Suite F] Mock adapter — PASSED');
const mock_adapter = (cmd, args) => {
  if (args[0] === 'tag' && args[1] === '-l') return { status: 0, stdout: `${TAG}\n`, stderr: '' };
  if (args[0] === 'ls-remote') return { status: 0, stdout: `abc123\trefs/tags/${TAG}`, stderr: '' };
  if (args[0] === 'rev-list') return { status: 0, stdout: `${HEAD}\n`, stderr: '' };
  return { status: 1, stdout: '', stderr: '' };
};
const f_pass = runPostExecutionVerifier({
  executor_ready:   true,
  executor_status:  'LOCAL_EXEC_REAL_TAG_EXECUTED',
  tag_created:      true,
  ci:               false,
  target_tag:       TAG,
  expected_git_head: HEAD,
  spawn_adapter:    mock_adapter,
  _mock_timestamp:  TS,
});
assert(f_pass.verifier_status    === 'POST_EXEC_VERIFY_PASSED',                         '[F-01] PASSED with adapter');
assert(f_pass.local_tag_verified === true,                                              '[F-02] local_tag=true');
assert(f_pass.remote_tag_verified=== true,                                              '[F-03] remote_tag=true');
assert(f_pass.head_match_verified=== true,                                              '[F-04] head_match=true');
assert(f_pass.tag_created        === false,                                             '[F-05] tag_created=false (verifier)');

// ─── Suite G: Mock adapter — local tag missing ────────────────────
console.log('\n[Suite G] Mock adapter — failures');
const adapter_no_local = (cmd, args) => {
  if (args[0] === 'tag' && args[1] === '-l') return { status: 0, stdout: '', stderr: '' };
  return { status: 0, stdout: TAG, stderr: '' };
};
const g_nolocal = runPostExecutionVerifier({
  executor_ready: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED', tag_created: true,
  ci: false, target_tag: TAG, spawn_adapter: adapter_no_local, _mock_timestamp: TS,
});
assert(g_nolocal.verifier_status === 'POST_EXEC_VERIFY_BLOCKED_LOCAL_TAG_MISSING',     '[G-01] local tag missing');

const adapter_no_remote = (cmd, args) => {
  if (args[0] === 'tag' && args[1] === '-l') return { status: 0, stdout: `${TAG}\n`, stderr: '' };
  if (args[0] === 'ls-remote') return { status: 0, stdout: '', stderr: '' };
  return { status: 0, stdout: HEAD, stderr: '' };
};
const g_noremote = runPostExecutionVerifier({
  executor_ready: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED', tag_created: true,
  ci: false, target_tag: TAG, spawn_adapter: adapter_no_remote, _mock_timestamp: TS,
});
assert(g_noremote.verifier_status === 'POST_EXEC_VERIFY_BLOCKED_REMOTE_TAG_MISSING',   '[G-02] remote tag missing');

const adapter_head_mismatch = (cmd, args) => {
  if (args[0] === 'tag' && args[1] === '-l') return { status: 0, stdout: `${TAG}\n`, stderr: '' };
  if (args[0] === 'ls-remote') return { status: 0, stdout: `abc123\trefs/tags/${TAG}`, stderr: '' };
  if (args[0] === 'rev-list') return { status: 0, stdout: 'zzz9999wronghead\n', stderr: '' };
  return { status: 0, stdout: '', stderr: '' };
};
const g_headmiss = runPostExecutionVerifier({
  executor_ready: true, executor_status: 'LOCAL_EXEC_REAL_TAG_EXECUTED', tag_created: true,
  ci: false, target_tag: TAG, expected_git_head: HEAD, spawn_adapter: adapter_head_mismatch,
  _mock_timestamp: TS,
});
assert(g_headmiss.verifier_status === 'POST_EXEC_VERIFY_BLOCKED_HEAD_MISMATCH',        '[G-03] head mismatch');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.tag_created                  === false, '[H-01] tag_created=false (dry_run fix)');
assert(fix.git_push_performed           === false, '[H-02] push=false');
assert(fix.deploy_performed             === false, '[H-03] deploy=false');
assert(fix.stable_promoted              === false, '[H-04] stable=false');
assert(fix.release_performed            === false, '[H-05] release=false');
assert(fix.real_execution_not_performed === true,  '[H-06] not_performed=true');
assert(f_pass.tag_created               === false, '[H-07] tag_created=false (PASSED)');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
const v_ok = validatePostExecutionVerifierResult(fix);
assert(v_ok.valid === true,                                                             '[I-01] valid dry_run fix');
const v_null = validatePostExecutionVerifierResult(null);
assert(v_null.valid === false,                                                          '[I-02] null invalid');
const v_bad = validatePostExecutionVerifierResult({ verifier_status: 'POST_EXEC_VERIFY_PASSED', deploy_performed: true });
assert(v_bad.errors.includes('deploy_performed_must_be_false'),                        '[I-03] deploy=true → error');
const v_tag = validatePostExecutionVerifierResult({ verifier_status: 'POST_EXEC_VERIFY_PASSED', tag_created: true });
assert(v_tag.errors.includes('tag_created_must_be_false'),                             '[I-04] tag_created=true → error');

// ─── Suite J: Deterministic ID ────────────────────────────────────
console.log('\n[Suite J] Deterministic ID');
const j1 = runPostExecutionVerifier({ fixture_mode: true, _mock_timestamp: TS });
const j2 = runPostExecutionVerifier({ fixture_mode: true, _mock_timestamp: TS });
assert(j1.verifier_id === j2.verifier_id,                                               '[J-01] deterministic id');

// ─── Suite K: Render ──────────────────────────────────────────────
console.log('\n[Suite K] Render');
const rendered = renderPostExecutionVerifierSummary(fix);
assert(typeof rendered === 'string',                                                    '[K-01] returns string');
assert(rendered.includes('POST_EXEC_VERIFY_SKIPPED_DRY_RUN'),                          '[K-02] status in output');
assert(rendered.includes('tag_created                   : false'),                      '[K-03] tag=false');
assert(rendered.includes('deploy_performed              : false'),                      '[K-04] deploy=false');
assert(rendered.includes('verification_passed'),                                        '[K-05] passed field');
assert(renderPostExecutionVerifierSummary(null) === 'real_tag_post_execution_verifier: null', '[K-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-post-execution-verifier: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
