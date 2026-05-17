#!/usr/bin/env node
/**
 * Real Runtime Path Baseline — Unit Tests V30.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  evaluateRealRuntimePathBaseline,
  BASELINE_STATUSES,
} from '../real-runtime-path-baseline.mjs';

const CLI = resolve(process.cwd(), 'tools', 'real-runtime-path-baseline.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(BASELINE_STATUSES),                                    '[A-01] statuses is array');
assert(BASELINE_STATUSES.length === 5,                                      '[A-02] 5 statuses');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_DRILL'),                '[A-03] BLOCKED_DRILL present');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_CANDIDATE'),            '[A-04] BLOCKED_CANDIDATE present');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_CI_CONTRACT'),          '[A-05] BLOCKED_CI_CONTRACT present');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_BINDING'),              '[A-06] BLOCKED_BINDING present');
assert(BASELINE_STATUSES.includes('BASELINE_READY'),                        '[A-07] BASELINE_READY present');

// ─── Suite B: Invariants — deploy/promotion/stable always false ───
console.log('\n[Suite B] Invariants');
const readyResult   = evaluateRealRuntimePathBaseline({ use_fixtures: true, tests_verified: true });
const blockedResult = evaluateRealRuntimePathBaseline({
  use_fixtures: true,
  tests_verified: false,  // triggers binding block via tests_verified gate
  drill_overrides: { tests_verified: false },
});
assert(readyResult.deploy_allowed      === false, '[B-01] deploy=false (READY)');
assert(readyResult.promotion_allowed   === false, '[B-02] promotion=false (READY)');
assert(readyResult.stable_allowed      === false, '[B-03] stable=false (READY)');
assert(blockedResult.deploy_allowed    === false, '[B-04] deploy=false (blocked)');
assert(blockedResult.promotion_allowed === false, '[B-05] promotion=false (blocked)');
assert(blockedResult.stable_allowed    === false, '[B-06] stable=false (blocked)');

// ─── Suite C: Full valid → BASELINE_READY ────────────────────────
console.log('\n[Suite C] Full valid chain');
assert(readyResult.baseline_status          === 'BASELINE_READY',              '[C-01] status=BASELINE_READY');
assert(readyResult.baseline_ready           === true,                           '[C-02] baseline_ready=true');
assert(readyResult.baseline_real            === true,                           '[C-03] baseline_real=true');
assert(readyResult.drill_status             === 'DRILL_PASS_GOLD_READY_LOCAL',  '[C-04] drill_status OK');
assert(readyResult.candidate_drill_status   === 'CANDIDATE_DRILL_READY',        '[C-05] candidate_status OK');
assert(readyResult.ci_contract_status       === 'CI_CONTRACT_SKIPPED',          '[C-06] CI skipped by default');
assert(readyResult.binding_status           === 'PASSGOLD_RUNTIME_READY',       '[C-07] binding=READY');
assert(readyResult.evidence_source          === 'go-core',                      '[C-08] evidence_source=go-core');
assert(readyResult.tests_verified           === true,                           '[C-09] tests_verified=true');
assert(readyResult.schema_version           === 'v30.0',                        '[C-10] schema=v30.0');
assert(typeof readyResult.mission_id        === 'string',                       '[C-11] mission_id present');
assert(typeof readyResult.evidence_receipt_id === 'string',                     '[C-12] evidence_receipt_id present');
assert(Array.isArray(readyResult.baseline_components),                          '[C-13] baseline_components array');
assert(readyResult.baseline_components.length === 4,                            '[C-14] 4 components listed');
assert(readyResult.blocking_reason          === null,                           '[C-15] blocking_reason=null in READY');

// ─── Suite D: Drill blocked ───────────────────────────────────────
console.log('\n[Suite D] Drill blocked');
const drillBlocked = evaluateRealRuntimePathBaseline({
  drill_overrides: {
    runtime_fixture: {
      backend_alive:      false,
      backend_health_ok:  false,
      backend_stub:       false,
      mission_id:         'msn-test-d01',
      evidence_receipt_id: 'rcpt-d01',
      evidence_source:    'go-core',
      runtime_probe_pass: false,
    },
  },
});
assert(drillBlocked.baseline_status      === 'BASELINE_BLOCKED_DRILL', '[D-01] drill fail → BASELINE_BLOCKED_DRILL');
assert(drillBlocked.baseline_ready       === false,                     '[D-02] baseline_ready=false');
assert(drillBlocked.baseline_real        === false,                     '[D-03] baseline_real=false');
assert(drillBlocked.deploy_allowed       === false,                     '[D-04] deploy=false');
assert(typeof drillBlocked.drill_status  === 'string',                  '[D-05] drill_status echoed');

// ─── Suite E: Candidate blocked ───────────────────────────────────
console.log('\n[Suite E] Candidate blocked');
const candidateBlocked = evaluateRealRuntimePathBaseline({
  use_fixtures: true,
  candidate_overrides: {
    strict_gate_overrides: { go_test_pass: false },
  },
});
assert(candidateBlocked.baseline_status === 'BASELINE_BLOCKED_CANDIDATE', '[E-01] candidate fail → BASELINE_BLOCKED_CANDIDATE');
assert(candidateBlocked.baseline_ready  === false,                         '[E-02] baseline_ready=false');

// ─── Suite F: CI contract blocked ────────────────────────────────
console.log('\n[Suite F] CI contract blocked');
const ciBlocked = evaluateRealRuntimePathBaseline({
  use_fixtures:        true,
  enforce_ci_contract: true,
  env:                 {},  // no CI vars → BLOCKED_ENV
});
assert(ciBlocked.baseline_status === 'BASELINE_BLOCKED_CI_CONTRACT', '[F-01] CI contract fail → BASELINE_BLOCKED_CI_CONTRACT');
assert(ciBlocked.baseline_ready  === false,                           '[F-02] baseline_ready=false');

// ─── Suite G: Binding blocked ─────────────────────────────────────
console.log('\n[Suite G] Binding blocked');
// Let drill and candidate pass with tests_verified=true; block only at final binding
const bindingBlocked = evaluateRealRuntimePathBaseline({
  use_fixtures:   true,
  tests_verified: false,  // Stage 4 binding will block: tests_verified gate
  drill_overrides:     { tests_verified: true },   // allow drill to pass
  candidate_overrides: { tests_verified: true },   // allow candidate to pass
});
assert(bindingBlocked.baseline_status === 'BASELINE_BLOCKED_BINDING', '[G-01] binding fail → BASELINE_BLOCKED_BINDING');
assert(bindingBlocked.baseline_ready  === false,                        '[G-02] baseline_ready=false');

// ─── Suite H: CI contract enforced and ready ──────────────────────
console.log('\n[Suite H] CI enforced + ready');
const ciReadyEnv = {
  CI:             'true',
  GITHUB_RUN_ID:  'run-h01',
  GITHUB_SHA:     'sha-h01-abcdef',
  CI_RUNTIME_EVIDENCE_CONTRACT: '1',
};
const ciEnforced = evaluateRealRuntimePathBaseline({
  use_fixtures:        true,
  enforce_ci_contract: true,
  env:                 ciReadyEnv,
  tests_verified:      true,
});
assert(ciEnforced.baseline_status       === 'BASELINE_READY',       '[H-01] CI enforced + valid → READY');
assert(ciEnforced.ci_contract_status    === 'CI_CONTRACT_READY',    '[H-02] ci_contract=READY');
assert(ciEnforced.ci_contract_enforced  === true,                   '[H-03] ci_contract_enforced=true');
assert(ciEnforced.ci_contract_skipped   === false,                  '[H-04] ci_contract_skipped=false');
assert(ciEnforced.deploy_allowed        === false,                  '[H-05] deploy=false even with CI');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                            '[I-01] CLI exit 0 (default)');
assert(cliDefault.stdout.includes('BASELINE_READY'),         '[I-02] stdout BASELINE_READY');
assert(cliDefault.stdout.includes('baseline_status'),        '[I-03] stdout has baseline_status');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                               '[I-04] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                      '[I-05] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,         '[I-06] JSON deploy=false');
assert(parsed && parsed.promotion_allowed === false,         '[I-07] JSON promotion=false');
assert(parsed && parsed.stable_allowed    === false,         '[I-08] JSON stable=false');
assert(parsed && parsed.baseline_ready    === true,          '[I-09] JSON baseline_ready=true');
assert(parsed && parsed.baseline_real     === true,          '[I-10] JSON baseline_real=true');
assert(parsed && Array.isArray(parsed.baseline_components),  '[I-11] JSON baseline_components array');

const cliEnforceCI = runCLI(['--enforce-ci']);
assert(cliEnforceCI.exitCode === 1,                          '[I-12] --enforce-ci without CI vars → exit 1');
assert(cliEnforceCI.stdout.includes('BLOCKED'),              '[I-13] --enforce-ci stdout BLOCKED');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(readyResult.schema_version   === 'v30.0', '[J-01] schema=v30.0 (READY)');
assert(drillBlocked.schema_version  === 'v30.0', '[J-02] schema=v30.0 (BLOCKED_DRILL)');
assert(ciBlocked.schema_version     === 'v30.0', '[J-03] schema=v30.0 (BLOCKED_CI)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-runtime-path-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
