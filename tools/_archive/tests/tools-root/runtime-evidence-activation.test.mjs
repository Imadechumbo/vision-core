#!/usr/bin/env node
/**
 * Runtime Evidence Activation — Unit Tests V21.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  activateRuntimeEvidence,
  RUNTIME_EVIDENCE_STATUSES,
} from '../runtime-evidence-activation.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-evidence-activation.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Full valid runtime input
const fullValid = {
  backend_alive:       true,
  backend_health_ok:   true,
  backend_stub:        false,
  mission_id:          'msn_test_001',
  evidence_receipt_id: 'rcpt_test_001',
  evidence_source:     'go-core',
  runtime_probe_pass:  true,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RUNTIME_EVIDENCE_STATUSES),                                   '[A-01] statuses is array');
assert(RUNTIME_EVIDENCE_STATUSES.length === 6,                                     '[A-02] 6 statuses');
assert(RUNTIME_EVIDENCE_STATUSES.includes('RUNTIME_EVIDENCE_READY'),               '[A-03] READY present');
assert(RUNTIME_EVIDENCE_STATUSES.includes('RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE'), '[A-04] BLOCKED_BACKEND_OFFLINE');
assert(RUNTIME_EVIDENCE_STATUSES.includes('RUNTIME_EVIDENCE_BLOCKED_BACKEND_STUB'),    '[A-05] BLOCKED_BACKEND_STUB');
assert(RUNTIME_EVIDENCE_STATUSES.includes('RUNTIME_EVIDENCE_BLOCKED_MISSION_ID'),      '[A-06] BLOCKED_MISSION_ID');
assert(RUNTIME_EVIDENCE_STATUSES.includes('RUNTIME_EVIDENCE_BLOCKED_RECEIPT'),         '[A-07] BLOCKED_RECEIPT');
assert(RUNTIME_EVIDENCE_STATUSES.includes('RUNTIME_EVIDENCE_BLOCKED_SOURCE'),          '[A-08] BLOCKED_SOURCE');

// ─── Suite B: Invariants — any call never allows deploy/promotion ──
console.log('\n[Suite B] Invariants');
const anyResult = activateRuntimeEvidence({});
assert(anyResult.deploy_allowed    === false, '[B-01] deploy_allowed=false (empty input)');
assert(anyResult.promotion_allowed === false, '[B-02] promotion_allowed=false (empty input)');
assert(anyResult.stable_allowed    === false, '[B-03] stable_allowed=false (empty input)');

const readyResult = activateRuntimeEvidence(fullValid);
assert(readyResult.deploy_allowed    === false, '[B-04] deploy_allowed=false (READY)');
assert(readyResult.promotion_allowed === false, '[B-05] promotion_allowed=false (READY)');
assert(readyResult.stable_allowed    === false, '[B-06] stable_allowed=false (READY)');

// ─── Suite C: Backend offline → BLOCKED ──────────────────────────
console.log('\n[Suite C] Backend offline');
const offlineResult = activateRuntimeEvidence({ backend_alive: false });
assert(offlineResult.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE', '[C-01] status=BLOCKED_BACKEND_OFFLINE');
assert(offlineResult.runtime_evidence_ready  === false,                                      '[C-02] ready=false');

const healthFail = activateRuntimeEvidence({ backend_alive: true, backend_health_ok: false });
assert(healthFail.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE', '[C-03] health fail → BLOCKED_BACKEND_OFFLINE');
assert(healthFail.runtime_evidence_ready  === false,                                      '[C-04] ready=false');

// ─── Suite D: Backend stub → BLOCKED ─────────────────────────────
console.log('\n[Suite D] Backend stub');
const stubResult = activateRuntimeEvidence({
  backend_alive:     true,
  backend_health_ok: true,
  backend_stub:      true,
});
assert(stubResult.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_BACKEND_STUB', '[D-01] status=BLOCKED_BACKEND_STUB');
assert(stubResult.runtime_evidence_ready  === false,                                   '[D-02] ready=false');

// ─── Suite E: Missing mission_id → BLOCKED ───────────────────────
console.log('\n[Suite E] Missing mission_id');
const noMission = activateRuntimeEvidence({
  backend_alive: true, backend_health_ok: true, backend_stub: false,
  mission_id: null,
});
assert(noMission.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_MISSION_ID', '[E-01] null mission_id → BLOCKED');
assert(noMission.runtime_evidence_ready  === false,                                 '[E-02] ready=false');

const emptyMission = activateRuntimeEvidence({
  backend_alive: true, backend_health_ok: true, backend_stub: false,
  mission_id: '',
});
assert(emptyMission.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_MISSION_ID', '[E-03] empty mission_id → BLOCKED');

// ─── Suite F: Missing receipt → BLOCKED ──────────────────────────
console.log('\n[Suite F] Missing evidence_receipt');
const noReceipt = activateRuntimeEvidence({
  backend_alive: true, backend_health_ok: true, backend_stub: false,
  mission_id: 'msn_001', evidence_receipt_id: null,
});
assert(noReceipt.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_RECEIPT', '[F-01] null receipt → BLOCKED');
assert(noReceipt.runtime_evidence_ready  === false,                              '[F-02] ready=false');

const emptyReceipt = activateRuntimeEvidence({
  backend_alive: true, backend_health_ok: true, backend_stub: false,
  mission_id: 'msn_001', evidence_receipt_id: '',
});
assert(emptyReceipt.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_RECEIPT', '[F-03] empty receipt → BLOCKED');

// ─── Suite G: Wrong source → BLOCKED ─────────────────────────────
console.log('\n[Suite G] Wrong evidence_source');
const backendSource = activateRuntimeEvidence({
  backend_alive: true, backend_health_ok: true, backend_stub: false,
  mission_id: 'msn_001', evidence_receipt_id: 'rcpt_001',
  evidence_source: 'backend',
});
assert(backendSource.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_SOURCE', '[G-01] source=backend → BLOCKED');
assert(backendSource.runtime_evidence_ready  === false,                             '[G-02] ready=false');

const nullSource = activateRuntimeEvidence({
  backend_alive: true, backend_health_ok: true, backend_stub: false,
  mission_id: 'msn_001', evidence_receipt_id: 'rcpt_001',
  evidence_source: null,
});
assert(nullSource.runtime_evidence_status === 'RUNTIME_EVIDENCE_BLOCKED_SOURCE', '[G-03] null source → BLOCKED');

// ─── Suite H: Full valid → READY ─────────────────────────────────
console.log('\n[Suite H] Full valid runtime');
assert(readyResult.runtime_evidence_status === 'RUNTIME_EVIDENCE_READY', '[H-01] status=READY');
assert(readyResult.runtime_evidence_ready  === true,                      '[H-02] ready=true');
assert(readyResult.backend_alive           === true,                      '[H-03] backend_alive=true');
assert(readyResult.backend_health_ok       === true,                      '[H-04] backend_health_ok=true');
assert(readyResult.backend_stub            === false,                     '[H-05] backend_stub=false');
assert(readyResult.mission_id              === 'msn_test_001',            '[H-06] mission_id echoed');
assert(readyResult.evidence_receipt_id     === 'rcpt_test_001',           '[H-07] receipt_id echoed');
assert(readyResult.evidence_source         === 'go-core',                 '[H-08] source=go-core');
assert(readyResult.runtime_probe_pass      === true,                      '[H-09] probe_pass=true');
assert(readyResult.deploy_allowed          === false,                     '[H-10] READY still deploy=false');
assert(readyResult.promotion_allowed       === false,                     '[H-11] READY still promotion=false');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                          '[I-01] CLI default → exit 1 (blocked)');
assert(cliDefault.stdout.includes('BLOCKED'),                              '[I-02] CLI stdout contains BLOCKED');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 1,                                             '[I-03] CLI --json → exit 1');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                    '[I-04] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,                       '[I-05] JSON deploy_allowed=false');
assert(parsed && parsed.promotion_allowed === false,                       '[I-06] JSON promotion_allowed=false');

// ─── Suite J: Schema version ──────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(anyResult.schema_version   === 'v21.0', '[J-01] schema=v21.0 (blocked)');
assert(readyResult.schema_version === 'v21.0', '[J-02] schema=v21.0 (ready)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-evidence-activation: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
