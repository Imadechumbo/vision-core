#!/usr/bin/env node
/**
 * PASS GOLD Runtime Evidence Binding — Unit Tests V21.4
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  evaluatePassGoldRuntimeBinding,
  PASSGOLD_RUNTIME_STATUSES,
} from '../pass-gold-runtime-binding.mjs';

const CLI = resolve(process.cwd(), 'tools', 'pass-gold-runtime-binding.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Valid fixtures
const validEvidence = {
  runtime_evidence_ready: true,
  backend_alive:          true,
  backend_stub:           false,
  mission_id:             'msn_binding_001',
  evidence_receipt_id:    'rcpt_binding_001',
  evidence_source:        'go-core',
};
const validReceipt = {
  receipt_valid:   true,
  receipt_status:  'RECEIPT_VALID',
  source:          'go-core',
  receipt_id:      'rcpt_binding_001',
};
const validAuthority = { authority_valid: true };
const validTests     = true;

function makeFullValid() {
  return {
    runtime_evidence:  validEvidence,
    go_core_receipt:   validReceipt,
    authority_binding: validAuthority,
    tests_verified:    validTests,
  };
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PASSGOLD_RUNTIME_STATUSES),                         '[A-01] statuses is array');
assert(PASSGOLD_RUNTIME_STATUSES.length === 5,                           '[A-02] 5 statuses');
assert(PASSGOLD_RUNTIME_STATUSES.includes('PASSGOLD_RUNTIME_READY'),         '[A-03] READY present');
assert(PASSGOLD_RUNTIME_STATUSES.includes('PASSGOLD_RUNTIME_BLOCKED_EVIDENCE'),  '[A-04] BLOCKED_EVIDENCE');
assert(PASSGOLD_RUNTIME_STATUSES.includes('PASSGOLD_RUNTIME_BLOCKED_RECEIPT'),   '[A-05] BLOCKED_RECEIPT');
assert(PASSGOLD_RUNTIME_STATUSES.includes('PASSGOLD_RUNTIME_BLOCKED_AUTHORITY'), '[A-06] BLOCKED_AUTHORITY');
assert(PASSGOLD_RUNTIME_STATUSES.includes('PASSGOLD_RUNTIME_BLOCKED_TESTS'),     '[A-07] BLOCKED_TESTS');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const emptyResult = evaluatePassGoldRuntimeBinding({});
const readyResult = evaluatePassGoldRuntimeBinding(makeFullValid());
assert(emptyResult.deploy_allowed    === false, '[B-01] deploy=false (empty)');
assert(emptyResult.promotion_allowed === false, '[B-02] promotion=false (empty)');
assert(emptyResult.stable_allowed    === false, '[B-03] stable=false (empty)');
assert(readyResult.deploy_allowed    === false, '[B-04] deploy=false (READY)');
assert(readyResult.promotion_allowed === false, '[B-05] promotion=false (READY)');
assert(readyResult.stable_allowed    === false, '[B-06] stable=false (READY)');

// ─── Suite C: Missing evidence → BLOCKED_EVIDENCE ────────────────
console.log('\n[Suite C] Missing evidence');
const noEvidence = evaluatePassGoldRuntimeBinding({ go_core_receipt: validReceipt, authority_binding: validAuthority, tests_verified: true });
assert(noEvidence.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_EVIDENCE', '[C-01] null evidence → BLOCKED_EVIDENCE');
assert(noEvidence.pass_gold_candidate_allowed      === false,                               '[C-02] candidate_allowed=false');

const stubEvidence = evaluatePassGoldRuntimeBinding({
  runtime_evidence: { ...validEvidence, backend_stub: true },
  go_core_receipt: validReceipt, authority_binding: validAuthority, tests_verified: true,
});
assert(stubEvidence.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_EVIDENCE', '[C-03] stub evidence → BLOCKED_EVIDENCE');

const notReadyEvidence = evaluatePassGoldRuntimeBinding({
  runtime_evidence: { ...validEvidence, runtime_evidence_ready: false },
  go_core_receipt: validReceipt, authority_binding: validAuthority, tests_verified: true,
});
assert(notReadyEvidence.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_EVIDENCE', '[C-04] not_ready evidence → BLOCKED_EVIDENCE');

// ─── Suite D: Invalid receipt → BLOCKED_RECEIPT ───────────────────
console.log('\n[Suite D] Invalid receipt');
const noReceipt = evaluatePassGoldRuntimeBinding({
  runtime_evidence: validEvidence, go_core_receipt: null, authority_binding: validAuthority, tests_verified: true,
});
assert(noReceipt.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_RECEIPT', '[D-01] null receipt → BLOCKED_RECEIPT');
assert(noReceipt.pass_gold_candidate_allowed      === false,                              '[D-02] candidate_allowed=false');

const invalidReceipt = evaluatePassGoldRuntimeBinding({
  runtime_evidence: validEvidence,
  go_core_receipt: { ...validReceipt, receipt_valid: false },
  authority_binding: validAuthority, tests_verified: true,
});
assert(invalidReceipt.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_RECEIPT', '[D-03] invalid receipt → BLOCKED_RECEIPT');

const backendReceipt = evaluatePassGoldRuntimeBinding({
  runtime_evidence: validEvidence,
  go_core_receipt: { ...validReceipt, source: 'backend' },
  authority_binding: validAuthority, tests_verified: true,
});
assert(backendReceipt.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_RECEIPT', '[D-04] backend source → BLOCKED_RECEIPT');

// ─── Suite E: Missing authority → BLOCKED_AUTHORITY ──────────────
console.log('\n[Suite E] Missing authority');
const noAuthority = evaluatePassGoldRuntimeBinding({
  runtime_evidence: validEvidence, go_core_receipt: validReceipt, authority_binding: null, tests_verified: true,
});
assert(noAuthority.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_AUTHORITY', '[E-01] null authority → BLOCKED_AUTHORITY');
assert(noAuthority.pass_gold_candidate_allowed      === false,                                '[E-02] candidate_allowed=false');

const invalidAuthority = evaluatePassGoldRuntimeBinding({
  runtime_evidence: validEvidence, go_core_receipt: validReceipt,
  authority_binding: { authority_valid: false }, tests_verified: true,
});
assert(invalidAuthority.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_AUTHORITY', '[E-03] invalid authority → BLOCKED_AUTHORITY');

// ─── Suite F: Tests not verified → BLOCKED_TESTS ─────────────────
console.log('\n[Suite F] Tests not verified');
const noTests = evaluatePassGoldRuntimeBinding({
  runtime_evidence: validEvidence, go_core_receipt: validReceipt,
  authority_binding: validAuthority, tests_verified: false,
});
assert(noTests.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_BLOCKED_TESTS', '[F-01] tests=false → BLOCKED_TESTS');
assert(noTests.pass_gold_candidate_allowed      === false,                            '[F-02] candidate_allowed=false');

// ─── Suite G: Full valid → PASSGOLD_RUNTIME_READY ────────────────
console.log('\n[Suite G] Full valid chain');
assert(readyResult.pass_gold_runtime_binding_status === 'PASSGOLD_RUNTIME_READY', '[G-01] status=READY');
assert(readyResult.pass_gold_runtime_binding_valid  === true,                     '[G-02] binding_valid=true');
assert(readyResult.pass_gold_candidate_allowed      === true,                     '[G-03] candidate_allowed=true');
assert(readyResult.runtime_evidence_ready           === true,                     '[G-04] evidence_ready=true');
assert(readyResult.go_core_receipt_valid            === true,                     '[G-05] receipt_valid=true');
assert(readyResult.authority_binding_valid          === true,                     '[G-06] authority_valid=true');
assert(readyResult.tests_verified                   === true,                     '[G-07] tests_verified=true');
assert(readyResult.mission_id                       === 'msn_binding_001',        '[G-08] mission_id echoed');
assert(readyResult.evidence_receipt_id              === 'rcpt_binding_001',       '[G-09] receipt_id echoed');
assert(readyResult.evidence_source                  === 'go-core',                '[G-10] source=go-core');
assert(readyResult.deploy_allowed                   === false,                    '[G-11] READY deploy=false');
assert(readyResult.promotion_allowed                === false,                    '[G-12] READY promotion=false');
assert(readyResult.stable_allowed                   === false,                    '[G-13] READY stable=false');

// ─── Suite H: CLI ─────────────────────────────────────────────────
console.log('\n[Suite H] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                               '[H-01] CLI exit 1 (no input)');
assert(cliDefault.stdout.includes('BLOCKED'),                   '[H-02] stdout BLOCKED');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 1,                                  '[H-03] --json exit 1');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                         '[H-04] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,            '[H-05] deploy=false');
assert(parsed && parsed.promotion_allowed === false,            '[H-06] promotion=false');

// ─── Suite I: Schema ──────────────────────────────────────────────
console.log('\n[Suite I] Schema');
assert(emptyResult.schema_version === 'v21.4', '[I-01] schema=v21.4 (blocked)');
assert(readyResult.schema_version === 'v21.4', '[I-02] schema=v21.4 (ready)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\npass-gold-runtime-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
