#!/usr/bin/env node
/**
 * Backend Health Contract — Unit Tests V26.1
 */

import { spawnSync }  from 'child_process';
import { resolve }    from 'path';
import {
  validateHealthContract,
  fetchAndValidateHealth,
  HEALTH_STATUSES,
} from '../backend-health-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'backend-health-contract.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(HEALTH_STATUSES),                          '[A-01] HEALTH_STATUSES is array');
assert(HEALTH_STATUSES.length === 6,                            '[A-02] 6 statuses');
assert(HEALTH_STATUSES.includes('HEALTH_BLOCKED_OFFLINE'),      '[A-03] OFFLINE present');
assert(HEALTH_STATUSES.includes('HEALTH_BLOCKED_HTTP_STATUS'),  '[A-04] HTTP_STATUS present');
assert(HEALTH_STATUSES.includes('HEALTH_BLOCKED_HTML'),         '[A-05] HTML present');
assert(HEALTH_STATUSES.includes('HEALTH_BLOCKED_INVALID_JSON'), '[A-06] INVALID_JSON present');
assert(HEALTH_STATUSES.includes('HEALTH_BLOCKED_STUB'),         '[A-07] STUB present');
assert(HEALTH_STATUSES.includes('HEALTH_READY'),                '[A-08] READY present');

// ─── Suite B: Offline ─────────────────────────────────────────────
console.log('\n[Suite B] Offline');
{
  const r = validateHealthContract({ offline: true });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_OFFLINE', '[B-01] offline → BLOCKED_OFFLINE');
  assert(r.backend_alive          === false,                    '[B-02] alive=false');
  assert(r.backend_health_ok      === false,                    '[B-03] health_ok=false');
  assert(r.backend_stub           === true,                     '[B-04] stub=true (no proof)');
  assert(r.backend_not_stub       === false,                    '[B-05] not_stub=false');
  assert(r.deploy_allowed         === false,                    '[B-06] deploy=false');
  assert(r.promotion_allowed      === false,                    '[B-07] promotion=false');
}
{
  // null http_status also = offline
  const r = validateHealthContract({ http_status: null });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_OFFLINE', '[B-08] null status → OFFLINE');
}

// ─── Suite C: HTTP status != 200 ─────────────────────────────────
console.log('\n[Suite C] HTTP status');
{
  const r = validateHealthContract({ http_status: 500 });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_HTTP_STATUS', '[C-01] 500 → BLOCKED_HTTP_STATUS');
  assert(r.deploy_allowed         === false,                        '[C-02] deploy=false');
  assert(r.promotion_allowed      === false,                        '[C-03] promotion=false');
}
{
  const r = validateHealthContract({ http_status: 404 });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_HTTP_STATUS', '[C-04] 404 → BLOCKED_HTTP_STATUS');
}

// ─── Suite D: HTML response ───────────────────────────────────────
console.log('\n[Suite D] HTML response');
{
  const r = validateHealthContract({ http_status: 200, content_type: 'text/html', body_raw: '<html>ok</html>' });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_HTML', '[D-01] HTML content-type → BLOCKED_HTML');
  assert(r.deploy_allowed         === false,                 '[D-02] deploy=false');
}
{
  const r = validateHealthContract({ http_status: 200, body_raw: '<html><body>Welcome</body></html>' });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_HTML', '[D-03] HTML body → BLOCKED_HTML');
}

// ─── Suite E: Invalid JSON ────────────────────────────────────────
console.log('\n[Suite E] Invalid JSON');
{
  const r = validateHealthContract({ http_status: 200, body_raw: 'not json' });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_INVALID_JSON', '[E-01] invalid json → BLOCKED_INVALID_JSON');
  assert(r.deploy_allowed         === false,                         '[E-02] deploy=false');
}
{
  const r = validateHealthContract({ http_status: 200, body_raw: '' });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_INVALID_JSON', '[E-03] empty body → BLOCKED_INVALID_JSON');
}

