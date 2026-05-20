#!/usr/bin/env node
/**
 * Tests — Agent Context Cache Contract V131.0
 */

import {
  buildAgentContextCacheContract,
  validateAgentContextCacheContract,
  renderAgentContextCacheContract,
  CONTEXT_CACHE_CONTRACT_STATUSES,
  DEFAULT_TTL_MINUTES,
} from '../agent-context-cache-contract.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_PARAMS = {
  mission_id:    'mission-001',
  repo:          'vision-core',
  branch:        'main',
  git_head:      'cafecafe1234567',
  baseline_id:   'baseline-v130',
  context_scope: 'cost-cache-governance',
  ttl_minutes:   5,
};

console.log('\n=== agent-context-cache-contract tests ===\n');

console.log('--- missing mission_id ---');
{
  const c = buildAgentContextCacheContract({ context_scope: 'scope', git_head: 'abc' });
  assert(c.contract_status === 'CONTEXT_CACHE_CONTRACT_BLOCKED_MISSION', 'missing mission → BLOCKED_MISSION');
  assert(c.contract_ready === false, 'contract_ready false');
}

console.log('--- missing context_scope ---');
{
  const c = buildAgentContextCacheContract({ mission_id: 'm1', git_head: 'abc' });
  assert(c.contract_status === 'CONTEXT_CACHE_CONTRACT_BLOCKED_SCOPE', 'missing scope → BLOCKED_SCOPE');
  assert(c.contract_ready === false, 'contract_ready false');
}

console.log('--- missing hash sources ---');
{
  const c = buildAgentContextCacheContract({ mission_id: 'm1', context_scope: 'scope' });
  assert(c.contract_status === 'CONTEXT_CACHE_CONTRACT_BLOCKED_HASH', 'missing hash → BLOCKED_HASH');
  assert(c.contract_ready === false, 'contract_ready false');
}

console.log('--- git_head only sufficient for hash ---');
{
  const c = buildAgentContextCacheContract({ mission_id: 'm1', context_scope: 'scope', git_head: 'abc123' });
  assert(c.contract_ready === true, 'git_head alone sufficient');
}

console.log('--- baseline_id only sufficient for hash ---');
{
  const c = buildAgentContextCacheContract({ mission_id: 'm1', context_scope: 'scope', baseline_id: 'base-001' });
  assert(c.contract_ready === true, 'baseline_id alone sufficient');
}

console.log('--- contract ready ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c.contract_status === 'CONTEXT_CACHE_CONTRACT_READY', 'ready status');
  assert(c.contract_ready === true, 'contract_ready true');
  assert(typeof c.contract_id === 'string' && c.contract_id.length === 64, 'contract_id sha256');
  assert(typeof c.cache_key === 'string' && c.cache_key.length === 64, 'cache_key sha256');
  assert(typeof c.cache_hash === 'string' && c.cache_hash.length === 64, 'cache_hash sha256');
  assert(c.schema_version === 'v131.0', 'schema version');
  assert(c.mission_id === 'mission-001', 'mission_id');
  assert(c.repo === 'vision-core', 'repo');
  assert(c.branch === 'main', 'branch');
  assert(c.git_head === 'cafecafe1234567', 'git_head');
  assert(c.baseline_id === 'baseline-v130', 'baseline_id');
  assert(c.context_scope === 'cost-cache-governance', 'context_scope');
  assert(c.ttl_minutes === 5, 'ttl_minutes');
  assert(c.cache_allowed === true, 'cache_allowed default true');
  assert(c.cache_write_allowed === true, 'cache_write_allowed default true');
  assert(c.cache_read_allowed === true, 'cache_read_allowed default true');
}

console.log('--- default TTL ---');
{
  const c = buildAgentContextCacheContract({ mission_id: 'm1', context_scope: 'scope', git_head: 'abc' });
  assert(c.ttl_minutes === DEFAULT_TTL_MINUTES, 'default TTL 5 minutes');
}

console.log('--- cache_key deterministic ---');
{
  const c1 = buildAgentContextCacheContract(GOOD_PARAMS);
  const c2 = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c1.cache_key === c2.cache_key, 'cache_key deterministic');
  assert(c1.cache_hash === c2.cache_hash, 'cache_hash deterministic');
  assert(c1.contract_id === c2.contract_id, 'contract_id deterministic');
}

console.log('--- different branches produce different keys ---');
{
  const c1 = buildAgentContextCacheContract({ ...GOOD_PARAMS, branch: 'main' });
  const c2 = buildAgentContextCacheContract({ ...GOOD_PARAMS, branch: 'feature-x' });
  assert(c1.cache_key !== c2.cache_key, 'different branches → different cache_key');
}

console.log('--- cache_allowed=false override ---');
{
  const c = buildAgentContextCacheContract({ ...GOOD_PARAMS, cache_allowed: false });
  assert(c.cache_allowed === false, 'cache_allowed override false');
}

console.log('--- null params ---');
{
  const c = buildAgentContextCacheContract(null);
  assert(c.contract_status === 'CONTEXT_CACHE_CONTRACT_BLOCKED_MISSION', 'null → BLOCKED_MISSION');
}

console.log('--- stale_cache_blocked=true ---');
{
  const c1 = buildAgentContextCacheContract({});
  assert(c1.stale_cache_blocked === true, 'blocked: true');
  const c2 = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c2.stale_cache_blocked === true, 'ready: true');
}

console.log('--- cross_branch_cache_blocked=true ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c.cross_branch_cache_blocked === true, 'cross_branch_cache_blocked=true');
}

console.log('--- cost_estimate_required=true ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c.cost_estimate_required === true, 'cost_estimate_required=true');
}

console.log('--- stable_promoted=false ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- deploy_performed=false ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  assert(c.release_performed === false, 'release_performed=false');
}

console.log('--- validate ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  const v = validateAgentContextCacheContract(c);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateAgentContextCacheContract(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const c = buildAgentContextCacheContract(GOOD_PARAMS);
  const txt = renderAgentContextCacheContract(c);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('AGENT CONTEXT CACHE CONTRACT V131.0'), 'render title');
  assert(txt.includes('CONTEXT_CACHE_CONTRACT_READY'), 'status in output');
  assert(txt.includes('stale_cache_blocked:'), 'stale field in output');
  assert(txt.includes('cost_estimate_required:'), 'cost field in output');
}

console.log('--- render blocked ---');
{
  const c = buildAgentContextCacheContract({});
  const txt = renderAgentContextCacheContract(c);
  assert(txt.includes('CACHE CONTRACT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(CONTEXT_CACHE_CONTRACT_STATUSES.includes('CONTEXT_CACHE_CONTRACT_READY'), 'ready in statuses');
  assert(CONTEXT_CACHE_CONTRACT_STATUSES.includes('CONTEXT_CACHE_CONTRACT_BLOCKED_MISSION'), 'mission blocked');
  assert(CONTEXT_CACHE_CONTRACT_STATUSES.includes('CONTEXT_CACHE_CONTRACT_BLOCKED_SCOPE'), 'scope blocked');
  assert(CONTEXT_CACHE_CONTRACT_STATUSES.includes('CONTEXT_CACHE_CONTRACT_BLOCKED_HASH'), 'hash blocked');
  assert(CONTEXT_CACHE_CONTRACT_STATUSES.length === 4, 'exactly 4 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
