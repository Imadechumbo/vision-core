#!/usr/bin/env node
/**
 * PI Harness Supervised Release Ledger Wiring — Unit Tests V44.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';

const HARNESS = resolve(process.cwd(), 'tools', 'pi-harness.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runHarness(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', HARNESS, '--mode', 'interactive', '--dry-run', '--json', ...args], {
    encoding: 'utf-8', timeout: 25000,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout || ''); } catch { parsed = null; }
  return { parsed, exitCode: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// Pre-compute results
const def = runHarness([]);
const ledgerOnly = runHarness(['--supervised-release-ledger']);
const fullFixture = runHarness([
  '--supervised-release-ledger',
  '--fixture-supervised-release',
  '--fixture-manual-promotion-review',
]);
const ledgerWithRC = runHarness([
  '--supervised-release-ledger',
  '--supervised-release-candidate',
  '--fixture-runtime-candidate',
  '--fixture-release-intent',
  '--fixture-authority',
  '--verify-tests',
  '--policy-clean',
]);

// ─── Suite A: Default — ledger disabled ───────────────────────────
console.log('\n[Suite A] Default — ledger disabled');
assert(def.parsed !== null,                                               '[A-01] default JSON parseable');
assert(def.parsed?.supervised_ledger_enabled === false,                   '[A-02] default ledger_enabled=false');
assert(def.parsed?.supervised_ledger_size    === 0,                       '[A-03] default ledger_size=0');
assert(def.parsed?.supervised_ledger_chain_valid === null,                '[A-04] default chain_valid=null');
assert(Array.isArray(def.parsed?.supervised_ledger_events),               '[A-05] default events=[]');
assert(def.parsed?.supervised_ledger_events?.length === 0,                '[A-06] default events empty');
assert(def.parsed?.promotion_package_ready  === false,                    '[A-07] default pkg_ready=false');
assert(def.parsed?.promotion_review_ready   === false,                    '[A-08] default review_ready=false');

// ─── Suite B: Ledger enabled but no RC → no events ────────────────
console.log('\n[Suite B] Ledger enabled, no RC ready');
assert(ledgerOnly.parsed !== null,                                        '[B-01] JSON parseable');
assert(ledgerOnly.parsed?.supervised_ledger_enabled === true,             '[B-02] ledger_enabled=true');
assert(ledgerOnly.parsed?.supervised_ledger_size    === 0,                '[B-03] no events (no RC)');
assert(ledgerOnly.parsed?.supervised_ledger_chain_valid === true,         '[B-04] empty chain valid');
assert(ledgerOnly.parsed?.promotion_package_ready   === false,            '[B-05] pkg_ready=false');

// ─── Suite C: Full fixture — 6 events, chain valid ────────────────
console.log('\n[Suite C] Full fixture — events + chain');
assert(fullFixture.parsed !== null,                                       '[C-01] JSON parseable');
assert(fullFixture.parsed?.supervised_ledger_enabled === true,            '[C-02] ledger_enabled=true');
assert(fullFixture.parsed?.supervised_ledger_size    === 6,               '[C-03] 6 events (RC+intent+auth+pkg+req+comp)');
assert(fullFixture.parsed?.supervised_ledger_chain_valid === true,        '[C-04] chain_valid=true');
assert(Array.isArray(fullFixture.parsed?.supervised_ledger_events),       '[C-05] events array');
assert(fullFixture.parsed?.supervised_ledger_events?.length === 6,        '[C-06] events length=6');
assert(fullFixture.parsed?.promotion_package_ready   === true,            '[C-07] pkg_ready=true');
assert(fullFixture.parsed?.promotion_review_ready    === true,            '[C-08] review_ready=true');

// Verify event sequence
const evs = fullFixture.parsed?.supervised_ledger_events ?? [];
assert(evs[0]?.event_type === 'SUPERVISED_RC_CANDIDATE_DECLARED',         '[C-09] seq=0 RC_DECLARED');
assert(evs[1]?.event_type === 'SUPERVISED_RELEASE_INTENT_CREATED',        '[C-10] seq=1 INTENT_CREATED');
assert(evs[2]?.event_type === 'SUPERVISED_INTENT_AUTHORITY_BOUND',        '[C-11] seq=2 AUTHORITY_BOUND');
assert(evs[3]?.event_type === 'SUPERVISED_PROMOTION_PACKAGE_BUILT',       '[C-12] seq=3 PACKAGE_BUILT');
assert(evs[4]?.event_type === 'SUPERVISED_PROMOTION_REVIEW_REQUESTED',    '[C-13] seq=4 REVIEW_REQUESTED');
assert(evs[5]?.event_type === 'SUPERVISED_PROMOTION_REVIEW_COMPLETED',    '[C-14] seq=5 REVIEW_COMPLETED');
for (let i = 0; i < evs.length; i++) {
  assert(evs[i]?.seq === i,                                               `[C-15] seq=${i} correct`);
  assert(evs[i]?.supervised_ledger_ready === true,                        `[C-16] event ready (seq=${i})`);
}

// ─── Suite D: Ledger + supervised RC flags → events appended ─────
console.log('\n[Suite D] Ledger + supervised RC flags');
assert(ledgerWithRC.parsed !== null,                                      '[D-01] JSON parseable');
assert(ledgerWithRC.parsed?.supervised_ledger_enabled === true,           '[D-02] ledger_enabled=true');
assert(ledgerWithRC.parsed?.supervised_ledger_size    >= 3,               '[D-03] at least RC+intent+auth events');
assert(ledgerWithRC.parsed?.supervised_ledger_chain_valid === true,       '[D-04] chain valid');
assert(ledgerWithRC.parsed?.supervised_release_candidate_ready === true,  '[D-05] supervised_rc_ready=true');

// ─── Suite E: Invariants — always false ───────────────────────────
console.log('\n[Suite E] Invariants');
for (const [label, r] of [
  ['default', def],
  ['ledger_only', ledgerOnly],
  ['full_fixture', fullFixture],
  ['ledger_with_rc', ledgerWithRC],
]) {
  assert(r.parsed?.deploy_allowed            === false, `[E] deploy=false (${label})`);
  assert(r.parsed?.promotion_allowed         === false, `[E] promotion=false (${label})`);
  assert(r.parsed?.production_release_allowed === false, `[E] production=false (${label})`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npi-harness-supervised-release-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
