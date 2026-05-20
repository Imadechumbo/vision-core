#!/usr/bin/env node
/**
 * Tests — Stable Promotion Confirmation Document V127.1
 */

import {
  issueStablePromotionConfirmationDocument,
  validateStablePromotionConfirmationDocument,
  renderStablePromotionConfirmationDocument,
  CONFIRMATION_DOCUMENT_STATUSES,
} from '../stable-promotion-confirmation-document.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_SNAPSHOT = {
  snapshot_ready:         true,
  snapshot_id:            'snapshot-001',
  governance_baseline_id: 'baseline-001',
  import_id:              'import-001',
  execution_receipt_id:   'exec-receipt-001',
  verifier_id:            'verifier-001',
  executed_by:            'human-operator',
  target_stable_ref:      'stable',
  target_tag:             'v127.1-test',
  all_checks_passed:      true,
  content_hash:           'a'.repeat(64),
};

console.log('\n=== stable-promotion-confirmation-document tests ===\n');

console.log('--- null snapshot ---');
{
  const d = issueStablePromotionConfirmationDocument({});
  assert(d.document_status === 'CONFIRMATION_DOCUMENT_BLOCKED_SNAPSHOT', 'null snapshot → BLOCKED_SNAPSHOT');
  assert(d.document_issued === false, 'document_issued false');
}

console.log('--- snapshot not ready ---');
{
  const d = issueStablePromotionConfirmationDocument({
    stable_execution_post_state_snapshot: { snapshot_ready: false },
  });
  assert(d.document_status === 'CONFIRMATION_DOCUMENT_BLOCKED_SNAPSHOT', 'not-ready → BLOCKED_SNAPSHOT');
}

console.log('--- document issued ---');
{
  const d = issueStablePromotionConfirmationDocument({
    stable_execution_post_state_snapshot: GOOD_SNAPSHOT,
    issued_by: 'governance-operator',
    notes: 'test confirmation',
  });
  assert(d.document_status === 'CONFIRMATION_DOCUMENT_ISSUED', 'issued status');
  assert(d.document_issued === true, 'document_issued true');
  assert(typeof d.confirmation_id === 'string' && d.confirmation_id.length === 64, 'confirmation_id sha256');
  assert(d.schema_version === 'v127.1', 'schema version');
  assert(d.snapshot_id === 'snapshot-001', 'snapshot_id propagated');
  assert(d.governance_baseline_id === 'baseline-001', 'governance_baseline_id propagated');
  assert(d.import_id === 'import-001', 'import_id propagated');
  assert(d.execution_receipt_id === 'exec-receipt-001', 'execution_receipt_id propagated');
  assert(d.verifier_id === 'verifier-001', 'verifier_id propagated');
  assert(d.executed_by === 'human-operator', 'executed_by propagated');
  assert(d.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(d.target_tag === 'v127.1-test', 'target_tag propagated');
  assert(d.all_checks_passed === true, 'all_checks_passed propagated');
  assert(d.content_hash === 'a'.repeat(64), 'content_hash propagated');
  assert(d.issued_by === 'governance-operator', 'issued_by');
  assert(d.notes === 'test confirmation', 'notes');
}

console.log('--- document without issued_by and notes ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.document_issued === true, 'issued without optional fields');
  assert(d.issued_by === null, 'issued_by null');
  assert(d.notes === null, 'notes null');
}

console.log('--- confirmation_id deterministic ---');
{
  const d1 = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  const d2 = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d1.confirmation_id === d2.confirmation_id, 'confirmation_id deterministic');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const d1 = issueStablePromotionConfirmationDocument({});
  assert(d1.system_execution_performed === false, 'blocked: false');
  const d2 = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d2.system_execution_performed === false, 'issued: false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.release_performed === false, 'release_performed=false');
}

console.log('--- confirmation_is_human_only=true ---');
{
  const d1 = issueStablePromotionConfirmationDocument({});
  assert(d1.confirmation_is_human_only === true, 'blocked: true');
  const d2 = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d2.confirmation_is_human_only === true, 'issued: true');
}

console.log('--- future_promotion_requires_new_governance_cycle=true ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  assert(d.future_promotion_requires_new_governance_cycle === true, 'future_promotion_requires_new_governance_cycle=true');
}

console.log('--- validate ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT });
  const v = validateStablePromotionConfirmationDocument(d);
  assert(v.valid === true, 'validate issued');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionConfirmationDocument(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render issued ---');
{
  const d = issueStablePromotionConfirmationDocument({ stable_execution_post_state_snapshot: GOOD_SNAPSHOT, issued_by: 'op', notes: 'test' });
  const txt = renderStablePromotionConfirmationDocument(d);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION CONFIRMATION DOCUMENT V127.1'), 'render title');
  assert(txt.includes('CONFIRMATION_DOCUMENT_ISSUED'), 'status in output');
  assert(txt.includes('system_execution_performed:'), 'invariant in output');
  assert(txt.includes('confirmation_is_human_only:'), 'human_only field in output');
  assert(txt.includes('future_promotion_requires_new_governance_cycle:'), 'future cycle field in output');
}

console.log('--- render blocked ---');
{
  const d = issueStablePromotionConfirmationDocument({});
  const txt = renderStablePromotionConfirmationDocument(d);
  assert(txt.includes('CONFIRMATION DOCUMENT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(CONFIRMATION_DOCUMENT_STATUSES.includes('CONFIRMATION_DOCUMENT_ISSUED'), 'issued in statuses');
  assert(CONFIRMATION_DOCUMENT_STATUSES.includes('CONFIRMATION_DOCUMENT_BLOCKED_SNAPSHOT'), 'blocked in statuses');
  assert(CONFIRMATION_DOCUMENT_STATUSES.length === 2, 'exactly 2 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
