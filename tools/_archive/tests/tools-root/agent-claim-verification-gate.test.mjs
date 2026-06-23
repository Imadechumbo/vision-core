#!/usr/bin/env node
/**
 * Tests — Agent Claim Verification Gate V146.0
 */

import {
  verifyAgentClaim,
  validateClaimVerification,
  renderClaimVerification,
  CLAIM_VERIFICATION_STATUSES,
  CLAIM_TYPES,
} from '../agent-claim-verification-gate.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

console.log('\n=== agent-claim-verification-gate tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = verifyAgentClaim({});
  assert('no claim_id → CLAIM_BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
  assert('claim_verified=false', r.claim_verified === false);
  assert('agent_claim_trusted=false', r.agent_claim_trusted === false);
  assert('hallucination_risk=true', r.hallucination_risk === true);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = verifyAgentClaim(null);
  assert('null params → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}
{
  const r = verifyAgentClaim({ claim_id: 'c1', claim_type: 'UNKNOWN_TYPE' });
  assert('bad claim_type → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}

// --- FILE_CREATED ---
console.log('--- FILE_CREATED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-fc-1',
    claim_type: 'FILE_CREATED',
    claimed_files: ['tools/foo.mjs'],
    local_observation: { file_exists: { 'tools/foo.mjs': false } },
  });
  assert('file missing → CLAIM_BLOCKED_MISSING_FILE', r.claim_status === 'CLAIM_BLOCKED_MISSING_FILE');
  assert('hallucination_risk=true', r.hallucination_risk === true);
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-fc-2',
    claim_type: 'FILE_CREATED',
    claimed_files: ['tools/foo.mjs'],
    local_observation: { file_exists: { 'tools/foo.mjs': true } },
  });
  assert('file exists → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
  assert('agent_claim_trusted=true', r.agent_claim_trusted === true);
  assert('verified_proofs includes file_exists', r.verified_proofs.includes('file_exists'));
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-fc-3',
    claim_type: 'FILE_CREATED',
    claimed_files: ['tools/a.mjs', 'tools/b.mjs'],
    local_observation: { file_exists: { 'tools/a.mjs': true, 'tools/b.mjs': false } },
  });
  assert('one file missing → BLOCKED_MISSING_FILE', r.claim_status === 'CLAIM_BLOCKED_MISSING_FILE');
}

// --- FILE_MODIFIED ---
console.log('--- FILE_MODIFIED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-fm-1',
    claim_type: 'FILE_MODIFIED',
    expected_diff_files: ['tools/foo.mjs'],
    local_observation: { git_diff_files: [], git_diff_stat: 'empty' },
  });
  assert('diff empty → CLAIM_BLOCKED_MISSING_DIFF', r.claim_status === 'CLAIM_BLOCKED_MISSING_DIFF');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-fm-2',
    claim_type: 'FILE_MODIFIED',
    expected_diff_files: ['tools/foo.mjs'],
    local_observation: { git_diff_files: ['tools/foo.mjs'] },
  });
  assert('diff matches → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
  assert('verified_proofs has git_diff_files', r.verified_proofs.includes('git_diff_files'));
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-fm-3',
    claim_type: 'FILE_MODIFIED',
    expected_diff_files: ['tools/foo.mjs'],
    local_observation: { git_diff_files: ['tools/bar.mjs'] },
  });
  assert('claimed file not in diff → BLOCKED_MISSING_DIFF', r.claim_status === 'CLAIM_BLOCKED_MISSING_DIFF');
}

