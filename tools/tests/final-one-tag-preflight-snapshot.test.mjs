#!/usr/bin/env node
/**
 * Final One-Tag Preflight Snapshot — Unit Tests V96.0
 */

import {
  PREFLIGHT_SNAPSHOT_STATUSES,
  buildFinalOneTagPreflightSnapshot,
  validateFinalOneTagPreflightSnapshot,
  renderFinalOneTagPreflightSnapshot,
} from '../final-one-tag-preflight-snapshot.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS       = '2026-05-19T07:00:00.000Z';
const SHA      = 'abc1234def567890abc12345';
const BASELINE = { baseline_ready: true, baseline_id: 'test-baseline-id-000000' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PREFLIGHT_SNAPSHOT_STATUSES),                                         '[A-01] statuses array');
assert(PREFLIGHT_SNAPSHOT_STATUSES.length === 8,                                           '[A-02] 8 statuses');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_BASELINE'),        '[A-03] BLOCKED_BASELINE');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_WORKTREE'),        '[A-04] BLOCKED_WORKTREE');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_HEAD'),            '[A-05] BLOCKED_HEAD');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_LOCAL_TAG'),       '[A-06] BLOCKED_LOCAL_TAG');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_REMOTE_TAG'),      '[A-07] BLOCKED_REMOTE_TAG');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_EVIDENCE'),        '[A-08] BLOCKED_EVIDENCE');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_BLOCKED_ROLLBACK'),        '[A-09] BLOCKED_ROLLBACK');
assert(PREFLIGHT_SNAPSHOT_STATUSES.includes('PREFLIGHT_SNAPSHOT_READY'),                   '[A-10] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildFinalOneTagPreflightSnapshot({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                            '[B-01] returns object');
assert(fix.snapshot_status     === 'PREFLIGHT_SNAPSHOT_READY',                            '[B-02] READY status');
assert(fix.preflight_ready     === true,                                                   '[B-03] preflight_ready=true');
assert(fix.schema_version      === 'v96.0',                                                '[B-04] schema=v96.0');
assert(typeof fix.snapshot_id === 'string' && fix.snapshot_id.length === 24,              '[B-05] id 24 chars');
assert(fix.blocking_reason     === null,                                                   '[B-06] blocking=null');
assert(fix.evidence_source     === 'go-core',                                             '[B-07] evidence_source=go-core');
assert(fix.working_tree_clean  === true,                                                   '[B-08] worktree clean');
assert(fix.local_tag_exists    === false,                                                  '[B-09] local_tag_exists=false');
assert(fix.remote_tag_exists   === false,                                                  '[B-10] remote_tag_exists=false');
assert(fix.ci_environment      === false,                                                  '[B-11] ci=false');
assert(fix.github_actions      === false,                                                  '[B-12] github_actions=false');
assert(fix.local_interactive_session_required === true,                                    '[B-13] interactive=true');
assert(fix.baseline_verified   === true,                                                   '[B-14] baseline_verified=true');
assert(fix.created_at          === TS,                                                     '[B-15] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ─────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: BLOCKED_BASELINE ────────────────────────────────────
console.log('\n[Suite D] BLOCKED_BASELINE');
const bNoBaseline = buildFinalOneTagPreflightSnapshot({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoBaseline.snapshot_status  === 'PREFLIGHT_SNAPSHOT_BLOCKED_BASELINE',             '[D-01] no baseline → BLOCKED_BASELINE');
assert(bNoBaseline.preflight_ready  === false,                                              '[D-02] ready=false');
assert(bNoBaseline.baseline_verified === false,                                             '[D-03] baseline_verified=false');
assert(bNoBaseline.tag_created       === false,                                             '[D-04] tag_created=false in blocked');

const bBadBaseline = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result: { baseline_ready: false },
  _mock_timestamp: TS,
});
assert(bBadBaseline.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_BASELINE',             '[D-05] bad baseline → BLOCKED_BASELINE');

// ─── Suite E: BLOCKED_WORKTREE ────────────────────────────────────
console.log('\n[Suite E] BLOCKED_WORKTREE');
const bDirty = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:  BASELINE,
  working_tree_clean: false,
  _mock_timestamp: TS,
});
assert(bDirty.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_WORKTREE',                   '[E-01] dirty → BLOCKED_WORKTREE');
assert(bDirty.baseline_verified === true,                                                   '[E-02] baseline passed before worktree');
assert(bDirty.tag_created === false,                                                        '[E-03] tag_created=false');

// ─── Suite F: BLOCKED_HEAD ────────────────────────────────────────
console.log('\n[Suite F] BLOCKED_HEAD');
const bHeadMismatch = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:   BASELINE,
  working_tree_clean: true,
  git_head:          'aaa111',
  expected_git_head: 'bbb222',
  _mock_timestamp:   TS,
});
assert(bHeadMismatch.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_HEAD',                '[F-01] mismatch → BLOCKED_HEAD');
assert(bHeadMismatch.baseline_verified === true,                                            '[F-02] baseline passed');

const bNoHead = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:   BASELINE,
  working_tree_clean: true,
  _mock_timestamp:   TS,
});
assert(bNoHead.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_HEAD',                      '[F-03] no head → BLOCKED_HEAD');

// ─── Suite G: BLOCKED_LOCAL_TAG ───────────────────────────────────
console.log('\n[Suite G] BLOCKED_LOCAL_TAG');
const bLocalTag = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:   BASELINE,
  working_tree_clean: true,
  git_head:          SHA,
  expected_git_head: SHA,
  local_tag_exists:  true,
  _mock_timestamp:   TS,
});
assert(bLocalTag.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_LOCAL_TAG',               '[G-01] local tag → BLOCKED_LOCAL_TAG');
assert(bLocalTag.baseline_verified === true,                                                '[G-02] baseline passed');

// ─── Suite H: BLOCKED_REMOTE_TAG ─────────────────────────────────
console.log('\n[Suite H] BLOCKED_REMOTE_TAG');
const bRemoteTag = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:   BASELINE,
  working_tree_clean: true,
  git_head:          SHA,
  expected_git_head: SHA,
  local_tag_exists:  false,
  remote_tag_exists: true,
  _mock_timestamp:   TS,
});
assert(bRemoteTag.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_REMOTE_TAG',             '[H-01] remote tag → BLOCKED_REMOTE_TAG');
assert(bRemoteTag.local_tag_exists === false,                                               '[H-02] local tag passed before remote');

// ─── Suite I: BLOCKED_EVIDENCE ────────────────────────────────────
console.log('\n[Suite I] BLOCKED_EVIDENCE');
const bBadEvidence = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:   BASELINE,
  working_tree_clean: true,
  git_head:          SHA,
  expected_git_head: SHA,
  local_tag_exists:  false,
  remote_tag_exists: false,
  evidence_source:   'backend',
  rollback_anchor_id: 'anchor-001',
  _mock_timestamp:   TS,
});
assert(bBadEvidence.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_EVIDENCE',             '[I-01] backend → BLOCKED_EVIDENCE');

const bNoEvidence = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:   BASELINE,
  working_tree_clean: true,
  git_head:          SHA,
  expected_git_head: SHA,
  local_tag_exists:  false,
  remote_tag_exists: false,
  _mock_timestamp:   TS,
});
assert(bNoEvidence.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_EVIDENCE',              '[I-02] no source → BLOCKED_EVIDENCE');

// ─── Suite J: BLOCKED_ROLLBACK ────────────────────────────────────
console.log('\n[Suite J] BLOCKED_ROLLBACK');
const bNoRollback = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:   BASELINE,
  working_tree_clean: true,
  git_head:          SHA,
  expected_git_head: SHA,
  local_tag_exists:  false,
  remote_tag_exists: false,
  evidence_source:   'go-core',
  _mock_timestamp:   TS,
});
assert(bNoRollback.snapshot_status === 'PREFLIGHT_SNAPSHOT_BLOCKED_ROLLBACK',              '[J-01] no rollback → BLOCKED_ROLLBACK');
assert(bNoRollback.rollback_anchor_id === null,                                             '[J-02] rollback_anchor_id=null');

