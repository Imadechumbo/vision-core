#!/usr/bin/env node
/**
 * Run-Live Mission Contract — Unit Tests V26.2
 */

import { spawnSync }  from 'child_process';
import { resolve }    from 'path';
import {
  validateRunLiveContract,
  fetchAndValidateRunLive,
  RUNLIVE_STATUSES,
} from '../run-live-mission-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'run-live-mission-contract.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}
function makeValid(overrides = {}) {
  return {
    http_status: 200,
    body_raw: JSON.stringify({
      mission_id: 'mission-abc-xyz-2026-real',
      runtime:    'node',
      timestamp:  '2026-05-17T00:00:00Z',
      ...overrides,
    }),
  };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RUNLIVE_STATUSES),                              '[A-01] RUNLIVE_STATUSES is array');
assert(RUNLIVE_STATUSES.length === 7,                                '[A-02] 7 statuses');
assert(RUNLIVE_STATUSES.includes('RUNLIVE_BLOCKED_OFFLINE'),         '[A-03] OFFLINE present');
assert(RUNLIVE_STATUSES.includes('RUNLIVE_BLOCKED_HTTP_STATUS'),     '[A-04] HTTP_STATUS present');
assert(RUNLIVE_STATUSES.includes('RUNLIVE_BLOCKED_INVALID_JSON'),    '[A-05] INVALID_JSON present');
assert(RUNLIVE_STATUSES.includes('RUNLIVE_BLOCKED_STUB'),            '[A-06] STUB present');
assert(RUNLIVE_STATUSES.includes('RUNLIVE_BLOCKED_MISSION_ID'),      '[A-07] MISSION_ID present');
assert(RUNLIVE_STATUSES.includes('RUNLIVE_BLOCKED_FAKE_PASS_GOLD'),  '[A-08] FAKE_PASS_GOLD present');
assert(RUNLIVE_STATUSES.includes('RUNLIVE_READY'),                   '[A-09] READY present');

// ─── Suite B: Offline ─────────────────────────────────────────────
console.log('\n[Suite B] Offline');
{
  const r = validateRunLiveContract({ offline: true });
  assert(r.run_live_status    === 'RUNLIVE_BLOCKED_OFFLINE', '[B-01] offline → BLOCKED_OFFLINE');
  assert(r.run_live_ready     === false,                     '[B-02] ready=false');
  assert(r.backend_stub       === true,                      '[B-03] stub=true');
  assert(r.deploy_allowed     === false,                     '[B-04] deploy=false');
  assert(r.promotion_allowed  === false,                     '[B-05] promotion=false');
}
{
  const r = validateRunLiveContract({ http_status: null });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_OFFLINE', '[B-06] null status → OFFLINE');
}

// ─── Suite C: HTTP status ─────────────────────────────────────────
console.log('\n[Suite C] HTTP status');
{
  const r = validateRunLiveContract({ http_status: 500 });
  assert(r.run_live_status   === 'RUNLIVE_BLOCKED_HTTP_STATUS', '[C-01] 500 → BLOCKED_HTTP_STATUS');
  assert(r.deploy_allowed    === false,                         '[C-02] deploy=false');
  assert(r.promotion_allowed === false,                         '[C-03] promotion=false');
}
{
  const r = validateRunLiveContract({ http_status: 403 });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_HTTP_STATUS',   '[C-04] 403 → BLOCKED_HTTP_STATUS');
}

// ─── Suite D: Invalid JSON ────────────────────────────────────────
console.log('\n[Suite D] Invalid JSON');
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: 'bad json' });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_INVALID_JSON', '[D-01] bad json → BLOCKED_INVALID_JSON');
  assert(r.deploy_allowed  === false,                         '[D-02] deploy=false');
}
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: '' });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_INVALID_JSON', '[D-03] empty → BLOCKED_INVALID_JSON');
}

// ─── Suite E: Stub response ───────────────────────────────────────
// §131 (tools/run-live-mission-contract.mjs a2b36940, 2026-06-23) scoped stub
// detection to STRING VALUES only, deliberately excluding field names/booleans
// — "backend_stub" is a legitimate real field name, and checking the raw JSON
// (or boolean-valued keys) for the substring "stub" false-positived on real
// RUNLIVE_READY responses. E-01/E-03 below test real string-value markers
// (what the gate is actually meant to catch); E-05 proves the false-positive
// this fix removed stays fixed.
console.log('\n[Suite E] Stub response');
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ status: 'stub', mission_id: 'x' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_STUB', '[E-01] stub marker in string value → BLOCKED_STUB');
  assert(r.deploy_allowed  === false,                 '[E-02] deploy=false');
}
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ note: 'mock response', mission_id: 'y' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_STUB', '[E-03] mock marker in string value → BLOCKED_STUB');
}
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ env: 'fake' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_STUB', '[E-04] fake env → BLOCKED_STUB');
}
{
  // §131: a real response legitimately carries backend_stub:false (boolean) —
  // must NOT be treated as a stub marker just because the field name contains "stub".
  const body = JSON.stringify({ backend_stub: false, mission_id: 'mission-real-abc-999', runtime: 'node' });
  const r = validateRunLiveContract({ http_status: 200, body_raw: body });
  assert(r.run_live_status !== 'RUNLIVE_BLOCKED_STUB', '[E-05] backend_stub:false (boolean field) does NOT false-positive as stub');
  assert(r.run_live_status === 'RUNLIVE_READY',         '[E-06] real response with backend_stub:false reaches RUNLIVE_READY');
}

