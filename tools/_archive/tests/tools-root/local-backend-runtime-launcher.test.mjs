#!/usr/bin/env node
/**
 * Local Backend Runtime Launcher — Unit Tests V26.0
 */

import { spawnSync }       from 'child_process';
import { resolve, join }   from 'path';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir }          from 'os';
import {
  launchLocalBackend,
  stopLocalBackend,
  LAUNCHER_STATUSES,
} from '../local-backend-runtime-launcher.mjs';

const CLI = resolve(process.cwd(), 'tools', 'local-backend-runtime-launcher.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 30000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(LAUNCHER_STATUSES),                            '[A-01] LAUNCHER_STATUSES is array');
assert(LAUNCHER_STATUSES.length === 6,                              '[A-02] 6 statuses');
assert(LAUNCHER_STATUSES.includes('BACKEND_LAUNCH_SKIPPED'),        '[A-03] SKIPPED present');
assert(LAUNCHER_STATUSES.includes('BACKEND_LAUNCH_BLOCKED_NO_SERVER'), '[A-04] NO_SERVER present');
assert(LAUNCHER_STATUSES.includes('BACKEND_LAUNCH_BLOCKED_PORT_BUSY'), '[A-05] PORT_BUSY present');
assert(LAUNCHER_STATUSES.includes('BACKEND_LAUNCH_BLOCKED_HEALTH_TIMEOUT'), '[A-06] HEALTH_TIMEOUT present');
assert(LAUNCHER_STATUSES.includes('BACKEND_LAUNCH_READY'),          '[A-07] READY present');
assert(LAUNCHER_STATUSES.includes('BACKEND_LAUNCH_STOPPED'),        '[A-08] STOPPED present');

// ─── Suite B: No-start / skip (default safe mode) ────────────────
console.log('\n[Suite B] No-start / skip');
{
  const r = await launchLocalBackend({ no_start: true });
  assert(r.launcher_status    === 'BACKEND_LAUNCH_SKIPPED', '[B-01] no_start → SKIPPED');
  assert(r.backend_started    === false,                    '[B-02] not started');
  assert(r.backend_alive      === false,                    '[B-03] not alive');
  assert(r.backend_health_ok  === false,                    '[B-04] health false');
  assert(r.deploy_allowed     === false,                    '[B-05] deploy=false');
  assert(r.promotion_allowed  === false,                    '[B-06] promotion=false');
  assert(r.stable_allowed     === false,                    '[B-07] stable=false');
}
{
  // Default (no start_local_backend flag) → skip
  const r = await launchLocalBackend({});
  assert(r.launcher_status === 'BACKEND_LAUNCH_SKIPPED', '[B-08] default → SKIPPED');
}

// ─── Suite C: Server absent ───────────────────────────────────────
console.log('\n[Suite C] Server absent');
{
  const dir = mkdtempSync(join(tmpdir(), 'launcher-test-'));
  try {
    const r = await launchLocalBackend({ root: dir, start_local_backend: true, port: 19999 });
    assert(r.launcher_status   === 'BACKEND_LAUNCH_BLOCKED_NO_SERVER', '[C-01] no server → BLOCKED_NO_SERVER');
    assert(r.backend_started   === false,                              '[C-02] not started');
    assert(r.deploy_allowed    === false,                              '[C-03] deploy=false');
    assert(r.promotion_allowed === false,                              '[C-04] promotion=false');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite D: Port busy ───────────────────────────────────────────
console.log('\n[Suite D] Port busy');
{
  // Start a simple listener on a port, then try to launch on same port
  const net  = await import('net');
  const port = 19998;
  const srv  = net.createServer();
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  try {
    const dir = mkdtempSync(join(tmpdir(), 'launcher-port-'));
    mkdirSync(join(dir, 'backend'), { recursive: true });
    writeFileSync(join(dir, 'backend', 'server.js'), '// stub\n');
    // Copy server entry path requirement: SERVER_ENTRY = 'backend/server.js'
    // The launcher looks for backend/server.js at root level
    writeFileSync(join(dir, 'backend', 'server.js'), '// stub\n');
    // Need server.js at root/backend/server.js
    const r = await launchLocalBackend({ root: dir, start_local_backend: true, port });
    assert(r.launcher_status   === 'BACKEND_LAUNCH_BLOCKED_PORT_BUSY', '[D-01] busy port → BLOCKED_PORT_BUSY');
    assert(r.backend_started   === false,                              '[D-02] not started');
    assert(r.deploy_allowed    === false,                              '[D-03] deploy=false');
    assert(r.promotion_allowed === false,                              '[D-04] promotion=false');
    rmSync(dir, { recursive: true, force: true });
  } finally {
    await new Promise(r => srv.close(r));
  }
}

// ─── Suite E: Invariants always false ────────────────────────────
console.log('\n[Suite E] Invariants always false');
{
  const statuses = [
    'BACKEND_LAUNCH_SKIPPED',
    'BACKEND_LAUNCH_BLOCKED_NO_SERVER',
    'BACKEND_LAUNCH_BLOCKED_PORT_BUSY',
  ];
  for (const status of statuses) {
    // We can exercise skipped + no_server easily
  }
  const skip = await launchLocalBackend({ no_start: true });
  assert(skip.deploy_allowed    === false, '[E-01] SKIPPED deploy=false');
  assert(skip.promotion_allowed === false, '[E-02] SKIPPED promotion=false');
  assert(skip.stable_allowed    === false, '[E-03] SKIPPED stable=false');

  const dir = mkdtempSync(join(tmpdir(), 'inv-test-'));
  try {
    const ns = await launchLocalBackend({ root: dir, start_local_backend: true, port: 19997 });
    assert(ns.deploy_allowed    === false, '[E-04] NO_SERVER deploy=false');
    assert(ns.promotion_allowed === false, '[E-05] NO_SERVER promotion=false');
    assert(ns.stable_allowed    === false, '[E-06] NO_SERVER stable=false');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── Suite F: stopLocalBackend with non-ready result ─────────────
console.log('\n[Suite F] stopLocalBackend non-ready');
{
  const skip = await launchLocalBackend({ no_start: true });
  const stop = stopLocalBackend(skip);
  assert(stop.launcher_status   === 'BACKEND_LAUNCH_SKIPPED', '[F-01] stop non-ready → SKIPPED');
  assert(stop.backend_stopped   === false,                    '[F-02] not stopped');
  assert(stop.deploy_allowed    === false,                    '[F-03] deploy=false');
  assert(stop.promotion_allowed === false,                    '[F-04] promotion=false');
}
{
  const stop = stopLocalBackend(null);
  assert(stop.launcher_status === 'BACKEND_LAUNCH_SKIPPED', '[F-05] null input → SKIPPED');
}

// ─── Suite G: Schema ─────────────────────────────────────────────
console.log('\n[Suite G] Schema');
{
  const r = await launchLocalBackend({ no_start: true });
  assert(r.schema_version === 'v26.0', '[G-01] schema=v26.0');
}

// ─── Suite H: CLI --no-start ─────────────────────────────────────
console.log('\n[Suite H] CLI');
{
  const r = runCLI(['--no-start', '--json']);
  assert(r.exitCode === 0,                                '[H-01] --no-start exit 0');
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed !== null,                                 '[H-02] JSON parseable');
  assert(parsed?.launcher_status === 'BACKEND_LAUNCH_SKIPPED', '[H-03] SKIPPED');
  assert(parsed?.deploy_allowed  === false,               '[H-04] deploy=false');
  assert(parsed?.promotion_allowed === false,             '[H-05] promotion=false');
}
{
  const r = runCLI(['--json']);
  assert(r.exitCode === 0,                               '[H-06] default exit 0');
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed?.launcher_status === 'BACKEND_LAUNCH_SKIPPED', '[H-07] default → SKIPPED');
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nlocal-backend-runtime-launcher: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
