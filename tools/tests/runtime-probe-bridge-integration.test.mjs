#!/usr/bin/env node
/**
 * Runtime Probe Bridge Integration — Unit Tests V31.3
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runProbeBridgeIntegration,
  PROBE_BRIDGE_STATUSES,
} from '../runtime-probe-bridge-integration.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-probe-bridge-integration.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Valid mock health
const MOCK_HEALTH_READY = {
  health_contract_status: 'HEALTH_READY',
  backend_alive:          true,
  backend_health_ok:      true,
  backend_not_stub:       true,
  backend_stub:           false,
};

// Valid mock bridge
const MOCK_BRIDGE_READY = {
  bridge_status:       'BRIDGE_READY',
  bridge_ready:        true,
  backend_stub:        false,
  evidence_source:     'go-core',
  mission_id:          'msn-probe-001',
  evidence_receipt_id: 'rcpt-probe-001',
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PROBE_BRIDGE_STATUSES),                                      '[A-01] statuses is array');
assert(PROBE_BRIDGE_STATUSES.length === 5,                                        '[A-02] 5 statuses');
assert(PROBE_BRIDGE_STATUSES.includes('PROBE_BRIDGE_BLOCKED_HEALTH'),             '[A-03] BLOCKED_HEALTH present');
assert(PROBE_BRIDGE_STATUSES.includes('PROBE_BRIDGE_BLOCKED_BRIDGE'),             '[A-04] BLOCKED_BRIDGE present');
assert(PROBE_BRIDGE_STATUSES.includes('PROBE_BRIDGE_BLOCKED_CONTRACT'),           '[A-05] BLOCKED_CONTRACT present');
assert(PROBE_BRIDGE_STATUSES.includes('PROBE_BRIDGE_BLOCKED_RECEIPT'),            '[A-06] BLOCKED_RECEIPT present');
assert(PROBE_BRIDGE_STATUSES.includes('PROBE_BRIDGE_READY'),                      '[A-07] PROBE_BRIDGE_READY present');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const healthFail = runProbeBridgeIntegration({
  _mock_health: { health_contract_status: 'HEALTH_OFFLINE', backend_alive: false, backend_health_ok: false, backend_not_stub: false },
});
const ready = runProbeBridgeIntegration({
  _mock_health: MOCK_HEALTH_READY,
  _mock_bridge: MOCK_BRIDGE_READY,
});
assert(healthFail.deploy_allowed    === false, '[B-01] deploy=false (blocked)');
assert(healthFail.promotion_allowed === false, '[B-02] promotion=false (blocked)');
assert(healthFail.stable_allowed    === false, '[B-03] stable=false (blocked)');
assert(ready.deploy_allowed         === false, '[B-04] deploy=false (READY)');
assert(ready.promotion_allowed      === false, '[B-05] promotion=false (READY)');
assert(ready.stable_allowed         === false, '[B-06] stable=false (READY)');

// ─── Suite C: Health blocked ──────────────────────────────────────
console.log('\n[Suite C] Health blocked');
assert(healthFail.probe_bridge_status === 'PROBE_BRIDGE_BLOCKED_HEALTH', '[C-01] health fail → BLOCKED_HEALTH');
assert(healthFail.probe_bridge_ready  === false,                          '[C-02] probe_bridge_ready=false');
assert(healthFail.backend_alive       === false,                          '[C-03] backend_alive=false');
assert(healthFail.backend_stub        === true,                           '[C-04] backend_stub=true when blocked');

const stubHealth = runProbeBridgeIntegration({
  _mock_health: { health_contract_status: 'HEALTH_STUB', backend_alive: true, backend_health_ok: true, backend_not_stub: false, backend_stub: true },
});
assert(stubHealth.probe_bridge_status === 'PROBE_BRIDGE_BLOCKED_HEALTH', '[C-05] stub health → BLOCKED_HEALTH');
assert(stubHealth.blocking_reason     === 'backend_stub_detected_in_health', '[C-06] stub blocking reason');

// ─── Suite D: Bridge blocked ──────────────────────────────────────
console.log('\n[Suite D] Bridge blocked');
const bridgeFail = runProbeBridgeIntegration({
  _mock_health: MOCK_HEALTH_READY,
  _mock_bridge: {
    bridge_status:  'BRIDGE_BLOCKED_GOCORE',
    bridge_ready:   false,
    backend_stub:   true,
    blocking_reason: 'gocore_not_found',
  },
});
assert(bridgeFail.probe_bridge_status === 'PROBE_BRIDGE_BLOCKED_BRIDGE', '[D-01] bridge fail → BLOCKED_BRIDGE');
assert(bridgeFail.probe_bridge_ready  === false,                          '[D-02] probe_bridge_ready=false');

// ─── Suite E: Contract blocked ────────────────────────────────────
console.log('\n[Suite E] Contract blocked');
const backendStubBridge = runProbeBridgeIntegration({
  _mock_health: MOCK_HEALTH_READY,
  _mock_bridge: { bridge_status: 'BRIDGE_READY', bridge_ready: true, backend_stub: true, evidence_source: 'go-core', mission_id: 'msn-e01', evidence_receipt_id: 'rcpt-e01' },
});
assert(backendStubBridge.probe_bridge_status === 'PROBE_BRIDGE_BLOCKED_CONTRACT', '[E-01] bridge stub=true → BLOCKED_CONTRACT');

const backendSourceBridge = runProbeBridgeIntegration({
  _mock_health: MOCK_HEALTH_READY,
  _mock_bridge: { bridge_status: 'BRIDGE_READY', bridge_ready: true, backend_stub: false, evidence_source: 'backend', mission_id: 'msn-e02', evidence_receipt_id: 'rcpt-e02' },
});
assert(backendSourceBridge.probe_bridge_status === 'PROBE_BRIDGE_BLOCKED_CONTRACT', '[E-02] backend source → BLOCKED_CONTRACT');

// ─── Suite F: Full valid → PROBE_BRIDGE_READY ─────────────────────
console.log('\n[Suite F] Full valid');
assert(ready.probe_bridge_status  === 'PROBE_BRIDGE_READY', '[F-01] status=PROBE_BRIDGE_READY');
assert(ready.probe_bridge_ready   === true,                  '[F-02] probe_bridge_ready=true');
assert(ready.backend_alive        === true,                  '[F-03] backend_alive=true');
assert(ready.backend_health_ok    === true,                  '[F-04] backend_health_ok=true');
assert(ready.backend_stub         === false,                 '[F-05] backend_stub=false');
assert(ready.evidence_source      === 'go-core',             '[F-06] evidence_source=go-core');
assert(ready.runtime_probe_pass   === true,                  '[F-07] runtime_probe_pass=true');
assert(ready.receipt_valid        === true,                  '[F-08] receipt_valid=true');
assert(ready.mission_id           === 'msn-probe-001',       '[F-09] mission_id echoed');
assert(ready.evidence_receipt_id  === 'rcpt-probe-001',      '[F-10] receipt_id echoed');
assert(ready.blocking_reason      === null,                  '[F-11] blocking_reason=null');
assert(ready.schema_version       === 'v31.3',               '[F-12] schema=v31.3');

// ─── Suite G: Fixture mode ────────────────────────────────────────
console.log('\n[Suite G] Fixture mode');
const fixtureReady = runProbeBridgeIntegration({ fixture_mode: true });
assert(fixtureReady.probe_bridge_status === 'PROBE_BRIDGE_READY', '[G-01] fixture_mode → PROBE_BRIDGE_READY');
assert(fixtureReady.backend_stub        === false,                 '[G-02] backend_stub=false in fixture');
assert(fixtureReady.evidence_source     === 'go-core',             '[G-03] evidence_source=go-core');
assert(fixtureReady.runtime_probe_pass  === true,                  '[G-04] runtime_probe_pass=true');

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliDefault = runCLI([]);
// Default: no fixture → health check with no URL → blocked
assert(cliDefault.exitCode === 1,                               '[H-01] CLI no args → exit 1');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                               '[H-02] fixture-mode → exit 0');
assert(cliFixture.stdout.includes('PROBE_BRIDGE_READY'),        '[H-03] stdout PROBE_BRIDGE_READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                  '[H-04] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                         '[H-05] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,            '[H-06] JSON deploy=false');
assert(parsed && parsed.promotion_allowed === false,            '[H-07] JSON promotion=false');
assert(parsed && parsed.backend_stub      === false,            '[H-08] JSON backend_stub=false');
assert(parsed && parsed.runtime_probe_pass === true,            '[H-09] JSON runtime_probe_pass=true');

// ─── Suite I: Schema ──────────────────────────────────────────────
console.log('\n[Suite I] Schema');
assert(ready.schema_version      === 'v31.3', '[I-01] schema=v31.3 (READY)');
assert(healthFail.schema_version === 'v31.3', '[I-02] schema=v31.3 (BLOCKED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-probe-bridge-integration: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
