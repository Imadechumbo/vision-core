#!/usr/bin/env node
/**
 * Agent Context Cache Contract — V131.0
 *
 * Defines contract for caching agent context without mixing missions,
 * branches or baselines. Does NOT execute real API calls.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v131.0';

export const CONTEXT_CACHE_CONTRACT_STATUSES = [
  'CONTEXT_CACHE_CONTRACT_BLOCKED_MISSION',
  'CONTEXT_CACHE_CONTRACT_BLOCKED_SCOPE',
  'CONTEXT_CACHE_CONTRACT_BLOCKED_HASH',
  'CONTEXT_CACHE_CONTRACT_READY',
];

export const DEFAULT_TTL_MINUTES = 5;

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:  false,
    deploy_performed: false,
    release_performed: false,
    stale_cache_blocked:        true,
    cross_branch_cache_blocked: true,
    cost_estimate_required:     true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    contract_status:  status,
    contract_ready:   false,
    blocking_reason:  reason,
    ..._locked(),
    ...extra,
  };
}

function _cacheKey(mission_id, repo, branch, context_scope) {
  return _sha256([mission_id, repo || '', branch || '', context_scope].join('|'));
}

function _cacheHash(cache_key, git_head, baseline_id) {
  return _sha256([cache_key, git_head || '', baseline_id || ''].join('|'));
}

function _contractId(cache_hash) {
  return _sha256([cache_hash, 'acc-v131.0'].join('|'));
}

export function buildAgentContextCacheContract(params) {
  const {
    mission_id,
    repo,
    branch,
    git_head,
    baseline_id,
    context_scope,
    ttl_minutes,
    cache_allowed,
    cache_write_allowed,
    cache_read_allowed,
  } = params || {};

  if (!mission_id) {
    return _blocked('CONTEXT_CACHE_CONTRACT_BLOCKED_MISSION', 'mission_id is required');
  }

  if (!context_scope) {
    return _blocked('CONTEXT_CACHE_CONTRACT_BLOCKED_SCOPE', 'context_scope is required');
  }

  if (!git_head && !baseline_id) {
    return _blocked('CONTEXT_CACHE_CONTRACT_BLOCKED_HASH', 'git_head or baseline_id required for cache hash');
  }

  const cache_key  = _cacheKey(mission_id, repo, branch, context_scope);
  const cache_hash = _cacheHash(cache_key, git_head, baseline_id);
  const contract_id = _contractId(cache_hash);

  return {
    schema_version:      SCHEMA_VERSION,
    contract_id,
    contract_status:     'CONTEXT_CACHE_CONTRACT_READY',
    contract_ready:      true,
    mission_id,
    repo:                repo || null,
    branch:              branch || null,
    git_head:            git_head || null,
    baseline_id:         baseline_id || null,
    context_scope,
    cache_key,
    cache_hash,
    ttl_minutes:         typeof ttl_minutes === 'number' ? ttl_minutes : DEFAULT_TTL_MINUTES,
    cache_allowed:       cache_allowed !== false,
    cache_write_allowed: cache_write_allowed !== false,
    cache_read_allowed:  cache_read_allowed !== false,
    ..._locked(),
  };
}

export function validateAgentContextCacheContract(contract) {
  if (!contract || typeof contract !== 'object') {
    return { valid: false, errors: ['contract is null/undefined'] };
  }

  const errors = [];

  if (!CONTEXT_CACHE_CONTRACT_STATUSES.includes(contract.contract_status)) {
    errors.push(`invalid contract_status: ${contract.contract_status}`);
  }
  if (contract.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (contract.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (contract.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (contract.release_performed !== false) errors.push('release_performed must be false');
  if (contract.stale_cache_blocked !== true) errors.push('stale_cache_blocked must be true');
  if (contract.cross_branch_cache_blocked !== true) errors.push('cross_branch_cache_blocked must be true');
  if (contract.cost_estimate_required !== true) errors.push('cost_estimate_required must be true');

  return { valid: errors.length === 0, errors };
}

export function renderAgentContextCacheContract(contract) {
  if (!contract || !contract.contract_ready) {
    return `[CACHE CONTRACT BLOCKED] ${contract?.contract_status || 'unknown'}: ${contract?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== AGENT CONTEXT CACHE CONTRACT V131.0 ===`,
    `Schema:                      ${contract.schema_version}`,
    `Contract ID:                 ${contract.contract_id}`,
    `Status:                      ${contract.contract_status}`,
    `Mission ID:                  ${contract.mission_id}`,
    `Repo:                        ${contract.repo || 'not set'}`,
    `Branch:                      ${contract.branch || 'not set'}`,
    `Git HEAD:                    ${contract.git_head || 'not set'}`,
    `Baseline ID:                 ${contract.baseline_id || 'not set'}`,
    `Context Scope:               ${contract.context_scope}`,
    `Cache Key:                   ${contract.cache_key}`,
    `Cache Hash:                  ${contract.cache_hash}`,
    `TTL (minutes):               ${contract.ttl_minutes}`,
    `Cache Allowed:               ${contract.cache_allowed}`,
    `Cache Write Allowed:         ${contract.cache_write_allowed}`,
    `Cache Read Allowed:          ${contract.cache_read_allowed}`,
    ``,
    `stale_cache_blocked:         ${contract.stale_cache_blocked}`,
    `cross_branch_cache_blocked:  ${contract.cross_branch_cache_blocked}`,
    `cost_estimate_required:      ${contract.cost_estimate_required}`,
    `stable_promoted:             ${contract.stable_promoted}`,
    `deploy_performed:            ${contract.deploy_performed}`,
    `release_performed:           ${contract.release_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('agent-context-cache-contract.mjs')) {
  const isJson = process.argv.includes('--json');

  const contract = buildAgentContextCacheContract({
    mission_id:    'mission-v131-cli',
    repo:          'vision-core',
    branch:        'main',
    git_head:      'cafecafe1234567',
    baseline_id:   'baseline-v130-mock',
    context_scope: 'cost-cache-governance',
    ttl_minutes:   5,
  });

  if (isJson) {
    console.log(JSON.stringify(contract, null, 2));
  } else {
    console.log(renderAgentContextCacheContract(contract));
  }
}
