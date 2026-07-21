'use strict';

const crypto = require('crypto');
const { MultiProvidersError, assertNoSecrets } = require('./multiproviders-domain');

const FAILOVER_ERROR_CATEGORIES = Object.freeze([
  'transport',
  'rate_limit',
  'capacity',
  'model_unavailable',
  'timeout',
  'provider_error',
]);

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new MultiProvidersError('invalid_field', { field });
  return value.trim();
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function currentMetadata(value, now) {
  if (!value || typeof value !== 'object') return null;
  if (value.valid_until && (!Number.isFinite(Date.parse(value.valid_until)) || Date.parse(value.valid_until) <= now)) return null;
  return value;
}

function costEstimate(provider, now) {
  const cost = currentMetadata(provider.cost, now);
  if (!cost || cost.category === 'unknown' || !cost.source || !cost.currency || !cost.unit || !cost.valid_until) return null;
  return finiteOrNull(cost.estimated_cost_usd);
}

function latencyEstimate(provider, now) {
  const latency = currentMetadata(provider.latency, now);
  if (!latency || !latency.source || !latency.window || !Number.isInteger(latency.sample_size) || latency.sample_size <= 0 || !latency.valid_until) return null;
  return finiteOrNull(latency.p95_ms);
}

function privacyMatches(provider, requirements) {
  if (!provider.privacy || !provider.privacy.source) return false;
  const properties = provider.privacy.properties;
  if (!properties || typeof properties !== 'object') return false;
  return Object.entries(requirements).every(([key, expected]) => properties[key] === expected);
}

function failoverAllowed(operation = {}, errorCategory = null) {
  if (errorCategory && !FAILOVER_ERROR_CATEGORIES.includes(errorCategory)) return false;
  const retryBudgetExhausted = Number.isInteger(operation.max_retries) &&
    Number.isInteger(operation.retries_executed) &&
    operation.retries_executed >= operation.max_retries;
  return operation.idempotent === true &&
    operation.side_effects !== true &&
    operation.streaming_started !== true &&
    operation.tools_executed !== true &&
    !retryBudgetExhausted;
}

function receiptId(value) {
  return 'route-' + crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20);
}

class MultiProvidersRouter {
  constructor({ providerRegistry, modelRegistry, runtimeState, clock = () => Date.now() }) {
    if (!providerRegistry || !modelRegistry || !runtimeState) throw new MultiProvidersError('routing_dependency_required');
    this.providerRegistry = providerRegistry;
    this.modelRegistry = modelRegistry;
    this.runtimeState = runtimeState;
    this.clock = clock;
  }

  evaluateOffering(request, offering, policy, now) {
    const provider = this.providerRegistry.get(request.tenant_id, offering.provider_id);
    const reasons = [];
    if (!provider) reasons.push('orphan_provider');
    if (request.exclusions.includes(offering.provider_id)) reasons.push('excluded_by_policy');
    if (request.mode === 'manual' && offering.provider_id !== request.provider_id) reasons.push('not_manual_target');

    let eligibility = null;
    if (provider) {
      eligibility = this.runtimeState.eligibility(
        request.tenant_id,
        offering.provider_id,
        request.model_id,
        request.required_capabilities,
        { deployment: offering.deployment || 'default' },
      );
      reasons.push(...eligibility.reasons);
    }

    const cost = provider ? costEstimate(provider, now) : null;
    if (request.max_cost_usd !== null && cost === null) reasons.push('cost_unknown');
    if (request.max_cost_usd !== null && cost !== null && cost > request.max_cost_usd) reasons.push('cost_limit_exceeded');

    const latency = provider ? latencyEstimate(provider, now) : null;
    if (request.max_latency_ms !== null && latency === null) reasons.push('latency_unknown');
    if (request.max_latency_ms !== null && latency !== null && latency > request.max_latency_ms) reasons.push('latency_limit_exceeded');

    if (provider && Object.keys(request.privacy).length && !privacyMatches(provider, request.privacy)) {
      reasons.push('privacy_requirement_failed');
    }
    if (request.min_context_tokens !== null) {
      const contextLimit = finiteOrNull(offering.context_limits && offering.context_limits.max_tokens);
      if (contextLimit === null) reasons.push('context_unknown');
      else if (contextLimit < request.min_context_tokens) reasons.push('context_limit_exceeded');
    }

    const priority = finiteOrNull(policy.priorities[offering.provider_id]) ?? policy.default_priority;
    const affinity = request.affinity.includes(offering.provider_id) ? 0 : 1;
    return {
      provider_id: offering.provider_id,
      model_id: offering.model_id,
      deployment: offering.deployment || 'default',
      eligible: reasons.length === 0,
      reasons: [...new Set(reasons)],
      priority,
      affinity,
      cost_usd: cost,
      latency_ms: latency,
      confidence: reasons.length === 0 ? 'validated' : 'rejected',
      eligibility,
    };
  }

