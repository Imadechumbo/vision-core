'use strict';

const PROVIDER_STATES = Object.freeze(['discovered', 'registered', 'configured', 'validated', 'ready', 'disabled', 'removed']);
const HEALTH_STATES = Object.freeze(['unknown', 'starting', 'online', 'degraded', 'offline', 'stopping']);
const MODEL_STATES = Object.freeze(['known', 'available', 'deprecated', 'retired']);
const TRANSITIONS = Object.freeze({
  discovered: ['registered', 'removed'],
  registered: ['configured', 'disabled', 'removed'],
  configured: ['validated', 'disabled', 'removed'],
  validated: ['ready', 'configured', 'disabled', 'removed'],
  ready: ['configured', 'disabled', 'removed'],
  disabled: ['configured', 'removed'],
  removed: [],
});

class MultiProvidersError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'MultiProvidersError';
    this.code = code;
    this.details = details;
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new MultiProvidersError('invalid_field', { field });
  return value.trim();
}
function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MultiProvidersError('invalid_field', { field });
  return value;
}
function requiredArray(value, field) {
  if (!Array.isArray(value)) throw new MultiProvidersError('invalid_field', { field });
  return value;
}
function optionalNumber(value, field) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new MultiProvidersError('invalid_field', { field });
  return value;
}
function assertNoSecrets(value, path = 'root') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['key', 'api_key', 'token', 'secret', 'password', 'authorization'].includes(key.toLowerCase())) {
      throw new MultiProvidersError('secret_field_forbidden', { field: path + '.' + key });
    }
    assertNoSecrets(child, path + '.' + key);
  }
}
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function scopeKey(tenantId, id) {
  return JSON.stringify([requiredString(tenantId, 'tenant_id'), requiredString(id, 'id')]);
}
function normalizeVersions(input = {}) {
  const names = ['contract', 'provider', 'transport', 'configuration'];
  const out = {};
  for (const name of names) out[name] = requiredString(input[name], 'versions.' + name);
  return out;
}
function normalizeHealth(input) {
  if (typeof input === 'boolean') throw new MultiProvidersError('boolean_health_forbidden');
  requiredObject(input, 'health');
  const status = input.status || 'unknown';
  if (!HEALTH_STATES.includes(status)) throw new MultiProvidersError('invalid_health_status', { status });
  return {
    status,
    checked_at: input.checked_at || null,
    valid_until: input.valid_until || null,
    ttl_ms: optionalNumber(input.ttl_ms, 'health.ttl_ms'),
    latency_ms: optionalNumber(input.latency_ms, 'health.latency_ms'),
    failure_reason: input.failure_reason || null,
    consecutive_failures: optionalNumber(input.consecutive_failures, 'health.consecutive_failures') || 0,
    consecutive_successes: optionalNumber(input.consecutive_successes, 'health.consecutive_successes') || 0,
    source: input.source || null,
    scope: input.scope || 'provider',
    evidence: clone(input.evidence || null),
    last_transition_at: input.last_transition_at || null,
  };
}
function normalizeCapability(input) {
  if (!input || typeof input !== 'object') throw new MultiProvidersError('invalid_capability');
  assertNoSecrets(input, 'capability');
  const availability = input.availability || 'unknown';
  if (!['unknown', 'unsupported', 'declared', 'validated', 'degraded'].includes(availability)) {
    throw new MultiProvidersError('invalid_capability_availability', { availability });
  }
  return {
    capability_id: requiredString(input.capability_id, 'capability.capability_id'),
    capability_version: requiredString(input.capability_version, 'capability.capability_version'),
    availability,
    limitations: clone(input.limitations || {}),
    source: input.source || null,
    validated_at: input.validated_at || null,
    valid_until: input.valid_until || null,
    evidence: clone(input.evidence || null),
  };
}
function normalizeProvider(input) {
  if (!input || typeof input !== 'object') throw new MultiProvidersError('invalid_provider');
  assertNoSecrets(input, 'provider');
  const known = new Set(['id','tenant_id','display_name','vendor','transport','location','models','capabilities','health','status','latency','cost','privacy','context','reasoning','streaming','tools','multimodal','versions','configuration_ref','evidence','created_at','updated_at','extensions']);
  const extensions = clone(requiredObject(input.extensions || {}, 'extensions'));
  for (const [key, value] of Object.entries(input)) if (!known.has(key)) extensions[key] = clone(value);
  const status = requiredString(input.status, 'status');
  if (!PROVIDER_STATES.includes(status)) throw new MultiProvidersError('invalid_provider_status', { status });
  return {
    id: requiredString(input.id, 'id'),
    tenant_id: requiredString(input.tenant_id, 'tenant_id'),
    display_name: requiredString(input.display_name, 'display_name'),
    vendor: requiredString(input.vendor, 'vendor'),
    transport: clone(requiredObject(input.transport, 'transport')),
    location: requiredString(input.location, 'location'),
    models: [...new Set(requiredArray(input.models, 'models').map(value => requiredString(value, 'models[]')))],
    capabilities: requiredArray(input.capabilities, 'capabilities').map(normalizeCapability),
    health: normalizeHealth(input.health),
    status,
    latency: clone(requiredObject(input.latency, 'latency')),
    cost: clone(requiredObject(input.cost, 'cost')),
    privacy: clone(requiredObject(input.privacy, 'privacy')),
    context: clone(requiredObject(input.context, 'context')),
    reasoning: clone(requiredObject(input.reasoning, 'reasoning')),
    streaming: clone(requiredObject(input.streaming, 'streaming')),
    tools: clone(requiredObject(input.tools, 'tools')),
    multimodal: clone(requiredObject(input.multimodal, 'multimodal')),
    versions: normalizeVersions(input.versions),
    configuration_ref: input.configuration_ref || null,
    evidence: clone(input.evidence || null),
    created_at: input.created_at || new Date().toISOString(),
    updated_at: input.updated_at || new Date().toISOString(),
    extensions,
  };
}
function normalizeModel(input) {
  if (!input || typeof input !== 'object') throw new MultiProvidersError('invalid_model');
  assertNoSecrets(input, 'model');
  const lifecycle = input.lifecycle || 'known';
  if (!MODEL_STATES.includes(lifecycle)) throw new MultiProvidersError('invalid_model_lifecycle', { lifecycle });
  return {
    id: requiredString(input.id, 'id'),
    tenant_id: requiredString(input.tenant_id, 'tenant_id'),
    family: requiredString(input.family, 'family'),
    display_name: requiredString(input.display_name, 'display_name'),
    model_version: requiredString(input.model_version, 'model_version'),
    variant: input.variant || null,
    quantization: input.quantization || null,
    modalities: clone(requiredArray(input.modalities, 'modalities')),
    capabilities: requiredArray(input.capabilities, 'capabilities').map(normalizeCapability),
    context_limits: clone(requiredObject(input.context_limits, 'context_limits')),
    lifecycle,
    extensions: clone(input.extensions || {}),
  };
}

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.discoveries = new Map();
  }
  register(input, { expected_configuration_version = null } = {}) {
    const provider = normalizeProvider(input);
    const key = scopeKey(provider.tenant_id, provider.id);
    const existing = this.providers.get(key);
    if (existing && expected_configuration_version === null) {
      const comparable = value => JSON.stringify({ ...value, created_at: null, updated_at: null });
      if (comparable(existing) === comparable(provider)) return clone(existing);
      throw new MultiProvidersError('provider_already_registered');
    }
    if (existing && existing.versions.configuration !== expected_configuration_version) throw new MultiProvidersError('version_conflict');
    this.providers.set(key, clone(provider));
    return clone(provider);
  }
  get(tenantId, id) {
    const value = this.providers.get(scopeKey(tenantId, id));
    return value ? clone(value) : null;
  }
  list(tenantId) {
    const scope = requiredString(tenantId, 'tenant_id');
    return [...this.providers.values()].filter(value => value.tenant_id === scope).map(clone);
  }
  discover(tenantId, candidate) {
    if (!candidate || typeof candidate !== 'object') throw new MultiProvidersError('invalid_discovery');
    const record = {
      tenant_id: requiredString(tenantId, 'tenant_id'),
      proposed_id: requiredString(candidate.proposed_id, 'proposed_id'),
      source: requiredString(candidate.source, 'source'),
      confidence: optionalNumber(candidate.confidence, 'confidence'),
      valid_until: candidate.valid_until || null,
      evidence: clone(candidate.evidence || null),
    };
    this.discoveries.set(scopeKey(record.tenant_id, record.proposed_id), record);
    return clone(record);
  }
  configure(tenantId, id, configurationRef, expectedConfigurationVersion, nextConfigurationVersion) {
    const provider = this.get(tenantId, id);
    if (!provider) throw new MultiProvidersError('provider_not_found');
    if (provider.versions.configuration !== requiredString(expectedConfigurationVersion, 'expected_configuration_version')) throw new MultiProvidersError('version_conflict');
    provider.configuration_ref = requiredString(configurationRef, 'configuration_ref');
    provider.versions.configuration = requiredString(nextConfigurationVersion, 'next_configuration_version');
    if (provider.versions.configuration === expectedConfigurationVersion) throw new MultiProvidersError('version_not_advanced');
    if (provider.status === 'registered' || provider.status === 'disabled') provider.status = 'configured';
    return this.register(provider, { expected_configuration_version: expectedConfigurationVersion });
  }
  transition(tenantId, id, nextStatus, { expected_status = null } = {}) {
    const key = scopeKey(tenantId, id);
    const provider = this.providers.get(key);
    if (!provider) throw new MultiProvidersError('provider_not_found');
    if (expected_status !== null && provider.status !== expected_status) throw new MultiProvidersError('lifecycle_conflict', { expected: expected_status, actual: provider.status });
    if (!PROVIDER_STATES.includes(nextStatus) || !TRANSITIONS[provider.status].includes(nextStatus)) {
      throw new MultiProvidersError('invalid_lifecycle_transition', { from: provider.status, to: nextStatus });
    }
    provider.status = nextStatus;
    provider.updated_at = new Date().toISOString();
    return clone(provider);
  }
  unregister(tenantId, id, modelRegistry = null) {
    const key = scopeKey(tenantId, id);
    if (!this.providers.has(key)) throw new MultiProvidersError('provider_not_found');
    if (modelRegistry && modelRegistry.hasOfferingsForProvider(tenantId, id)) throw new MultiProvidersError('provider_has_offerings');
    const provider = this.providers.get(key);
    if (provider.status !== 'removed') {
      if (!TRANSITIONS[provider.status].includes('removed')) throw new MultiProvidersError('invalid_lifecycle_transition', { from: provider.status, to: 'removed' });
      provider.status = 'removed';
      provider.updated_at = new Date().toISOString();
    }
    return clone(provider);
  }
}