// --- TEST_EXECUTED ---
console.log('--- TEST_EXECUTED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-te-1',
    claim_type: 'TEST_EXECUTED',
    expected_test_command: 'npm run test:foo',
    local_observation: {},
  });
  assert('no exit_code → CLAIM_BLOCKED_TEST_NOT_RUN', r.claim_status === 'CLAIM_BLOCKED_TEST_NOT_RUN');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-te-2',
    claim_type: 'TEST_EXECUTED',
    expected_test_command: 'npm run test:foo',
    expected_exit_code: 0,
    local_observation: { exit_code: 1 },
  });
  assert('exit_code mismatch → CLAIM_BLOCKED_EXIT_CODE', r.claim_status === 'CLAIM_BLOCKED_EXIT_CODE');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-te-3',
    claim_type: 'TEST_EXECUTED',
    expected_test_command: 'npm run test:foo',
    expected_exit_code: 0,
    local_observation: { exit_code: 0, output_hash: 'abc123' },
  });
  assert('exit_code=0 → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
  assert('verified includes test_exit_code', r.verified_proofs.includes('test_exit_code'));
  assert('verified includes output_hash', r.verified_proofs.includes('output_hash'));
}

// --- COMMIT_CREATED ---
console.log('--- COMMIT_CREATED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-cc-1',
    claim_type: 'COMMIT_CREATED',
    expected_commit_hash: 'abc123',
    local_observation: {},
  });
  assert('no commit hash → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-cc-2',
    claim_type: 'COMMIT_CREATED',
    expected_commit_hash: 'abc123',
    local_observation: { commit_hash: 'def456' },
  });
  assert('hash mismatch → CLAIM_HALLUCINATION_RISK', r.claim_status === 'CLAIM_HALLUCINATION_RISK');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-cc-3',
    claim_type: 'COMMIT_CREATED',
    expected_commit_hash: 'abc123',
    local_observation: { commit_hash: 'abc123' },
  });
  assert('commit hash matches → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
}

// --- PR_CREATED ---
console.log('--- PR_CREATED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-pr-1',
    claim_type: 'PR_CREATED',
    expected_pr_number: 42,
    local_observation: {},
  });
  assert('no pr_number → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-pr-2',
    claim_type: 'PR_CREATED',
    expected_pr_number: 42,
    local_observation: { pr_number: 42 },
  });
  assert('pr_number present → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
}

// --- PR_MERGED ---
console.log('--- PR_MERGED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-pm-1',
    claim_type: 'PR_MERGED',
    expected_pr_number: 42,
    local_observation: { pr_number: 42, pr_state: 'OPEN' },
  });
  assert('pr not merged → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-pm-2',
    claim_type: 'PR_MERGED',
    expected_pr_number: 42,
    local_observation: { pr_number: 42, pr_state: 'MERGED' },
  });
  assert('pr merged → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
  assert('verified includes pr_state_merged', r.verified_proofs.includes('pr_state_merged'));
}

// --- SCRIPT_ADDED ---
console.log('--- SCRIPT_ADDED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-sa-1',
    claim_type: 'SCRIPT_ADDED',
    local_observation: { package_script_exists: false },
  });
  assert('script missing → CLAIM_BLOCKED_MISSING_FILE', r.claim_status === 'CLAIM_BLOCKED_MISSING_FILE');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-sa-2',
    claim_type: 'SCRIPT_ADDED',
    local_observation: { package_script_exists: true },
  });
  assert('script exists → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
}

// --- BASELINE_READY ---
console.log('--- BASELINE_READY ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-br-1',
    claim_type: 'BASELINE_READY',
    local_observation: { baseline_valid: false },
  });
  assert('baseline invalid → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-br-2',
    claim_type: 'BASELINE_READY',
    local_observation: { baseline_valid: true },
  });
  assert('baseline valid → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
}