  route(input) {
    if (!input || typeof input !== 'object') throw new MultiProvidersError('invalid_route_request');
    assertNoSecrets(input, 'route_request');
    const mode = input.mode || 'automatic';
    if (!['manual', 'automatic'].includes(mode)) throw new MultiProvidersError('invalid_routing_mode');
    const request = {
      tenant_id: requiredString(input.tenant_id, 'tenant_id'),
      model_id: requiredString(input.model_id, 'model_id'),
      mode,
      provider_id: input.provider_id || null,
      required_capabilities: Array.isArray(input.required_capabilities) ? [...new Set(input.required_capabilities.map(String))] : [],
      privacy: input.privacy && typeof input.privacy === 'object' ? { ...input.privacy } : {},
      max_cost_usd: input.max_cost_usd === undefined || input.max_cost_usd === null ? null : input.max_cost_usd,
      max_latency_ms: input.max_latency_ms === undefined || input.max_latency_ms === null ? null : input.max_latency_ms,
      min_context_tokens: input.min_context_tokens === undefined || input.min_context_tokens === null ? null : input.min_context_tokens,
      exclusions: Array.isArray(input.exclusions) ? [...new Set(input.exclusions.map(String))] : [],
      affinity: Array.isArray(input.affinity) ? [...new Set(input.affinity.map(String))] : [],
      operation: input.operation && typeof input.operation === 'object' ? { ...input.operation } : {},
    };
    if (mode === 'manual') requiredString(request.provider_id, 'provider_id');
    if (request.max_cost_usd !== null && (!Number.isFinite(request.max_cost_usd) || request.max_cost_usd < 0)) {
      throw new MultiProvidersError('invalid_cost_limit');
    }
    if (request.max_latency_ms !== null && (!Number.isFinite(request.max_latency_ms) || request.max_latency_ms < 0)) {
      throw new MultiProvidersError('invalid_latency_limit');
    }
    if (request.min_context_tokens !== null && (!Number.isInteger(request.min_context_tokens) || request.min_context_tokens <= 0)) {
      throw new MultiProvidersError('invalid_context_requirement');
    }

    const priorities = input.policy && input.policy.priorities && typeof input.policy.priorities === 'object'
      ? { ...input.policy.priorities }
      : {};
    for (const [providerId, priority] of Object.entries(priorities)) {
      if (!Number.isFinite(priority)) throw new MultiProvidersError('invalid_policy_priority', { provider_id: providerId });
    }
    const defaultPriority = input.policy && input.policy.default_priority;
    if (defaultPriority !== undefined && !Number.isFinite(defaultPriority)) throw new MultiProvidersError('invalid_default_priority');
    const policy = {
      version: requiredString(input.policy && input.policy.version, 'policy.version'),
      priorities,
      default_priority: defaultPriority ?? 1000,
    };
    const now = this.clock();
    const offerings = this.modelRegistry.listOfferings(request.tenant_id, request.model_id);
    const candidates = offerings.map(offering => this.evaluateOffering(request, offering, policy, now));
    candidates.sort((a, b) =>
      a.priority - b.priority ||
      a.affinity - b.affinity ||
      (a.cost_usd ?? Number.POSITIVE_INFINITY) - (b.cost_usd ?? Number.POSITIVE_INFINITY) ||
      (a.latency_ms ?? Number.POSITIVE_INFINITY) - (b.latency_ms ?? Number.POSITIVE_INFINITY) ||
      a.provider_id.localeCompare(b.provider_id) ||
      a.deployment.localeCompare(b.deployment)
    );
    const eligible = candidates.filter(candidate => candidate.eligible);
    const selected = eligible[0] || null;
    const canFailover = failoverAllowed(request.operation);
    const failover = {
      allowed: canFailover,
      reason: canFailover ? null : 'operation_not_safe_to_retry',
      candidates: canFailover ? eligible.slice(1).map(candidate => ({
        provider_id: candidate.provider_id,
        deployment: candidate.deployment,
      })) : [],
    };
    const receipt = {
      policy_version: policy.version,
      mode,
      tenant_id: request.tenant_id,
      model_id: request.model_id,
      requirements: {
        capabilities: request.required_capabilities,
        privacy: request.privacy,
        max_cost_usd: request.max_cost_usd,
        max_latency_ms: request.max_latency_ms,
        min_context_tokens: request.min_context_tokens,
        exclusions: request.exclusions,
        affinity: request.affinity,
      },
      candidates,
      selected: selected ? { provider_id: selected.provider_id, deployment: selected.deployment } : null,
      failover,
      decision: selected ? 'selected' : 'no_eligible_route',
      decided_at: new Date(now).toISOString(),
    };
    receipt.receipt_id = receiptId(receipt);
    return receipt;
  }

  nextFailover(receipt, failedProviderId, operation, errorCategory) {
    if (!receipt || receipt.decision !== 'selected') throw new MultiProvidersError('invalid_route_receipt');
    if (!receipt.failover.allowed || !failoverAllowed(operation, errorCategory)) {
      return { allowed: false, reason: 'failover_not_safe', candidate: null };
    }
    const candidate = receipt.failover.candidates.find(item => item.provider_id !== failedProviderId) || null;
    return {
      allowed: Boolean(candidate),
      reason: candidate ? null : 'no_compatible_failover',
      candidate,
    };
  }
}

module.exports = {
  FAILOVER_ERROR_CATEGORIES,
  MultiProvidersRouter,
  failoverAllowed,
};