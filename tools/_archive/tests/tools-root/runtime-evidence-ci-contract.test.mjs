#!/usr/bin/env node
/**
 * Runtime Evidence CI Contract — Unit Tests V29.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  validateRuntimeEvidenceCIContract,
  CI_CONTRACT_STATUSES,
} from '../runtime-evidence-ci-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'runtime-evidence-ci-contract.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

// Fixtures
const CI_ENV = {
  CI:             'true',
  GITHUB_RUN_ID:  'run-001',
  GITHUB_SHA:     'abc123def456',
  CI_RUNTIME_EVIDENCE_CONTRACT: '1',
};

const VALID_EVIDENCE = {
  runtime_evidence_ready: true,
  backend_alive:          true,
  backend_stub:           false,
  backend_health_ok:      true,
  mission_id:             'msn-ci-001',
  evidence_receipt_id:    'rcpt-ci-001',
  evidence_source:        'go-core',
};

const VALID_RECEIPT = {
  receipt_valid:  true,
  receipt_status: 'RECEIPT_VALID',
  source:         'go-core',
  receipt_id:     'rcpt-ci-001',
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CI_CONTRACT_STATUSES),                              '[A-01] statuses is array');
assert(CI_CONTRACT_STATUSES.length === 5,                                '[A-02] 5 statuses');
assert(CI_CONTRACT_STATUSES.includes('CI_CONTRACT_SKIPPED'),             '[A-03] SKIPPED present');
assert(CI_CONTRACT_STATUSES.includes('CI_CONTRACT_BLOCKED_ENV'),         '[A-04] BLOCKED_ENV present');
assert(CI_CONTRACT_STATUSES.includes('CI_CONTRACT_BLOCKED_STUB'),        '[A-05] BLOCKED_STUB present');
assert(CI_CONTRACT_STATUSES.includes('CI_CONTRACT_BLOCKED_RECEIPT'),     '[A-06] BLOCKED_RECEIPT present');
assert(CI_CONTRACT_STATUSES.includes('CI_CONTRACT_READY'),               '[A-07] READY present');

// ─── Suite B: Invariants — deploy/promotion/stable always false ───
console.log('\n[Suite B] Invariants');
const skippedResult = validateRuntimeEvidenceCIContract({ allow_skip: true });
const blockedResult = validateRuntimeEvidenceCIContract({ enforce: true, env: {} });
const readyResult   = validateRuntimeEvidenceCIContract({ enforce: true, env: CI_ENV });
assert(skippedResult.deploy_allowed    === false, '[B-01] deploy=false (skipped)');
assert(skippedResult.promotion_allowed === false, '[B-02] promotion=false (skipped)');
assert(skippedResult.stable_allowed    === false, '[B-03] stable=false (skipped)');
assert(blockedResult.deploy_allowed    === false, '[B-04] deploy=false (blocked)');
assert(blockedResult.promotion_allowed === false, '[B-05] promotion=false (blocked)');
assert(blockedResult.stable_allowed    === false, '[B-06] stable=false (blocked)');
assert(readyResult.deploy_allowed      === false, '[B-07] deploy=false (ready)');
assert(readyResult.promotion_allowed   === false, '[B-08] promotion=false (ready)');
assert(readyResult.stable_allowed      === false, '[B-09] stable=false (ready)');

// ─── Suite C: Skip behavior ───────────────────────────────────────
console.log('\n[Suite C] Skip behavior');
const noEnforceSkip = validateRuntimeEvidenceCIContract({ allow_skip: true, env: {} });
assert(noEnforceSkip.ci_contract_status  === 'CI_CONTRACT_SKIPPED', '[C-01] no CI → SKIPPED');
assert(noEnforceSkip.ci_contract_skipped === true,                  '[C-02] ci_contract_skipped=true');
assert(noEnforceSkip.ci_contract_valid   === false,                 '[C-03] ci_contract_valid=false in SKIPPED');
assert(noEnforceSkip.schema_version      === 'v29.0',              '[C-04] schema=v29.0');

const ciButNoContract = validateRuntimeEvidenceCIContract({
  allow_skip: true,
  env: { CI: 'true', GITHUB_RUN_ID: 'r1', GITHUB_SHA: 'sha1' },
});
assert(ciButNoContract.ci_contract_status === 'CI_CONTRACT_SKIPPED', '[C-05] CI without contract flag → SKIPPED');

// ─── Suite D: Env blocked ─────────────────────────────────────────
console.log('\n[Suite D] Env blocked');
const noCI = validateRuntimeEvidenceCIContract({ enforce: true, env: {} });
assert(noCI.ci_contract_status   === 'CI_CONTRACT_BLOCKED_ENV', '[D-01] empty env → BLOCKED_ENV');
assert(noCI.ci_contract_valid    === false,                      '[D-02] contract_valid=false');
assert(Array.isArray(noCI.missing_vars),                          '[D-03] missing_vars array');
assert(noCI.missing_vars.length  > 0,                            '[D-04] missing_vars not empty');
assert(noCI.missing_vars.includes('CI'),                          '[D-05] CI in missing_vars');
assert(noCI.missing_vars.includes('GITHUB_RUN_ID'),               '[D-06] GITHUB_RUN_ID in missing_vars');
assert(noCI.missing_vars.includes('GITHUB_SHA'),                  '[D-07] GITHUB_SHA in missing_vars');

const partialEnv = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: { CI: 'true', GITHUB_RUN_ID: 'r1' },
});
assert(partialEnv.ci_contract_status === 'CI_CONTRACT_BLOCKED_ENV', '[D-08] missing SHA → BLOCKED_ENV');
assert(partialEnv.missing_vars.includes('GITHUB_SHA'),              '[D-09] GITHUB_SHA missing');

// ─── Suite E: Stub detection ──────────────────────────────────────
console.log('\n[Suite E] Stub detection');
const stubEvidence = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  runtime_evidence: { ...VALID_EVIDENCE, backend_stub: true },
});
assert(stubEvidence.ci_contract_status === 'CI_CONTRACT_BLOCKED_STUB', '[E-01] backend_stub=true → BLOCKED_STUB');
assert(stubEvidence.stub_detected      === true,                        '[E-02] stub_detected=true');

const fakeValueEvidence = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  runtime_evidence: { ...VALID_EVIDENCE, backend_stub: false, evidence_source: 'fake-source' },
});
assert(fakeValueEvidence.ci_contract_status === 'CI_CONTRACT_BLOCKED_STUB', '[E-03] fake in value → BLOCKED_STUB');

const mockValueEvidence = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  runtime_evidence: { ...VALID_EVIDENCE, backend_stub: false, runtime_status: 'mock-ready' },
});
assert(mockValueEvidence.ci_contract_status === 'CI_CONTRACT_BLOCKED_STUB', '[E-04] mock in value → BLOCKED_STUB');

const stubReceiptId = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  go_core_receipt: { ...VALID_RECEIPT, receipt_id: 'stub-receipt-123' },
});
assert(stubReceiptId.ci_contract_status === 'CI_CONTRACT_BLOCKED_STUB', '[E-05] stub in receipt_id → BLOCKED_STUB');

// mission_id excluded from stub scan — should not trigger stub block
const missionIdWithStubWord = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  runtime_evidence: { ...VALID_EVIDENCE, mission_id: 'stub-mission-for-testing' },
  go_core_receipt: VALID_RECEIPT,
});
assert(missionIdWithStubWord.ci_contract_status !== 'CI_CONTRACT_BLOCKED_STUB', '[E-06] mission_id excluded from stub scan');

// ─── Suite F: Receipt blocked ─────────────────────────────────────
console.log('\n[Suite F] Receipt blocked');
const invalidReceipt = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  go_core_receipt: { ...VALID_RECEIPT, receipt_valid: false },
});
assert(invalidReceipt.ci_contract_status === 'CI_CONTRACT_BLOCKED_RECEIPT', '[F-01] receipt_valid=false → BLOCKED_RECEIPT');

const wrongSourceReceipt = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  go_core_receipt: { ...VALID_RECEIPT, source: 'backend' },
});
assert(wrongSourceReceipt.ci_contract_status === 'CI_CONTRACT_BLOCKED_RECEIPT', '[F-02] source!=go-core → BLOCKED_RECEIPT');

// ─── Suite G: Full valid → CI_CONTRACT_READY ─────────────────────
console.log('\n[Suite G] Full valid');
assert(readyResult.ci_contract_status   === 'CI_CONTRACT_READY', '[G-01] status=CI_CONTRACT_READY');
assert(readyResult.ci_contract_valid    === true,                 '[G-02] ci_contract_valid=true');
assert(readyResult.ci_contract_enforced === true,                 '[G-03] ci_contract_enforced=true');
assert(readyResult.ci_contract_skipped  === false,               '[G-04] ci_contract_skipped=false');
assert(readyResult.missing_vars.length  === 0,                   '[G-05] no missing_vars');
assert(readyResult.stub_detected        === false,               '[G-06] stub_detected=false');
assert(readyResult.schema_version       === 'v29.0',             '[G-07] schema=v29.0');
assert(readyResult.ci_run_id            === 'run-001',           '[G-08] ci_run_id echoed');
assert(readyResult.ci_sha               === 'abc123def456',      '[G-09] ci_sha echoed');

const readyWithEvidence = validateRuntimeEvidenceCIContract({
  enforce: true,
  env: CI_ENV,
  runtime_evidence: VALID_EVIDENCE,
  go_core_receipt:  VALID_RECEIPT,
});
assert(readyWithEvidence.ci_contract_status        === 'CI_CONTRACT_READY', '[G-10] with evidence → READY');
assert(readyWithEvidence.runtime_evidence_present  === true,                '[G-11] runtime_evidence_present=true');
assert(readyWithEvidence.receipt_present           === true,                '[G-12] receipt_present=true');

// ─── Suite H: Auto-detect CI from env ────────────────────────────
console.log('\n[Suite H] Auto-detect');
const autoDetectCI = validateRuntimeEvidenceCIContract({
  enforce: null,
  env: CI_ENV,
});
assert(autoDetectCI.ci_contract_status   === 'CI_CONTRACT_READY', '[H-01] auto-detect CI+contract → READY');
assert(autoDetectCI.ci_contract_enforced === true,                 '[H-02] enforced=true');

const autoDetectNoContract = validateRuntimeEvidenceCIContract({
  enforce: null,
  env: { CI: 'true', GITHUB_RUN_ID: 'r1', GITHUB_SHA: 'sha1' },
});
assert(autoDetectNoContract.ci_contract_status === 'CI_CONTRACT_SKIPPED', '[H-03] CI without contract var → SKIPPED');

const autoDetectNoCI = validateRuntimeEvidenceCIContract({
  enforce: null,
  env: {},
});
assert(autoDetectNoCI.ci_contract_status === 'CI_CONTRACT_SKIPPED', '[H-04] no CI env → SKIPPED');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
// Default: not in CI env during test → SKIPPED → exit 0
assert(cliDefault.exitCode === 0,                            '[I-01] CLI default exit 0 (skipped)');
assert(cliDefault.stdout.includes('ci_contract_status'),     '[I-02] stdout has ci_contract_status');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                               '[I-03] --json exit 0');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                      '[I-04] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false,         '[I-05] JSON deploy=false');
assert(parsed && parsed.promotion_allowed === false,         '[I-06] JSON promotion=false');
assert(parsed && parsed.stable_allowed    === false,         '[I-07] JSON stable=false');

const cliEnforce = runCLI(['--enforce']);
// --enforce with no CI env → BLOCKED_ENV → exit 1
assert(cliEnforce.exitCode === 1,                            '[I-08] --enforce without CI vars → exit 1');
assert(cliEnforce.stdout.includes('BLOCKED'),                '[I-09] --enforce stdout BLOCKED');

// ─── Suite J: Schema ──────────────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(readyResult.schema_version   === 'v29.0', '[J-01] schema=v29.0 (READY)');
assert(skippedResult.schema_version === 'v29.0', '[J-02] schema=v29.0 (SKIPPED)');
assert(blockedResult.schema_version === 'v29.0', '[J-03] schema=v29.0 (BLOCKED)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nruntime-evidence-ci-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
