#!/usr/bin/env node
/**
 * PI Harness — Real Manual Release Gate Mode — Unit Tests V58.0
 */

import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS   = resolve(__dirname, '..', 'pi-harness.mjs');

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function runHarness(extraArgs = []) {
  const r = spawnSync(
    process.execPath,
    [HARNESS, '--mode', 'interactive', '--dry-run', '--json', ...extraArgs],
    { timeout: 20000, encoding: 'utf8' }
  );
  if (r.error) throw r.error;
  try { return JSON.parse(r.stdout); }
  catch { return null; }
}

// ─── Suite A: Default — gate disabled ────────────────────────────
console.log('\n[Suite A] Default mode — real gate disabled');
const defOut = runHarness();
assert(defOut !== null,                                                              '[A-01] harness returns JSON');
assert(defOut.real_manual_release_gate_enabled === false,                           '[A-02] gate_enabled=false by default');
assert(defOut.real_manual_release_gate_status  === null,                            '[A-03] gate_status=null by default');
assert(defOut.real_manual_release_gate_ready   === false,                           '[A-04] gate_ready=false by default');
assert(defOut.production_execution_lock_status === null,                            '[A-05] lock_status=null by default');
assert(defOut.production_execution_locked      === true,                            '[A-06] production_execution_locked=true always');
assert(defOut.real_release_readiness_status    === null,                            '[A-07] readiness_status=null by default');
assert(defOut.evidence_finalizer_status        === null,                            '[A-08] finalizer_status=null by default');
assert(Array.isArray(defOut.real_release_locked_ledger_event_ids),                 '[A-09] ledger_event_ids array');
assert(defOut.real_release_locked_ledger_event_ids.length === 0,                   '[A-10] 0 ledger events by default');
assert(defOut.unlock_required                  === true,                            '[A-11] unlock_required=true always');

// ─── Suite B: Full fixture — gate + lock + readiness + finalizer ──
console.log('\n[Suite B] Full fixture — ready locked');
const fullOut = runHarness([
  '--real-manual-release-gate',
  '--fixture-production-lock',
]);
assert(fullOut !== null,                                                             '[B-01] harness returns JSON');
assert(fullOut.real_manual_release_gate_enabled === true,                           '[B-02] gate_enabled=true');
assert(fullOut.real_manual_release_gate_status  === 'REAL_GATE_READY_LOCKED',      '[B-03] gate_status=REAL_GATE_READY_LOCKED');
assert(fullOut.real_manual_release_gate_ready   === true,                           '[B-04] gate_ready=true');
assert(fullOut.production_execution_lock_status === 'PRODUCTION_LOCK_ACTIVE',      '[B-05] lock_status=PRODUCTION_LOCK_ACTIVE');
assert(fullOut.production_execution_locked      === true,                           '[B-06] production_execution_locked=true');
assert(fullOut.real_release_readiness_status    === 'REAL_READINESS_READY_LOCKED', '[B-07] readiness=REAL_READINESS_READY_LOCKED');
assert(fullOut.evidence_finalizer_status        === 'FINALIZER_READY_LOCKED',      '[B-08] finalizer=FINALIZER_READY_LOCKED');
assert(fullOut.unlock_required                  === true,                           '[B-09] unlock_required=true');

// ─── Suite C: Ledger events appended ─────────────────────────────
console.log('\n[Suite C] Ledger events');
const ledgerOut = runHarness([
  '--real-manual-release-gate',
  '--fixture-production-lock',
  '--ledger-real-release-locked',
]);
assert(ledgerOut !== null,                                                           '[C-01] harness returns JSON');
assert(Array.isArray(ledgerOut.real_release_locked_ledger_event_ids),              '[C-02] event_ids array');
assert(ledgerOut.real_release_locked_ledger_event_ids.length === 4,                '[C-03] 4 ledger events appended');
for (const id of ledgerOut.real_release_locked_ledger_event_ids) {
  assert(typeof id === 'string' && id.length === 24,                               `[C] event_id 24 chars: ${id}`);
}

// ─── Suite D: Execution flags always false ────────────────────────
console.log('\n[Suite D] Execution flags false always');
for (const [label, out] of [['default', defOut], ['full-fixture', fullOut], ['ledger', ledgerOut]]) {
  assert(out.release_execution_allowed === false,  `[D] ${label}: exec_allowed=false`);
  assert(out.release_performed         === false,  `[D] ${label}: release_performed=false`);
  assert(out.tag_created               === false,  `[D] ${label}: tag_created=false`);
  assert(out.stable_promoted           === false,  `[D] ${label}: stable_promoted=false`);
  assert(out.deploy_performed          === false,  `[D] ${label}: deploy_performed=false`);
  assert(out.deploy_allowed            === false,  `[D] ${label}: deploy_allowed=false`);
}

// ─── Suite E: Invariants across all outputs ───────────────────────
console.log('\n[Suite E] Invariants');
for (const [label, out] of [['default', defOut], ['full-fixture', fullOut], ['ledger', ledgerOut]]) {
  assert(out.production_execution_locked === true, `[E] ${label}: production_execution_locked=true`);
  assert(out.unlock_required             === true, `[E] ${label}: unlock_required=true`);
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\npi-harness-real-manual-release-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
