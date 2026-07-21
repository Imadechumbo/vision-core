'use strict';

const {
  HEALTH_STATES,
  MultiProvidersError,
  assertNoSecrets,
} = require('./multiproviders-domain');

const HEALTH_SCOPES = Object.freeze(['provider', 'transport', 'model', 'capability', 'credential', 'endpoint']);
const CAPABILITY_AVAILABILITY = Object.freeze(['unsupported', 'unknown', 'declared', 'degraded', 'validated']);

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new MultiProvidersError('invalid_field', { field });
  return value.trim();
}

function nonNegativeNumber(value, field, integer = false) {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new MultiProvidersError('invalid_field', { field });
  }
  return value;
}

function validTime(value, field) {
  const timestamp = Date.parse(requiredString(value, field));
  if (!Number.isFinite(timestamp)) throw new MultiProvidersError('invalid_timestamp', { field });
  return timestamp;
}

function healthKey(tenantId, target) {
  const scope = requiredString(target.scope, 'scope');
  if (!HEALTH_SCOPES.includes(scope)) throw new MultiProvidersError('invalid_health_scope', { scope });
  let identity;
  if (scope === 'provider') identity = [requiredString(target.provider_id, 'provider_id')];
  if (scope === 'transport') identity = [requiredString(target.provider_id, 'provider_id'), requiredString(target.transport_id, 'transport_id')];
  if (scope === 'model') identity = [target.provider_id || null, requiredString(target.model_id, 'model_id')];
  if (scope === 'capability') {
    if (!target.provider_id && !target.model_id) throw new MultiProvidersError('capability_owner_required');
    identity = [target.provider_id || null, target.model_id || null, requiredString(target.capability_id, 'capability_id')];
  }
  if (scope === 'credential') identity = [requiredString(target.provider_id, 'provider_id'), requiredString(target.credential_ref, 'credential_ref')];
  if (scope === 'endpoint') identity = [requiredString(target.provider_id, 'provider_id'), requiredString(target.endpoint_ref, 'endpoint_ref')];
  return JSON.stringify([requiredString(tenantId, 'tenant_id'), scope, identity]);
}

function unknownHealth(target, reason, transitionAt = null) {
  return {
    status: 'unknown',
    checked_at: null,
    valid_until: null,
    ttl_ms: null,
    latency_ms: null,
    failure_reason: reason,
    consecutive_failures: 0,
    consecutive_successes: 0,
    source: null,
    scope: target.scope,
    evidence: null,
    last_transition_at: transitionAt,
  };
}

function normalizeObservation(target, observation, previous, now) {
  if (!observation || typeof observation !== 'object' || typeof observation === 'boolean') {
    throw new MultiProvidersError('invalid_health_observation');
  }
  assertNoSecrets(observation, 'health');
  const status = requiredString(observation.status, 'health.status');
  if (!HEALTH_STATES.includes(status)) throw new MultiProvidersError('invalid_health_status', { status });
  const checkedAt = validTime(observation.checked_at, 'health.checked_at');
  if (checkedAt > now) throw new MultiProvidersError('future_health_observation');
  const ttlMs = nonNegativeNumber(observation.ttl_ms, 'health.ttl_ms');
  if (ttlMs !== null && ttlMs === 0) throw new MultiProvidersError('invalid_health_ttl');
  let validUntil = observation.valid_until ? validTime(observation.valid_until, 'health.valid_until') : null;
  if (validUntil === null && ttlMs !== null) validUntil = checkedAt + ttlMs;
  if (status !== 'unknown' && validUntil === null) throw new MultiProvidersError('health_validity_required');
  if (validUntil !== null && validUntil <= checkedAt) throw new MultiProvidersError('invalid_health_validity');
  if (status !== 'unknown' && (!observation.evidence || !observation.source)) {
    throw new MultiProvidersError('health_evidence_required');
  }
  const changed = !previous || previous.status !== status;
  return {
    status,
    checked_at: new Date(checkedAt).toISOString(),
    valid_until: validUntil === null ? null : new Date(validUntil).toISOString(),
    ttl_ms: ttlMs,
    latency_ms: nonNegativeNumber(observation.latency_ms, 'health.latency_ms'),
    failure_reason: observation.failure_reason || null,
    consecutive_failures: nonNegativeNumber(observation.consecutive_failures, 'health.consecutive_failures', true) || 0,
    consecutive_successes: nonNegativeNumber(observation.consecutive_successes, 'health.consecutive_successes', true) || 0,
    source: observation.source ? requiredString(observation.source, 'health.source') : null,
    scope: target.scope,
    evidence: observation.evidence || null,
    last_transition_at: changed ? new Date(now).toISOString() : previous.last_transition_at,
  };
}

