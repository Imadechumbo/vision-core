#!/usr/bin/env node
/**
 * Manual Release Execution Control Plane Baseline — Unit Tests V50.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runManualReleaseExecutionControlPlaneBaseline,
  MANUAL_EXECUTION_BASELINE_STATUSES,
} from '../manual-release-execution-control-plane-baseline.mjs';

const CLI = resolve(process.cwd(), 'tools', 'manual-release-execution-control-plane-baseline.mjs');
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
assert(Array.isArray(MANUAL_EXECUTION_BASELINE_STATUSES),                                          '[A-01] statuses array');
assert(MANUAL_EXECUTION_BASELINE_STATUSES.length === 5,                                            '[A-02] 5 statuses');
assert(MANUAL_EXECUTION_BASELINE_STATUSES.includes('MANUAL_EXECUTION_BASELINE_BLOCKED_MODULES'),   '[A-03] BLOCKED_MODULES');
assert(MANUAL_EXECUTION_BASELINE_STATUSES.includes('MANUAL_EXECUTION_BASELINE_BLOCKED_TESTS'),     '[A-04] BLOCKED_TESTS');
assert(MANUAL_EXECUTION_BASELINE_STATUSES.includes('MANUAL_EXECUTION_BASELINE_BLOCKED_INVARIANTS'),'[A-05] BLOCKED_INVARIANTS');
assert(MANUAL_EXECUTION_BASELINE_STATUSES.includes('MANUAL_EXECUTION_BASELINE_BLOCKED_HANDOFF'),   '[A-06] BLOCKED_HANDOFF');
assert(MANUAL_EXECUTION_BASELINE_STATUSES.includes('MANUAL_EXECUTION_BASELINE_READY'),             '[A-07] READY');

// ─── Suite B: Full baseline — all checks pass ─────────────────────
console.log('\n[Suite B] Full baseline');
const baseline = runManualReleaseExecutionControlPlaneBaseline({ _mock_timestamp: TS });
assert(baseline.manual_execution_baseline_status === 'MANUAL_EXECUTION_BASELINE_READY', '[B-01] status=READY');
assert(baseline.manual_execution_baseline_ready  === true,                              '[B-02] ready=true');
assert(baseline.modules_verified                 === true,                              '[B-03] modules_verified=true');
assert(baseline.invariants_verified              === true,                              '[B-04] invariants_verified=true');
assert(baseline.pipeline_verified                === true,                              '[B-05] pipeline_verified=true');
assert(baseline.handoff_verified                 === true,                              '[B-06] handoff_verified=true');
assert(baseline.ledger_verified                  === true,                              '[B-07] ledger_verified=true');
assert(baseline.ledger_size                      === 6,                                 '[B-08] ledger_size=6');
assert(baseline.ledger_event_types               === 6,                                 '[B-09] event_types=6');
assert(baseline.chain_valid                      === true,                              '[B-10] chain_valid=true');
assert(Array.isArray(baseline.modules_checked),                                         '[B-11] modules_checked array');
assert(baseline.modules_checked.length           === 7,                                 '[B-12] 7 required modules listed');
assert(baseline.evidence_source                  === 'go-core',                         '[B-13] evidence_source=go-core');
assert(typeof baseline.handoff_id                === 'string',                          '[B-14] handoff_id present');
assert(baseline.blocking_reason                  === null,                              '[B-15] blocking_reason=null');
assert(baseline.deploy_allowed                   === false,                             '[B-16] deploy=false (REGRA)');
assert(baseline.promotion_allowed                === false,                             '[B-17] promotion=false (REGRA)');
assert(baseline.stable_allowed                   === false,                             '[B-18] stable=false (REGRA)');
assert(baseline.tag_allowed                      === false,                             '[B-19] tag=false (REGRA)');
assert(baseline.release_execution_allowed        === false,                             '[B-20] release_execution_allowed=false');
assert(baseline.release_performed                === false,                             '[B-21] release_performed=false');
assert(baseline.tag_created                      === false,                             '[B-22] tag_created=false');
assert(baseline.stable_promoted                  === false,                             '[B-23] stable_promoted=false');
assert(baseline.deploy_performed                 === false,                             '[B-24] deploy_performed=false');
assert(baseline.baseline_executed                === false,                             '[B-25] baseline_executed=false');
assert(baseline.schema_version                   === 'v50.0',                           '[B-26] schema=v50.0');

// Consistent: READY status on second run
const baseline2 = runManualReleaseExecutionControlPlaneBaseline({ _mock_timestamp: TS });
assert(baseline2.manual_execution_baseline_ready   === true,                            '[B-27] consistent ready=true');
assert(baseline2.manual_execution_baseline_status  === 'MANUAL_EXECUTION_BASELINE_READY', '[B-28] consistent status=READY');

// ─── Suite C: Required modules listed ────────────────────────────
console.log('\n[Suite C] Required modules listed');
const requiredModules = [
  'manual-release-request-contract',
  'human-confirmation-contract',
  'manual-release-request-authority-binding',
  'manual-release-execution-preflight',
  'manual-release-dry-run-executor',
  'manual-release-handoff-package',
  'manual-release-handoff-ledger',
];
for (const mod of requiredModules) {
  assert(baseline.modules_checked?.includes(mod), `[C] module present: ${mod}`);
}

// ─── Suite D: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite D] Invariants');
assert(baseline.deploy_allowed            === false, '[D-01] deploy=false');
assert(baseline.promotion_allowed         === false, '[D-02] promotion=false');
assert(baseline.stable_allowed            === false, '[D-03] stable=false');
assert(baseline.tag_allowed               === false, '[D-04] tag=false');
assert(baseline.release_execution_allowed === false, '[D-05] release_execution_allowed=false');
assert(baseline.release_performed         === false, '[D-06] release_performed=false');
assert(baseline.tag_created               === false, '[D-07] tag_created=false');
assert(baseline.stable_promoted           === false, '[D-08] stable_promoted=false');
assert(baseline.deploy_performed          === false, '[D-09] deploy_performed=false');
assert(baseline.baseline_executed         === false, '[D-10] baseline_executed=false');

// ─── Suite E: CLI ─────────────────────────────────────────────────
console.log('\n[Suite E] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                                                          '[E-01] exit 0');
assert(cliDefault.stdout.includes('MANUAL_EXECUTION_BASELINE_READY'),                     '[E-02] stdout READY');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                                                             '[E-03] --json exit 0');
let parsed = null;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                                    '[E-04] JSON parseable');
assert(parsed?.manual_execution_baseline_ready   === true,                                '[E-05] ready=true');
assert(parsed?.modules_verified                  === true,                                '[E-06] modules_verified=true');
assert(parsed?.invariants_verified               === true,                                '[E-07] invariants_verified=true');
assert(parsed?.pipeline_verified                 === true,                                '[E-08] pipeline_verified=true');
assert(parsed?.handoff_verified                  === true,                                '[E-09] handoff_verified=true');
assert(parsed?.ledger_verified                   === true,                                '[E-10] ledger_verified=true');
assert(parsed?.deploy_allowed                    === false,                               '[E-11] deploy=false');
assert(parsed?.promotion_allowed                 === false,                               '[E-12] promotion=false (REGRA)');
assert(parsed?.stable_allowed                    === false,                               '[E-13] stable=false');
assert(parsed?.tag_allowed                       === false,                               '[E-14] tag=false');
assert(parsed?.release_execution_allowed         === false,                               '[E-15] release_execution_allowed=false');
assert(parsed?.release_performed                 === false,                               '[E-16] release_performed=false');
assert(parsed?.tag_created                       === false,                               '[E-17] tag_created=false');
assert(parsed?.stable_promoted                   === false,                               '[E-18] stable_promoted=false');
assert(parsed?.deploy_performed                  === false,                               '[E-19] deploy_performed=false');
assert(parsed?.baseline_executed                 === false,                               '[E-20] baseline_executed=false');
assert(parsed?.evidence_source                   === 'go-core',                           '[E-21] source=go-core');
assert(parsed?.schema_version                    === 'v50.0',                             '[E-22] schema=v50.0');
assert(parsed?.ledger_size                       === 6,                                   '[E-23] ledger_size=6');
assert(parsed?.chain_valid                       === true,                                '[E-24] chain_valid=true');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nmanual-release-execution-control-plane-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
