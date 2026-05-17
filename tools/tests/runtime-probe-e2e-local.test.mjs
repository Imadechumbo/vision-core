#!/usr/bin/env node
/**
 * Runtime Probe E2E Local — Unit Tests V26.4
 */

import { spawnSync }  from 'child_process';
import { resolve }    from 'path';
import {
  runRuntimeProbeE2ELocal,
  E2E_STATUSES,
} from '../runtime-probe-e2e-local.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-probe-e2e-local.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Mocks
const MOCK_HEALTH_READY = {
  health_contract_status: 'HEALTH_READY',
  backend_alive:  true,
  backend_health_ok: true,
  backend_stub:  false,
  backend_not_stub: true,
};
const MOCK_RUNLIVE_READY = {
  run_live_status: 'RUNLIVE_READY',
  mission_id:      'mission-e2e-real-abc-2026',
  backend_stub:    false,
  run_live_ready:  true,
};
const MOCK_LAUNCH_READY = {
  launcher_status:  'BACKEND_LAUNCH_READY',
  backend_alive:    true,
  backend_health_ok: true,
  backend_pid:      99999,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(E2E_STATUSES),                         '[A-01] E2E_STATUSES is array');
assert(E2E_STATUSES.length === 6,                           '[A-02] 6 statuses');
assert(E2E_STATUSES.includes('E2E_SKIPPED_NO_START'),       '[A-03] SKIPPED present');
assert(E2E_STATUSES.includes('E2E_BLOCKED_BACKEND'),        '[A-04] BLOCKED_BACKEND present');
assert(E2E_STATUSES.includes('E2E_BLOCKED_HEALTH'),         '[A-05] BLOCKED_HEALTH present');
assert(E2E_STATUSES.includes('E2E_BLOCKED_RUNLIVE'),        '[A-06] BLOCKED_RUNLIVE present');
assert(E2E_STATUSES.includes('E2E_BLOCKED_RECEIPT'),        '[A-07] BLOCKED_RECEIPT present');
assert(E2E_STATUSES.includes('E2E_RUNTIME_READY'),          '[A-08] RUNTIME_READY present');

// ─── Suite B: No-start / skip (default safe mode) ────────────────
console.log('\n[Suite B] No-start / skip');
{
  const r = await runRuntimeProbeE2ELocal({});
  assert(r.e2e_runtime_status === 'E2E_SKIPPED_NO_START', '[B-01] default → SKIPPED');
  assert(r.runtime_probe_pass === false,                  '[B-02] probe_pass=false');
  assert(r.backend_alive      === false,                  '[B-03] alive=false');
  assert(r.deploy_allowed     === false,                  '[B-04] deploy=false');
  assert(r.promotion_allowed  === false,                  '[B-05] promotion=false');
}
{
  const r = await runRuntimeProbeE2ELocal({ no_start: true });
  assert(r.e2e_runtime_status === 'E2E_SKIPPED_NO_START', '[B-06] no_start=true → SKIPPED');
}
{
  const r = await runRuntimeProbeE2ELocal({ start_local_backend: false, no_start: false });
  assert(r.e2e_runtime_status === 'E2E_SKIPPED_NO_START', '[B-07] no start_local_backend → SKIPPED');
}

// ─── Suite C: Backend launch failure ─────────────────────────────
console.log('\n[Suite C] Backend launch failure');
{
  const r = await runRuntimeProbeE2ELocal({
    no_start: false,
    start_local_backend: true,
    _mock: {
      launchResult: { launcher_status: 'BACKEND_LAUNCH_BLOCKED_NO_SERVER', backend_alive: false },
    },
  });
  assert(r.e2e_runtime_status === 'E2E_BLOCKED_BACKEND', '[C-01] no server → E2E_BLOCKED_BACKEND');
  assert(r.runtime_probe_pass === false,                 '[C-02] probe_pass=false');
  assert(r.deploy_allowed     === false,                 '[C-03] deploy=false');
  assert(r.promotion_allowed  === false,                 '[C-04] promotion=false');
}

// ─── Suite D: Health failure ──────────────────────────────────────
console.log('\n[Suite D] Health failure');
{
  const r = await runRuntimeProbeE2ELocal({
    no_start: false,
    start_local_backend: true,
    _mock: {
      launchResult: MOCK_LAUNCH_READY,
      healthResult: { health_contract_status: 'HEALTH_BLOCKED_OFFLINE', backend_alive: false },
    },
  });
  assert(r.e2e_runtime_status === 'E2E_BLOCKED_HEALTH', '[D-01] health fail → E2E_BLOCKED_HEALTH');
  assert(r.runtime_probe_pass === false,                '[D-02] probe_pass=false');
  assert(r.deploy_allowed     === false,               '[D-03] deploy=false');
}

