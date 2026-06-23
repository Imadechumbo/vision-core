#!/usr/bin/env node
/**
 * Runtime Execution Baseline — Unit Tests V40.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runRuntimeExecutionBaseline,
  BASELINE_STATUSES,
} from '../runtime-execution-baseline.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-execution-baseline.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Pre-compute results shared across suites (expensive: run once)
const def     = runRuntimeExecutionBaseline();
const fixture = runRuntimeExecutionBaseline({ fixture_mode: true });

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(BASELINE_STATUSES),                                   '[A-01] statuses is array');
assert(BASELINE_STATUSES.length === 6,                                     '[A-02] 6 statuses');
assert(BASELINE_STATUSES.includes('BASELINE_SKIPPED'),                     '[A-03] SKIPPED');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_MODULES'),             '[A-04] BLOCKED_MODULES');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_TESTS'),               '[A-05] BLOCKED_TESTS');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_DRILL'),               '[A-06] BLOCKED_DRILL');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_INVARIANTS'),          '[A-07] BLOCKED_INVARIANTS');
assert(BASELINE_STATUSES.includes('BASELINE_READY'),                       '[A-08] READY');

// ─── Suite B: Default skipped ─────────────────────────────────────
console.log('\n[Suite B] Default skipped');
assert(def.baseline_status    === 'BASELINE_SKIPPED', '[B-01] default → SKIPPED');
assert(def.baseline_ready     === false,              '[B-02] ready=false');
assert(def.modules_verified   === false,              '[B-03] modules_verified=false');
assert(def.tests_verified     === false,              '[B-04] tests_verified=false');
assert(def.drill_passed       === false,              '[B-05] drill_passed=false');
assert(def.invariants_passed  === false,              '[B-06] invariants_passed=false');
assert(def.deploy_performed   === false,              '[B-07] deploy_performed=false');
assert(def.stable_promoted    === false,              '[B-08] stable_promoted=false');
assert(def.deploy_allowed     === false,              '[B-09] deploy=false');
assert(def.promotion_allowed  === false,              '[B-10] promotion=false');
assert(def.stable_allowed     === false,              '[B-11] stable=false');
assert(def.tag_allowed        === false,              '[B-12] tag_allowed=false');
assert(def.blocking_reason    === 'baseline_not_requested', '[B-13] blocking_reason=baseline_not_requested');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(def.deploy_allowed          === false, '[C-01] deploy=false (skipped)');
assert(def.promotion_allowed       === false, '[C-02] promotion=false (skipped)');
assert(def.deploy_performed        === false, '[C-03] deploy_performed=false (skipped)');
assert(def.stable_promoted         === false, '[C-04] stable_promoted=false (skipped)');
assert(fixture.deploy_allowed      === false, '[C-05] deploy=false (fixture)');
assert(fixture.promotion_allowed   === false, '[C-06] promotion=false (fixture)');
assert(fixture.stable_allowed      === false, '[C-07] stable=false (fixture)');
assert(fixture.tag_allowed         === false, '[C-08] tag_allowed=false (fixture)');
assert(fixture.deploy_performed    === false, '[C-09] deploy_performed=false (fixture)');
assert(fixture.stable_promoted     === false, '[C-10] stable_promoted=false (fixture)');

// ─── Suite D: Fixture baseline READY ─────────────────────────────
console.log('\n[Suite D] Fixture baseline READY');
assert(fixture.baseline_status    === 'BASELINE_READY', '[D-01] status=BASELINE_READY');
assert(fixture.baseline_ready     === true,             '[D-02] ready=true');
assert(fixture.modules_verified   === true,             '[D-03] modules_verified=true');
assert(fixture.tests_verified     === true,             '[D-04] tests_verified=true');
assert(fixture.drill_passed       === true,             '[D-05] drill_passed=true');
assert(fixture.invariants_passed  === true,             '[D-06] invariants_passed=true');
assert(fixture.modules_count      === 6,                '[D-07] modules_count=6');
assert(fixture.tests_count        === 6,                '[D-08] tests_count=6');
assert(fixture.stages_verified    === 3,                '[D-09] stages_verified=3');
assert(fixture.ci_proof_valid     === true,             '[D-10] ci_proof_valid=true');
assert(fixture.pass_gold_candidate === true,            '[D-11] pass_gold_candidate=true');
assert(fixture.candidate_is_local_only === true,        '[D-12] candidate_is_local_only=true');
assert(fixture.evidence_source    === 'go-core',        '[D-13] evidence_source=go-core');
assert(typeof fixture.proof_hash  === 'string',         '[D-14] proof_hash is string');
assert(fixture.proof_hash.startsWith('proof_'),         '[D-15] proof_hash starts proof_');
assert(typeof fixture.mission_id  === 'string',         '[D-16] mission_id is string');
assert(fixture.blocking_reason    === null,             '[D-17] blocking_reason=null');
assert(fixture.schema_version     === 'v40.0',          '[D-18] schema=v40.0');
assert(Array.isArray(fixture.missing_modules) && fixture.missing_modules.length === 0, '[D-19] missing_modules empty');
assert(Array.isArray(fixture.missing_tests)   && fixture.missing_tests.length   === 0, '[D-20] missing_tests empty');

// ─── Suite E: Requested with real filesystem ──────────────────────
console.log('\n[Suite E] Requested with real filesystem');
const real = runRuntimeExecutionBaseline({ baseline_requested: true });
assert(real.baseline_status    === 'BASELINE_READY', '[E-01] real requested → BASELINE_READY');
assert(real.baseline_ready     === true,             '[E-02] ready=true');
assert(real.modules_verified   === true,             '[E-03] modules_verified=true');
assert(real.tests_verified     === true,             '[E-04] tests_verified=true');
assert(real.drill_passed       === true,             '[E-05] drill_passed=true');
assert(real.deploy_performed   === false,            '[E-06] deploy_performed=false');
assert(real.stable_promoted    === false,            '[E-07] stable_promoted=false');
assert(real.deploy_allowed     === false,            '[E-08] deploy=false');

// ─── Suite F: Drill blocked ───────────────────────────────────────
console.log('\n[Suite F] Skip-file-check edge cases');
// skip_file_check bypasses fs check — drill runs purely in memory
const skipCheck = runRuntimeExecutionBaseline({ baseline_requested: true, skip_file_check: true });
assert(skipCheck.baseline_ready    === true,  '[F-01] skip_file_check → still READY');
assert(skipCheck.modules_verified  === true,  '[F-02] modules_verified=true (skipped check)');
assert(skipCheck.tests_verified    === true,  '[F-03] tests_verified=true (skipped check)');

// ─── Suite G: CLI ─────────────────────────────────────────────────
console.log('\n[Suite G] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                        '[G-01] default → exit 1');
assert(cliDefault.stdout.includes('BASELINE_SKIPPED'),                   '[G-02] stdout SKIPPED');
assert(cliDefault.stdout.includes('deploy_allowed'),                     '[G-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                        '[G-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('BASELINE_READY'),                     '[G-05] stdout BASELINE_READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                          '[G-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                 '[G-07] JSON parseable');
assert(parsed && parsed.baseline_ready         === true,                '[G-08] JSON ready=true');
assert(parsed && parsed.modules_verified       === true,                '[G-09] JSON modules_verified=true');
assert(parsed && parsed.tests_verified         === true,                '[G-10] JSON tests_verified=true');
assert(parsed && parsed.drill_passed           === true,                '[G-11] JSON drill_passed=true');
assert(parsed && parsed.invariants_passed      === true,                '[G-12] JSON invariants_passed=true');
assert(parsed && parsed.deploy_allowed         === false,               '[G-13] JSON deploy=false');
assert(parsed && parsed.promotion_allowed      === false,               '[G-14] JSON promotion=false');
assert(parsed && parsed.stable_allowed         === false,               '[G-15] JSON stable=false');
assert(parsed && parsed.tag_allowed            === false,               '[G-16] JSON tag_allowed=false');
assert(parsed && parsed.deploy_performed       === false,               '[G-17] JSON deploy_performed=false');
assert(parsed && parsed.stable_promoted        === false,               '[G-18] JSON stable_promoted=false');
assert(parsed && parsed.evidence_source        === 'go-core',           '[G-19] JSON evidence_source=go-core');
assert(parsed && parsed.ci_proof_valid         === true,                '[G-20] JSON ci_proof_valid=true');
assert(parsed && parsed.pass_gold_candidate    === true,                '[G-21] JSON pass_gold_candidate=true');
assert(parsed && parsed.candidate_is_local_only === true,               '[G-22] JSON local_only=true');
assert(parsed && parsed.modules_count          === 6,                   '[G-23] JSON modules_count=6');
assert(parsed && parsed.tests_count            === 6,                   '[G-24] JSON tests_count=6');
assert(parsed && parsed.stages_verified        === 3,                   '[G-25] JSON stages_verified=3');

// ─── Suite H: Schema ──────────────────────────────────────────────
console.log('\n[Suite H] Schema');
assert(fixture.schema_version === 'v40.0', '[H-01] schema=v40.0 (READY)');
assert(def.schema_version     === 'v40.0', '[H-02] schema=v40.0 (SKIPPED)');
assert(real.schema_version    === 'v40.0', '[H-03] schema=v40.0 (REAL)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-execution-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
