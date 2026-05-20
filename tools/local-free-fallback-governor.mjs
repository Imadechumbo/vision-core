#!/usr/bin/env node
/**
 * Local/Free Fallback Governor — V136.0
 *
 * Evaluates whether to switch from premium to local/free agent.
 * Does NOT execute real API calls or deployments.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v136.0';

export const FALLBACK_STATUSES = [
  'FALLBACK_BLOCKED_INPUT',
  'FALLBACK_NOT_REQUIRED',
  'FALLBACK_SELECTED_LOCAL',
  'FALLBACK_SELECTED_FREE_API',
  'FALLBACK_BLOCKED_UNAVAILABLE',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

export function evaluateLocalFreeFallback(params) {
  const {
    mission_id,
    primary_agent,
    fallback_reason,
    premium_limited    = false,
    local_available    = true,
    free_api_available = true,
    cache_hit_rate     = 0,
  } = params || {};

  const fbKey = [
    mission_id, primary_agent, fallback_reason,
    premium_limited, local_available, free_api_available, cache_hit_rate,
  ].join('|');
  const fallback_id = _sha256(fbKey);

  const blockedInput = (reason) => ({
    fallback_id,
    schema_version:    SCHEMA_VERSION,
    primary_agent:     primary_agent ?? null,
    fallback_agent:    null,
    fallback_reason:   fallback_reason ?? null,
    premium_limited,
    local_available,
    free_api_available,
    fallback_allowed:  false,
    fallback_blocked:  true,
    fallback_status:   'FALLBACK_BLOCKED_INPUT',
    blocked_reason:    reason,
    ..._locked(),
  });

  if (!mission_id || String(mission_id).trim() === '') {
    return blockedInput('mission_id is required.');
  }
  if (!primary_agent || String(primary_agent).trim() === '') {
    return blockedInput('primary_agent is required.');
  }

  // No fallback needed
  if (!premium_limited) {
    return {
      fallback_id,
      schema_version:    SCHEMA_VERSION,
      primary_agent,
      fallback_agent:    null,
      fallback_reason:   fallback_reason ?? null,
      premium_limited,
      local_available,
      free_api_available,
      fallback_allowed:  false,
      fallback_blocked:  false,
      fallback_status:   'FALLBACK_NOT_REQUIRED',
      ..._locked(),
    };
  }

  // Fallback needed — check availability
  if (!local_available && !free_api_available) {
    return {
      fallback_id,
      schema_version:    SCHEMA_VERSION,
      primary_agent,
      fallback_agent:    null,
      fallback_reason:   fallback_reason ?? 'premium_limited',
      premium_limited,
      local_available,
      free_api_available,
      fallback_allowed:  false,
      fallback_blocked:  true,
      fallback_status:   'FALLBACK_BLOCKED_UNAVAILABLE',
      ..._locked(),
    };
  }

  // Prefer local when high cache hit or local available
  if (local_available && (cache_hit_rate >= 0.5 || !free_api_available)) {
    return {
      fallback_id,
      schema_version:    SCHEMA_VERSION,
      primary_agent,
      fallback_agent:    'local',
      fallback_reason:   fallback_reason ?? 'premium_limited',
      premium_limited,
      local_available,
      free_api_available,
      fallback_allowed:  true,
      fallback_blocked:  false,
      fallback_status:   'FALLBACK_SELECTED_LOCAL',
      ..._locked(),
    };
  }

  // Use free_api
  return {
    fallback_id,
    schema_version:    SCHEMA_VERSION,
    primary_agent,
    fallback_agent:    'free_api',
    fallback_reason:   fallback_reason ?? 'premium_limited',
    premium_limited,
    local_available,
    free_api_available,
    fallback_allowed:  true,
    fallback_blocked:  false,
    fallback_status:   'FALLBACK_SELECTED_FREE_API',
    ..._locked(),
  };
}

export function validateLocalFreeFallback(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'fallback_id', 'schema_version', 'fallback_status',
    'fallback_allowed', 'fallback_blocked',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!FALLBACK_STATUSES.includes(result.fallback_status)) {
    errors.push(`invalid fallback_status: ${result.fallback_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderLocalFreeFallback(result) {
  if (!result || typeof result !== 'object') {
    return '[LOCAL_FREE_FALLBACK_GOVERNOR] No result to render.';
  }
  const lines = [
    `=== Local/Free Fallback Governor [${SCHEMA_VERSION}] ===`,
    `Fallback status:   ${result.fallback_status ?? 'N/A'}`,
    `Primary agent:     ${result.primary_agent ?? 'N/A'}`,
    `Fallback agent:    ${result.fallback_agent ?? 'none'}`,
    `Premium limited:   ${result.premium_limited}`,
    `Local available:   ${result.local_available}`,
    `Free API available:${result.free_api_available}`,
    `Fallback allowed:  ${result.fallback_allowed}`,
    `Fallback blocked:  ${result.fallback_blocked}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
