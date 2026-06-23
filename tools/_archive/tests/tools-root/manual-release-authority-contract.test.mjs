#!/usr/bin/env node
/**
 * Tests — Manual Release Authority Contract V191.0
 */

import {
  buildManualReleaseAuthorityContract,
  validateManualReleaseAuthorityContract,
  renderManualReleaseAuthorityContract,
  MANUAL_RELEASE_AUTHORITY_STATUSES,
} from '../manual-release-authority-contract.mjs';

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
  contract_id: 'contract-001',
  phase_gate_ready: true,
  phase_certified: true,
  v171_v190_certified: true,
  manual_authority_requested: true,
  requester: 'operator-01',
  reason: 'Post-certification controlled release',
  target_scope: 'v1.0.0-rc1',
};

console.log('\n=== manual-release-authority-contract tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(MANUAL_RELEASE_AUTHORITY_STATUSES));
assert('has MANUAL_AUTHORITY_BLOCKED_INPUT', MANUAL_RELEASE_AUTHORITY_STATUSES.includes('MANUAL_AUTHORITY_BLOCKED_INPUT'));
assert('has MANUAL_AUTHORITY_BLOCKED_PHASE_GATE', MANUAL_RELEASE_AUTHORITY_STATUSES.includes('MANUAL_AUTHORITY_BLOCKED_PHASE_GATE'));
assert('has MANUAL_AUTHORITY_REQUIRED', MANUAL_RELEASE_AUTHORITY_STATUSES.includes('MANUAL_AUTHORITY_REQUIRED'));
assert('has MANUAL_AUTHORITY_GRANTED_DRY', MANUAL_RELEASE_AUTHORITY_STATUSES.includes('MANUAL_AUTHORITY_GRANTED_DRY'));
assert('build is function', typeof buildManualReleaseAuthorityContract === 'function');
assert('validate is function', typeof validateManualReleaseAuthorityContract === 'function');
assert('render is function', typeof renderManualReleaseAuthorityContract === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildManualReleaseAuthorityContract(null);
  assert('null → BLOCKED_INPUT', r.status === 'MANUAL_AUTHORITY_BLOCKED_INPUT');
  assert('null: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: deploy_allowed=false', r.deploy_allowed === false);
  assert('null: stable_allowed=false', r.stable_allowed === false);
  assert('null: tag_allowed=false', r.tag_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
}
{
  const r = buildManualReleaseAuthorityContract({});
  assert('no contract_id → BLOCKED_INPUT', r.status === 'MANUAL_AUTHORITY_BLOCKED_INPUT');
}
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, requester: '' });
  assert('empty requester → BLOCKED_INPUT', r.status === 'MANUAL_AUTHORITY_BLOCKED_INPUT');
}
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, reason: undefined });
  assert('no reason → BLOCKED_INPUT', r.status === 'MANUAL_AUTHORITY_BLOCKED_INPUT');
}
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, target_scope: undefined });
  assert('no target_scope → BLOCKED_INPUT', r.status === 'MANUAL_AUTHORITY_BLOCKED_INPUT');
}

// --- blocked phase gate ---
console.log('--- blocked phase gate ---');
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, phase_gate_ready: false });
  assert('phase_gate=false → BLOCKED_PHASE_GATE', r.status === 'MANUAL_AUTHORITY_BLOCKED_PHASE_GATE');
  assert('blocked_gate: release_allowed=false', r.release_allowed === false);
  assert('blocked_gate: manual_authority_granted_dry=false', r.manual_authority_granted_dry === false);
}
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, phase_certified: false });
  assert('phase_certified=false → BLOCKED_PHASE_GATE', r.status === 'MANUAL_AUTHORITY_BLOCKED_PHASE_GATE');
}
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, v171_v190_certified: false });
  assert('v171_v190_certified=false → BLOCKED_PHASE_GATE', r.status === 'MANUAL_AUTHORITY_BLOCKED_PHASE_GATE');
}

