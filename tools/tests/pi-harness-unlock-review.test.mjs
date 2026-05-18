#!/usr/bin/env node
/**
 * PI Harness Unlock Review Mode — Unit Tests V63.1
 */

import { spawnSync } from 'child_process';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function run(...args) {
  const r = spawnSync(process.execPath, [
    '--no-deprecation',
    'tools/pi-harness.mjs',
    '--mode', 'interactive',
    '--dry-run',
    '--json',
    ...args,
  ], { encoding: 'utf8', timeout: 30000 });
  if (r.status !== 0 && !r.stdout) {
    console.error('harness stderr:', r.stderr?.slice(0, 400));
    return null;
  }
  try { return JSON.parse(r.stdout); } catch { return null; }
}

// ─── Suite A: Default — unlock review disabled ────────────────────
console.log('\n[Suite A] Default — unlock review disabled');
const def = run();
assert(def !== null,                                                                      '[A-01] harness returns output');
assert(def.unlock_review_enabled         === false,                                       '[A-02] unlock_review_enabled=false');
assert(def.unlock_contract_ready         === false,                                       '[A-03] unlock_contract_ready=false');
assert(def.unlock_authority_ready        === false,                                       '[A-04] unlock_authority_ready=false');
assert(def.unlock_binding_ready          === false,                                       '[A-05] unlock_binding_ready=false');
assert(def.unlock_review_ready           === false,                                       '[A-06] unlock_review_ready=false');
assert(def.unlock_evidence_package_ready === false,                                       '[A-07] evidence_package_ready=false');
assert(Array.isArray(def.unlock_review_ledger_event_ids) && def.unlock_review_ledger_event_ids.length === 0, '[A-08] ledger_events=[]');
assert(def.unlock_executed               === false,                                       '[A-09] unlock_executed=false');
assert(def.unlock_review_only            === true,                                        '[A-10] unlock_review_only=true');
assert(def.future_execution_phase_required === true,                                      '[A-11] future_exec=true');
assert(def.production_execution_locked   === true,                                        '[A-12] production_execution_locked=true');

// ─── Suite B: Full fixture unlock review ──────────────────────────
console.log('\n[Suite B] Full fixture unlock review');
const full = run(
  '--unlock-review',
  '--fixture-real-gate-baseline',
  '--fixture-unlock-contract',
  '--fixture-unlock-authority',
  '--fixture-unlock-binding',
);
assert(full !== null,                                                                      '[B-01] harness returns output');
assert(full.unlock_review_enabled        === true,                                        '[B-02] unlock_review_enabled=true');
assert(full.unlock_contract_ready        === true,                                        '[B-03] unlock_contract_ready=true');
assert(full.unlock_authority_ready       === true,                                        '[B-04] unlock_authority_ready=true');
assert(full.unlock_binding_ready         === true,                                        '[B-05] unlock_binding_ready=true');
assert(full.unlock_review_ready          === true,                                        '[B-06] unlock_review_ready=true');
assert(full.unlock_evidence_package_ready === true,                                       '[B-07] evidence_package_ready=true');
assert(full.unlock_executed              === false,                                        '[B-08] unlock_executed=false');
assert(full.production_execution_locked  === true,                                        '[B-09] production_execution_locked=true');
assert(full.future_execution_phase_required === true,                                     '[B-10] future_exec=true');

// ─── Suite C: Ledger events ───────────────────────────────────────
console.log('\n[Suite C] Ledger events');
const ledger = run(
  '--unlock-review',
  '--fixture-real-gate-baseline',
  '--fixture-unlock-contract',
  '--fixture-unlock-authority',
  '--fixture-unlock-binding',
  '--ledger-unlock-review',
);
assert(ledger !== null,                                                                    '[C-01] harness returns output');
assert(ledger.unlock_review_enabled      === true,                                        '[C-02] unlock_review_enabled=true');
assert(Array.isArray(ledger.unlock_review_ledger_event_ids),                              '[C-03] ledger_events is array');
assert(ledger.unlock_review_ledger_event_ids.length === 5,                                '[C-04] 5 ledger events');
assert(ledger.unlock_executed            === false,                                        '[C-05] unlock_executed=false');
assert(ledger.production_execution_locked === true,                                        '[C-06] production_execution_locked=true');

// ─── Suite D: Execution flags false always ────────────────────────
console.log('\n[Suite D] Execution flags false');
const cases = [def, full, ledger];
for (const [i, o] of cases.entries()) {
  if (!o) { failed++; console.error(`  ✗ case ${i} null`); continue; }
  assert(o.deploy_allowed            !== true,  `[D] case ${i}: deploy_allowed≠true`);
  assert(o.promotion_allowed         !== true,  `[D] case ${i}: promotion_allowed≠true`);
  assert(o.stable_allowed            !== true,  `[D] case ${i}: stable_allowed≠true`);
  assert(o.tag_allowed               !== true,  `[D] case ${i}: tag_allowed≠true`);
  assert(o.unlock_executed           === false, `[D] case ${i}: unlock_executed=false`);
  assert(o.production_execution_locked === true,`[D] case ${i}: production_execution_locked=true`);
  assert(o.unlock_review_only        === true,  `[D] case ${i}: unlock_review_only=true`);
  assert(o.future_execution_phase_required === true, `[D] case ${i}: future_exec=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npi-harness-unlock-review: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
