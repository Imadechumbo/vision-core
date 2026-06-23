#!/usr/bin/env node
/**
 * Rollback Drill — Unit Tests V16.3
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  executeRollbackDrill,
  ROLLBACK_DRILL_STATUSES,
  ROLLBACK_SCHEMA_VERSION,
} from '../rollback-drill.mjs';

const CLI = resolve(process.cwd(), 'tools', 'rollback-drill.mjs');
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log(`  ✓ ${m}`); passed++; } else { console.error(`  ✗ FAIL: ${m}`); failed++; } }
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

const goodPlan = {
  rollback_target:   'deadbeef123',
  rollback_branch:   'main',
  evidence_snapshot: 'ev_gocore_v163',
  steps: [
    { id: 'snapshot', description: 'Record current state' },
    { id: 'verify',   description: 'Verify rollback target integrity' },
  ],
};
const noPlanSteps  = { rollback_target: 'abc', steps: [] };
const noTargetPlan = { rollback_target: null, steps: [{ id: 's1', description: 'step' }] };

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(ROLLBACK_SCHEMA_VERSION === 'v16.3',                             '[A-01] schema=v16.3');
assert(Array.isArray(ROLLBACK_DRILL_STATUSES) && ROLLBACK_DRILL_STATUSES.length === 5, '[A-02] 5 statuses');
assert(ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_BLOCKED_PLAN'),       '[A-03] ROLLBACK_BLOCKED_PLAN');
assert(ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_BLOCKED_TARGET'),     '[A-04] ROLLBACK_BLOCKED_TARGET');
assert(ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_DRY_RUN_READY'),      '[A-05] ROLLBACK_DRY_RUN_READY');
assert(ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_LOCAL_DRILL_PASS'),   '[A-06] ROLLBACK_LOCAL_DRILL_PASS');
assert(ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_LOCAL_DRILL_FAIL'),   '[A-07] ROLLBACK_LOCAL_DRILL_FAIL');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants — always false');
const anyR = executeRollbackDrill({});
assert(anyR.deploy_performed  === false, '[B-01] deploy_performed=false');
assert(anyR.deploy_allowed    === false, '[B-02] deploy_allowed=false');
assert(anyR.tag_created       === false, '[B-03] tag_created=false');
assert(anyR.stable_promoted   === false, '[B-04] stable_promoted=false');
assert(anyR.release_performed === false, '[B-05] release_performed=false');
assert(anyR.schema_version === 'v16.3',  '[B-06] schema=v16.3');

// ─── Suite C: Blocked scenarios ──────────────────────────────────
console.log('\n[Suite C] Blocked scenarios');

// Missing plan → ROLLBACK_BLOCKED_PLAN
const pNoPlan = executeRollbackDrill({});
assert(pNoPlan.rollback_drill_status === 'ROLLBACK_BLOCKED_PLAN', '[C-01] no plan → ROLLBACK_BLOCKED_PLAN');
assert(pNoPlan.rollback_ready        === false,                   '[C-02] blocked → rollback_ready=false');
assert(pNoPlan.restore_performed     === false,                   '[C-03] blocked → restore_performed=false');

// Null plan → ROLLBACK_BLOCKED_PLAN
const pNull = executeRollbackDrill({ rollbackPlan: null });
assert(pNull.rollback_drill_status === 'ROLLBACK_BLOCKED_PLAN',   '[C-04] null plan → ROLLBACK_BLOCKED_PLAN');

// Empty steps → ROLLBACK_BLOCKED_PLAN
const pNoSteps = executeRollbackDrill({ rollbackPlan: noPlanSteps });
assert(pNoSteps.rollback_drill_status === 'ROLLBACK_BLOCKED_PLAN','[C-05] no steps → ROLLBACK_BLOCKED_PLAN');

// Missing target → ROLLBACK_BLOCKED_TARGET
const pNoTarget = executeRollbackDrill({ rollbackPlan: noTargetPlan });
assert(pNoTarget.rollback_drill_status === 'ROLLBACK_BLOCKED_TARGET','[C-06] no target → ROLLBACK_BLOCKED_TARGET');

// ─── Suite D: Dry-run ─────────────────────────────────────────────
console.log('\n[Suite D] Dry-run mode');
const dryRun = executeRollbackDrill({ rollbackPlan: goodPlan, dryRun: true });
assert(dryRun.rollback_drill_status === 'ROLLBACK_DRY_RUN_READY', '[D-01] dry-run → ROLLBACK_DRY_RUN_READY');
assert(dryRun.rollback_ready        === true,                     '[D-02] dry-run → rollback_ready=true');
assert(dryRun.restore_performed     === false,                    '[D-03] dry-run → restore_performed=false');
assert(dryRun.integrity_pass        === true,                     '[D-04] dry-run → integrity_pass=true');
assert(dryRun.rollback_target === 'deadbeef123',                  '[D-05] target populated');
assert(dryRun.steps_evaluated === 2,                              '[D-06] steps_evaluated=2');
assert(typeof dryRun.rollback_drill_id === 'string',              '[D-07] drill_id is string');
assert(dryRun.rollback_drill_id.startsWith('drill_'),             '[D-08] id starts with drill_');
assert(dryRun.deploy_performed === false,                         '[D-09] dry-run → deploy_performed=false');

// ─── Suite E: Local drill ─────────────────────────────────────────
console.log('\n[Suite E] Local drill (temp dir)');
const localDrill = executeRollbackDrill({ rollbackPlan: goodPlan, dryRun: false, localDrill: true });
assert(localDrill.rollback_drill_status === 'ROLLBACK_LOCAL_DRILL_PASS' || localDrill.rollback_drill_status === 'ROLLBACK_LOCAL_DRILL_FAIL', '[E-01] local drill → valid status');
assert(localDrill.restore_performed === true,                     '[E-02] local drill → restore_performed=true');
assert(typeof localDrill.files_checked === 'number',              '[E-03] files_checked is number');
assert(localDrill.deploy_performed === false,                     '[E-04] local drill → deploy_performed=false');
assert(localDrill.stable_promoted  === false,                     '[E-05] local drill → stable_promoted=false');

// Local drill pass specifically
if (localDrill.rollback_drill_status === 'ROLLBACK_LOCAL_DRILL_PASS') {
  assert(localDrill.integrity_pass === true,                      '[E-06] local drill pass → integrity_pass=true');
  assert(localDrill.rollback_ready === true,                      '[E-07] local drill pass → rollback_ready=true');
} else {
  // Still should not affect production
  assert(localDrill.deploy_performed === false,                   '[E-06] local drill fail → deploy_performed=false');
  assert(localDrill.stable_promoted  === false,                   '[E-07] local drill fail → stable_promoted=false');
}

// ─── Suite F: Default mode is dry-run ─────────────────────────────
console.log('\n[Suite F] Default dry-run (no localDrill flag)');
const defaultMode = executeRollbackDrill({ rollbackPlan: goodPlan });
assert(defaultMode.rollback_drill_status === 'ROLLBACK_DRY_RUN_READY','[F-01] default → dry-run mode');
assert(defaultMode.restore_performed === false,                   '[F-02] default → restore_performed=false');

// ─── Suite G: CLI ────────────────────────────────────────────────
console.log('\n[Suite G] CLI entrypoint');

// No flags → blocked
const cliNone = runCLI(['--json']);
assert(cliNone.exitCode === 2,                                    '[G-01] no plan → exit 2');
assert(cliNone.stdout.length > 0,                                 '[G-02] stdout non-empty');
(() => {
  try {
    const o = JSON.parse(cliNone.stdout);
    assert(o.rollback_drill_status === 'ROLLBACK_BLOCKED_PLAN',   '[G-03] → ROLLBACK_BLOCKED_PLAN');
    assert(o.deploy_performed === false,                           '[G-04] deploy_performed=false');
  } catch { assert(false, '[G-03..04] valid JSON'); }
})();

// Dry-run with target → ROLLBACK_DRY_RUN_READY
const cliDry = runCLI(['--json', '--dry-run', '--rollback-target', 'sha123abc', '--rollback-step', 'snapshot state']);
assert(cliDry.exitCode === 0,                                     '[G-05] dry-run → exit 0');
(() => {
  try {
    const o = JSON.parse(cliDry.stdout);
    assert(o.rollback_drill_status === 'ROLLBACK_DRY_RUN_READY',  '[G-06] → ROLLBACK_DRY_RUN_READY');
    assert(o.restore_performed === false,                          '[G-07] dry-run → restore_performed=false');
    assert(o.deploy_performed  === false,                          '[G-08] deploy_performed=false');
  } catch { assert(false, '[G-06..08] valid JSON'); }
})();

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nRollback Drill Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
