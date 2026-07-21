#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import domain from '../../backend/multiproviders-domain.js';

const {
  PROVIDER_STATES,
  HEALTH_STATES,
  MultiProvidersError,
  normalizeProvider,
  ProviderRegistry,
  ModelRegistry,
} = domain;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('  PASS ' + name);
    passed += 1;
  } catch (error) {
    console.error('  FAIL ' + name);
    throw error;
  }
}
function throwsCode(fn, code) {
  assert.throws(fn, error => error instanceof MultiProvidersError && error.code === code);
}
function capability(id = 'chat') {
  return { capability_id: id, capability_version: '1', availability: 'declared' };
}
function provider(tenantId = 'tenant-a', id = 'provider-a', extra = {}) {
  return {
    id,
    tenant_id: tenantId,
    display_name: 'Provider A',
    vendor: 'vendor-a',
    transport: { kind: 'http', endpoint_ref: 'vault://provider-a' },
    location: 'remote',
    models: [],
    capabilities: [capability()],
    health: { status: 'unknown', scope: 'provider' },
    status: 'discovered',
    latency: { status: 'unknown' },
    cost: { category: 'unknown' },
    privacy: { properties: {} },
    context: { status: 'unknown' },
    reasoning: { availability: 'unknown' },
    streaming: { availability: 'unknown' },
    tools: { availability: 'unknown' },
    multimodal: { availability: 'unknown' },
    versions: { contract: '1', provider: '1', transport: '1', configuration: '1' },
    ...extra,
  };
}
function model(tenantId = 'tenant-a', id = 'model-a') {
  return {
    id,
    tenant_id: tenantId,
    family: 'family-a',
    display_name: 'Model A',
    model_version: '1',
    modalities: ['text'],
    capabilities: [capability()],
    context_limits: { status: 'unknown' },
  };
}

console.log('=== MultiProviders canonical domain ===');

test('provider contract preserves unknown fields only in extensions', () => {
  const value = normalizeProvider(provider('tenant-a', 'p1', { future_field: { enabled: true } }));
  assert.deepEqual(value.extensions.future_field, { enabled: true });
  assert.equal(value.future_field, undefined);
  assert.equal(value.health.status, 'unknown');
});
test('provider contract rejects missing normative metadata', () => {
  const value = provider();
  delete value.privacy;
  throwsCode(() => normalizeProvider(value), 'invalid_field');
});
test('provider contract rejects missing required identity', () => {
  const value = provider();
  delete value.vendor;
  throwsCode(() => normalizeProvider(value), 'invalid_field');
});
test('secret fields are forbidden recursively but credential references are allowed', () => {
  throwsCode(
    () => normalizeProvider(provider('tenant-a', 'p1', { extensions: { nested: { api_key: 'forbidden' } } })),
    'secret_field_forbidden',
  );
  assert.equal(
    normalizeProvider(provider('tenant-a', 'p1', { transport: { credential_ref: 'vault://credential-a' } })).transport.credential_ref,
    'vault://credential-a',
  );
});test('boolean health is forbidden', () => {
  throwsCode(() => normalizeProvider(provider('tenant-a', 'p1', { health: true })), 'boolean_health_forbidden');
});
test('provider and health state vocabularies remain separate', () => {
  assert(PROVIDER_STATES.includes('ready'));
  assert(!PROVIDER_STATES.includes('offline'));
  assert(HEALTH_STATES.includes('offline'));
  assert(!HEALTH_STATES.includes('ready'));
});
test('domain has no privileged provider or model names', () => {
  const source = fs.readFileSync(new URL('../../backend/multiproviders-domain.js', import.meta.url), 'utf8');
  assert.equal(/\b(openai|anthropic|claude|colibri|ollama|lm studio|gemini|gpt|llama)\b/i.test(source), false);
});

const providers = new ProviderRegistry();
const models = new ModelRegistry(providers);

test('same provider id is isolated by tenant', () => {
  providers.register(provider('tenant-a', 'shared'));
  providers.register(provider('tenant-b', 'shared'));
  assert.equal(providers.list('tenant-a').length, 1);
  assert.equal(providers.list('tenant-b').length, 1);
  assert.equal(providers.get('tenant-c', 'shared'), null);
});
test('provider registration is idempotent but conflicting duplicates fail closed', () => {
  assert.equal(providers.register(provider('tenant-a', 'shared')).id, 'shared');
  throwsCode(
    () => providers.register(provider('tenant-a', 'shared', { display_name: 'Conflicting identity' })),
    'provider_already_registered',
  );
});
test('provider update requires matching configuration version', () => {
  throwsCode(
    () => providers.register(provider('tenant-a', 'shared', { versions: { contract: '1', provider: '1', transport: '1', configuration: '2' } }), { expected_configuration_version: 'wrong' }),
    'version_conflict',
  );
  const updated = providers.register(
    provider('tenant-a', 'shared', { versions: { contract: '1', provider: '1', transport: '1', configuration: '2' } }),
    { expected_configuration_version: '1' },
  );
  assert.equal(updated.versions.configuration, '2');
});
test('discovery records evidence without registering or promoting trust', () => {
  const discovery = providers.discover('tenant-a', {
    proposed_id: 'candidate-a',
    source: 'manual',
    confidence: 0.5,
    evidence: { receipt: 'discovery-1' },
  });
  assert.equal(discovery.proposed_id, 'candidate-a');
  assert.equal(providers.get('tenant-a', 'candidate-a'), null);
});
test('configuration stores only a reference and enforces expected version', () => {
  providers.register(provider('tenant-a', 'configurable'));
  providers.transition('tenant-a', 'configurable', 'registered');
  const configured = providers.configure('tenant-a', 'configurable', 'vault://config-a', '1', 'configuration-v2');
  assert.equal(configured.status, 'configured');
  assert.equal(configured.configuration_ref, 'vault://config-a');
  assert.equal(configured.versions.configuration, 'configuration-v2');
  throwsCode(() => providers.configure('tenant-a', 'configurable', 'vault://other', '1', 'configuration-v3'), 'version_conflict');
});
test('compound tenant and provider ids cannot collide', () => {
  providers.register(provider('tenant:a', 'shared'));
  providers.register(provider('tenant', 'a:shared'));
  assert.equal(providers.get('tenant:a', 'shared').tenant_id, 'tenant:a');
  assert.equal(providers.get('tenant', 'a:shared').id, 'a:shared');
});
test('provider lifecycle accepts only explicit transitions', () => {
  assert.equal(providers.transition('tenant-a', 'shared', 'registered', { expected_status: 'discovered' }).status, 'registered');
  throwsCode(() => providers.transition('tenant-a', 'shared', 'configured', { expected_status: 'discovered' }), 'lifecycle_conflict');
  throwsCode(() => providers.transition('tenant-a', 'shared', 'ready'), 'invalid_lifecycle_transition');
  assert.equal(providers.transition('tenant-a', 'shared', 'configured').status, 'configured');
  assert.equal(providers.transition('tenant-a', 'shared', 'validated').status, 'validated');
  assert.equal(providers.transition('tenant-a', 'shared', 'ready').status, 'ready');
  assert.equal(providers.transition('tenant-a', 'shared', 'disabled').status, 'disabled');
});

