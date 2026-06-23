#!/usr/bin/env node
/**
 * Tests — Stable Promotion Human Approval Binding V116.1
 */

import {
  bindStablePromotionHumanApproval,
  validateStablePromotionHumanApprovalBinding,
  renderStablePromotionHumanApprovalBinding,
  HUMAN_APPROVAL_BINDING_STATUSES,
  REQUIRED_APPROVAL_PHRASE,
} from '../stable-promotion-human-approval-binding.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_CONTRACT = { contract_ready: true, contract_id: 'contract-001' };
const GOOD_PARAMS = {
  stable_promotion_contract: GOOD_CONTRACT,
  human_approval_phrase:     REQUIRED_APPROVAL_PHRASE,
  approved_by:               'human-001',
  approval_decision:         'approved',
};

console.log('\n=== stable-promotion-human-approval-binding tests ===\n');

console.log('--- missing contract ---');
{
  const r = bindStablePromotionHumanApproval({ ...GOOD_PARAMS, stable_promotion_contract: null });
  assert(r.binding_status === 'HUMAN_APPROVAL_BINDING_BLOCKED_CONTRACT', 'null contract → BLOCKED_CONTRACT');
  assert(r.binding_ready === false, 'binding_ready false');
}

console.log('--- contract not ready ---');
{
  const r = bindStablePromotionHumanApproval({ ...GOOD_PARAMS, stable_promotion_contract: { contract_ready: false } });
  assert(r.binding_status === 'HUMAN_APPROVAL_BINDING_BLOCKED_CONTRACT', 'not-ready → BLOCKED_CONTRACT');
}

console.log('--- rejected ---');
{
  const r = bindStablePromotionHumanApproval({ ...GOOD_PARAMS, approval_decision: 'rejected' });
  assert(r.binding_status === 'HUMAN_APPROVAL_BINDING_REJECTED', 'rejected → REJECTED');
  assert(r.binding_ready === false, 'binding_ready false');
}

console.log('--- wrong phrase ---');
{
  const r = bindStablePromotionHumanApproval({ ...GOOD_PARAMS, human_approval_phrase: 'wrong' });
  assert(r.binding_status === 'HUMAN_APPROVAL_BINDING_PHRASE_MISMATCH', 'wrong phrase → PHRASE_MISMATCH');
}

console.log('--- expired ---');
{
  const r = bindStablePromotionHumanApproval({ ...GOOD_PARAMS, expired: true });
  assert(r.binding_status === 'HUMAN_APPROVAL_BINDING_EXPIRED', 'expired → EXPIRED');
}

console.log('--- ready ---');
{
  const r = bindStablePromotionHumanApproval(GOOD_PARAMS);
  assert(r.binding_status === 'HUMAN_APPROVAL_BINDING_READY', 'ready status');
  assert(r.binding_ready === true, 'binding_ready true');
  assert(r.human_approval_bound === true, 'human_approval_bound true');
  assert(r.approval_phrase_verified === true, 'phrase verified');
  assert(r.approval_decision === 'approved', 'decision approved');
  assert(r.contract_id === 'contract-001', 'contract_id propagated');
  assert(r.schema_version === 'v116.1', 'schema version');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = bindStablePromotionHumanApproval({ ...GOOD_PARAMS, stable_promotion_contract: null });
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = bindStablePromotionHumanApproval(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{ assert(bindStablePromotionHumanApproval(GOOD_PARAMS).stable_promoted === false, 'stable_promoted=false'); }

console.log('--- git_push_performed=false ---');
{ assert(bindStablePromotionHumanApproval(GOOD_PARAMS).git_push_performed === false, 'git_push_performed=false'); }

console.log('--- deploy_performed=false ---');
{ assert(bindStablePromotionHumanApproval(GOOD_PARAMS).deploy_performed === false, 'deploy_performed=false'); }

console.log('--- release_performed=false ---');
{ assert(bindStablePromotionHumanApproval(GOOD_PARAMS).release_performed === false, 'release_performed=false'); }

console.log('--- validate ---');
{
  const r = bindStablePromotionHumanApproval(GOOD_PARAMS);
  const v = validateStablePromotionHumanApprovalBinding(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- render ready ---');
{
  const txt = renderStablePromotionHumanApprovalBinding(bindStablePromotionHumanApproval(GOOD_PARAMS));
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION HUMAN APPROVAL BINDING'), 'render title');
}

console.log('--- render blocked ---');
{
  const txt = renderStablePromotionHumanApprovalBinding(bindStablePromotionHumanApproval({ ...GOOD_PARAMS, stable_promotion_contract: null }));
  assert(txt.includes('HUMAN APPROVAL BINDING BLOCKED'), 'render blocked');
}

console.log('--- required phrase export ---');
{
  assert(REQUIRED_APPROVAL_PHRASE.includes('STABLE PROMOTION REVIEW ONLY'), 'phrase correct');
}

console.log('--- statuses export ---');
{
  assert(HUMAN_APPROVAL_BINDING_STATUSES.includes('HUMAN_APPROVAL_BINDING_READY'), 'ready in exports');
  assert(HUMAN_APPROVAL_BINDING_STATUSES.includes('HUMAN_APPROVAL_BINDING_REJECTED'), 'rejected in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
