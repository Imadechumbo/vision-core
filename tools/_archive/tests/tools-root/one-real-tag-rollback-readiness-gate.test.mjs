#!/usr/bin/env node
/**
 * Tests — One Real Tag Rollback Readiness Gate V108.1
 */

import {
  buildOneRealTagRollbackReadinessGate,
  validateOneRealTagRollbackReadinessGate,
  renderOneRealTagRollbackReadinessGate,
  ROLLBACK_READINESS_STATUSES,
} from '../one-real-tag-rollback-readiness-gate.mjs';

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

const DRY_RUN_LEDGER = {
  ledger_valid: true,
  ledger_id:    'ledger-dry-001',
  events: [
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',          index: 0, event_hash: 'h0', prev_hash: 'genesis', ref_id: 'p0', event_id: 'e0' },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED',  index: 1, event_hash: 'h1', prev_hash: 'h0',      ref_id: 'v0', event_id: 'e1' },
  ],
  deploy_performed:  false,
  stable_promoted:   false,
  release_performed: false,
};

const REAL_TAG_LEDGER = {
  ledger_valid: true,
  ledger_id:    'ledger-real-001',
  events: [
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',           index: 0, event_hash: 'r0', prev_hash: 'genesis', ref_id: 'p0', event_id: 'e0' },
    { event_type: 'ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED',  index: 1, event_hash: 'r1', prev_hash: 'r0',      ref_id: 'v0', event_id: 'e1' },
  ],
  deploy_performed:  false,
  stable_promoted:   false,
  release_performed: false,
};

const GOOD_PARAMS = {
  ledger:             DRY_RUN_LEDGER,
  target_tag:         'v5.0.0',
  git_head:           'abcdef1234567',
  rollback_anchor_id: 'rollback-anchor-001',
};

console.log('\n=== one-real-tag-rollback-readiness-gate tests ===\n');

// missing ledger
console.log('--- missing ledger ---');
{
  const r = buildOneRealTagRollbackReadinessGate({ ...GOOD_PARAMS, ledger: null });
  assert(r.rollback_status === 'ROLLBACK_READINESS_BLOCKED_LEDGER', 'null ledger → BLOCKED_LEDGER');
  assert(r.rollback_ready === false, 'rollback_ready false');
  assert(r.rollback_executed === false, 'rollback_executed false');
}

// ledger not valid
console.log('--- ledger not valid ---');
{
  const r = buildOneRealTagRollbackReadinessGate({
    ...GOOD_PARAMS,
    ledger: { ledger_valid: false },
  });
  assert(r.rollback_status === 'ROLLBACK_READINESS_BLOCKED_LEDGER', 'invalid ledger → BLOCKED_LEDGER');
}

// missing tag
console.log('--- missing tag ---');
{
  const r1 = buildOneRealTagRollbackReadinessGate({ ...GOOD_PARAMS, target_tag: null });
  assert(r1.rollback_status === 'ROLLBACK_READINESS_BLOCKED_TAG', 'null tag → BLOCKED_TAG');

  const r2 = buildOneRealTagRollbackReadinessGate({ ...GOOD_PARAMS, target_tag: 'release-1.0' });
  assert(r2.rollback_status === 'ROLLBACK_READINESS_BLOCKED_TAG', 'no-v-prefix → BLOCKED_TAG');
}

// dry-run ready
console.log('--- dry-run ready ---');
{
  const r = buildOneRealTagRollbackReadinessGate(GOOD_PARAMS);
  assert(r.rollback_status === 'ROLLBACK_READINESS_DRY_RUN_READY', 'dry-run status');
  assert(r.rollback_ready === true, 'rollback_ready true');
  assert(r.rollback_required === false, 'rollback_required false for dry-run');
  assert(r.target_tag === 'v5.0.0', 'target_tag preserved');
  assert(r.git_head === 'abcdef1234567', 'git_head preserved');
  assert(r.schema_version === 'v108.1', 'schema version');
}

// real tag ready
console.log('--- real tag ready ---');
{
  const r = buildOneRealTagRollbackReadinessGate({ ...GOOD_PARAMS, ledger: REAL_TAG_LEDGER });
  assert(r.rollback_status === 'ROLLBACK_READINESS_REAL_TAG_READY', 'real-tag status');
  assert(r.rollback_ready === true, 'rollback_ready true');
  assert(r.rollback_required === true, 'rollback_required true for real-tag');
}

// rollback commands present
console.log('--- rollback commands present ---');
{
  const r = buildOneRealTagRollbackReadinessGate(GOOD_PARAMS);
  assert(typeof r.rollback_commands === 'string', 'rollback_commands is string');
  assert(r.rollback_commands.includes('git tag -d'), 'contains tag delete');
  assert(r.rollback_commands.includes(':refs/tags/'), 'contains remote delete');
  assert(r.rollback_commands.includes('v5.0.0'), 'contains target tag');
}

// rollback_executed=false
console.log('--- rollback_executed=false ---');
{
  const r = buildOneRealTagRollbackReadinessGate(GOOD_PARAMS);
  assert(r.rollback_executed === false, 'rollback_executed=false');
}

// deploy/stable/release false
console.log('--- deploy/stable/release false ---');
{
  const r = buildOneRealTagRollbackReadinessGate(GOOD_PARAMS);
  assert(r.deploy_performed === false, 'deploy false');
  assert(r.stable_promoted === false, 'stable false');
  assert(r.release_performed === false, 'release false');
}

// validate
console.log('--- validate ---');
{
  const r = buildOneRealTagRollbackReadinessGate(GOOD_PARAMS);
  const v = validateOneRealTagRollbackReadinessGate(r);
  assert(v.valid === true, 'validate dry-run gate');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = buildOneRealTagRollbackReadinessGate(GOOD_PARAMS);
  const txt = renderOneRealTagRollbackReadinessGate(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('ROLLBACK_READINESS_DRY_RUN_READY'), 'render includes status');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(ROLLBACK_READINESS_STATUSES.includes('ROLLBACK_READINESS_DRY_RUN_READY'), 'dry-run in exports');
  assert(ROLLBACK_READINESS_STATUSES.includes('ROLLBACK_READINESS_REAL_TAG_READY'), 'real-tag in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
