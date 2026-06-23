#!/usr/bin/env node

import {
  buildSoftwareFactoryContract,
  validateSoftwareFactoryContract,
  renderSoftwareFactoryContract,
  SOFTWARE_FACTORY_CONTRACT_STATUSES,
} from '../../software-factory/software-factory-contract.mjs';

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
  contract_id: 'sf-contract-001',
  mission_id: 'mission-001',
  mission_type: 'feature',
  requested_by: 'human-operator',
  target_project: 'vision-core',
  allowed_files: ['tools/software-factory/', 'tools/tests/software-factory/'],
  forbidden_files: ['tools/deploy/', 'tools/release/'],
  safety_mode: true,
  pass_gold_required: true,
  rollback_required: true,
};

console.log('\n=== software-factory-contract tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(SOFTWARE_FACTORY_CONTRACT_STATUSES));
assert('has SOFTWARE_FACTORY_BLOCKED_INPUT', SOFTWARE_FACTORY_CONTRACT_STATUSES.includes('SOFTWARE_FACTORY_BLOCKED_INPUT'));
assert('has SOFTWARE_FACTORY_BLOCKED_SCOPE', SOFTWARE_FACTORY_CONTRACT_STATUSES.includes('SOFTWARE_FACTORY_BLOCKED_SCOPE'));
assert('has SOFTWARE_FACTORY_READY', SOFTWARE_FACTORY_CONTRACT_STATUSES.includes('SOFTWARE_FACTORY_READY'));
assert('build is function', typeof buildSoftwareFactoryContract === 'function');
assert('validate is function', typeof validateSoftwareFactoryContract === 'function');
assert('render is function', typeof renderSoftwareFactoryContract === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildSoftwareFactoryContract(null);
  assert('null -> BLOCKED_INPUT', r.status === 'SOFTWARE_FACTORY_BLOCKED_INPUT');
  assert('null: scope_validated=false', r.scope_validated === false);
}
{
  const r = buildSoftwareFactoryContract({});
  assert('{} -> BLOCKED_INPUT', r.status === 'SOFTWARE_FACTORY_BLOCKED_INPUT');
}
{
  const r = buildSoftwareFactoryContract({ contract_id: '' });
  assert('empty contract_id -> BLOCKED_INPUT', r.status === 'SOFTWARE_FACTORY_BLOCKED_INPUT');
}
{
  const r = buildSoftwareFactoryContract({ contract_id: 'c-1', mission_id: '' });
  assert('empty mission_id -> BLOCKED_INPUT', r.status === 'SOFTWARE_FACTORY_BLOCKED_INPUT');
}
{
  const r = buildSoftwareFactoryContract({ contract_id: 'c-1', mission_id: 'm-1', mission_type: '' });
  assert('empty mission_type -> BLOCKED_INPUT', r.status === 'SOFTWARE_FACTORY_BLOCKED_INPUT');
}
{
  const r = buildSoftwareFactoryContract({ contract_id: 'c-1', mission_id: 'm-1', mission_type: 'feature', requested_by: '' });
  assert('empty requested_by -> BLOCKED_INPUT', r.status === 'SOFTWARE_FACTORY_BLOCKED_INPUT');
}
{
  const r = buildSoftwareFactoryContract({ contract_id: 'c-1', mission_id: 'm-1', mission_type: 'feature', requested_by: 'me', target_project: '' });
  assert('empty target_project -> BLOCKED_INPUT', r.status === 'SOFTWARE_FACTORY_BLOCKED_INPUT');
}

// --- blocked scope ---
console.log('--- blocked scope ---');
{
  const base = { contract_id: 'c-1', mission_id: 'm-1', mission_type: 'feature', requested_by: 'me', target_project: 'proj' };
  const r = buildSoftwareFactoryContract({ ...base, allowed_files: [] });
  assert('empty allowed_files -> BLOCKED_SCOPE', r.status === 'SOFTWARE_FACTORY_BLOCKED_SCOPE');
}
{
  const base = { contract_id: 'c-1', mission_id: 'm-1', mission_type: 'feature', requested_by: 'me', target_project: 'proj' };
  const r = buildSoftwareFactoryContract({ ...base, allowed_files: ['dir/'], forbidden_files: null });
  assert('null forbidden_files -> BLOCKED_SCOPE', r.status === 'SOFTWARE_FACTORY_BLOCKED_SCOPE');
}
{
  const base = { contract_id: 'c-1', mission_id: 'm-1', mission_type: 'feature', requested_by: 'me', target_project: 'proj' };
  const r = buildSoftwareFactoryContract({ ...base, allowed_files: ['dir/'], forbidden_files: [], safety_mode: false });
  assert('safety_mode=false -> BLOCKED_SCOPE', r.status === 'SOFTWARE_FACTORY_BLOCKED_SCOPE');
}
{
  const base = { contract_id: 'c-1', mission_id: 'm-1', mission_type: 'feature', requested_by: 'me', target_project: 'proj' };
  const r = buildSoftwareFactoryContract({ ...base, allowed_files: ['dir/'], forbidden_files: [], safety_mode: true, pass_gold_required: false });
  assert('pass_gold_required=false -> BLOCKED_SCOPE', r.status === 'SOFTWARE_FACTORY_BLOCKED_SCOPE');
}
{
  const base = { contract_id: 'c-1', mission_id: 'm-1', mission_type: 'feature', requested_by: 'me', target_project: 'proj' };
  const r = buildSoftwareFactoryContract({ ...base, allowed_files: ['dir/'], forbidden_files: [], safety_mode: true, pass_gold_required: true, rollback_required: false });
  assert('rollback_required=false -> BLOCKED_SCOPE', r.status === 'SOFTWARE_FACTORY_BLOCKED_SCOPE');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildSoftwareFactoryContract(VALID_INPUT);
  assert('valid -> SOFTWARE_FACTORY_READY', r.status === 'SOFTWARE_FACTORY_READY');
  assert('ready: schema_version=v201.0', r.schema_version === 'v201.0');
  assert('ready: contract_id set', r.contract_id === 'sf-contract-001');
  assert('ready: mission_id set', r.mission_id === 'mission-001');
  assert('ready: mission_type=feature', r.mission_type === 'feature');
  assert('ready: requested_by set', r.requested_by === 'human-operator');
  assert('ready: target_project set', r.target_project === 'vision-core');
  assert('ready: safety_mode=true', r.safety_mode === true);
  assert('ready: pass_gold_required=true', r.pass_gold_required === true);
  assert('ready: rollback_required=true', r.rollback_required === true);
  assert('ready: scope_validated=true', r.scope_validated === true);
  assert('ready: contract_hash 64 chars', r.contract_hash && r.contract_hash.length === 64);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('ready: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildSoftwareFactoryContract(VALID_INPUT);
  const v = validateSoftwareFactoryContract(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildSoftwareFactoryContract(null);
  const v = validateSoftwareFactoryContract(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateSoftwareFactoryContract(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildSoftwareFactoryContract(VALID_INPUT);
  const s = renderSoftwareFactoryContract(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains SOFTWARE_FACTORY_READY', s.includes('SOFTWARE_FACTORY_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderSoftwareFactoryContract(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const r = buildSoftwareFactoryContract(VALID_INPUT);
  assert('all: release_allowed=false', r.release_allowed === false);
  assert('all: deploy_allowed=false', r.deploy_allowed === false);
  assert('all: stable_allowed=false', r.stable_allowed === false);
  assert('all: tag_allowed=false', r.tag_allowed === false);
  assert('all: real_execution_allowed=false', r.real_execution_allowed === false);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
