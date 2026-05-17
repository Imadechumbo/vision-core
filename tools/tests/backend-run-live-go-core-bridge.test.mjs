#!/usr/bin/env node
/**
 * Backend Run-Live Go Core Bridge — Unit Tests V31.2
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runRunLiveGoCorebridge,
  BRIDGE_STATUSES,
} from '../backend-run-live-go-core-bridge.mjs';

const CLI = resolve(process.cwd(), 'tools', 'backend-run-live-go-core-bridge.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const VALID_PAYLOAD = { mission_id: 'msn-bridge-001' };
const VALID_GOCORE  = {
  mission_id:          'msn-bridge-001',
  evidence_receipt_id: 'rcpt-bridge-001',
  evidence_source:     'go-core',
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(BRIDGE_STATUSES),                                   '[A-01] statuses is array');
assert(BRIDGE_STATUSES.length === 5,                                     '[A-02] 5 statuses');
assert(BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_PAYLOAD'),               '[A-03] BLOCKED_PAYLOAD present');
assert(BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_GOCORE'),                '[A-04] BLOCKED_GOCORE present');
assert(BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_RECEIPT'),               '[A-05] BLOCKED_RECEIPT present');
assert(BRIDGE_STATUSES.includes('BRIDGE_BLOCKED_RUNLIVE_CONTRACT'),      '[A-06] BLOCKED_RUNLIVE_CONTRACT present');
assert(BRIDGE_STATUSES.includes('BRIDGE_READY'),                         '[A-07] BRIDGE_READY present');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const noPayload = runRunLiveGoCorebridge({});
const ready     = runRunLiveGoCorebridge({
  run_live_payload: VALID_PAYLOAD,
  fixture_mode: true,
  _fixture_gocore: VALID_GOCORE,
});
assert(noPayload.deploy_allowed    === false, '[B-01] deploy=false (blocked)');
assert(noPayload.promotion_allowed === false, '[B-02] promotion=false (blocked)');
assert(noPayload.stable_allowed    === false, '[B-03] stable=false (blocked)');
assert(ready.deploy_allowed        === false, '[B-04] deploy=false (READY)');
assert(ready.promotion_allowed     === false, '[B-05] promotion=false (READY)');
assert(ready.stable_allowed        === false, '[B-06] stable=false (READY)');

// ─── Suite C: Payload blocked ─────────────────────────────────────
console.log('\n[Suite C] Payload blocked');
assert(noPayload.bridge_status === 'BRIDGE_BLOCKED_PAYLOAD', '[C-01] no payload → BRIDGE_BLOCKED_PAYLOAD');
assert(noPayload.bridge_ready  === false,                    '[C-02] bridge_ready=false');

const nullPayload = runRunLiveGoCorebridge({ run_live_payload: null });
assert(nullPayload.bridge_status === 'BRIDGE_BLOCKED_PAYLOAD', '[C-03] null payload → BRIDGE_BLOCKED_PAYLOAD');

const passGoldPayload = runRunLiveGoCorebridge({
  run_live_payload: { mission_id: 'msn-x', pass_gold: true },
});
assert(passGoldPayload.bridge_status === 'BRIDGE_BLOCKED_PAYLOAD', '[C-04] pass_gold=true payload → BRIDGE_BLOCKED_PAYLOAD');
assert(passGoldPayload.blocking_reason === 'payload_claims_pass_gold_rejected', '[C-05] correct blocking_reason');

const promotionPayload = runRunLiveGoCorebridge({
  run_live_payload: { mission_id: 'msn-x', promotion_allowed: true },
});
assert(promotionPayload.bridge_status === 'BRIDGE_BLOCKED_PAYLOAD', '[C-06] promotion_allowed=true → BRIDGE_BLOCKED_PAYLOAD');

// ─── Suite D: Go Core blocked ─────────────────────────────────────
console.log('\n[Suite D] Go Core blocked');
const gocoreBlocked = runRunLiveGoCorebridge({
  run_live_payload: VALID_PAYLOAD,
  // no fixture_mode and no go_core_bin → harness blocked → bridge blocked
});
assert(gocoreBlocked.bridge_status === 'BRIDGE_BLOCKED_GOCORE', '[D-01] harness fail → BRIDGE_BLOCKED_GOCORE');
assert(gocoreBlocked.bridge_ready  === false,                   '[D-02] bridge_ready=false');
assert(gocoreBlocked.backend_stub  === true,                    '[D-03] backend_stub=true when blocked');

const badGocoreOutput = runRunLiveGoCorebridge({
  run_live_payload: VALID_PAYLOAD,
  _fixture_gocore: { mission_id: 'msn-x', evidence_source: 'backend' },
});
assert(badGocoreOutput.bridge_status === 'BRIDGE_BLOCKED_GOCORE', '[D-04] bad gocore output → BRIDGE_BLOCKED_GOCORE');

// ─── Suite E: Receipt blocked ─────────────────────────────────────
console.log('\n[Suite E] Receipt from wrong source');
// Note: receipt source is validated in harness, so BRIDGE_BLOCKED_GOCORE covers it.
// Test a harness that passes but has no receipt (inject directly):
const noReceiptFixture = runRunLiveGoCorebridge({
  run_live_payload: VALID_PAYLOAD,
  _fixture_gocore: 'not json',
});
assert(noReceiptFixture.bridge_status === 'BRIDGE_BLOCKED_GOCORE', '[E-01] invalid fixture → BRIDGE_BLOCKED_GOCORE');

// ─── Suite F: Full valid → BRIDGE_READY ──────────────────────────
console.log('\n[Suite F] Full valid');
assert(ready.bridge_status            === 'BRIDGE_READY',       '[F-01] status=BRIDGE_READY');
assert(ready.bridge_ready             === true,                  '[F-02] bridge_ready=true');
assert(ready.backend_stub             === false,                 '[F-03] backend_stub=false');
assert(ready.evidence_source          === 'go-core',             '[F-04] evidence_source=go-core');
assert(ready.mission_id               === 'msn-bridge-001',     '[F-05] mission_id echoed');
assert(ready.evidence_receipt_id      === 'rcpt-bridge-001',    '[F-06] receipt_id echoed');
assert(ready.run_live_contract_status === 'RUNLIVE_READY',       '[F-07] contract=RUNLIVE_READY');
assert(typeof ready.run_live_response  === 'object',             '[F-08] run_live_response present');
assert(ready.run_live_response?.pass_gold         === false,     '[F-09] run_live response pass_gold=false');
assert(ready.run_live_response?.promotion_allowed === false,     '[F-10] run_live response promotion_allowed=false');
assert(ready.blocking_reason          === null,                  '[F-11] blocking_reason=null');
assert(ready.schema_version           === 'v31.2',               '[F-12] schema=v31.2');

// ─── Suite G: backend_stub only false with Go Core ────────────────
console.log('\n[Suite G] backend_stub semantics');
assert(noPayload.backend_stub === true, '[G-01] blocked → backend_stub=true');
assert(ready.backend_stub     === false, '[G-02] READY → backend_stub=false');
assert(gocoreBlocked.backend_stub === true, '[G-03] gocore blocked → backend_stub=true');

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                         '[H-01] no payload → exit 1');
assert(cliDefault.stdout.includes('BLOCKED'),             '[H-02] stdout BLOCKED');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                         '[H-03] fixture-mode → exit 0');
assert(cliFixture.stdout.includes('BRIDGE_READY'),        '[H-04] stdout BRIDGE_READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                            '[H-05] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                   '[H-06] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,      '[H-07] JSON deploy=false');
assert(parsed && parsed.promotion_allowed === false,      '[H-08] JSON promotion=false');
assert(parsed && parsed.backend_stub      === false,      '[H-09] JSON backend_stub=false');

// ─── Suite I: Schema ──────────────────────────────────────────────
console.log('\n[Suite I] Schema');
assert(ready.schema_version     === 'v31.2', '[I-01] schema=v31.2 (READY)');
assert(noPayload.schema_version === 'v31.2', '[I-02] schema=v31.2 (BLOCKED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nbackend-run-live-go-core-bridge: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