// --- PASS_GOLD_CLAIMED ---
console.log('--- PASS_GOLD_CLAIMED ---');
{
  const r = verifyAgentClaim({
    claim_id: 'c-pg-1',
    claim_type: 'PASS_GOLD_CLAIMED',
    evidence_receipt: null,
  });
  assert('no evidence_receipt → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-pg-2',
    claim_type: 'PASS_GOLD_CLAIMED',
    evidence_receipt: { pass_gold: false, receipt_id: 'r1' },
  });
  assert('pass_gold=false → BLOCKED_NO_PROOF', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-pg-3',
    claim_type: 'PASS_GOLD_CLAIMED',
    evidence_receipt: { pass_gold: true, receipt_id: 'r1' },
  });
  assert('valid receipt → CLAIM_VERIFIED', r.claim_status === 'CLAIM_VERIFIED');
  assert('verified includes evidence_receipt', r.verified_proofs.includes('evidence_receipt'));
}
{
  const r = verifyAgentClaim({
    claim_id: 'c-pg-4',
    claim_type: 'PASS_GOLD_CLAIMED',
    evidence_receipt: { pass_gold: true },
  });
  assert('receipt missing receipt_id → BLOCKED', r.claim_status === 'CLAIM_BLOCKED_NO_PROOF');
}

// --- hallucination risk ---
console.log('--- hallucination risk ---');
{
  const cases = [
    verifyAgentClaim({ claim_id: '', claim_type: 'FILE_CREATED' }),
    verifyAgentClaim({ claim_id: 'x', claim_type: 'FILE_CREATED', claimed_files: ['a'], local_observation: { file_exists: { a: false } } }),
    verifyAgentClaim({ claim_id: 'x', claim_type: 'TEST_EXECUTED', expected_test_command: 'npm run t', local_observation: {} }),
  ];
  for (const r of cases) {
    assert(`hallucination_risk=true [${r.claim_status}]`, r.hallucination_risk === true);
    assert(`agent_claim_trusted=false [${r.claim_status}]`, r.agent_claim_trusted === false);
  }
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    verifyAgentClaim({}),
    verifyAgentClaim({ claim_id: 'c1', claim_type: 'FILE_CREATED', claimed_files: ['f'], local_observation: { file_exists: { f: true } } }),
    verifyAgentClaim({ claim_id: 'c2', claim_type: 'COMMIT_CREATED', expected_commit_hash: 'h', local_observation: { commit_hash: 'h' } }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.claim_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.claim_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.claim_status}]`, r.release_performed === false);
  }
}

// --- deterministic ID ---
console.log('--- deterministic ID ---');
{
  const p = { claim_id: 'det-1', claim_type: 'FILE_CREATED', claimed_files: ['f'], local_observation: { file_exists: { f: true } } };
  const r1 = verifyAgentClaim(p);
  const r2 = verifyAgentClaim(p);
  assert('claim_verification_id deterministic', r1.claim_verification_id === r2.claim_verification_id);
  assert('claim_verification_id sha256', /^[a-f0-9]{64}$/.test(r1.claim_verification_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = verifyAgentClaim({ claim_id: 'c1', claim_type: 'FILE_CREATED', claimed_files: ['f'], local_observation: { file_exists: { f: true } } });
  const v = validateClaimVerification(r);
  assert('validate verified → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = verifyAgentClaim({});
  const v = validateClaimVerification(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  const v = validateClaimVerification(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = verifyAgentClaim({ claim_id: 'c1', claim_type: 'FILE_CREATED', claimed_files: ['f'], local_observation: { file_exists: { f: true } } });
  const s = renderClaimVerification(r);
  assert('render string', typeof s === 'string');
  assert('render shows CLAIM_VERIFIED', s.includes('CLAIM_VERIFIED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = verifyAgentClaim({});
  const s = renderClaimVerification(r);
  assert('render blocked', s.includes('CLAIM_BLOCKED_NO_PROOF'));
}
{
  assert('render null graceful', typeof renderClaimVerification(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('CLAIM_VERIFICATION_STATUSES is array', Array.isArray(CLAIM_VERIFICATION_STATUSES));
  assert('CLAIM_VERIFICATION_STATUSES length=7', CLAIM_VERIFICATION_STATUSES.length === 7);
  assert('CLAIM_TYPES is array', Array.isArray(CLAIM_TYPES));
  assert('CLAIM_TYPES length=9', CLAIM_TYPES.length === 9);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
