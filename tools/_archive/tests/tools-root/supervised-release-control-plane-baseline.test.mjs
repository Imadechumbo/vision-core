#!/usr/bin/env node
/**
 * Supervised Release Control Plane Baseline — Unit Tests V45.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runSupervisedReleaseControlPlaneBaseline,
  CONTROL_PLANE_BASELINE_STATUSES,
} from '../supervised-release-control-plane-baseline.mjs';

const CLI = resolve(process.cwd(), 'tools', 'supervised-release-control-plane-baseline.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CONTROL_PLANE_BASELINE_STATUSES),                                        '[A-01] statuses array');
assert(CONTROL_PLANE_BASELINE_STATUSES.length === 5,                                          '[A-02] 5 statuses');
assert(CONTROL_PLANE_BASELINE_STATUSES.includes('CONTROL_PLANE_BASELINE_BLOCKED_MODULE'),     '[A-03] BLOCKED_MODULE');
assert(CONTROL_PLANE_BASELINE_STATUSES.includes('CONTROL_PLANE_BASELINE_BLOCKED_INVARIANTS'), '[A-04] BLOCKED_INVARIANTS');
assert(CONTROL_PLANE_BASELINE_STATUSES.includes('CONTROL_PLANE_BASELINE_BLOCKED_PIPELINE'),   '[A-05] BLOCKED_PIPELINE');
assert(CONTROL_PLANE_BASELINE_STATUSES.includes('CONTROL_PLANE_BASELINE_BLOCKED_LEDGER'),     '[A-06] BLOCKED_LEDGER');
assert(CONTROL_PLANE_BASELINE_STATUSES.includes('CONTROL_PLANE_BASELINE_READY'),              '[A-07] READY');

// ─── Suite B: Full baseline — all checks pass ─────────────────────
console.log('\n[Suite B] Full baseline');
const baseline = runSupervisedReleaseControlPlaneBaseline({ _mock_timestamp: TS });
assert(baseline.control_plane_baseline_status === 'CONTROL_PLANE_BASELINE_READY', '[B-01] status=READY');
assert(baseline.control_plane_baseline_ready  === true,                           '[B-02] ready=true');
assert(baseline.modules_verified              === true,                           '[B-03] modules_verified=true');
assert(baseline.invariants_verified           === true,                           '[B-04] invariants_verified=true');
assert(baseline.pipeline_verified             === true,                           '[B-05] pipeline_verified=true');
assert(baseline.ledger_verified               === true,                           '[B-06] ledger_verified=true');
assert(baseline.ledger_size                   === 7,                              '[B-07] ledger_size=7');
assert(baseline.ledger_event_types            === 7,                              '[B-08] event_types=7');
assert(baseline.chain_valid                   === true,                           '[B-09] chain_valid=true');
assert(Array.isArray(baseline.modules_checked),                                   '[B-10] modules_checked array');
assert(baseline.modules_checked.length        === 7,                              '[B-11] 7 required modules listed');
assert(baseline.evidence_source               === 'go-core',                      '[B-12] evidence_source=go-core');
assert(baseline.release_candidate_mode        === 'supervised',                   '[B-13] mode=supervised');
assert(typeof baseline.rc_id                  === 'string',                       '[B-14] rc_id present');
assert(baseline.blocking_reason               === null,                           '[B-15] blocking_reason=null');
assert(baseline.deploy_allowed                === false,                          '[B-16] deploy=false (REGRA)');
assert(baseline.promotion_allowed             === false,                          '[B-17] promotion=false (REGRA)');
assert(baseline.stable_allowed                === false,                          '[B-18] stable=false (REGRA)');
assert(baseline.tag_allowed                   === false,                          '[B-19] tag=false (REGRA)');
assert(baseline.release_performed             === false,                          '[B-20] release_performed=false');
assert(baseline.promote_performed             === false,                          '[B-21] promote_performed=false');
assert(baseline.baseline_executed             === false,                          '[B-22] baseline_executed=false');
assert(baseline.schema_version                === 'v45.0',                        '[B-23] schema=v45.0');

// Consistent: READY status each run
const baseline2 = runSupervisedReleaseControlPlaneBaseline({ _mock_timestamp: TS });
assert(baseline.control_plane_baseline_ready  === baseline2.control_plane_baseline_ready, '[B-24] consistent ready=true');
assert(baseline2.control_plane_baseline_status === 'CONTROL_PLANE_BASELINE_READY',       '[B-25] consistent status=READY');

// ─── Suite C: All modules_checked present ────────────────────────
console.log('\n[Suite C] Required modules listed');
const requiredModules = [
  'supervised-release-intent-contract',
  'release-intent-authority-binding',
  'runtime-candidate-release-intent-bridge',
  'supervised-release-candidate-controller',
  'manual-promotion-package-builder',
  'manual-promotion-review-gate',
  'supervised-release-ledger-events',
];
for (const mod of requiredModules) {
  assert(baseline.modules_checked?.includes(mod), `[C] module present: ${mod}`);
}

// ─── Suite D: Invariants ─────────────────────────────────────────
console.log('\n[Suite D] Invariants');
assert(baseline.deploy_allowed    === false, '[D-01] deploy=false');
assert(baseline.promotion_allowed === false, '[D-02] promotion=false');
assert(baseline.stable_allowed    === false, '[D-03] stable=false');
assert(baseline.tag_allowed       === false, '[D-04] tag=false');
assert(baseline.release_performed === false, '[D-05] release_performed=false');
assert(baseline.promote_performed === false, '[D-06] promote_performed=false');
assert(baseline.baseline_executed === false, '[D-07] baseline_executed=false');

// ─── Suite E: CLI ─────────────────────────────────────────────────
console.log('\n[Suite E] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                                                '[E-01] exit 0');
assert(cliDefault.stdout.includes('CONTROL_PLANE_BASELINE_READY'),               '[E-02] stdout READY');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                                                   '[E-03] --json exit 0');
let parsed = null;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                           '[E-04] JSON parseable');
assert(parsed && parsed.control_plane_baseline_ready === true,                   '[E-05] ready=true');
assert(parsed && parsed.modules_verified             === true,                   '[E-06] modules_verified=true');
assert(parsed && parsed.invariants_verified          === true,                   '[E-07] invariants_verified=true');
assert(parsed && parsed.pipeline_verified            === true,                   '[E-08] pipeline_verified=true');
assert(parsed && parsed.ledger_verified              === true,                   '[E-09] ledger_verified=true');
assert(parsed && parsed.deploy_allowed               === false,                  '[E-10] deploy=false');
assert(parsed && parsed.promotion_allowed            === false,                  '[E-11] promotion=false (REGRA)');
assert(parsed && parsed.stable_allowed               === false,                  '[E-12] stable=false');
assert(parsed && parsed.tag_allowed                  === false,                  '[E-13] tag=false');
assert(parsed && parsed.release_performed            === false,                  '[E-14] release_performed=false');
assert(parsed && parsed.promote_performed            === false,                  '[E-15] promote_performed=false');
assert(parsed && parsed.baseline_executed            === false,                  '[E-16] baseline_executed=false');
assert(parsed && parsed.evidence_source              === 'go-core',              '[E-17] source=go-core');
assert(parsed && parsed.schema_version               === 'v45.0',                '[E-18] schema=v45.0');
assert(parsed && parsed.ledger_size                  === 7,                      '[E-19] ledger_size=7');
assert(parsed && parsed.chain_valid                  === true,                   '[E-20] chain_valid=true');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nsupervised-release-control-plane-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
