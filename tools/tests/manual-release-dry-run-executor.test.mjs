#!/usr/bin/env node
/**
 * Manual Release Dry-Run Executor — Unit Tests V47.1
 */

import {
  runManualReleaseDryRun,
  DRY_RUN_STATUSES,
  DRY_RUN_STEPS,
} from '../manual-release-dry-run-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const VALID_PREFLIGHT = {
  manual_release_preflight_ready: true,
  evidence_source:                'go-core',
  evidence_receipt_id:            'receipt-abc',
  git_head:                       'deadbeef',
  target_branch:                  'main',
  target_version:                 '1.0.0',
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(DRY_RUN_STATUSES),                                     '[A-01] statuses array');
assert(DRY_RUN_STATUSES.length === 4,                                       '[A-02] 4 statuses');
assert(DRY_RUN_STATUSES.includes('DRY_RUN_BLOCKED_PREFLIGHT'),              '[A-03] BLOCKED_PREFLIGHT');
assert(DRY_RUN_STATUSES.includes('DRY_RUN_BLOCKED_EVIDENCE'),               '[A-04] BLOCKED_EVIDENCE');
assert(DRY_RUN_STATUSES.includes('DRY_RUN_BLOCKED_GIT'),                    '[A-05] BLOCKED_GIT');
assert(DRY_RUN_STATUSES.includes('DRY_RUN_READY'),                          '[A-06] READY');
assert(Array.isArray(DRY_RUN_STEPS),                                        '[A-07] steps array');
assert(DRY_RUN_STEPS.length === 10,                                         '[A-08] 10 steps');
assert(DRY_RUN_STEPS.includes('verify_preflight_ready'),                    '[A-09] step: verify_preflight_ready');
assert(DRY_RUN_STEPS.includes('simulate_tag_creation'),                     '[A-10] step: simulate_tag_creation');
assert(DRY_RUN_STEPS.includes('simulate_stable_promotion'),                 '[A-11] step: simulate_stable_promotion');
assert(DRY_RUN_STEPS.includes('write_dry_run_report'),                      '[A-12] step: write_dry_run_report');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = runManualReleaseDryRun({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture.manual_release_dry_run_ready  === true,                      '[B-01] ready=true');
assert(fixture.manual_release_dry_run_status === 'DRY_RUN_READY',           '[B-02] status=DRY_RUN_READY');
assert(typeof fixture.dry_run_report_id      === 'string',                  '[B-03] report_id string');
assert(Array.isArray(fixture.dry_run_steps),                                '[B-04] steps array');
assert(fixture.dry_run_steps.length          === 10,                        '[B-05] 10 steps');
assert(typeof fixture.simulated_tag_name     === 'string',                  '[B-06] simulated_tag_name string');
assert(typeof fixture.simulated_stable_target === 'string',                 '[B-07] simulated_stable_target string');
assert(typeof fixture.simulated_release_notes === 'object',                 '[B-08] simulated_release_notes object');
assert(typeof fixture.simulated_rollback_anchor === 'string',               '[B-09] simulated_rollback_anchor string');
assert(fixture.release_performed             === false,                     '[B-10] release_performed=false');
assert(fixture.tag_created                   === false,                     '[B-11] tag_created=false');
assert(fixture.stable_promoted               === false,                     '[B-12] stable_promoted=false');
assert(fixture.deploy_performed              === false,                     '[B-13] deploy_performed=false');
assert(fixture.deploy_allowed                === false,                     '[B-14] deploy_allowed=false');
assert(fixture.promotion_allowed             === false,                     '[B-15] promotion_allowed=false');
assert(fixture.stable_allowed                === false,                     '[B-16] stable_allowed=false');
assert(fixture.tag_allowed                   === false,                     '[B-17] tag_allowed=false');
assert(fixture.local_only                    === true,                      '[B-18] local_only=true');
assert(fixture.schema_version                === 'v47.1',                   '[B-19] schema=v47.1');
assert(fixture.blocking_reason               === null,                      '[B-20] blocking_reason=null');
// steps all SIMULATED and not executed
for (const step of fixture.dry_run_steps) {
  assert(step.status    === 'SIMULATED',  `[B] step ${step.step}: status=SIMULATED`);
  assert(step.executed  === false,        `[B] step ${step.step}: executed=false`);
  assert(step.real_action === false,      `[B] step ${step.step}: real_action=false`);
}

// ─── Suite C: Blocked — preflight missing ────────────────────────
console.log('\n[Suite C] Blocked — preflight');
const noPreflight = runManualReleaseDryRun({ preflight_result: null });
assert(noPreflight.manual_release_dry_run_status === 'DRY_RUN_BLOCKED_PREFLIGHT', '[C-01] null preflight → BLOCKED_PREFLIGHT');
assert(noPreflight.release_performed             === false,                       '[C-02] release_performed=false');
assert(noPreflight.tag_created                   === false,                       '[C-03] tag_created=false');

const notReadyPreflight = runManualReleaseDryRun({ preflight_result: { manual_release_preflight_ready: false } });
assert(notReadyPreflight.manual_release_dry_run_status === 'DRY_RUN_BLOCKED_PREFLIGHT', '[C-04] not ready → BLOCKED_PREFLIGHT');

// ─── Suite D: Blocked — evidence ─────────────────────────────────
console.log('\n[Suite D] Blocked — evidence');
const badEvidence = runManualReleaseDryRun({ preflight_result: { ...VALID_PREFLIGHT, evidence_source: 'backend' } });
assert(badEvidence.manual_release_dry_run_status === 'DRY_RUN_BLOCKED_EVIDENCE', '[D-01] backend → BLOCKED_EVIDENCE');

const noReceipt = runManualReleaseDryRun({ preflight_result: { ...VALID_PREFLIGHT, evidence_receipt_id: null } });
assert(noReceipt.manual_release_dry_run_status === 'DRY_RUN_BLOCKED_EVIDENCE', '[D-02] no receipt → BLOCKED_EVIDENCE');

// ─── Suite E: Blocked — git fields ───────────────────────────────
console.log('\n[Suite E] Blocked — git');
const noGitHead = runManualReleaseDryRun({ preflight_result: { ...VALID_PREFLIGHT, git_head: null } });
assert(noGitHead.manual_release_dry_run_status === 'DRY_RUN_BLOCKED_GIT', '[E-01] no git_head → BLOCKED_GIT');

const noBranch = runManualReleaseDryRun({ preflight_result: { ...VALID_PREFLIGHT, target_branch: null } });
assert(noBranch.manual_release_dry_run_status === 'DRY_RUN_BLOCKED_GIT', '[E-02] no branch → BLOCKED_GIT');

// ─── Suite F: Full dry-run ready ─────────────────────────────────
console.log('\n[Suite F] Full dry-run ready');
const ready = runManualReleaseDryRun({ preflight_result: VALID_PREFLIGHT, _mock_timestamp: TS });
assert(ready.manual_release_dry_run_ready    === true,                      '[F-01] ready=true');
assert(ready.manual_release_dry_run_status   === 'DRY_RUN_READY',           '[F-02] status=DRY_RUN_READY');
assert(typeof ready.dry_run_report_id        === 'string',                  '[F-03] report_id string');
assert(ready.simulated_tag_name              === 'v1.0.0',                  '[F-04] simulated_tag=v1.0.0');
assert(ready.simulated_stable_target         === 'main',                    '[F-05] simulated_stable=main');
assert(ready.target_version                  === '1.0.0',                   '[F-06] target_version wired');
assert(ready.target_branch                   === 'main',                    '[F-07] target_branch wired');
assert(ready.git_head                        === 'deadbeef',                '[F-08] git_head wired');
assert(ready.evidence_receipt_id             === 'receipt-abc',             '[F-09] evidence_receipt_id wired');
assert(ready.simulated_release_notes.type    === 'SIMULATED_DRY_RUN',       '[F-10] release_notes.type=SIMULATED_DRY_RUN');
assert(ready.simulated_release_notes.note.includes('DRY RUN ONLY'),         '[F-11] release_notes has DRY RUN ONLY note');
assert(ready.release_performed               === false,                     '[F-12] release_performed=false');
assert(ready.tag_created                     === false,                     '[F-13] tag_created=false');
assert(ready.stable_promoted                 === false,                     '[F-14] stable_promoted=false');
assert(ready.deploy_performed                === false,                     '[F-15] deploy_performed=false');
assert(ready.deploy_allowed                  === false,                     '[F-16] deploy=false');
assert(ready.promotion_allowed               === false,                     '[F-17] promotion=false');
assert(ready.stable_allowed                  === false,                     '[F-18] stable=false');
assert(ready.tag_allowed                     === false,                     '[F-19] tag=false');
// all steps SIMULATED
for (const step of ready.dry_run_steps) {
  assert(step.real_action === false, `[F] step ${step.step}: real_action=false`);
}

// ─── Suite G: Invariants across all modes ────────────────────────
console.log('\n[Suite G] Invariants across all modes');
const modes = [
  { label: 'fixture',      o: fixture      },
  { label: 'ready',        o: ready        },
  { label: 'no-preflight', o: noPreflight  },
  { label: 'bad-evidence', o: badEvidence  },
  { label: 'no-git',       o: noGitHead    },
];
for (const { label, o } of modes) {
  assert(o.release_performed === false, `[G] ${label}: release_performed=false`);
  assert(o.tag_created       === false, `[G] ${label}: tag_created=false`);
  assert(o.stable_promoted   === false, `[G] ${label}: stable_promoted=false`);
  assert(o.deploy_performed  === false, `[G] ${label}: deploy_performed=false`);
  assert(o.deploy_allowed    === false, `[G] ${label}: deploy_allowed=false`);
  assert(o.promotion_allowed === false, `[G] ${label}: promotion_allowed=false`);
  assert(o.stable_allowed    === false, `[G] ${label}: stable_allowed=false`);
  assert(o.tag_allowed       === false, `[G] ${label}: tag_allowed=false`);
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\nmanual-release-dry-run-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