// ─── Suite K: Non-fixture READY ───────────────────────────────────
console.log('\n[Suite K] Non-fixture READY');
const ready = buildFinalOneTagPreflightSnapshot({
  fixture_mode: false,
  baseline_result:    BASELINE,
  target_tag:         'v1.0.0',
  target_version:     '1.0.0',
  current_branch:     'main',
  git_head:           SHA,
  expected_git_head:  SHA,
  evidence_receipt_id: 'receipt-001',
  evidence_source:    'go-core',
  rollback_anchor_id: 'anchor-001',
  working_tree_clean: true,
  local_tag_exists:   false,
  remote_tag_exists:  false,
  ci_environment:     false,
  github_actions:     false,
  _mock_timestamp:    TS,
});
assert(ready.snapshot_status   === 'PREFLIGHT_SNAPSHOT_READY',                             '[K-01] full params → READY');
assert(ready.preflight_ready   === true,                                                    '[K-02] ready=true');
assert(ready.target_tag        === 'v1.0.0',                                               '[K-03] target_tag set');
assert(ready.git_head          === SHA,                                                    '[K-04] git_head set');
assert(ready.evidence_source   === 'go-core',                                              '[K-05] evidence=go-core');
assert(ready.rollback_anchor_id === 'anchor-001',                                          '[K-06] rollback set');
assert(ready.human_op_baseline_id === 'test-baseline-id-000000',                           '[K-07] baseline_id propagated');
assert(ready.tag_created       === false,                                                   '[K-08] tag_created=false');
assert(ready.actual_real_tag_created === false,                                             '[K-09] actual_tag=false');

