#!/usr/bin/env node
/**
 * Tests — Stable Review Evidence Binding V111.1
 */

import {
  bindStableReviewEvidence,
  validateStableReviewEvidenceBinding,
  renderStableReviewEvidenceBinding,
  STABLE_REVIEW_BINDING_STATUSES,
} from '../stable-review-evidence-binding.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const GOOD_DRY_CONTRACT = {
  contract_ready:               true,
  contract_status:              'STABLE_REVIEW_CONTRACT_DRY_RUN_REVIEW_READY',
  stable_review_contract_id:    'contract-dry-001',
  one_tag_baseline_id:          'baseline-001',
  target_tag:                   'v8.0.0',
  git_head:                     'cafecafe1234567',
  evidence_receipt_id:          'evidence-001',
  evidence_source:              'go-core',
  rollback_anchor_id:           'rollback-001',
  actual_real_tag_created:      false,
  actual_git_push_performed:    false,
  stable_promotion_allowed:     false,
  stable_promoted:              false,
};

const GOOD_REAL_CONTRACT = {
  ...GOOD_DRY_CONTRACT,
  contract_status:            'STABLE_REVIEW_CONTRACT_REAL_TAG_REVIEW_READY',
  stable_review_contract_id:  'contract-real-001',
  actual_real_tag_created:    true,
  actual_git_push_performed:  true,
};

const GOOD_PARAMS = {
  stable_review_contract: GOOD_DRY_CONTRACT,
  evidence_receipt_id:    'evidence-001',
  evidence_source:        'go-core',
  rollback_anchor_id:     'rollback-001',
  ledger_chain_valid:     true,
  receipt_verified:       false,
};

console.log('\n=== stable-review-evidence-binding tests ===\n');

// missing contract
console.log('--- missing contract ---');
{
  const r = bindStableReviewEvidence({ ...GOOD_PARAMS, stable_review_contract: null });
  assert(r.binding_status === 'STABLE_REVIEW_BINDING_BLOCKED_CONTRACT', 'null contract → BLOCKED_CONTRACT');
  assert(r.binding_ready === false, 'binding_ready false');
}

// contract not ready
console.log('--- contract not ready ---');
{
  const r = bindStableReviewEvidence({
    ...GOOD_PARAMS,
    stable_review_contract: { contract_ready: false },
  });
  assert(r.binding_status === 'STABLE_REVIEW_BINDING_BLOCKED_CONTRACT', 'not-ready → BLOCKED_CONTRACT');
}

// backend evidence blocked
console.log('--- backend evidence blocked ---');
{
  const r1 = bindStableReviewEvidence({ ...GOOD_PARAMS, evidence_source: 'backend' });
  assert(r1.binding_status === 'STABLE_REVIEW_BINDING_BLOCKED_EVIDENCE', 'backend → BLOCKED_EVIDENCE');

  const r2 = bindStableReviewEvidence({ ...GOOD_PARAMS, evidence_receipt_id: null });
  assert(r2.binding_status === 'STABLE_REVIEW_BINDING_BLOCKED_EVIDENCE', 'null receipt → BLOCKED_EVIDENCE');
}

// ledger invalid
console.log('--- ledger invalid ---');
{
  const r = bindStableReviewEvidence({ ...GOOD_PARAMS, ledger_chain_valid: false });
  assert(r.binding_status === 'STABLE_REVIEW_BINDING_BLOCKED_LEDGER', 'invalid ledger → BLOCKED_LEDGER');
}

// dry-run binding ready
console.log('--- dry-run binding ready ---');
{
  const r = bindStableReviewEvidence(GOOD_PARAMS);
  assert(r.binding_status === 'STABLE_REVIEW_BINDING_DRY_RUN_READY', 'dry-run status');
  assert(r.binding_ready === true, 'binding_ready true');
  assert(r.real_tag_confirmed === false, 'real_tag_confirmed false');
  assert(r.dry_run_confirmed === true, 'dry_run_confirmed true');
  assert(r.stable_review_evidence_ready === true, 'stable_review_evidence_ready true');
  assert(r.schema_version === 'v111.1', 'schema version');
}

// real tag binding ready with mock receipt
console.log('--- real tag binding ready with mock receipt ---');
{
  const r = bindStableReviewEvidence({
    ...GOOD_PARAMS,
    stable_review_contract: GOOD_REAL_CONTRACT,
    receipt_verified:       true,
  });
  assert(r.binding_status === 'STABLE_REVIEW_BINDING_REAL_TAG_READY', 'real-tag status');
  assert(r.real_tag_confirmed === true, 'real_tag_confirmed true for mock');
  assert(r.dry_run_confirmed === false, 'dry_run_confirmed false');
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed STILL false');
  assert(r.stable_promoted === false, 'stable_promoted false');
}

// stable_promotion_allowed=false
console.log('--- stable_promotion_allowed=false ---');
{
  const r = bindStableReviewEvidence(GOOD_PARAMS);
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

// stable=false
console.log('--- stable=false ---');
{
  const r = bindStableReviewEvidence(GOOD_PARAMS);
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// deploy=false
console.log('--- deploy=false ---');
{
  const r = bindStableReviewEvidence(GOOD_PARAMS);
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release=false
console.log('--- release=false ---');
{
  const r = bindStableReviewEvidence(GOOD_PARAMS);
  assert(r.release_performed === false, 'release_performed=false');
}

// validate
console.log('--- validate ---');
{
  const r = bindStableReviewEvidence(GOOD_PARAMS);
  const v = validateStableReviewEvidenceBinding(r);
  assert(v.valid === true, 'validate dry-run binding');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = bindStableReviewEvidence(GOOD_PARAMS);
  const txt = renderStableReviewEvidenceBinding(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE REVIEW EVIDENCE BINDING'), 'render includes title');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(STABLE_REVIEW_BINDING_STATUSES.includes('STABLE_REVIEW_BINDING_DRY_RUN_READY'), 'dry-run in exports');
  assert(STABLE_REVIEW_BINDING_STATUSES.includes('STABLE_REVIEW_BINDING_REAL_TAG_READY'), 'real-tag in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
