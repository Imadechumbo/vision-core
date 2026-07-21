'use strict';

const crypto = require('crypto');
const {
  MultiProvidersError,
  normalizeProvider,
  normalizeModel,
} = require('./multiproviders-domain');

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex').slice(0, 16);
}

function requireLegacyDescriptor(value) {
  if (!value || typeof value !== 'object') throw new MultiProvidersError('invalid_legacy_descriptor');
  if (typeof value.id !== 'string' || !value.id.trim()) throw new MultiProvidersError('invalid_legacy_provider_id');

  if ('key' in value || 'api_key' in value || 'token' in value || 'secret' in value) {
    throw new MultiProvidersError('legacy_secret_forbidden');
  }
  return value;
}

class LegacyCompatibilityBridge {
  constructor({ providerRegistry, modelRegistry, tenant_id = 'vision-core-system' }) {
    if (!providerRegistry || !modelRegistry) throw new MultiProvidersError('registry_required');
    this.providerRegistry = providerRegistry;
    this.modelRegistry = modelRegistry;
    this.tenantId = tenant_id;
    this.legacyExecution = new Map();
    this.receipts = [];
  }

  translate(descriptor) {
    const legacy = requireLegacyDescriptor(descriptor);
    const providerId = legacy.id.trim();
    const hasModel = typeof legacy.model === 'string' && Boolean(legacy.model.trim());
    const modelId = hasModel ? (legacy.canonical_model_id || legacy.model.trim()) : null;
    const configurationVersion = 'legacy-' + fingerprint({
      endpoint_ref: legacy.endpoint_ref || null,

      transport_type: legacy.transport_type || 'legacy',
    });
    const capability = {
      capability_id: 'chat',
      capability_version: '1',
      availability: 'declared',
      source: 'legacy-compatibility-bridge',
      evidence: { source_ref: legacy.source_ref || null },
    };
    const provider = normalizeProvider({
      id: providerId,
      tenant_id: this.tenantId,
      display_name: legacy.display_name || providerId,
      vendor: legacy.vendor || 'unknown',
      transport: {
        transport_type: legacy.transport_type || 'legacy',
        endpoint_ref: legacy.endpoint_ref || null,
      },
      location: legacy.location || 'unknown',
      models: modelId ? [modelId] : [],
      capabilities: [capability],
      health: { status: 'unknown', scope: 'provider', source: 'legacy-compatibility-bridge' },
      status: 'discovered',
      latency: { status: 'unknown' },
      cost: { category: 'unknown' },
      privacy: { properties: {}, unknown: true },
      context: { status: 'unknown' },
      reasoning: { availability: 'unknown' },
      streaming: { availability: 'unknown' },
      tools: { availability: 'unknown' },
      multimodal: { availability: 'unknown' },
      versions: {
        contract: '1',
        provider: legacy.provider_version || 'legacy-unknown',
        transport: legacy.transport_version || 'legacy-unknown',
        configuration: configurationVersion,
      },
      evidence: { source: 'legacy-compatibility-bridge', source_ref: legacy.source_ref || null },
    });
    const model = modelId ? normalizeModel({
      id: modelId,
      tenant_id: this.tenantId,
      family: legacy.model_family || 'unknown',
      display_name: legacy.model_display_name || modelId,
      model_version: legacy.model_version || 'legacy-unknown',
      variant: legacy.model_variant || null,
      quantization: legacy.quantization || null,
      modalities: legacy.modalities || ['text'],
      capabilities: [capability],
      context_limits: { status: 'unknown' },
      lifecycle: 'known',
      extensions: {},
    }) : null;
    const offering = modelId ? {
      provider_model_id: legacy.model,
      deployment: legacy.deployment || null,
      endpoint_ref: legacy.endpoint_ref || null,
      versions: provider.versions,
      capabilities: [capability],
      context_limits: { status: 'unknown' },
    } : null;
    return { provider, model, offering, configured: Boolean(legacy.configured) };
  }

