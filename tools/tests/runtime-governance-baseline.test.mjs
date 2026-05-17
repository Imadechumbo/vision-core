#!/usr/bin/env node
/**
 * Runtime Governance Baseline — Unit Tests V25.0
 */

import { spawnSync }                from 'child_process';
import { resolve, join }            from 'path';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir }                   from 'os';
import {
  checkRuntimeGovernanceBaseline,
  BASELINE_STATUSES,
  REQUIRED_MODULES,
  REQUIRED_TESTS,
  REQUIRED_SCRIPTS,
} from '../runtime-governance-baseline.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-governance-baseline.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 30000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(BASELINE_STATUSES),                         '[A-01] BASELINE_STATUSES is array');
assert(BASELINE_STATUSES.length === 4,                           '[A-02] 4 statuses');
assert(BASELINE_STATUSES.includes('BASELINE_READY'),             '[A-03] BASELINE_READY present');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_MODULES'),   '[A-04] BLOCKED_MODULES present');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_TESTS'),     '[A-05] BLOCKED_TESTS present');
assert(BASELINE_STATUSES.includes('BASELINE_BLOCKED_INVARIANTS'),'[A-06] BLOCKED_INVARIANTS present');
assert(Array.isArray(REQUIRED_MODULES) && REQUIRED_MODULES.length === 6, '[A-07] 6 required modules');
assert(Array.isArray(REQUIRED_TESTS)   && REQUIRED_TESTS.length   === 6, '[A-08] 6 required tests');
assert(Array.isArray(REQUIRED_SCRIPTS) && REQUIRED_SCRIPTS.length === 6, '[A-09] 6 required scripts');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const readyResult = checkRuntimeGovernanceBaseline({ check_invariants: true });
assert(readyResult.deploy_allowed    === false, '[B-01] deploy=false (READY)');
assert(readyResult.promotion_allowed === false, '[B-02] promotion=false (READY)');
assert(readyResult.stable_allowed    === false, '[B-03] stable=false (READY)');

// Test with empty dir (all blocked)
const emptyDir = mkdtempSync(join(tmpdir(), 'vision-baseline-empty-'));
try {
  const emptyResult = checkRuntimeGovernanceBaseline({ root: emptyDir, check_invariants: false });
  assert(emptyResult.deploy_allowed    === false, '[B-04] deploy=false (empty dir)');
  assert(emptyResult.promotion_allowed === false, '[B-05] promotion=false (empty dir)');
  assert(emptyResult.stable_allowed    === false, '[B-06] stable=false (empty dir)');
} finally {
  rmSync(emptyDir, { recursive: true, force: true });
}

// ─── Suite C: Module absent → BASELINE_BLOCKED_MODULES ───────────
console.log('\n[Suite C] Module absent');
{
  const dir = mkdtempSync(join(tmpdir(), 'vision-baseline-'));
  try {
    const result = checkRuntimeGovernanceBaseline({ root: dir, check_invariants: false });
    assert(result.baseline_status          === 'BASELINE_BLOCKED_MODULES', '[C-01] empty → BLOCKED_MODULES');
    assert(result.runtime_governance_ready === false,                       '[C-02] ready=false');
    assert(result.missing_modules.length   > 0,                            '[C-03] missing_modules non-empty');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite D: Tests absent → BASELINE_BLOCKED_TESTS ──────────────
console.log('\n[Suite D] Tests absent');
{
  const dir = mkdtempSync(join(tmpdir(), 'vision-baseline-'));
  try {
    // Create stub module files but no test files
    mkdirSync(join(dir, 'tools'), { recursive: true });
    for (const m of REQUIRED_MODULES) {
      writeFileSync(join(dir, m), '// stub\n');
    }
    const result = checkRuntimeGovernanceBaseline({ root: dir, check_invariants: false });
    assert(result.baseline_status          === 'BASELINE_BLOCKED_TESTS', '[D-01] no tests → BLOCKED_TESTS');
    assert(result.runtime_governance_ready === false,                     '[D-02] ready=false');
    assert(result.missing_tests.length     > 0,                          '[D-03] missing_tests non-empty');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite E: Invariant violation → BASELINE_BLOCKED_INVARIANTS ──
console.log('\n[Suite E] Invariant violation');
{
  const dir = mkdtempSync(join(tmpdir(), 'vision-baseline-'));
  try {
    // Create modules + tests that output deploy_allowed=true (intentional violation)
    mkdirSync(join(dir, 'tools'), { recursive: true });
    mkdirSync(join(dir, 'tools', 'tests'), { recursive: true });
    for (const m of REQUIRED_MODULES) {
      writeFileSync(join(dir, m), `#!/usr/bin/env node\nconsole.log(JSON.stringify({deploy_allowed:true,promotion_allowed:true}));\n`);
    }
    for (const t of REQUIRED_TESTS) {
      writeFileSync(join(dir, t), '// stub test\n');
    }
    const result = checkRuntimeGovernanceBaseline({ root: dir, check_invariants: true });
    assert(result.baseline_status          === 'BASELINE_BLOCKED_INVARIANTS', '[E-01] violation → BLOCKED_INVARIANTS');
    assert(result.runtime_governance_ready === false,                          '[E-02] ready=false');
    assert(result.invariants_ok            === false,                          '[E-03] invariants_ok=false');
    assert(result.invariant_errors.length  > 0,                               '[E-04] invariant_errors non-empty');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite F: Full valid → BASELINE_READY ────────────────────────
console.log('\n[Suite F] Full valid baseline (real project)');
assert(readyResult.baseline_status          === 'BASELINE_READY',  '[F-01] status=BASELINE_READY');
assert(readyResult.baseline_version         === 'v25.0',           '[F-02] version=v25.0');
assert(readyResult.runtime_governance_ready === true,              '[F-03] ready=true');
assert(readyResult.modules_present.length   === 6,                 '[F-04] 6 modules present');
assert(readyResult.tests_present.length     === 6,                 '[F-05] 6 tests present');
assert(readyResult.invariants_ok            === true,              '[F-06] invariants_ok=true');
assert(readyResult.invariant_errors.length  === 0,                 '[F-07] no invariant errors');
assert(readyResult.deploy_allowed           === false,             '[F-08] READY deploy=false');
assert(readyResult.promotion_allowed        === false,             '[F-09] READY promotion=false');
assert(readyResult.stable_allowed           === false,             '[F-10] READY stable=false');

// ─── Suite G: Schema ──────────────────────────────────────────────
console.log('\n[Suite G] Schema');
assert(readyResult.schema_version === 'v25.0', '[G-01] schema=v25.0 (ready)');

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliNoInv = runCLI(['--no-invariants']);
assert(cliNoInv.exitCode === 0,                              '[H-01] --no-invariants exit 0');
assert(cliNoInv.stdout.includes('BASELINE_READY'),           '[H-02] stdout has BASELINE_READY');

const cliFull = runCLI(['--json']);
assert(cliFull.exitCode === 0,                               '[H-03] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliFull.stdout); } catch { parsed = null; }
assert(parsed !== null,                                      '[H-04] JSON parseable');
assert(parsed && parsed.baseline_status          === 'BASELINE_READY', '[H-05] status=BASELINE_READY');
assert(parsed && parsed.deploy_allowed           === false,            '[H-06] deploy=false');
assert(parsed && parsed.promotion_allowed        === false,            '[H-07] promotion=false');
assert(parsed && parsed.runtime_governance_ready === true,             '[H-08] governance_ready=true');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-governance-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
