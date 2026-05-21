#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Human Approval Binding V184.0
 */

import {
  buildRealRepoPatchHumanApprovalBinding,
  validateRealRepoPatchHumanApprovalBinding,
  renderRealRepoPatchHumanApprovalBinding,
  REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES,
} from '../real-repo-patch-human-approval-binding.mjs';

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

const VALID_INPUT = {
  binding_id: 'binding-001',
  replay_id: 'replay-001',
  replay_verified: true,
  approval_decision: 'approved',
};

console.log('\n=== real-repo-patch-human-approval-binding tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES));
assert('has HUMAN_APPROVAL_BLOCKED_INPUT', REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES.includes('HUMAN_APPROVAL_BLOCKED_INPUT'));
assert('has HUMAN_APPROVAL_BLOCKED_REPLAY', REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES.includes('HUMAN_APPROVAL_BLOCKED_REPLAY'));
assert('has HUMAN_APPROVAL_REQUIRED', REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES.includes('HUMAN_APPROVAL_REQUIRED'));
assert('has HUMAN_APPROVAL_BOUND', REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES.includes('HUMAN_APPROVAL_BOUND'));
assert('build is function', typeof buildRealRepoPatchHumanApprovalBinding === 'function');
assert('validate is function', typeof validateRealRepoPatchHumanApprovalBinding === 'function');
assert('render is function', typeof renderRealRepoPatchHumanApprovalBinding === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchHumanApprovalBinding(null);
  assert('null → BLOCKED_INPUT', r.status === 'HUMAN_APPROVAL_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchHumanApprovalBinding({});
  assert('no binding_id → BLOCKED_INPUT', r.status === 'HUMAN_APPROVAL_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchHumanApprovalBinding({ binding_id: 'b' });
  assert('no replay_id → BLOCKED_INPUT', r.status === 'HUMAN_APPROVAL_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, approval_decision: 'bad-value' });
  assert('invalid decision → BLOCKED_INPUT', r.status === 'HUMAN_APPROVAL_BLOCKED_INPUT');
}

// --- blocked replay ---
console.log('--- blocked replay ---');
{
  const r = buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, replay_verified: false });
  assert('replay_verified=false → BLOCKED_REPLAY', r.status === 'HUMAN_APPROVAL_BLOCKED_REPLAY');
  assert('blocked_replay: release_allowed=false', r.release_allowed === false);
  assert('blocked_replay: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, replay_verified: undefined });
  assert('replay_verified=undefined → BLOCKED_REPLAY', r.status === 'HUMAN_APPROVAL_BLOCKED_REPLAY');
}

// --- approval required ---
console.log('--- approval required ---');
{
  const r = buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, approval_decision: undefined });
  assert('no decision → HUMAN_APPROVAL_REQUIRED', r.status === 'HUMAN_APPROVAL_REQUIRED');
  assert('required: release_allowed=false', r.release_allowed === false);
  assert('required: binding_hash=null', r.binding_hash === null);
}
{
  const r = buildRealRepoPatchHumanApprovalBinding({ binding_id: 'b', replay_id: 'r', replay_verified: true });
  assert('missing decision field → HUMAN_APPROVAL_REQUIRED', r.status === 'HUMAN_APPROVAL_REQUIRED');
}

// --- approved ---
console.log('--- approved ---');
{
  const r = buildRealRepoPatchHumanApprovalBinding(VALID_INPUT);
  assert('approved → HUMAN_APPROVAL_BOUND', r.status === 'HUMAN_APPROVAL_BOUND');
  assert('approved: schema_version=v184.0', r.schema_version === 'v184.0');
  assert('approved: binding_id set', r.binding_id === 'binding-001');
  assert('approved: replay_id set', r.replay_id === 'replay-001');
  assert('approved: approval_decision=approved', r.approval_decision === 'approved');
  assert('approved: release_allowed=false', r.release_allowed === false);
  assert('approved: binding_hash 64 chars', typeof r.binding_hash === 'string' && r.binding_hash.length === 64);
  assert('approved: errors empty', r.errors.length === 0);
  assert('approved: production_touched=false', r.production_touched === false);
  assert('approved: deploy_performed=false', r.deploy_performed === false);
  assert('approved: stable_promoted=false', r.stable_promoted === false);
  assert('approved: release_performed=false', r.release_performed === false);
}

// --- rejected ---
console.log('--- rejected ---');
{
  const r = buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, approval_decision: 'rejected' });
  assert('rejected → HUMAN_APPROVAL_BOUND', r.status === 'HUMAN_APPROVAL_BOUND');
  assert('rejected: approval_decision=rejected', r.approval_decision === 'rejected');
  assert('rejected: release_allowed=false', r.release_allowed === false);
  assert('rejected: binding_hash 64 chars', typeof r.binding_hash === 'string' && r.binding_hash.length === 64);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchHumanApprovalBinding(VALID_INPUT);
  const r2 = buildRealRepoPatchHumanApprovalBinding(VALID_INPUT);
  assert('hash deterministic', r1.binding_hash === r2.binding_hash);
  const r3 = buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, binding_id: 'binding-002' });
  assert('different binding_id → different hash', r1.binding_hash !== r3.binding_hash);
  const r4 = buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, approval_decision: 'rejected' });
  assert('different decision → different hash', r1.binding_hash !== r4.binding_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchHumanApprovalBinding(VALID_INPUT);
  const v = validateRealRepoPatchHumanApprovalBinding(r);
  assert('validate bound: valid=true', v.valid === true);
  assert('validate bound: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchHumanApprovalBinding(null);
  const v = validateRealRepoPatchHumanApprovalBinding(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchHumanApprovalBinding(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchHumanApprovalBinding(VALID_INPUT);
  const s = renderRealRepoPatchHumanApprovalBinding(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains HUMAN_APPROVAL_BOUND', s.includes('HUMAN_APPROVAL_BOUND'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains approved', s.includes('approved'));
}
{
  const s = renderRealRepoPatchHumanApprovalBinding(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchHumanApprovalBinding(null),
    buildRealRepoPatchHumanApprovalBinding({}),
    buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, replay_verified: false }),
    buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, approval_decision: undefined }),
    buildRealRepoPatchHumanApprovalBinding(VALID_INPUT),
    buildRealRepoPatchHumanApprovalBinding({ ...VALID_INPUT, approval_decision: 'rejected' }),
  ];
  assert('all: release_allowed=false', cases.every(r => r.release_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