// ─── Suite L: Deterministic ID ───────────────────────────────────
console.log('\n[Suite L] Deterministic ID');
const l1 = buildFinalOneTagPreflightSnapshot({ fixture_mode: true, _mock_timestamp: TS });
const l2 = buildFinalOneTagPreflightSnapshot({ fixture_mode: true, _mock_timestamp: TS });
assert(l1.snapshot_id === l2.snapshot_id,                                                  '[L-01] deterministic id');
const l3 = buildFinalOneTagPreflightSnapshot({ fixture_mode: true, _mock_timestamp: '2026-01-01T00:00:00.000Z' });
assert(l1.snapshot_id !== l3.snapshot_id,                                                  '[L-02] different ts → different id');

// ─── Suite M: Validate ───────────────────────────────────────────
console.log('\n[Suite M] Validate');
assert(validateFinalOneTagPreflightSnapshot(fix).length === 0,                             '[M-01] fixture passes validation');
assert(validateFinalOneTagPreflightSnapshot(null).length > 0,                              '[M-02] null fails validation');
const mutated = { ...fix, tag_created: true };
assert(validateFinalOneTagPreflightSnapshot(mutated).length > 0,                           '[M-03] tag_created=true fails');
const mutated2 = { ...fix, actual_real_tag_created: true };
assert(validateFinalOneTagPreflightSnapshot(mutated2).length > 0,                          '[M-04] actual_real_tag_created=true fails');

// ─── Suite N: Render ─────────────────────────────────────────────
console.log('\n[Suite N] Render');
const rendered = renderFinalOneTagPreflightSnapshot(fix);
assert(typeof rendered === 'string',                                                        '[N-01] returns string');
assert(rendered.includes('PREFLIGHT_SNAPSHOT_READY'),                                      '[N-02] status in output');
assert(rendered.includes('tag_created                        : false'),                    '[N-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created            : false'),                    '[N-04] actual_tag=false');
assert(rendered.includes('real_execution_not_performed       : true'),                     '[N-05] not_performed=true');
assert(rendered.includes('local_interactive_session_required : true'),                     '[N-06] interactive=true');
assert(rendered.includes('evidence_source                    : go-core'),                  '[N-07] evidence=go-core');
assert(rendered.includes('blocking_reason                    : none'),                     '[N-08] blocking=none');
assert(renderFinalOneTagPreflightSnapshot(null) === 'final_one_tag_preflight_snapshot: null', '[N-09] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nfinal-one-tag-preflight-snapshot: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
