#!/usr/bin/env node
/**
 * Backend Runtime Probe Adapter — Unit Tests V21.2
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  classifyProbeSnapshot,
  PROBE_STATUSES,
} from '../backend-runtime-probe.mjs';

const CLI = resolve(process.cwd(), 'tools', 'backend-runtime-probe.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Full valid run-live response
const validRunLive = {
  mission_id:          'msn_probe_001',
  evidence_receipt_id: 'rcpt_probe_001',
  evidence_source:     'go-core',
  backend_stub:        false,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PROBE_STATUSES),                           '[A-01] PROBE_STATUSES is array');
assert(PROBE_STATUSES.length === 6,                             '[A-02] 6 statuses');
assert(PROBE_STATUSES.includes('PROBE_SKIPPED_NO_START'),       '[A-03] PROBE_SKIPPED_NO_START');
assert(PROBE_STATUSES.includes('PROBE_BLOCKED_OFFLINE'),        '[A-04] PROBE_BLOCKED_OFFLINE');
assert(PROBE_STATUSES.includes('PROBE_BLOCKED_HEALTH'),         '[A-05] PROBE_BLOCKED_HEALTH');
assert(PROBE_STATUSES.includes('PROBE_BLOCKED_RUN_LIVE'),       '[A-06] PROBE_BLOCKED_RUN_LIVE');
assert(PROBE_STATUSES.includes('PROBE_BLOCKED_STUB'),           '[A-07] PROBE_BLOCKED_STUB');
assert(PROBE_STATUSES.includes('PROBE_READY'),                  '[A-08] PROBE_READY');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const defaultResult = classifyProbeSnapshot({});
assert(defaultResult.deploy_allowed    === false, '[B-01] deploy=false (default)');
assert(defaultResult.promotion_allowed === false, '[B-02] promotion=false (default)');
assert(defaultResult.stable_allowed    === false, '[B-03] stable=false (default)');

const readyResult = classifyProbeSnapshot({
  no_start: false, backend_reachable: true, health_ok: true,
  run_live_result: validRunLive,
});
assert(readyResult.deploy_allowed    === false, '[B-04] deploy=false (READY)');
assert(readyResult.promotion_allowed === false, '[B-05] promotion=false (READY)');
assert(readyResult.stable_allowed    === false, '[B-06] stable=false (READY)');

// ─── Suite C: no-start → PROBE_SKIPPED ───────────────────────────
console.log('\n[Suite C] No-start mode');
const noStart = classifyProbeSnapshot({ no_start: true });
assert(noStart.probe_status  === 'PROBE_SKIPPED_NO_START', '[C-01] no_start → SKIPPED');
assert(noStart.probe_ready   === false,                    '[C-02] ready=false');
assert(noStart.probe_skipped === true,                     '[C-03] skipped=true');

// Default (no_start defaults to true)
const defSnap = classifyProbeSnapshot({});
assert(defSnap.probe_status === 'PROBE_SKIPPED_NO_START',  '[C-04] default → SKIPPED');

// ─── Suite D: Backend offline → BLOCKED ──────────────────────────
console.log('\n[Suite D] Backend offline');
const offline = classifyProbeSnapshot({ no_start: false, backend_reachable: false });
assert(offline.probe_status === 'PROBE_BLOCKED_OFFLINE', '[D-01] offline → BLOCKED_OFFLINE');
assert(offline.probe_ready  === false,                   '[D-02] ready=false');

const timedOut = classifyProbeSnapshot({ no_start: false, backend_reachable: false, timed_out: true });
assert(timedOut.probe_status     === 'PROBE_BLOCKED_OFFLINE', '[D-03] timeout → BLOCKED_OFFLINE');
assert(timedOut.timed_out        === true,                    '[D-04] timed_out=true');

// ─── Suite E: Health fail → BLOCKED ──────────────────────────────
console.log('\n[Suite E] Health fail');
const healthFail = classifyProbeSnapshot({ no_start: false, backend_reachable: true, health_ok: false });
assert(healthFail.probe_status === 'PROBE_BLOCKED_HEALTH', '[E-01] health fail → BLOCKED_HEALTH');
assert(healthFail.probe_ready  === false,                  '[E-02] ready=false');
assert(healthFail.backend_alive === true,                  '[E-03] backend_alive=true despite health fail');

// ─── Suite F: run-live no response → BLOCKED ─────────────────────
console.log('\n[Suite F] run-live no response');
const noRunLive = classifyProbeSnapshot({
  no_start: false, backend_reachable: true, health_ok: true, run_live_result: null,
});
assert(noRunLive.probe_status === 'PROBE_BLOCKED_RUN_LIVE', '[F-01] null run_live → BLOCKED_RUN_LIVE');
assert(noRunLive.probe_ready  === false,                    '[F-02] ready=false');

const stringRunLive = classifyProbeSnapshot({
  no_start: false, backend_reachable: true, health_ok: true, run_live_result: 'string',
});
assert(stringRunLive.probe_status === 'PROBE_BLOCKED_RUN_LIVE', '[F-03] string run_live → BLOCKED_RUN_LIVE');

// ─── Suite G: Backend stub → BLOCKED ─────────────────────────────
console.log('\n[Suite G] Backend stub');
const stubRunLive = { mission_id: 'msn_001', evidence_receipt_id: 'rcpt_001', evidence_source: 'go-core', backend_stub: true };
const stubResult = classifyProbeSnapshot({
  no_start: false, backend_reachable: true, health_ok: true, run_live_result: stubRunLive,
});
assert(stubResult.probe_status === 'PROBE_BLOCKED_STUB', '[G-01] stub=true → BLOCKED_STUB');
assert(stubResult.probe_ready  === false,                '[G-02] ready=false');
assert(stubResult.backend_stub === true,                 '[G-03] backend_stub echoed');

// backend_stub missing from response also blocks
const noStubField = { mission_id: 'msn_001', evidence_receipt_id: 'rcpt_001', evidence_source: 'go-core' };
const noStubResult = classifyProbeSnapshot({
  no_start: false, backend_reachable: true, health_ok: true, run_live_result: noStubField,
});
assert(noStubResult.probe_status === 'PROBE_BLOCKED_STUB', '[G-04] backend_stub absent → BLOCKED_STUB');

// ─── Suite H: Full valid → PROBE_READY ───────────────────────────
console.log('\n[Suite H] Full valid probe');
assert(readyResult.probe_status        === 'PROBE_READY',     '[H-01] status=PROBE_READY');
assert(readyResult.probe_ready         === true,              '[H-02] ready=true');
assert(readyResult.backend_alive       === true,              '[H-03] backend_alive=true');
assert(readyResult.backend_stub        === false,             '[H-04] backend_stub=false');
assert(readyResult.mission_id          === 'msn_probe_001',   '[H-05] mission_id echoed');
assert(readyResult.evidence_receipt_id === 'rcpt_probe_001',  '[H-06] receipt_id echoed');
assert(readyResult.evidence_source     === 'go-core',         '[H-07] source=go-core');
assert(readyResult.deploy_allowed      === false,             '[H-08] READY deploy=false');
assert(readyResult.promotion_allowed   === false,             '[H-09] READY promotion=false');

// ─── Suite I: Timeout controlled ─────────────────────────────────
console.log('\n[Suite I] Timeout');
const withTimeout = classifyProbeSnapshot({ no_start: false, backend_reachable: false, timed_out: true, timeout_ms: 3000 });
assert(withTimeout.timed_out  === true,                    '[I-01] timed_out echoed');
assert(withTimeout.timeout_ms === 3000,                    '[I-02] timeout_ms echoed');

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                              '[J-01] CLI default exit 1');
assert(cliDefault.stdout.includes('SKIPPED'),                  '[J-02] CLI stdout SKIPPED');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 1,                                 '[J-03] --json exit 1');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                        '[J-04] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,           '[J-05] deploy=false');
assert(parsed && parsed.promotion_allowed === false,           '[J-06] promotion=false');

// ─── Suite K: Schema ──────────────────────────────────────────────
console.log('\n[Suite K] Schema');
assert(defaultResult.schema_version === 'v21.2', '[K-01] schema=v21.2 (skipped)');
assert(readyResult.schema_version   === 'v21.2', '[K-02] schema=v21.2 (ready)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nbackend-runtime-probe: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