// ─── Suite F: Stub detection ──────────────────────────────────────
console.log('\n[Suite F] Stub detection');
{
  const r = validateHealthContract({ http_status: 200, body_raw: JSON.stringify({ status: 'ok', stub: true }) });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_STUB', '[F-01] stub marker → BLOCKED_STUB');
  assert(r.backend_stub           === true,                  '[F-02] stub=true');
  assert(r.backend_not_stub       === false,                 '[F-03] not_stub=false');
  assert(r.deploy_allowed         === false,                 '[F-04] deploy=false');
}
{
  const r = validateHealthContract({ http_status: 200, body_raw: JSON.stringify({ status: 'mock', service: 'fake' }) });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_STUB', '[F-05] mock/fake markers → BLOCKED_STUB');
}
{
  const r = validateHealthContract({ http_status: 200, body_raw: JSON.stringify({ status: 'dry-run' }) });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_STUB', '[F-06] dry-run marker → BLOCKED_STUB');
}
{
  // status not in allowed set → stub
  const r = validateHealthContract({ http_status: 200, body_raw: JSON.stringify({ status: 'initializing' }) });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_STUB', '[F-07] unknown status → BLOCKED_STUB');
}

// ─── Suite G: HEALTH_READY — real backend ────────────────────────
console.log('\n[Suite G] HEALTH_READY');
{
  const realBody = JSON.stringify({
    status: 'ok',
    service: 'vision-core-backend',
    version: '1.0.0',
    runtime: 'node',
    uptime: 42.5,
  });
  const r = validateHealthContract({ http_status: 200, body_raw: realBody });
  assert(r.health_contract_status === 'HEALTH_READY', '[G-01] real backend → HEALTH_READY');
  assert(r.backend_alive          === true,           '[G-02] alive=true');
  assert(r.backend_health_ok      === true,           '[G-03] health_ok=true');
  assert(r.backend_stub           === false,          '[G-04] stub=false');
  assert(r.backend_not_stub       === true,           '[G-05] not_stub=true (has signals)');
  assert(r.deploy_allowed         === false,          '[G-06] deploy=false');
  assert(r.promotion_allowed      === false,          '[G-07] promotion=false');
  assert(r.stable_allowed         === false,          '[G-08] stable=false');
  assert(r.schema_version         === 'v26.1',        '[G-09] schema=v26.1');
}
{
  // Has ok status but only 1 signal → backend_not_stub=false
  const partialBody = JSON.stringify({ status: 'ok', service: 'only-one' });
  const r = validateHealthContract({ http_status: 200, body_raw: partialBody });
  assert(r.health_contract_status === 'HEALTH_READY', '[G-10] partial signals → READY (not blocked)');
  assert(r.backend_not_stub       === false,          '[G-11] partial signals → not_stub=false (insufficient proof)');
}

// ─── Suite H: fetchAndValidateHealth offline ──────────────────────
console.log('\n[Suite H] fetchAndValidateHealth offline');
{
  // Use a port that should not be running
  const r = await fetchAndValidateHealth({ base_url: 'http://127.0.0.1:19977', timeout_ms: 500 });
  assert(r.health_contract_status === 'HEALTH_BLOCKED_OFFLINE', '[H-01] unreachable → OFFLINE');
  assert(r.deploy_allowed         === false,                    '[H-02] deploy=false');
  assert(r.promotion_allowed      === false,                    '[H-03] promotion=false');
}

// ─── Suite I: Invariants always false ────────────────────────────
console.log('\n[Suite I] Invariants');
{
  const cases = [
    { offline: true },
    { http_status: 500 },
    { http_status: 200, body_raw: '<html>' },
    { http_status: 200, body_raw: 'bad json' },
    { http_status: 200, body_raw: JSON.stringify({ status: 'stub' }) },
    { http_status: 200, body_raw: JSON.stringify({ status: 'ok', service: 'a', version: 'b', runtime: 'c', uptime: 1 }) },
  ];
  for (let i = 0; i < cases.length; i++) {
    const r = validateHealthContract(cases[i]);
    assert(r.deploy_allowed    === false, `[I-0${i+1}] case ${i+1} deploy=false`);
    assert(r.promotion_allowed === false, `[I-0${i+1}b] case ${i+1} promotion=false`);
  }
}

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI');
{
  // CLI with --url pointing to unreachable port → exit 1, OFFLINE
  const r = runCLI(['--url', 'http://127.0.0.1:19976', '--timeout-ms', '500', '--json']);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed !== null,                                            '[J-01] JSON parseable');
  assert(parsed?.health_contract_status === 'HEALTH_BLOCKED_OFFLINE', '[J-02] OFFLINE from CLI');
  assert(parsed?.deploy_allowed         === false,                   '[J-03] deploy=false');
  assert(r.exitCode                     === 1,                       '[J-04] exit 1 (not ready)');
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nbackend-health-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