// ─── Suite F: Missing / fake mission_id ──────────────────────────
console.log('\n[Suite F] Fake/missing mission_id');
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ runtime: 'node' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_MISSION_ID', '[F-01] no mission_id → BLOCKED_MISSION_ID');
  assert(r.deploy_allowed  === false,                        '[F-02] deploy=false');
}
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ mission_id: '1716000000000', runtime: 'node' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_MISSION_ID', '[F-03] timestamp-only → BLOCKED_MISSION_ID');
}
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ mission_id: 'fake-mission', runtime: 'node' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_MISSION_ID', '[F-04] fake prefix → BLOCKED_MISSION_ID');
}
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ mission_id: '', runtime: 'node' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_MISSION_ID', '[F-05] empty string → BLOCKED_MISSION_ID');
}
{
  const r = validateRunLiveContract({ http_status: 200, body_raw: JSON.stringify({ mission_id: 'stub-mission-123', runtime: 'node' }) });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_MISSION_ID', '[F-06] stub prefix → BLOCKED_MISSION_ID');
}

// ─── Suite G: Fake PASS GOLD ──────────────────────────────────────
console.log('\n[Suite G] Fake PASS GOLD');
{
  const body = JSON.stringify({ mission_id: 'mission-real-abc-123', runtime: 'node', pass_gold: true });
  const r = validateRunLiveContract({ http_status: 200, body_raw: body });
  assert(r.run_live_status    === 'RUNLIVE_BLOCKED_FAKE_PASS_GOLD', '[G-01] pass_gold=true → BLOCKED_FAKE_PASS_GOLD');
  assert(r.pass_gold_claimed  === true,                             '[G-02] pass_gold_claimed=true');
  assert(r.deploy_allowed     === false,                            '[G-03] deploy=false');
  assert(r.promotion_allowed  === false,                            '[G-04] promotion=false');
}
{
  const body = JSON.stringify({ mission_id: 'mission-real-abc-456', runtime: 'node', promotion_allowed: true });
  const r = validateRunLiveContract({ http_status: 200, body_raw: body });
  assert(r.run_live_status === 'RUNLIVE_BLOCKED_FAKE_PASS_GOLD', '[G-05] promotion_allowed=true → BLOCKED');
  assert(r.promotion_allowed_claimed === true,                   '[G-06] promotion_allowed_claimed=true');
}

// ─── Suite H: RUNLIVE_READY ───────────────────────────────────────
console.log('\n[Suite H] RUNLIVE_READY');
{
  const r = validateRunLiveContract(makeValid());
  assert(r.run_live_status    === 'RUNLIVE_READY',          '[H-01] valid → RUNLIVE_READY');
  assert(r.mission_id         === 'mission-abc-xyz-2026-real', '[H-02] mission_id set');
  assert(r.backend_stub       === false,                    '[H-03] stub=false');
  assert(r.run_live_ready     === true,                     '[H-04] ready=true');
  assert(r.pass_gold_claimed  === false,                    '[H-05] pass_gold_claimed=false');
  assert(r.deploy_allowed     === false,                    '[H-06] deploy=false');
  assert(r.promotion_allowed  === false,                    '[H-07] promotion=false');
  assert(r.stable_allowed     === false,                    '[H-08] stable=false');
  assert(r.schema_version     === 'v26.2',                  '[H-09] schema=v26.2');
}

// ─── Suite I: fetchAndValidateRunLive offline ─────────────────────
console.log('\n[Suite I] fetchAndValidateRunLive offline');
{
  const r = await fetchAndValidateRunLive({ base_url: 'http://127.0.0.1:19975', timeout_ms: 500 });
  assert(r.run_live_status   === 'RUNLIVE_BLOCKED_OFFLINE', '[I-01] unreachable → OFFLINE');
  assert(r.deploy_allowed    === false,                     '[I-02] deploy=false');
  assert(r.promotion_allowed === false,                     '[I-03] promotion=false');
}

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI');
{
  const r = runCLI(['--url', 'http://127.0.0.1:19974', '--timeout-ms', '500', '--json']);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed !== null,                                         '[J-01] JSON parseable');
  assert(parsed?.run_live_status === 'RUNLIVE_BLOCKED_OFFLINE',   '[J-02] OFFLINE from CLI');
  assert(parsed?.deploy_allowed  === false,                       '[J-03] deploy=false');
  assert(r.exitCode              === 1,                           '[J-04] exit 1');
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrun-live-mission-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