class ModelRegistry {
  constructor(providerRegistry) {
    this.providerRegistry = providerRegistry;
    this.models = new Map();
    this.aliases = new Map();
    this.offerings = new Map();
  }
  register(input) {
    const model = normalizeModel(input);
    const key = scopeKey(model.tenant_id, model.id);
    if (this.models.has(key)) throw new MultiProvidersError('model_already_registered');
    this.models.set(key, clone(model));
    return clone(model);
  }
  get(tenantId, id) {
    const model = this.models.get(scopeKey(tenantId, id));
    return model ? clone(model) : null;
  }
  list(tenantId) {
    const scope = requiredString(tenantId, 'tenant_id');
    return [...this.models.values()].filter(value => value.tenant_id === scope).map(clone);
  }
  addAlias(tenantId, alias, target) {
    this.addAliases(tenantId, [{ alias, target }]);
  }
  addAliases(tenantId, entries) {
    if (!Array.isArray(entries) || entries.length === 0) throw new MultiProvidersError('invalid_aliases');
    const previous = new Map(this.aliases);
    try {
      for (const entry of entries) {
        const aliasKey = scopeKey(tenantId, entry.alias);
        if (this.models.has(aliasKey)) throw new MultiProvidersError('alias_overwrites_model');
        const target = requiredString(entry.target, 'target');
        if (this.aliases.has(aliasKey) && this.aliases.get(aliasKey) !== target) throw new MultiProvidersError('alias_ambiguous');
        this.aliases.set(aliasKey, target);
      }
      for (const entry of entries) this.resolveAlias(tenantId, entry.alias);
    } catch (error) {
      this.aliases = previous;
      throw error;
    }
  }
  resolveAlias(tenantId, value) {
    let current = requiredString(value, 'alias');
    const seen = new Set();
    while (this.aliases.has(scopeKey(tenantId, current))) {
      if (seen.has(current)) throw new MultiProvidersError('alias_loop');
      seen.add(current);
      current = this.aliases.get(scopeKey(tenantId, current));
    }
    if (!this.models.has(scopeKey(tenantId, current))) throw new MultiProvidersError('model_not_found');
    return current;
  }
  linkOffering(tenantId, providerId, modelId, offering = {}) {
    if (!this.providerRegistry.get(tenantId, providerId)) throw new MultiProvidersError('orphan_provider');
    if (!this.models.has(scopeKey(tenantId, modelId))) throw new MultiProvidersError('orphan_model');
    const key = JSON.stringify([requiredString(tenantId, 'tenant_id'), requiredString(providerId, 'provider_id'), requiredString(modelId, 'model_id'), offering.deployment || 'default']);
    if (this.offerings.has(key)) throw new MultiProvidersError('offering_already_registered');
    const normalized = {
      tenant_id: tenantId,
      provider_id: providerId,
      model_id: modelId,
      provider_model_id: requiredString(offering.provider_model_id, 'provider_model_id'),
      deployment: offering.deployment || null,
      snapshot: offering.snapshot || null,
      endpoint_ref: offering.endpoint_ref || null,
      versions: normalizeVersions(requiredObject(offering.versions, 'offering.versions')),
      capabilities: Array.isArray(offering.capabilities) ? offering.capabilities.map(normalizeCapability) : [],
      context_limits: clone(requiredObject(offering.context_limits || {}, 'offering.context_limits')),
    };
    this.offerings.set(key, normalized);
    const modelKey = scopeKey(tenantId, modelId);
    const model = this.models.get(modelKey);
    if (model.lifecycle === 'known') model.lifecycle = 'available';
    return clone(normalized);
  }
  unlinkOffering(tenantId, providerId, modelId, deployment = 'default') {
    const key = JSON.stringify([requiredString(tenantId, 'tenant_id'), requiredString(providerId, 'provider_id'), requiredString(modelId, 'model_id'), deployment]);
    if (!this.offerings.delete(key)) throw new MultiProvidersError('offering_not_found');
    if (!this.listOfferings(tenantId, modelId).length) this.models.get(scopeKey(tenantId, modelId)).lifecycle = 'known';
  }
  hasOfferingsForProvider(tenantId, providerId) {
    return [...this.offerings.values()].some(o => o.tenant_id === tenantId && o.provider_id === providerId);
  }
  listOfferings(tenantId, modelId = null) {
    return [...this.offerings.values()].filter(o => o.tenant_id === tenantId && (!modelId || o.model_id === modelId)).map(clone);
  }
}

module.exports = {
  PROVIDER_STATES,
  HEALTH_STATES,
  MODEL_STATES,
  MultiProvidersError,
  normalizeProvider,
  normalizeModel,
  normalizeCapability,
  assertNoSecrets,
  ProviderRegistry,
  ModelRegistry,
};