test('same model id is isolated by tenant and duplicates fail', () => {
  models.register(model('tenant-a', 'shared-model'));
  models.register(model('tenant-b', 'shared-model'));
  assert.equal(models.list('tenant-a').length, 1);
  assert.equal(models.get('tenant-c', 'shared-model'), null);
  throwsCode(() => models.register(model('tenant-a', 'shared-model')), 'model_already_registered');
});
test('aliases resolve chains without replacing canonical identity', () => {
  models.addAlias('tenant-a', 'stable', 'shared-model');
  models.addAlias('tenant-a', 'latest', 'stable');
  assert.equal(models.resolveAlias('tenant-a', 'latest'), 'shared-model');
  assert.equal(models.get('tenant-a', 'latest'), null);
});
test('alias batch rejects circular references and rolls back', () => {
  throwsCode(
    () => models.addAliases('tenant-a', [{ alias: 'loop-a', target: 'loop-b' }, { alias: 'loop-b', target: 'loop-a' }]),
    'alias_loop',
  );
  throwsCode(() => models.resolveAlias('tenant-a', 'loop-a'), 'model_not_found');
});
test('alias cannot become ambiguous', () => {
  models.register(model('tenant-a', 'other-model'));
  throwsCode(() => models.addAlias('tenant-a', 'stable', 'other-model'), 'alias_ambiguous');
  assert.equal(models.resolveAlias('tenant-a', 'stable'), 'shared-model');
});
test('alias cannot overwrite canonical model', () => {
  throwsCode(() => models.addAlias('tenant-a', 'shared-model', 'shared-model'), 'alias_overwrites_model');
});
test('offering rejects orphan provider and orphan model', () => {
  throwsCode(
    () => models.linkOffering('tenant-a', 'missing', 'shared-model', { provider_model_id: 'external-a' }),
    'orphan_provider',
  );
  throwsCode(
    () => models.linkOffering('tenant-a', 'shared', 'missing', { provider_model_id: 'external-a' }),
    'orphan_model',
  );
});
test('offering links provider execution to canonical model without coupling identities', () => {
  const offering = models.linkOffering('tenant-a', 'shared', 'shared-model', {
    provider_model_id: 'external-a',
    endpoint_ref: 'vault://deployment-a',
    versions: { contract: '1', provider: '1', transport: '1', configuration: '2' },
  });
  assert.equal(offering.provider_id, 'shared');
  assert.equal(offering.model_id, 'shared-model');
  assert.equal(offering.provider_model_id, 'external-a');
  assert.equal(models.listOfferings('tenant-a', 'shared-model').length, 1);
  throwsCode(
    () => models.linkOffering('tenant-a', 'shared', 'shared-model', {
      provider_model_id: 'duplicate',
      versions: { contract: '1', provider: '1', transport: '1', configuration: '2' },
    }),
    'offering_already_registered',
  );
});
test('offering controls model availability and unlink preserves both identities', () => {
  assert.equal(models.get('tenant-a', 'shared-model').lifecycle, 'available');
  models.unlinkOffering('tenant-a', 'shared', 'shared-model');
  assert.equal(models.get('tenant-a', 'shared-model').lifecycle, 'known');
  assert.equal(providers.get('tenant-a', 'shared').id, 'shared');
  const removed = providers.unregister('tenant-a', 'shared', models);
  assert.equal(removed.status, 'removed');
  assert.equal(providers.get('tenant-a', 'shared').status, 'removed');
  throwsCode(() => providers.register(provider('tenant-a', 'shared')), 'provider_already_registered');
});
test('removed is terminal', () => {
  providers.transition('tenant-b', 'shared', 'registered');
  providers.transition('tenant-b', 'shared', 'removed');
  throwsCode(() => providers.transition('tenant-b', 'shared', 'registered'), 'invalid_lifecycle_transition');
});

console.log('\n' + passed + ' passed, 0 failed');