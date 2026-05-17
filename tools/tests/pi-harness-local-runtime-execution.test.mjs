#!/usr/bin/env node
/**
 * PI Harness Local Runtime Execution Mode — Unit Tests V36.3
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';

const CLI = resolve(process.cwd(), 'tools', 'pi-harness.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function runHarness(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, '--mode', 'interactive', '--dry-run', '--json', ...args], {
    encoding: 'utf-8',
    timeout: 30000,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout || '{}'); } catch { parsed = null; }
  return { parsed, stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Pre-compute results: default, fixture-local-runtime
// Only run 2 harness invocations to avoid timeout
const def     = runHarness([]);
const fixture = runHarness(['--fixture-local-runtime']);

// ─── Suite A: Default mode (no local runtime) ─────────────────────
console.log('\n[Suite A] Default mode (no --local-runtime-execution)');
assert(def.parsed !== null,                                                    '[A-01] JSON parseable');
assert(def.parsed?.local_runtime_execution_enabled === false,                  '[A-02] local_runtime_execution_enabled=false (default)');
assert(def.parsed?.local_runtime_status === 'LOCAL_RUNTIME_NOT_STARTED',       '[A-03] local_runtime_status=NOT_STARTED (default)');
assert(def.parsed?.local_runtime_ready  === false,                             '[A-04] local_runtime_ready=false (default)');
assert(def.parsed?.local_ledger_binding_ready === false,                       '[A-05] ledger_binding_ready=false (default)');
assert(def.parsed?.deploy_allowed  === false,                                  '[A-06] deploy=false (default)');
assert(def.parsed?.promotion_allowed === false,                                '[A-07] promotion=false (default)');

// ─── Suite B: Fixture local runtime mode ──────────────────────────
console.log('\n[Suite B] --fixture-local-runtime mode');
assert(fixture.parsed !== null,                                                '[B-01] JSON parseable');
assert(fixture.parsed?.local_runtime_execution_enabled === true,               '[B-02] local_runtime_execution_enabled=true');
assert(fixture.parsed?.local_runtime_status === 'LOCAL_RUNTIME_READY',         '[B-03] local_runtime_status=LOCAL_RUNTIME_READY');
assert(fixture.parsed?.local_runtime_ready  === true,                          '[B-04] local_runtime_ready=true');
assert(fixture.parsed?.local_evidence_package_ready === true,                  '[B-05] evidence_package_ready=true');
assert(fixture.parsed?.local_ledger_binding_ready === true,                    '[B-06] ledger_binding_ready=true');
assert(typeof fixture.parsed?.local_ledger_entry_id === 'string',              '[B-07] ledger_entry_id is string');
assert(typeof fixture.parsed?.local_package_hash    === 'string',              '[B-08] package_hash is string');
assert(fixture.parsed?.local_evidence_source        === 'go-core',             '[B-09] evidence_source=go-core');

// ─── Suite C: Invariants — deploy/promotion/stable/tag always false ──
console.log('\n[Suite C] Invariants');
assert(def.parsed?.deploy_allowed     === false, '[C-01] deploy=false (default)');
assert(def.parsed?.promotion_allowed  === false, '[C-02] promotion=false (default)');
assert(fixture.parsed?.deploy_allowed === false, '[C-03] deploy=false (fixture)');
assert(fixture.parsed?.promotion_allowed === false, '[C-04] promotion=false (fixture)');
// Verify JSON output structure has the V36.3 fields
assert('local_runtime_execution_enabled' in (fixture.parsed ?? {}), '[C-05] field local_runtime_execution_enabled present');
assert('local_runtime_status'            in (fixture.parsed ?? {}), '[C-06] field local_runtime_status present');
assert('local_evidence_package_status'   in (fixture.parsed ?? {}), '[C-07] field local_evidence_package_status present');
assert('local_ledger_binding_status'     in (fixture.parsed ?? {}), '[C-08] field local_ledger_binding_status present');

// ─── Suite D: Runtime evidence wiring ─────────────────────────────
console.log('\n[Suite D] Runtime evidence wiring');
assert(def.parsed?.runtime_evidence_enabled    === false, '[D-01] runtime_evidence_enabled=false (default)');
assert(fixture.parsed?.runtime_evidence_enabled === true,  '[D-02] runtime_evidence_enabled=true (fixture)');
assert(fixture.parsed?.runtime_evidence_ready   === true,  '[D-03] runtime_evidence_ready=true (fixture)');
assert(fixture.parsed?.runtime_evidence_status  === 'RUNTIME_EVIDENCE_READY', '[D-04] status=RUNTIME_EVIDENCE_READY (fixture)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npi-harness-local-runtime-execution: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
