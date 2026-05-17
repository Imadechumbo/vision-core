#!/usr/bin/env node
/**
 * Local Runtime Execution Controller — Unit Tests V36.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runLocalRuntimeExecutionController,
  LOCAL_RUNTIME_STATUSES,
} from '../local-runtime-execution-controller.mjs';

const CLI = resolve(process.cwd(), 'tools', 'local-runtime-execution-controller.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

function mockBridgeReady(overrides = {}) {
  return {
    probe_bridge_ready:   true,
    probe_bridge_status:  'PROBE_BRIDGE_READY',
    mission_id:           'exec-mission-001',
    evidence_receipt_id:  'exec-receipt-001',
    evidence_source:      'go-core',
    backend_stub:         false,
    runtime_probe_pass:   true,
    blocking_reason:      null,
    ...overrides,
  };
}

function mockBridgeBlocked(overrides = {}) {
  return {
    probe_bridge_ready:   false,
    probe_bridge_status:  'BLOCKED_HEALTH',
    mission_id:           null,
    evidence_receipt_id:  null,
    evidence_source:      null,
    backend_stub:         true,
    runtime_probe_pass:   false,
    blocking_reason:      'health_blocked',
    ...overrides,
  };
}

function mockLauncherReady(overrides = {}) {
  return {
    launch_status:    'BACKEND_LAUNCH_READY',
    launch_ready:     true,
    backend_started:  true,
    backend_alive:    true,
    backend_health_ok: true,
    blocking_reason:  null,
    ...overrides,
  };
}

function mockLauncherBlocked(overrides = {}) {
  return {
    launch_status:    'BACKEND_LAUNCH_BLOCKED_NO_SERVER',
    launch_ready:     false,
    backend_started:  false,
    backend_alive:    false,
    backend_health_ok: false,
    blocking_reason:  'no_server_file',
    ...overrides,
  };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(LOCAL_RUNTIME_STATUSES),                                    '[A-01] statuses is array');
assert(LOCAL_RUNTIME_STATUSES.length === 6,                                      '[A-02] 6 statuses');
assert(LOCAL_RUNTIME_STATUSES.includes('LOCAL_RUNTIME_SKIPPED'),                 '[A-03] SKIPPED');
assert(LOCAL_RUNTIME_STATUSES.includes('LOCAL_RUNTIME_BLOCKED_BACKEND'),         '[A-04] BLOCKED_BACKEND');
assert(LOCAL_RUNTIME_STATUSES.includes('LOCAL_RUNTIME_BLOCKED_GOCORE'),          '[A-05] BLOCKED_GOCORE');
assert(LOCAL_RUNTIME_STATUSES.includes('LOCAL_RUNTIME_BLOCKED_PROBE'),           '[A-06] BLOCKED_PROBE');
assert(LOCAL_RUNTIME_STATUSES.includes('LOCAL_RUNTIME_BLOCKED_RECEIPT'),         '[A-07] BLOCKED_RECEIPT');
assert(LOCAL_RUNTIME_STATUSES.includes('LOCAL_RUNTIME_READY'),                   '[A-08] LOCAL_RUNTIME_READY');

// ─── Suite B: Default skipped ─────────────────────────────────────
console.log('\n[Suite B] Default skipped');
const def = runLocalRuntimeExecutionController();
assert(def.local_runtime_status  === 'LOCAL_RUNTIME_SKIPPED', '[B-01] default → SKIPPED');
assert(def.local_runtime_ready   === false,                    '[B-02] ready=false');
assert(def.backend_alive         === false,                    '[B-03] backend_alive=false');
assert(def.backend_stub          === true,                     '[B-04] backend_stub=true');
assert(def.deploy_allowed        === false,                    '[B-05] deploy=false');
assert(def.promotion_allowed     === false,                    '[B-06] promotion=false');
assert(def.stable_allowed        === false,                    '[B-07] stable=false');
assert(def.tag_allowed           === false,                    '[B-08] tag_allowed=false');

const dryRun = runLocalRuntimeExecutionController({ execute_local_runtime: true, dry_run: true });
assert(dryRun.local_runtime_status === 'LOCAL_RUNTIME_SKIPPED', '[B-09] dry_run → SKIPPED');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
const fixture = runLocalRuntimeExecutionController({
  fixture_mode: true,
  _mock_bridge: mockBridgeReady(),
  _mock_launcher: mockLauncherReady(),
});
assert(def.deploy_allowed     === false, '[C-01] deploy=false (skipped)');
assert(def.promotion_allowed  === false, '[C-02] promotion=false (skipped)');
assert(fixture.deploy_allowed === false, '[C-03] deploy=false (ready)');
assert(fixture.promotion_allowed === false, '[C-04] promotion=false (ready)');
assert(fixture.stable_allowed === false, '[C-05] stable=false (ready)');
assert(fixture.tag_allowed    === false, '[C-06] tag_allowed=false (ready)');

// ─── Suite D: Backend blocked ─────────────────────────────────────
console.log('\n[Suite D] Backend blocked');
const backendBlocked = runLocalRuntimeExecutionController({
  execute_local_runtime: true,
  _mock_launcher:        mockLauncherBlocked(),
  _mock_bridge:          mockBridgeReady(),
});
assert(backendBlocked.local_runtime_status === 'LOCAL_RUNTIME_BLOCKED_BACKEND', '[D-01] launcher fail → BLOCKED_BACKEND');
assert(backendBlocked.local_runtime_ready  === false,                            '[D-02] ready=false');
assert(backendBlocked.deploy_allowed       === false,                            '[D-03] deploy=false');

// ─── Suite E: Go Core / bridge blocked ───────────────────────────
console.log('\n[Suite E] GoCore blocked');
const gocoreBlocked = runLocalRuntimeExecutionController({
  execute_local_runtime: true,
  _mock_launcher:        mockLauncherReady(),
  _mock_bridge:          mockBridgeBlocked(),
});
assert(gocoreBlocked.local_runtime_status === 'LOCAL_RUNTIME_BLOCKED_GOCORE', '[E-01] bridge fail → BLOCKED_GOCORE');
assert(gocoreBlocked.local_runtime_ready  === false,                           '[E-02] ready=false');

// ─── Suite F: Probe blocked ───────────────────────────────────────
console.log('\n[Suite F] Probe blocked');
const probeBlocked = runLocalRuntimeExecutionController({
  execute_local_runtime: true,
  _mock_launcher:        mockLauncherReady(),
  _mock_bridge:          mockBridgeReady({ runtime_probe_pass: false }),
});
assert(probeBlocked.local_runtime_status === 'LOCAL_RUNTIME_BLOCKED_PROBE', '[F-01] probe fail → BLOCKED_PROBE');
assert(probeBlocked.local_runtime_ready  === false,                          '[F-02] ready=false');

// ─── Suite G: Receipt blocked ─────────────────────────────────────
console.log('\n[Suite G] Receipt blocked');
const noReceipt = runLocalRuntimeExecutionController({
  execute_local_runtime: true,
  _mock_launcher:        mockLauncherReady(),
  _mock_bridge:          mockBridgeReady({ evidence_receipt_id: null }),
});
assert(noReceipt.local_runtime_status === 'LOCAL_RUNTIME_BLOCKED_RECEIPT', '[G-01] no receipt → BLOCKED_RECEIPT');

const badSource = runLocalRuntimeExecutionController({
  execute_local_runtime: true,
  _mock_launcher:        mockLauncherReady(),
  _mock_bridge:          mockBridgeReady({ evidence_source: 'backend' }),
});
assert(badSource.local_runtime_status === 'LOCAL_RUNTIME_BLOCKED_RECEIPT', '[G-02] backend source → BLOCKED_RECEIPT');

// ─── Suite H: Full valid → LOCAL_RUNTIME_READY ────────────────────
console.log('\n[Suite H] Full valid');
const ready = runLocalRuntimeExecutionController({
  execute_local_runtime: true,
  _mock_launcher:        mockLauncherReady(),
  _mock_bridge:          mockBridgeReady(),
});
assert(ready.local_runtime_status   === 'LOCAL_RUNTIME_READY', '[H-01] status=LOCAL_RUNTIME_READY');
assert(ready.local_runtime_ready    === true,                   '[H-02] ready=true');
assert(ready.backend_alive          === true,                   '[H-03] backend_alive=true');
assert(ready.backend_stub           === false,                  '[H-04] backend_stub=false');
assert(ready.mission_id             === 'exec-mission-001',     '[H-05] mission_id echoed');
assert(ready.evidence_receipt_id    === 'exec-receipt-001',     '[H-06] receipt_id echoed');
assert(ready.evidence_source        === 'go-core',              '[H-07] evidence_source=go-core');
assert(ready.runtime_probe_pass     === true,                   '[H-08] probe_pass=true');
assert(ready.deploy_allowed         === false,                  '[H-09] deploy=false');
assert(ready.promotion_allowed      === false,                  '[H-10] promotion=false');
assert(ready.stable_allowed         === false,                  '[H-11] stable=false');
assert(ready.tag_allowed            === false,                  '[H-12] tag_allowed=false');
assert(ready.blocking_reason        === null,                   '[H-13] blocking_reason=null');
assert(ready.schema_version         === 'v36.0',                '[H-14] schema=v36.0');

// Fixture mode also works
assert(fixture.local_runtime_status === 'LOCAL_RUNTIME_READY', '[H-15] fixture mode → READY');
assert(fixture.deploy_allowed       === false,                  '[H-16] fixture: deploy=false');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                         '[I-01] default → exit 1 (skipped/not ready)');
assert(cliDefault.stdout.includes('LOCAL_RUNTIME_SKIPPED'),               '[I-02] stdout SKIPPED');
assert(cliDefault.stdout.includes('deploy_allowed'),                      '[I-03] stdout deploy_allowed');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                         '[I-04] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('LOCAL_RUNTIME_READY'),                 '[I-05] stdout LOCAL_RUNTIME_READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                            '[I-06] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                   '[I-07] JSON parseable');
assert(parsed && parsed.local_runtime_ready   === true,                   '[I-08] JSON ready=true');
assert(parsed && parsed.deploy_allowed        === false,                  '[I-09] JSON deploy=false');
assert(parsed && parsed.promotion_allowed     === false,                  '[I-10] JSON promotion=false');
assert(parsed && parsed.stable_allowed        === false,                  '[I-11] JSON stable=false');
assert(parsed && parsed.tag_allowed           === false,                  '[I-12] JSON tag_allowed=false');
assert(parsed && parsed.evidence_source       === 'go-core',              '[I-13] JSON evidence_source=go-core');
assert(parsed && parsed.backend_stub          === false,                  '[I-14] JSON backend_stub=false');

const cliDryRun = runCLI(['--execute-local-runtime', '--dry-run']);
assert(cliDryRun.exitCode === 1,                                          '[I-15] --dry-run → exit 1');
assert(cliDryRun.stdout.includes('LOCAL_RUNTIME_SKIPPED'),                '[I-16] --dry-run → SKIPPED');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(ready.schema_version === 'v36.0', '[J-01] schema=v36.0 (READY)');
assert(def.schema_version   === 'v36.0', '[J-02] schema=v36.0 (SKIPPED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nlocal-runtime-execution-controller: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
