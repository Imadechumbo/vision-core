#!/usr/bin/env node
/**
 * Go Core Evidence Receipt Generator — Unit Tests V26.3
 */

import { spawnSync }  from 'child_process';
import { resolve }    from 'path';
import {
  generateGoCorEvidenceReceipt,
  RECEIPT_GEN_STATUSES,
} from '../go-core-evidence-receipt-generator.mjs';
import { validateGoCorEvidenceReceipt } from '../go-core-evidence-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'go-core-evidence-receipt-generator.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const VALID_MISSION = 'mission-abc-xyz-2026-real';
const VALID_GIT     = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_GEN_STATUSES),                       '[A-01] RECEIPT_GEN_STATUSES is array');
assert(RECEIPT_GEN_STATUSES.length === 3,                         '[A-02] 3 statuses');
assert(RECEIPT_GEN_STATUSES.includes('RECEIPT_GEN_BLOCKED_MISSION'),   '[A-03] BLOCKED_MISSION present');
assert(RECEIPT_GEN_STATUSES.includes('RECEIPT_GEN_BLOCKED_GIT_HEAD'),  '[A-04] BLOCKED_GIT_HEAD present');
assert(RECEIPT_GEN_STATUSES.includes('RECEIPT_GEN_READY'),             '[A-05] READY present');

// ─── Suite B: Missing mission_id ──────────────────────────────────
console.log('\n[Suite B] Missing mission_id');
{
  const r = generateGoCorEvidenceReceipt({});
  assert(r.receipt_generation_status === 'RECEIPT_GEN_BLOCKED_MISSION', '[B-01] no mission_id → BLOCKED_MISSION');
  assert(r.receipt_valid             === false,                         '[B-02] receipt_valid=false');
  assert(r.deploy_allowed            === false,                         '[B-03] deploy=false');
  assert(r.promotion_allowed         === false,                         '[B-04] promotion=false');
}
{
  const r = generateGoCorEvidenceReceipt({ mission_id: '' });
  assert(r.receipt_generation_status === 'RECEIPT_GEN_BLOCKED_MISSION', '[B-05] empty mission_id → BLOCKED');
}
{
  const r = generateGoCorEvidenceReceipt({ mission_id: null });
  assert(r.receipt_generation_status === 'RECEIPT_GEN_BLOCKED_MISSION', '[B-06] null mission_id → BLOCKED');
}

// ─── Suite C: Missing git_head ────────────────────────────────────
console.log('\n[Suite C] Missing git_head');
{
  const r = generateGoCorEvidenceReceipt({ mission_id: VALID_MISSION });
  assert(r.receipt_generation_status === 'RECEIPT_GEN_BLOCKED_GIT_HEAD', '[C-01] no git_head → BLOCKED_GIT_HEAD');
  assert(r.receipt_valid             === false,                          '[C-02] receipt_valid=false');
  assert(r.deploy_allowed            === false,                          '[C-03] deploy=false');
  assert(r.promotion_allowed         === false,                          '[C-04] promotion=false');
}
{
  const r = generateGoCorEvidenceReceipt({ mission_id: VALID_MISSION, git_head: '' });
  assert(r.receipt_generation_status === 'RECEIPT_GEN_BLOCKED_GIT_HEAD', '[C-05] empty git_head → BLOCKED');
}

// ─── Suite D: RECEIPT_GEN_READY — full valid ─────────────────────
console.log('\n[Suite D] RECEIPT_GEN_READY');
{
  const r = generateGoCorEvidenceReceipt({ mission_id: VALID_MISSION, git_head: VALID_GIT });
  assert(r.receipt_generation_status === 'RECEIPT_GEN_READY', '[D-01] valid → RECEIPT_GEN_READY');
  assert(r.receipt_valid             === true,                '[D-02] receipt_valid=true');
  assert(r.evidence_source           === 'go-core',           '[D-03] source=go-core');
  assert(typeof r.evidence_receipt_id === 'string' && r.evidence_receipt_id.length > 0, '[D-04] receipt_id non-empty');
  assert(r.evidence_receipt_id.startsWith('rcpt_'),          '[D-05] receipt_id prefix rcpt_');
  assert(typeof r.receipt_hash === 'string' && r.receipt_hash.length === 64, '[D-06] hash is 64 char hex');
  assert(r.mission_id                === VALID_MISSION,       '[D-07] mission_id preserved');
  assert(r.deploy_allowed            === false,               '[D-08] deploy=false');
  assert(r.promotion_allowed         === false,               '[D-09] promotion=false');
  assert(r.stable_allowed            === false,               '[D-10] stable=false');
  assert(r.schema_version            === 'v26.3',             '[D-11] schema=v26.3');
}