function capabilityState(capabilities, capabilityId, now) {
  const item = Array.isArray(capabilities)
    ? capabilities.find(capability => capability.capability_id === capabilityId)
    : null;
  if (!item) return { availability: 'unknown', reason: 'not_declared' };
  if (!CAPABILITY_AVAILABILITY.includes(item.availability)) {
    throw new MultiProvidersError('invalid_capability_availability', { availability: item.availability });
  }
  if (item.availability === 'validated' || item.availability === 'degraded') {
    const validatedAt = Date.parse(item.validated_at || '');
    const validUntil = Date.parse(item.valid_until || '');
    if (!item.evidence || !item.source || !Number.isFinite(validatedAt) || validatedAt > now ||
        !Number.isFinite(validUntil) || validUntil <= now) {
      return { ...item, availability: 'unknown', reason: 'evidence_missing_or_stale' };
    }
  }
  return { ...item, reason: null };
}

class MultiProvidersRuntimeState {
  constructor({ providerRegistry, modelRegistry, clock = () => Date.now() }) {
    if (!providerRegistry || !modelRegistry) throw new MultiProvidersError('registry_required');
    this.providerRegistry = providerRegistry;
    this.modelRegistry = modelRegistry;
    this.clock = clock;
    this.health = new Map();
  }

  assertTarget(tenantId, target) {
    if (target.provider_id && !this.providerRegistry.get(tenantId, target.provider_id)) {
      throw new MultiProvidersError('orphan_provider');
    }
    if (target.model_id && !this.modelRegistry.get(tenantId, target.model_id)) {
      throw new MultiProvidersError('orphan_model');
    }
    healthKey(tenantId, target);
  }

  observeHealth(tenantId, target, observation) {
    this.assertTarget(tenantId, target);
    const key = healthKey(tenantId, target);
    const normalized = normalizeObservation(target, observation, this.health.get(key), this.clock());
    this.health.set(key, normalized);
    return JSON.parse(JSON.stringify(normalized));
  }

  effectiveHealth(tenantId, target) {
    this.assertTarget(tenantId, target);
    const now = this.clock();
    const value = this.health.get(healthKey(tenantId, target));
    if (!value) return unknownHealth(target, 'no_observation');
    if (value.valid_until && Date.parse(value.valid_until) <= now) return unknownHealth(target, 'stale_observation', value.valid_until);
    return JSON.parse(JSON.stringify(value));
  }

  resolveCapability(tenantId, providerId, modelId, capabilityId, deployment = 'default') {
    const provider = this.providerRegistry.get(tenantId, providerId);
    const model = this.modelRegistry.get(tenantId, modelId);
    if (!provider) throw new MultiProvidersError('orphan_provider');
    if (!model) throw new MultiProvidersError('orphan_model');
    const offering = this.modelRegistry.listOfferings(tenantId, modelId)
      .find(item => item.provider_id === providerId && (item.deployment || 'default') === deployment);
    if (!offering) throw new MultiProvidersError('offering_not_found');
    const now = this.clock();
    const scopes = {
      provider: capabilityState(provider.capabilities, capabilityId, now),
      model: capabilityState(model.capabilities, capabilityId, now),
      offering: capabilityState(offering.capabilities, capabilityId, now),
    };
    const satisfied = Object.values(scopes).every(item => item.availability === 'validated');
    return { capability_id: capabilityId, scopes, satisfied };
  }

  eligibility(tenantId, providerId, modelId, requiredCapabilities = [], { deployment = 'default' } = {}) {
    const provider = this.providerRegistry.get(tenantId, providerId);
    if (!provider) throw new MultiProvidersError('orphan_provider');
    if (!this.modelRegistry.get(tenantId, modelId)) throw new MultiProvidersError('orphan_model');
    const reasons = [];
    if (provider.status !== 'ready') reasons.push('provider_not_ready');
    const providerHealth = this.effectiveHealth(tenantId, { scope: 'provider', provider_id: providerId });
    const modelHealth = this.effectiveHealth(tenantId, { scope: 'model', provider_id: providerId, model_id: modelId });
    if (!['online', 'degraded'].includes(providerHealth.status)) reasons.push('provider_health_' + providerHealth.status);
    if (!['online', 'degraded'].includes(modelHealth.status)) reasons.push('model_health_' + modelHealth.status);
    const capabilities = requiredCapabilities.map(id => this.resolveCapability(tenantId, providerId, modelId, id, deployment));
    if (capabilities.some(item => !item.satisfied)) reasons.push('capability_not_validated');
    return {
      eligible: reasons.length === 0,
      reasons,
      provider_health: providerHealth,
      model_health: modelHealth,
      capabilities,
    };
  }
}

module.exports = {
  HEALTH_SCOPES,
  CAPABILITY_AVAILABILITY,
  MultiProvidersRuntimeState,
  capabilityState,
};