// --- authority required ---
console.log('--- authority required ---');
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, manual_authority_requested: false });
  assert('not_requested → MANUAL_AUTHORITY_REQUIRED', r.status === 'MANUAL_AUTHORITY_REQUIRED');
  assert('required: release_allowed=false', r.release_allowed === false);
  assert('required: next_decision_allowed=false', r.next_decision_allowed === false);
}
{
  const r = buildManualReleaseAuthorityContract({ ...VALID_INPUT, manual_authority_requested: undefined });
  assert('requested=undefined → MANUAL_AUTHORITY_REQUIRED', r.status === 'MANUAL_AUTHORITY_REQUIRED');
}

// --- granted dry ---
console.log('--- granted dry ---');
{
  const r = buildManualReleaseAuthorityContract(VALID_INPUT);
  assert('valid → MANUAL_AUTHORITY_GRANTED_DRY', r.status === 'MANUAL_AUTHORITY_GRANTED_DRY');
  assert('granted: schema_version=v191.0', r.schema_version === 'v191.0');
  assert('granted: contract_id set', r.manual_authority_contract_id === 'contract-001');
  assert('granted: requester set', r.requester === 'operator-01');
  assert('granted: target_scope set', r.target_scope === 'v1.0.0-rc1');
  assert('granted: manual_authority_granted_dry=true', r.manual_authority_granted_dry === true);
  assert('granted: next_decision_allowed=true', r.next_decision_allowed === true);
  assert('granted: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('granted: release_allowed=false', r.release_allowed === false);
  assert('granted: deploy_allowed=false', r.deploy_allowed === false);
  assert('granted: stable_allowed=false', r.stable_allowed === false);
  assert('granted: tag_allowed=false', r.tag_allowed === false);
  assert('granted: contract_hash 64 chars', typeof r.contract_hash === 'string' && r.contract_hash.length === 64);
  assert('granted: errors empty', r.errors.length === 0);
  assert('granted: production_touched=false', r.production_touched === false);
  assert('granted: deploy_performed=false', r.deploy_performed === false);
  assert('granted: stable_promoted=false', r.stable_promoted === false);
  assert('granted: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildManualReleaseAuthorityContract(VALID_INPUT);
  const r2 = buildManualReleaseAuthorityContract(VALID_INPUT);
  assert('hash deterministic', r1.contract_hash === r2.contract_hash);
  const r3 = buildManualReleaseAuthorityContract({ ...VALID_INPUT, contract_id: 'contract-002' });
  assert('different contract_id → different hash', r1.contract_hash !== r3.contract_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildManualReleaseAuthorityContract(VALID_INPUT);
  const v = validateManualReleaseAuthorityContract(r);
  assert('validate granted: valid=true', v.valid === true);
  assert('validate granted: no errors', v.errors.length === 0);
}
{
  const r = buildManualReleaseAuthorityContract(null);
  const v = validateManualReleaseAuthorityContract(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateManualReleaseAuthorityContract(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildManualReleaseAuthorityContract(VALID_INPUT);
  const s = renderManualReleaseAuthorityContract(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains MANUAL_AUTHORITY_GRANTED_DRY', s.includes('MANUAL_AUTHORITY_GRANTED_DRY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: release_allowed false', s.includes('false'));
}
{
  const s = renderManualReleaseAuthorityContract(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildManualReleaseAuthorityContract(null),
    buildManualReleaseAuthorityContract({}),
    buildManualReleaseAuthorityContract({ ...VALID_INPUT, phase_gate_ready: false }),
    buildManualReleaseAuthorityContract({ ...VALID_INPUT, manual_authority_requested: false }),
    buildManualReleaseAuthorityContract(VALID_INPUT),
  ];
  assert('all: real_execution_allowed=false', cases.every(r => r.real_execution_allowed === false));
  assert('all: release_allowed=false', cases.every(r => r.release_allowed === false));
  assert('all: deploy_allowed=false', cases.every(r => r.deploy_allowed === false));
  assert('all: stable_allowed=false', cases.every(r => r.stable_allowed === false));
  assert('all: tag_allowed=false', cases.every(r => r.tag_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
