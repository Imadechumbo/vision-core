'use strict';

const {
  MultiProvidersError,
  assertNoSecrets,
  normalizeModel,
  ProviderRegistry,
  ModelRegistry,
} = require('./multiproviders-domain');

const ADAPTER_ERROR_CATEGORIES = Object.freeze([
  'configuration',
  'authentication',
  'transport',
  'rate_limit',
  'capacity',
  'policy',
  'model_unavailable',
  'timeout',
  'provider_error',
]);

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new MultiProvidersError('invalid_field', { field });
  return value.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeAdapterError(error) {
  const category = error && ADAPTER_ERROR_CATEGORIES.includes(error.category)
    ? error.category
    : 'provider_error';
  return {
    category,
    retryable: Boolean(error && error.retryable),
    message: category,
  };
}

async function withTimeout(task, timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new MultiProvidersError('invalid_timeout');
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => task(controller.signal)),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          const error = new Error('timeout');
          error.category = 'timeout';
          error.retryable = true;
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function validateAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') throw new MultiProvidersError('invalid_adapter');
  requiredString(adapter.adapter_id, 'adapter_id');
  for (const method of ['describe', 'probe', 'invoke']) {
    if (typeof adapter[method] !== 'function') throw new MultiProvidersError('adapter_method_required', { method });
  }
  return adapter;
}

class MultiProvidersAdapterHost {
  constructor({ providerRegistry, modelRegistry, runtimeState, router }) {
    if (!providerRegistry || !modelRegistry || !runtimeState || !router) throw new MultiProvidersError('adapter_dependency_required');
    this.providerRegistry = providerRegistry;
    this.modelRegistry = modelRegistry;
    this.runtimeState = runtimeState;
    this.router = router;
    this.adapters = new Map();
    this.bindings = new Map();
  }

  registerAdapter(adapter) {
    validateAdapter(adapter);
    if (this.adapters.has(adapter.adapter_id)) throw new MultiProvidersError('adapter_already_registered');
    this.adapters.set(adapter.adapter_id, adapter);
  }

  async onboard(adapterId, input) {
    const adapter = this.adapters.get(requiredString(adapterId, 'adapter_id'));
    if (!adapter) throw new MultiProvidersError('adapter_not_found');
    assertNoSecrets(input, 'adapter_onboard');
    const tenantId = requiredString(input.tenant_id, 'tenant_id');
    const description = await adapter.describe({
      tenant_id: tenantId,
      configuration_ref: requiredString(input.configuration_ref, 'configuration_ref'),
      credential_ref: input.credential_ref || null,
    });
    assertNoSecrets(description, 'adapter_description');
    if (!description || !description.provider || !Array.isArray(description.models)) {
      throw new MultiProvidersError('invalid_adapter_description');
    }

    const providerInput = {
      ...description.provider,
      tenant_id: tenantId,
      status: 'discovered',
      health: { status: 'unknown', scope: 'provider' },
      configuration_ref: null,
    };
    const providerId = requiredString(providerInput.id, 'provider.id');
    const preparedModels = description.models.map(modelDescription => ({
      model: { ...modelDescription.model, tenant_id: tenantId },
      offering: modelDescription.offering,
    }));

    // Full preflight before canonical mutation: validates Provider, every Model,
    // every Offering and duplicate identity using disposable registries.
    const scratchProviders = new ProviderRegistry();
    const scratchModels = new ModelRegistry(scratchProviders);
    scratchProviders.register(providerInput);
    for (const prepared of preparedModels) {
      scratchModels.register(prepared.model);
      scratchModels.linkOffering(tenantId, providerId, prepared.model.id, prepared.offering);
      const existingModel = this.modelRegistry.get(tenantId, prepared.model.id);
      if (existingModel) {
        const incomingModel = normalizeModel(prepared.model);
        const comparable = value => JSON.stringify({ ...value, lifecycle: null });
        if (comparable(existingModel) !== comparable(incomingModel)) {
          throw new MultiProvidersError('model_identity_conflict', { model_id: prepared.model.id });
        }
      }
    }

    const bindingKey = JSON.stringify([tenantId, providerId]);
    const existingBinding = this.bindings.get(bindingKey);
    if (existingBinding) {
      if (existingBinding.adapter_id !== adapterId ||
          existingBinding.configuration_ref !== input.configuration_ref ||
          existingBinding.credential_ref !== (input.credential_ref || null)) {
        throw new MultiProvidersError('adapter_binding_conflict');
      }
      return { provider: this.providerRegistry.get(tenantId, providerId), idempotent: true };
    }

    if (this.providerRegistry.get(tenantId, providerId)) throw new MultiProvidersError('provider_binding_required');
    this.providerRegistry.register(providerInput);
    this.providerRegistry.transition(tenantId, providerId, 'registered', { expected_status: 'discovered' });
    const registered = this.providerRegistry.get(tenantId, providerId);
    this.providerRegistry.configure(
      tenantId,
      providerId,
      input.configuration_ref,
      registered.versions.configuration,
      description.configuration_version,
    );

    for (const prepared of preparedModels) {
      if (!this.modelRegistry.get(tenantId, prepared.model.id)) this.modelRegistry.register(prepared.model);
      this.modelRegistry.linkOffering(tenantId, providerId, prepared.model.id, prepared.offering);
    }
    this.bindings.set(bindingKey, {
      adapter_id: adapterId,
      configuration_ref: input.configuration_ref,
      credential_ref: input.credential_ref || null,
    });
    return { provider: this.providerRegistry.get(tenantId, providerId), idempotent: false };
  }