// ─── Suite E: Run-live failure ────────────────────────────────────
console.log('\n[Suite E] Run-live failure');
{
  const r = await runRuntimeProbeE2ELocal({
    no_start: false,
    start_local_backend: true,
    _mock: {
      launchResult:  MOCK_LAUNCH_READY,
      healthResult:  MOCK_HEALTH_READY,
      runLiveResult: { run_live_status: 'RUNLIVE_BLOCKED_OFFLINE', run_live_ready: false },
    },
  });
  assert(r.e2e_runtime_status === 'E2E_BLOCKED_RUNLIVE', '[E-01] runlive fail → E2E_BLOCKED_RUNLIVE');
  assert(r.runtime_probe_pass === false,                 '[E-02] probe_pass=false');
  assert(r.deploy_allowed     === false,                 '[E-03] deploy=false');
}
{
  const r = await runRuntimeProbeE2ELocal({
    no_start: false,
    start_local_backend: true,
    _mock: {
      launchResult:  MOCK_LAUNCH_READY,
      healthResult:  MOCK_HEALTH_READY,
      runLiveResult: { run_live_status: 'RUNLIVE_BLOCKED_STUB', run_live_ready: false },
    },
  });
  assert(r.e2e_runtime_status === 'E2E_BLOCKED_RUNLIVE', '[E-04] stub → E2E_BLOCKED_RUNLIVE');
}

// ─── Suite F: Receipt failure (null mission_id) ───────────────────
console.log('\n[Suite F] Receipt failure');
{
  const r = await runRuntimeProbeE2ELocal({
    no_start: false,
    start_local_backend: true,
    _mock: {
      launchResult:  MOCK_LAUNCH_READY,
      healthResult:  MOCK_HEALTH_READY,
      runLiveResult: { run_live_status: 'RUNLIVE_READY', mission_id: null, run_live_ready: true },
    },
  });
  assert(r.e2e_runtime_status === 'E2E_BLOCKED_RECEIPT', '[F-01] null mission_id → E2E_BLOCKED_RECEIPT');
  assert(r.runtime_probe_pass === false,                 '[F-02] probe_pass=false');
  assert(r.deploy_allowed     === false,                 '[F-03] deploy=false');
}

// ─── Suite G: Full mocked E2E ready ───────────────────────────────
console.log('\n[Suite G] Full mocked E2E ready');
{
  const r = await runRuntimeProbeE2ELocal({
    no_start: false,
    start_local_backend: true,
    git_head: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    _mock: {
      launchResult:  MOCK_LAUNCH_READY,
      healthResult:  MOCK_HEALTH_READY,
      runLiveResult: MOCK_RUNLIVE_READY,
    },
  });
  assert(r.e2e_runtime_status  === 'E2E_RUNTIME_READY',          '[G-01] full mock → E2E_RUNTIME_READY');
  assert(r.runtime_probe_pass  === true,                         '[G-02] probe_pass=true');
  assert(r.backend_alive       === true,                         '[G-03] alive=true');
  assert(r.backend_health_ok   === true,                         '[G-04] health_ok=true');
  assert(r.backend_stub        === false,                        '[G-05] stub=false');
  assert(r.mission_id          === 'mission-e2e-real-abc-2026',  '[G-06] mission_id set');
  assert(typeof r.evidence_receipt_id === 'string' && r.evidence_receipt_id.length > 0, '[G-07] receipt_id set');
  assert(r.evidence_source     === 'go-core',                    '[G-08] source=go-core');
  assert(r.receipt_valid       === true,                         '[G-09] receipt_valid=true');
  assert(r.deploy_allowed      === false,                        '[G-10] deploy=false');
  assert(r.promotion_allowed   === false,                        '[G-11] promotion=false');
  assert(r.stable_allowed      === false,                        '[G-12] stable=false');
  assert(r.schema_version      === 'v26.4',                      '[G-13] schema=v26.4');
}

// ─── Suite H: Invariants always false ────────────────────────────
console.log('\n[Suite H] Invariants always false');
{
  const statuses = ['E2E_SKIPPED_NO_START'];
  const r = await runRuntimeProbeE2ELocal({});
  assert(r.deploy_allowed    === false, '[H-01] SKIPPED deploy=false');
  assert(r.promotion_allowed === false, '[H-02] SKIPPED promotion=false');
  assert(r.stable_allowed    === false, '[H-03] SKIPPED stable=false');
}

// ─── Suite I: CLI default → SKIPPED ──────────────────────────────
console.log('\n[Suite I] CLI');
{
  const r = runCLI(['--json']);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed !== null,                                         '[I-01] JSON parseable');
  assert(parsed?.e2e_runtime_status === 'E2E_SKIPPED_NO_START',  '[I-02] default → SKIPPED');
  assert(parsed?.deploy_allowed     === false,                   '[I-03] deploy=false');
  assert(parsed?.runtime_probe_pass === false,                   '[I-04] probe_pass=false');
  assert(r.exitCode                 === 1,                       '[I-05] exit 1');
}
{
  const r = runCLI(['--no-start', '--json']);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed?.e2e_runtime_status === 'E2E_SKIPPED_NO_START',  '[I-06] --no-start → SKIPPED');
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-probe-e2e-local: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
