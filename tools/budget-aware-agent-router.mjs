#!/usr/bin/env node
/**
 * Budget-Aware Agent Router — V135.1
 *
 * Routes agent selection based on cost gate and cache hit status.
 * Never auto-deploys, releases, or marks stable.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v135.1';

export const AGENT_ROUTE_STATUSES = [
  'ROUTE_BLOCKED_INPUT',
  'ROUTE_BLOCKED_COST',
  'ROUTE_SELECTED',
  'ROUTE_FALLBACK_SELECTED',
];

export const AGENT_ROUTES = [
  'local',
  'free_api',
  'claude',
  'codex',
  'deepseek',
  'premium',
  'blocked',
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

export function routeAgentByBudget(params) {
  const {
    mission_id,
    cost_gate_status,
    cost_allowed          = false,
    cache_hit_rate        = 0,
    is_critical_mission   = false,
    human_approval_given  = false,
    fallback_required     = false,
    preferred_agent,
  } = params || {};

  const routeKey = [
    mission_id, cost_gate_status, cost_allowed,
    cache_hit_rate, is_critical_mission,
    human_approval_given, fallback_required, preferred_agent,
  ].join('|');
  const route_id = _sha256(routeKey);

  const blockedInput = (reason) => ({
    route_id,
    schema_version: SCHEMA_VERSION,
    selected_route: 'blocked',
    route_status:   'ROUTE_BLOCKED_INPUT',
    is_fallback:    false,
    reason,
    ..._locked(),
  });

  if (!mission_id || String(mission_id).trim() === '') {
    return blockedInput('mission_id is required.');
  }
  if (!cost_gate_status) {
    return blockedInput('cost_gate_status is required.');
  }

  // Cost blocked → blocked route
  if (!cost_allowed) {
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: 'blocked',
      route_status:   'ROUTE_BLOCKED_COST',
      is_fallback:    false,
      reason:         'Cost not allowed. Agent routing blocked.',
      ..._locked(),
    };
  }

  // Fallback required → local/deepseek
  if (fallback_required) {
    const fallback = cache_hit_rate >= 0.5 ? 'local' : 'deepseek';
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: fallback,
      route_status:   'ROUTE_FALLBACK_SELECTED',
      is_fallback:    true,
      reason:         `Fallback required. Selected ${fallback} (cache_hit_rate=${cache_hit_rate}).`,
      ..._locked(),
    };
  }

  // High cache hit → prefer local/free_api
  if (cache_hit_rate >= 0.7) {
    const route = cache_hit_rate >= 0.9 ? 'local' : 'free_api';
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: route,
      route_status:   'ROUTE_SELECTED',
      is_fallback:    false,
      reason:         `High cache hit rate (${cache_hit_rate}). Using ${route}.`,
      ..._locked(),
    };
  }

  // Critical + budget approved + human approval → premium/claude
  if (is_critical_mission && cost_gate_status === 'COST_GATE_ALLOWED' && human_approval_given) {
    const route = preferred_agent === 'premium' ? 'premium' : 'claude';
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: route,
      route_status:   'ROUTE_SELECTED',
      is_fallback:    false,
      reason:         `Critical mission + approved + human approval. Using ${route}.`,
      ..._locked(),
    };
  }

  // Critical without human approval → claude (needs approval for premium)
  if (is_critical_mission && cost_gate_status === 'COST_GATE_ALLOWED') {
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: 'claude',
      route_status:   'ROUTE_SELECTED',
      is_fallback:    false,
      reason:         'Critical mission. Using claude. Premium requires human_approval_given=true.',
      ..._locked(),
    };
  }

  // REQUIRES_HUMAN_APPROVAL gate → fallback to deepseek
  if (cost_gate_status === 'COST_GATE_REQUIRES_HUMAN_APPROVAL' && !human_approval_given) {
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: 'deepseek',
      route_status:   'ROUTE_FALLBACK_SELECTED',
      is_fallback:    true,
      reason:         'Human approval required but not given. Falling back to deepseek.',
      ..._locked(),
    };
  }

  // Standard routing based on gate status
  if (cost_gate_status === 'COST_GATE_ALLOWED') {
    const route = preferred_agent && AGENT_ROUTES.includes(preferred_agent) && preferred_agent !== 'blocked'
      ? preferred_agent
      : 'codex';
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: route,
      route_status:   'ROUTE_SELECTED',
      is_fallback:    false,
      reason:         `Cost allowed. Using ${route}.`,
      ..._locked(),
    };
  }

  // WARNING → codex or free_api
  if (cost_gate_status === 'COST_GATE_WARNING') {
    return {
      route_id,
      schema_version: SCHEMA_VERSION,
      selected_route: 'free_api',
      route_status:   'ROUTE_SELECTED',
      is_fallback:    false,
      reason:         'Cost warning. Using free_api to conserve budget.',
      ..._locked(),
    };
  }

  // Default fallback
  return {
    route_id,
    schema_version: SCHEMA_VERSION,
    selected_route: 'local',
    route_status:   'ROUTE_FALLBACK_SELECTED',
    is_fallback:    true,
    reason:         `No specific route matched for gate ${cost_gate_status}. Defaulting to local.`,
    ..._locked(),
  };
}

export function validateBudgetAwareAgentRoute(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'route_id', 'schema_version', 'selected_route', 'route_status',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!AGENT_ROUTE_STATUSES.includes(result.route_status)) {
    errors.push(`invalid route_status: ${result.route_status}`);
  }
  if (!AGENT_ROUTES.includes(result.selected_route)) {
    errors.push(`invalid selected_route: ${result.selected_route}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderBudgetAwareAgentRoute(result) {
  if (!result || typeof result !== 'object') {
    return '[BUDGET_AWARE_AGENT_ROUTER] No result to render.';
  }
  const lines = [
    `=== Budget-Aware Agent Router [${SCHEMA_VERSION}] ===`,
    `Route status:   ${result.route_status ?? 'N/A'}`,
    `Selected route: ${result.selected_route ?? 'N/A'}`,
    `Is fallback:    ${result.is_fallback}`,
    `Reason:         ${result.reason ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