  async certify(tenantId, providerId, { credentialResolver = null, timeout_ms = 5000 } = {}) {
    const binding = this.bindings.get(JSON.stringify([tenantId, providerId]));
    if (!binding) throw new MultiProvidersError('adapter_binding_not_found');
    const adapter = this.adapters.get(binding.adapter_id);
    const credential = binding.credential_ref && credentialResolver
      ? await credentialResolver(binding.credential_ref)
      : null;
    if (binding.credential_ref && !credential) throw new MultiProvidersError('credential_unavailable');

    let probe;
    try {
      probe = await withTimeout(signal => adapter.probe({
        tenant_id: tenantId,
        provider: this.providerRegistry.get(tenantId, providerId),
        models: this.modelRegistry.listOfferings(tenantId).filter(item => item.provider_id === providerId),
        credential,
        signal,
      }), timeout_ms);
    } finally {
      // Credential is never persisted in host, Registry, receipt or error.
    }
    assertNoSecrets(probe, 'adapter_probe');
    if (!probe || !probe.provider_health || !Array.isArray(probe.models) || !Array.isArray(probe.provider_capabilities)) {
      throw new MultiProvidersError('invalid_probe_result');
    }

    const provider = this.providerRegistry.get(tenantId, providerId);
    this.providerRegistry.setCapabilities(tenantId, providerId, probe.provider_capabilities, provider.versions.configuration);
    this.runtimeState.observeHealth(tenantId, { scope: 'provider', provider_id: providerId }, probe.provider_health);
    if (probe.transport_health) {
      this.runtimeState.observeHealth(tenantId, { scope: 'transport', provider_id: providerId, transport_id: 'primary' }, probe.transport_health);
    }
    if (probe.endpoint_health) {
      this.runtimeState.observeHealth(tenantId, { scope: 'endpoint', provider_id: providerId, endpoint_ref: provider.transport.endpoint_ref }, probe.endpoint_health);
    }
    if (probe.credential_health && binding.credential_ref) {
      this.runtimeState.observeHealth(tenantId, { scope: 'credential', provider_id: providerId, credential_ref: binding.credential_ref }, probe.credential_health);
    }

    for (const modelProbe of probe.models) {
      const model = this.modelRegistry.get(tenantId, modelProbe.model_id);
      if (!model) throw new MultiProvidersError('orphan_model');
      this.modelRegistry.setCapabilities(tenantId, model.id, modelProbe.capabilities, model.model_version);
      this.modelRegistry.setOfferingCapabilities(
        tenantId,
        providerId,
        model.id,
        modelProbe.deployment || 'default',
        modelProbe.capabilities,
      );
      this.runtimeState.observeHealth(
        tenantId,
        { scope: 'model', provider_id: providerId, model_id: model.id },
        modelProbe.health,
      );
    }

    const requiredCapabilities = probe.provider_capabilities.map(item => item.capability_id);
    const offerings = this.modelRegistry.listOfferings(tenantId).filter(item => item.provider_id === providerId);
    const eligible = offerings.length > 0 && offerings.every(offering =>
      this.runtimeState.eligibility(
        tenantId,
        providerId,
        offering.model_id,
        requiredCapabilities,
        { deployment: offering.deployment || 'default' },
      ).reasons.every(reason => reason === 'provider_not_ready')
    );
    if (!eligible) throw new MultiProvidersError('adapter_certification_failed');
    this.providerRegistry.transition(tenantId, providerId, 'validated', { expected_status: 'configured' });
    this.providerRegistry.transition(tenantId, providerId, 'ready', { expected_status: 'validated' });
    return { provider_id: providerId, status: 'ready', adapter_id: binding.adapter_id };
  }

  async execute(routeRequest, payload, { credentialResolver = null, timeout_ms = 30000 } = {}) {
    assertNoSecrets(payload, 'adapter_payload');
    const receipt = this.router.route(routeRequest);
    if (!receipt.selected) return { ok: false, error: { category: 'policy', message: 'no_eligible_route' }, receipt };
    const key = JSON.stringify([routeRequest.tenant_id, receipt.selected.provider_id]);
    const binding = this.bindings.get(key);
    if (!binding) throw new MultiProvidersError('adapter_binding_not_found');
    const adapter = this.adapters.get(binding.adapter_id);
    const credential = binding.credential_ref && credentialResolver
      ? await credentialResolver(binding.credential_ref)
      : null;
    if (binding.credential_ref && !credential) {
      return { ok: false, error: { category: 'authentication', message: 'authentication' }, receipt };
    }
    try {
      const result = await withTimeout(signal => adapter.invoke({
        tenant_id: routeRequest.tenant_id,
        provider_id: receipt.selected.provider_id,
        model_id: routeRequest.model_id,
        deployment: receipt.selected.deployment,
        payload: clone(payload),
        credential,
        signal,
      }), timeout_ms);
      return { ok: true, result, receipt };
    } catch (error) {
      return { ok: false, error: normalizeAdapterError(error), receipt };
    }
  }
}

class InMemoryReferenceAdapter {
  constructor({ adapter_id = 'in-memory-reference', description, probe, handler }) {
    this.adapter_id = adapter_id;
    this.description = clone(description);
    this.probeResult = clone(probe);
    this.handler = handler;
  }
  async describe() {
    return clone(this.description);
  }
  async probe() {
    return clone(this.probeResult);
  }
  async invoke(context) {
    if (typeof this.handler !== 'function') throw Object.assign(new Error('unavailable'), { category: 'provider_error' });
    return this.handler(context);
  }
}

module.exports = {
  ADAPTER_ERROR_CATEGORIES,
  MultiProvidersAdapterHost,
  InMemoryReferenceAdapter,
  normalizeAdapterError,
  withTimeout,
  validateAdapter,
};