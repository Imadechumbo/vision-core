#!/usr/bin/env node
/**
 * Local Runtime PASS GOLD Drill — Unit Tests V22.0
 */

import { spawnSync }  from 'child_process';
import { resolve }    from 'path';
import { existsSync } from 'fs';
import {
  runLocalPassGoldDrill,
  DRILL_STATUSES,
} from '../local-runtime-pass-gold-drill.mjs';

const CLI = resolve(process.cwd(), 'tools', 'local-runtime-pass-gold-drill.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(DRILL_STATUSES),                                   '[A-01] DRILL_STATUSES is array');
assert(DRILL_STATUSES.length === 5,                                     '[A-02] 5 statuses');
assert(DRILL_STATUSES.includes('DRILL_PASS_GOLD_READY_LOCAL'),          '[A-03] READY_LOCAL present');
assert(DRILL_STATUSES.includes('DRILL_BLOCKED_SETUP'),                  '[A-04] BLOCKED_SETUP');
assert(DRILL_STATUSES.includes('DRILL_BLOCKED_RUNTIME'),                '[A-05] BLOCKED_RUNTIME');
assert(DRILL_STATUSES.includes('DRILL_BLOCKED_RECEIPT'),                '[A-06] BLOCKED_RECEIPT');
assert(DRILL_STATUSES.includes('DRILL_BLOCKED_BINDING'),                '[A-07] BLOCKED_BINDING');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const blockedResult = runLocalPassGoldDrill({ tests_verified: false });
const readyResult   = runLocalPassGoldDrill({ tests_verified: true });
assert(blockedResult.deploy_allowed    === false, '[B-01] deploy=false (blocked)');
assert(blockedResult.promotion_allowed === false, '[B-02] promotion=false (blocked)');
assert(blockedResult.stable_allowed    === false, '[B-03] stable=false (blocked)');
assert(readyResult.deploy_allowed      === false, '[B-04] deploy=false (READY)');
assert(readyResult.promotion_allowed   === false, '[B-05] promotion=false (READY)');
assert(readyResult.stable_allowed      === false, '[B-06] stable=false (READY)');
assert(readyResult.local_only          === true,  '[B-07] local_only=true (READY)');

// ─── Suite C: Invalid runtime → DRILL_BLOCKED_RUNTIME ────────────
console.log('\n[Suite C] Runtime blocked');
const invalidRuntime = {
  backend_alive:       false,
  backend_health_ok:   false,
  backend_stub:        true,
  mission_id:          null,
  evidence_receipt_id: null,
  evidence_source:     null,
  runtime_probe_pass:  false,
};
const blockedRuntime = runLocalPassGoldDrill({ runtime_fixture: invalidRuntime, tests_verified: true });
assert(blockedRuntime.drill_status   === 'DRILL_BLOCKED_RUNTIME', '[C-01] bad runtime → BLOCKED_RUNTIME');
assert(blockedRuntime.drill_ready    === false,                   '[C-02] drill_ready=false');

// ─── Suite D: Invalid receipt → DRILL_BLOCKED_RECEIPT ────────────
console.log('\n[Suite D] Receipt blocked');
const invalidReceipt = { source: 'backend', receipt_id: 'r1' }; // missing fields + wrong source
const blockedReceipt = runLocalPassGoldDrill({ receipt_fixture: invalidReceipt, tests_verified: true });
assert(blockedReceipt.drill_status === 'DRILL_BLOCKED_RECEIPT', '[D-01] bad receipt → BLOCKED_RECEIPT');
assert(blockedReceipt.drill_ready  === false,                   '[D-02] drill_ready=false');

// ─── Suite E: Tests not verified → DRILL_BLOCKED_BINDING ─────────
console.log('\n[Suite E] Tests not verified');
const noTests = runLocalPassGoldDrill({ tests_verified: false });
assert(noTests.drill_status === 'DRILL_BLOCKED_BINDING', '[E-01] no tests → DRILL_BLOCKED_BINDING');
assert(noTests.drill_ready  === false,                   '[E-02] drill_ready=false');

// ─── Suite F: Invalid authority → DRILL_BLOCKED_BINDING ──────────
console.log('\n[Suite F] Authority blocked');
const badAuthority = runLocalPassGoldDrill({
  authority_fixture: { authority_valid: false },
  tests_verified:    true,
});
assert(badAuthority.drill_status === 'DRILL_BLOCKED_BINDING', '[F-01] bad authority → BLOCKED_BINDING');
assert(badAuthority.drill_ready  === false,                   '[F-02] drill_ready=false');

// ─── Suite G: Full valid drill → DRILL_PASS_GOLD_READY_LOCAL ─────
console.log('\n[Suite G] Full valid drill');
assert(readyResult.drill_status                 === 'DRILL_PASS_GOLD_READY_LOCAL', '[G-01] status=DRILL_PASS_GOLD_READY_LOCAL');
assert(readyResult.drill_ready                  === true,                          '[G-02] drill_ready=true');
assert(readyResult.local_only                   === true,                          '[G-03] local_only=true');
assert(readyResult.pass_gold_candidate_allowed  === true,                          '[G-04] candidate_allowed=true');
assert(readyResult.pass_gold_candidate_local_only === true,                        '[G-05] candidate_local_only=true');
assert(typeof readyResult.mission_id            === 'string',                      '[G-06] mission_id string');
assert(typeof readyResult.evidence_receipt_id   === 'string',                      '[G-07] receipt_id string');
assert(readyResult.evidence_source              === 'go-core',                     '[G-08] source=go-core');
assert(readyResult.deploy_allowed               === false,                         '[G-09] READY deploy=false');
assert(readyResult.promotion_allowed            === false,                         '[G-10] READY promotion=false');
assert(readyResult.stable_allowed               === false,                         '[G-11] READY stable=false');

// ─── Suite H: Temp root removed after drill ───────────────────────
console.log('\n[Suite H] Temp root cleanup');
const drillWithRoot = runLocalPassGoldDrill({ tests_verified: true, remove_temp_root: true });
assert(drillWithRoot.temp_root_created === true, '[H-01] temp_root_created=true');
assert(drillWithRoot.temp_root_removed === true, '[H-02] temp_root_removed=true');
// Temp root should no longer exist
if (drillWithRoot.temp_root) {
  assert(!existsSync(drillWithRoot.temp_root), '[H-03] temp_root directory removed');
} else {
  assert(true, '[H-03] temp_root null (skipped)');
}

// Without removal
const drillNoRemove = runLocalPassGoldDrill({ tests_verified: true, remove_temp_root: false });
assert(drillNoRemove.temp_root_removed === false || drillNoRemove.temp_root_removed === undefined, '[H-04] remove_temp_root=false respected');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliNoTests = runCLI(['--no-tests-verified']);
assert(cliNoTests.exitCode === 1,                  '[I-01] CLI no-tests exit 1');

const cliReady = runCLI([]);
assert(cliReady.exitCode === 0,                    '[I-02] CLI with tests exit 0');
assert(cliReady.stdout.includes('READY_LOCAL') || cliReady.stdout.includes('DRILL_PASS_GOLD_READY_LOCAL'), '[I-03] stdout READY_LOCAL');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                     '[I-04] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                            '[I-05] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false, '[I-06] deploy=false');
assert(parsed && parsed.promotion_allowed === false, '[I-07] promotion=false');
assert(parsed && parsed.local_only        === true,  '[I-08] local_only=true');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(blockedResult.schema_version === 'v22.0', '[J-01] schema=v22.0 (blocked)');
assert(readyResult.schema_version   === 'v22.0', '[J-02] schema=v22.0 (ready)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nlocal-runtime-pass-gold-drill: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