// ─── Suite E: Deterministic hash ──────────────────────────────────
console.log('\n[Suite E] Deterministic receipt_id');
{
  const opts = { mission_id: VALID_MISSION, git_head: VALID_GIT };
  const r1 = generateGoCorEvidenceReceipt(opts);
  const r2 = generateGoCorEvidenceReceipt(opts);
  // receipt_id is deterministic (derived from mission+git+schema)
  assert(r1.evidence_receipt_id === r2.evidence_receipt_id, '[E-01] receipt_id deterministic same inputs');
  // hash will differ (timestamp in receipt body changes each call)
  // That is expected — the hash covers the full receipt including created_at
  assert(r1.evidence_receipt_id.startsWith('rcpt_'), '[E-02] receipt_id format stable');
}

// ─── Suite F: source always go-core ──────────────────────────────
console.log('\n[Suite F] source=go-core enforced');
{
  const r = generateGoCorEvidenceReceipt({ mission_id: VALID_MISSION, git_head: VALID_GIT });
  assert(r.evidence_source === 'go-core', '[F-01] evidence_source=go-core');
  // Verify inner receipt also has source=go-core
  assert(r.receipt?.source === 'go-core', '[F-02] receipt.source=go-core');
}

// ─── Suite G: Contract validates generated receipt ────────────────
console.log('\n[Suite G] Contract validates generated receipt');
{
  const r = generateGoCorEvidenceReceipt({ mission_id: VALID_MISSION, git_head: VALID_GIT });
  const validation = validateGoCorEvidenceReceipt(r.receipt);
  assert(validation.receipt_status === 'RECEIPT_VALID',  '[G-01] contract validates receipt');
  assert(validation.receipt_valid  === true,             '[G-02] receipt_valid=true');
  assert(validation.hash_verified  === true,             '[G-03] hash_verified=true');
  assert(validation.source         === 'go-core',        '[G-04] source=go-core in validation');
  assert(validation.deploy_allowed === false,            '[G-05] deploy=false in validation');
}

// ─── Suite H: Custom fields ───────────────────────────────────────
console.log('\n[Suite H] Custom fields');
{
  const r = generateGoCorEvidenceReceipt({
    mission_id:       VALID_MISSION,
    git_head:         VALID_GIT,
    validator_status: 'PASS_STRICT',
    pass_gold_status: 'CANDIDATE',
    security_status:  'SCANNED',
    runtime_status:   'LIVE_VERIFIED',
  });
  assert(r.receipt_generation_status === 'RECEIPT_GEN_READY', '[H-01] custom fields → READY');
  assert(r.receipt?.validator_status === 'PASS_STRICT',       '[H-02] validator_status preserved');
  assert(r.receipt?.pass_gold_status === 'CANDIDATE',         '[H-03] pass_gold_status preserved');
  assert(r.receipt?.security_status  === 'SCANNED',           '[H-04] security_status preserved');
  assert(r.receipt?.runtime_status   === 'LIVE_VERIFIED',     '[H-05] runtime_status preserved');
}

// ─── Suite I: Invariants ─────────────────────────────────────────
console.log('\n[Suite I] Invariants');
{
  const cases = [
    {},
    { mission_id: VALID_MISSION },
    { mission_id: VALID_MISSION, git_head: VALID_GIT },
  ];
  for (let i = 0; i < cases.length; i++) {
    const r = generateGoCorEvidenceReceipt(cases[i]);
    assert(r.deploy_allowed    === false, `[I-0${i+1}] case ${i+1} deploy=false`);
    assert(r.promotion_allowed === false, `[I-0${i+1}b] case ${i+1} promotion=false`);
  }
}

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI');
{
  // No args → BLOCKED_MISSION
  const r = runCLI(['--json']);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed !== null,                                                  '[J-01] JSON parseable');
  assert(parsed?.receipt_generation_status === 'RECEIPT_GEN_BLOCKED_MISSION', '[J-02] no args → BLOCKED_MISSION');
  assert(parsed?.deploy_allowed            === false,                     '[J-03] deploy=false');
  assert(r.exitCode                        === 1,                         '[J-04] exit 1');
}
{
  // Valid args → RECEIPT_GEN_READY
  const r = runCLI(['--mission-id', VALID_MISSION, '--git-head', VALID_GIT, '--json']);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch {}
  assert(parsed !== null,                                                '[J-05] JSON parseable');
  assert(parsed?.receipt_generation_status === 'RECEIPT_GEN_READY',    '[J-06] valid → RECEIPT_GEN_READY');
  assert(parsed?.evidence_source           === 'go-core',               '[J-07] source=go-core in CLI output');
  assert(parsed?.receipt_valid             === true,                    '[J-08] receipt_valid=true');
  assert(r.exitCode                        === 0,                       '[J-09] exit 0');
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ngo-core-evidence-receipt-generator: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
