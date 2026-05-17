#!/usr/bin/env node
/**
 * PI Harness Runtime Candidate Mode — Unit Tests V37.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';

const CLI = resolve(process.cwd(), 'tools', 'pi-harness.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

function runHarness(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, '--json', '--dry-run', ...args], {
    encoding: 'utf-8',
    timeout: 30000,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout || '{}'); } catch { parsed = null; }
  return { parsed, stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Pre-compute results: default and fixture-runtime-candidate
const def       = runHarness([]);
const candidate = runHarness(['--fixture-runtime-candidate']);

// ─── Suite A: Default mode ────────────────────────────────────────
console.log('\n[Suite A] Default mode (no --runtime-candidate)');
assert(def.parsed !== null,                                                        '[A-01] JSON parseable');
assert(def.parsed?.runtime_candidate_enabled      === false,                       '[A-02] runtime_candidate_enabled=false');
assert(def.parsed?.runtime_pass_gold_status       === 'RUNTIME_PASS_GOLD_NOT_STARTED', '[A-03] status=NOT_STARTED');
assert(def.parsed?.runtime_pass_gold_ready        === false,                       '[A-04] runtime_pass_gold_ready=false');
assert(def.parsed?.runtime_candidate_pass_gold    === false,                       '[A-05] pass_gold=false');
assert(def.parsed?.deploy_allowed                 === false,                       '[A-06] deploy=false');
assert(def.parsed?.promotion_allowed              === false,                       '[A-07] promotion=false');

// ─── Suite B: Fixture runtime candidate mode ──────────────────────
console.log('\n[Suite B] --fixture-runtime-candidate mode');
assert(candidate.parsed !== null,                                                  '[B-01] JSON parseable');
assert(candidate.parsed?.runtime_candidate_enabled === true,                       '[B-02] runtime_candidate_enabled=true');
assert(candidate.parsed?.runtime_pass_gold_status  === 'RUNTIME_PASS_GOLD_CANDIDATE_READY', '[B-03] status=CANDIDATE_READY');
assert(candidate.parsed?.runtime_pass_gold_ready   === true,                       '[B-04] runtime_pass_gold_ready=true');
assert(candidate.parsed?.runtime_candidate_pass_gold === true,                     '[B-05] pass_gold_candidate=true');
assert(candidate.parsed?.runtime_candidate_local_only === true,                    '[B-06] local_only=true');
assert(typeof candidate.parsed?.runtime_candidate_ledger_entry_id === 'string',    '[B-07] ledger_entry_id is string');
assert(candidate.parsed?.runtime_candidate_evidence_source === 'go-core',          '[B-08] evidence_source=go-core');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(def.parsed?.deploy_allowed           === false, '[C-01] deploy=false (default)');
assert(def.parsed?.promotion_allowed        === false, '[C-02] promotion=false (default)');
assert(candidate.parsed?.deploy_allowed     === false, '[C-03] deploy=false (candidate)');
assert(candidate.parsed?.promotion_allowed  === false, '[C-04] promotion=false (candidate)');
// V37.1 fields present in JSON
assert('runtime_candidate_enabled'      in (candidate.parsed ?? {}), '[C-05] field runtime_candidate_enabled present');
assert('runtime_pass_gold_status'       in (candidate.parsed ?? {}), '[C-06] field runtime_pass_gold_status present');
assert('runtime_candidate_pass_gold'    in (candidate.parsed ?? {}), '[C-07] field runtime_candidate_pass_gold present');
assert('runtime_candidate_local_only'   in (candidate.parsed ?? {}), '[C-08] field runtime_candidate_local_only present');
assert('runtime_candidate_ledger_entry_id' in (candidate.parsed ?? {}), '[C-09] field ledger_entry_id present');

// ─── Suite D: Runtime evidence wiring ─────────────────────────────
console.log('\n[Suite D] Runtime evidence wiring');
assert(def.parsed?.runtime_evidence_enabled    === false,                '[D-01] runtime_evidence_enabled=false (default)');
assert(candidate.parsed?.runtime_evidence_enabled === true,              '[D-02] runtime_evidence_enabled=true (candidate)');
assert(candidate.parsed?.runtime_evidence_ready   === true,              '[D-03] runtime_evidence_ready=true (candidate)');
assert(candidate.parsed?.runtime_evidence_status  === 'RUNTIME_EVIDENCE_READY', '[D-04] status=RUNTIME_EVIDENCE_READY');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npi-harness-runtime-candidate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