  sync(descriptors) {
    if (!Array.isArray(descriptors)) throw new MultiProvidersError('invalid_legacy_catalog');
    const seen = new Set();
    const receipt = {
      receipt_id: 'legacy-sync-' + fingerprint({ tenant_id: this.tenantId, descriptors }),
      tenant_id: this.tenantId,
      translated: [],
      incompatible: [],
      missing_since_last_sync: [],
    };

    for (const raw of descriptors) {
      try {
        const translated = this.translate(raw);
        const id = translated.provider.id;
        if (seen.has(id)) throw new MultiProvidersError('duplicate_legacy_provider');
        seen.add(id);

        const existingProvider = this.providerRegistry.get(this.tenantId, id);
        const desiredConfigurationVersion = translated.provider.versions.configuration + (translated.configured ? '-configured' : '');
        if (!existingProvider) {
          this.providerRegistry.register(translated.provider);
          this.providerRegistry.transition(this.tenantId, id, 'registered', { expected_status: 'discovered' });
          if (translated.configured) {
            this.providerRegistry.configure(
              this.tenantId,
              id,
              raw.configuration_ref || 'legacy-ref://' + id,
              translated.provider.versions.configuration,
              desiredConfigurationVersion,
            );
          }
        } else {
          if (existingProvider.status === 'removed') throw new MultiProvidersError('removed_provider_cannot_return');
          if (translated.configured && existingProvider.status === 'registered') {
            this.providerRegistry.configure(
              this.tenantId,
              id,
              raw.configuration_ref || 'legacy-ref://' + id,
              existingProvider.versions.configuration,
              desiredConfigurationVersion,
            );
          } else if (existingProvider.versions.configuration !== desiredConfigurationVersion) {
            const updated = {
              ...translated.provider,
              status: existingProvider.status,
              configuration_ref: existingProvider.configuration_ref,
              created_at: existingProvider.created_at,
              models: [...new Set(existingProvider.models.concat(translated.provider.models))],
              versions: { ...translated.provider.versions, configuration: desiredConfigurationVersion },
            };
            this.providerRegistry.register(updated, { expected_configuration_version: existingProvider.versions.configuration });
          } else if (translated.model && !existingProvider.models.includes(translated.model.id)) {
            this.providerRegistry.register({
              ...existingProvider,
              models: existingProvider.models.concat(translated.model.id),
            }, { expected_configuration_version: existingProvider.versions.configuration });
          }
        }

        if (translated.model) {
          if (!this.modelRegistry.get(this.tenantId, translated.model.id)) {
            this.modelRegistry.register(translated.model);
          }
          const hasOffering = this.modelRegistry.listOfferings(this.tenantId, translated.model.id)
            .some(item => item.provider_id === id && item.provider_model_id === translated.offering.provider_model_id);
          if (!hasOffering) {
            translated.offering.versions = this.providerRegistry.get(this.tenantId, id).versions;
            this.modelRegistry.linkOffering(this.tenantId, id, translated.model.id, translated.offering);
          }
        }

        this.legacyExecution.set(id, raw.execution_ref || null);
        receipt.translated.push({ provider_id: id, model_id: translated.model ? translated.model.id : null });
      } catch (error) {
        receipt.incompatible.push({
          provider_id: raw && raw.id ? String(raw.id) : null,
          code: error.code || 'legacy_translation_failed',
        });
      }
    }

    for (const provider of this.providerRegistry.list(this.tenantId)) {
      if (!seen.has(provider.id)) receipt.missing_since_last_sync.push(provider.id);
    }
    const lastReceipt = this.receipts[this.receipts.length - 1];
    if (!lastReceipt || lastReceipt.receipt_id !== receipt.receipt_id) {
      this.receipts.push(receipt);
      if (this.receipts.length > 100) this.receipts.shift();
    }
    return JSON.parse(JSON.stringify(receipt));
  }

  resolveExecution(providerId) {
    if (!this.providerRegistry.get(this.tenantId, providerId)) throw new MultiProvidersError('provider_not_found');
    return this.legacyExecution.has(providerId) ? this.legacyExecution.get(providerId) : null;
  }

  listCanonicalProviders() {
    return this.providerRegistry.list(this.tenantId);
  }

  listReceipts() {
    return JSON.parse(JSON.stringify(this.receipts));
  }
}

module.exports = { LegacyCompatibilityBridge, fingerprint };