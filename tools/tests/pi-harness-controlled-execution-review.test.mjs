#!/usr/bin/env node
/**
 * PI Harness — Controlled Execution Review Mode V68.1 Tests
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HARNESS   = join(__dirname, '..', 'pi-harness.mjs');

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function runHarness(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', HARNESS, '--mode', 'interactive', '--dry-run', '--json', ...args], {
    encoding: 'utf8',
    timeout:  30000,
    cwd:      join(__dirname, '../..'),
  });
  let out = {};
  try { out = JSON.parse(r.stdout); } catch (_) {}
  return { out, code: r.status, stderr: r.stderr };
}

// ─── Suite A: Default — controlled execution review disabled ───────
console.log('\n[Suite A] Default — controlled execution review disabled');
const { out: defaultOut } = runHarness([]);
assert(defaultOut.controlled_execution_review_enabled === false,                       '[A-01] disabled by default');
assert(defaultOut.controlled_execution_review_ready   === false,                       '[A-02] review_ready=false by default');
assert(defaultOut.controlled_execution_allowed        === false,                       '[A-03] controlled_exec=false by default');
assert(defaultOut.production_execution_locked         === true,                        '[A-04] locked=true by default');
assert(defaultOut.final_execution_phase_required      === true,                        '[A-05] final_exec=true by default');
assert(defaultOut.release_execution_allowed           === false,                       '[A-06] release_exec=false by default');
assert(defaultOut.release_performed                   === false,                       '[A-07] release_performed=false');
assert(defaultOut.tag_created                         === false,                       '[A-08] tag_created=false');
assert(defaultOut.stable_promoted                     === false,                       '[A-09] stable_promoted=false');
assert(defaultOut.deploy_performed                    === false,                       '[A-10] deploy_performed=false');

// ─── Suite B: Full fixture controlled review ready ──────────────
console.log('\n[Suite B] Full fixture controlled review');
const { out: fullOut } = runHarness([
  '--controlled-execution-review',
  '--fixture-unlock-governance-baseline',
  '--fixture-controlled-contract',
  '--fixture-controlled-authority',
  '--fixture-controlled-binding',
]);
assert(fullOut.controlled_execution_review_enabled === true,                           '[B-01] enabled');
assert(fullOut.controlled_contract_status  === 'CONTROLLED_CONTRACT_READY_REVIEW',    '[B-02] contract=READY_REVIEW');
assert(fullOut.controlled_authority_status === 'CONTROLLED_AUTHORITY_READY_REVIEW',   '[B-03] authority=READY_REVIEW');
assert(fullOut.controlled_binding_status   === 'CONTROLLED_BINDING_READY_REVIEW',     '[B-04] binding=READY_REVIEW');
assert(fullOut.controlled_risk_status      === 'CONTROLLED_RISK_READY_REVIEW',        '[B-05] risk=READY_REVIEW');
assert(fullOut.controlled_evidence_package_status === 'CONTROLLED_EVIDENCE_READY_REVIEW', '[B-06] evidence=READY_REVIEW');
assert(fullOut.controlled_execution_review_ready  === true,                            '[B-07] review_ready=true');

// ─── Suite C: Ledger events ─────────────────────────────────────
console.log('\n[Suite C] Ledger events');
const { out: ledgerOut } = runHarness([
  '--controlled-execution-review',
  '--fixture-unlock-governance-baseline',
  '--fixture-controlled-contract',
  '--fixture-controlled-authority',
  '--fixture-controlled-binding',
  '--ledger-controlled-execution',
]);
assert(Array.isArray(ledgerOut.controlled_execution_ledger_event_ids),                '[C-01] ledger_event_ids array');
assert(ledgerOut.controlled_execution_ledger_event_ids.length === 5,                  '[C-02] 5 ledger events');
assert(ledgerOut.controlled_execution_review_ready === true,                           '[C-03] review_ready=true with ledger');

// ─── Suite D: Invariants ─────────────────────────────────────────
console.log('\n[Suite D] Invariants');
assert(fullOut.production_execution_locked     === true,  '[D-01] locked=true');
assert(fullOut.final_execution_phase_required  === true,  '[D-02] final_exec=true');
assert(fullOut.unlock_executed                 === false, '[D-03] unlock_executed=false');
assert(fullOut.controlled_execution_allowed    === false, '[D-04] controlled_exec=false');
assert(fullOut.release_execution_allowed       === false, '[D-05] release_exec=false');
assert(fullOut.release_performed               === false, '[D-06] release_performed=false');
assert(fullOut.tag_created                     === false, '[D-07] tag_created=false');
assert(fullOut.stable_promoted                 === false, '[D-08] stable_promoted=false');
assert(fullOut.deploy_performed                === false, '[D-09] deploy_performed=false');
assert(fullOut.deploy_allowed                  === false, '[D-10] deploy_allowed=false');
assert(fullOut.promotion_allowed               === false, '[D-11] promotion_allowed=false');
assert(fullOut.controlled_execution_allowed    !== true,  '[D-12] controlled_execution_allowed!==true');
assert(fullOut.controlled_execution_review_ready === true, '[D-13] READY does not grant exec');

assert(ledgerOut.production_execution_locked    === true,  '[D-14] ledger: locked=true');
assert(ledgerOut.controlled_execution_allowed   === false, '[D-15] ledger: controlled_exec=false');
assert(ledgerOut.final_execution_phase_required === true,  '[D-16] ledger: final_exec=true');

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\npi-harness-controlled-execution-review: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
