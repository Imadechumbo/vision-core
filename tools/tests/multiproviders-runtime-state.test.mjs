#!/usr/bin/env node
import assert from 'node:assert/strict';
import domain from '../../backend/multiproviders-domain.js';
import stateModule from '../../backend/multiproviders-runtime-state.js';

const { ProviderRegistry, ModelRegistry, MultiProvidersError } = domain;
const { MultiProvidersRuntimeState, capabilityState } = stateModule;

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
const now = Date.parse('2026-07-21T12:00:00.000Z');
const validUntil = '2026-07-21T12:05:00.000Z';
function capability(availability = 'validated', extra = {}) {
  return {
    capability_id: 'chat',
    capability_version: '1',
    availability,
    source: 'test',
    evidence: { receipt: 'cap-1' },
    validated_at: '2026-07-21T11:55:00.000Z',
    valid_until: validUntil,
    ...extra,
  };
}
function provider() {
  return {
    id: 'provider-a',
    tenant_id: 'tenant-a',
    display_name: 'Provider A',
    vendor: 'vendor-a',
    transport: { transport_type: 'test' },
    location: 'unknown',
    models: ['model-a'],
    capabilities: [capability()],
    health: { status: 'unknown', scope: 'provider' },
    status: 'ready',
    latency: { status: 'unknown' },
    cost: { category: 'unknown' },
    privacy: { properties: {} },
    context: { status: 'unknown' },
    reasoning: { availability: 'unknown' },
    streaming: { availability: 'unknown' },
    tools: { availability: 'unknown' },
    multimodal: { availability: 'unknown' },
    versions: { contract: '1', provider: '1', transport: '1', configuration: '1' },
  };
}
function model() {
  return {
    id: 'model-a',
    tenant_id: 'tenant-a',
    family: 'family-a',
    display_name: 'Model A',
    model_version: '1',
    modalities: ['text'],
    capabilities: [capability()],
    context_limits: { status: 'unknown' },
  };
}
function setup() {
  const providers = new ProviderRegistry();
  const models = new ModelRegistry(providers);
  providers.register(provider());
  models.register(model());
  models.linkOffering('tenant-a', 'provider-a', 'model-a', {
    provider_model_id: 'remote-a',
    versions: { contract: '1', provider: '1', transport: '1', configuration: '1' },
    capabilities: [capability()],
  });
  const runtime = new MultiProvidersRuntimeState({ providerRegistry: providers, modelRegistry: models, clock: () => now });
  return { providers, models, runtime };
}
function online(scope, extraTarget = {}) {
  return {
    target: { scope, ...extraTarget },
    observation: {
      status: 'online',
      checked_at: '2026-07-21T11:59:00.000Z',
      valid_until: validUntil,
      source: 'test-probe',
      evidence: { receipt: 'health-1' },
    },
  };
}

console.log('=== MultiProviders capability, health and lifecycle runtime ===');

test('missing observation is unknown, never healthy', () => {
  const { runtime } = setup();
  const health = runtime.effectiveHealth('tenant-a', { scope: 'provider', provider_id: 'provider-a' });
  assert.equal(health.status, 'unknown');
  assert.equal(health.failure_reason, 'no_observation');
});
test('boolean, future and evidence-free health fail closed', () => {
  const { runtime } = setup();
  const target = { scope: 'provider', provider_id: 'provider-a' };
  throwsCode(() => runtime.observeHealth('tenant-a', target, true), 'invalid_health_observation');
  throwsCode(() => runtime.observeHealth('tenant-a', target, {
    status: 'online', checked_at: '2026-07-21T12:01:00.000Z', valid_until: validUntil, source: 'probe', evidence: {},
  }), 'future_health_observation');
  throwsCode(() => runtime.observeHealth('tenant-a', target, {
    status: 'online', checked_at: '2026-07-21T11:59:00.000Z', valid_until: validUntil,
  }), 'health_evidence_required');
});
test('Health evidence rejects embedded secrets', () => {
  const { runtime } = setup();
  const target = { scope: 'provider', provider_id: 'provider-a' };
  const observation = online('provider', { provider_id: 'provider-a' }).observation;
  throwsCode(
    () => runtime.observeHealth('tenant-a', target, { ...observation, evidence: { token: 'forbidden' } }),
    'secret_field_forbidden',
  );
});test('ttl derives validity and stale observation becomes unknown', () => {
  let clock = now;
  const { providers, models } = setup();
  const runtime = new MultiProvidersRuntimeState({ providerRegistry: providers, modelRegistry: models, clock: () => clock });
  const target = { scope: 'provider', provider_id: 'provider-a' };
  const observed = runtime.observeHealth('tenant-a', target, {
    status: 'online',
    checked_at: '2026-07-21T11:59:00.000Z',
    ttl_ms: 120000,
    source: 'probe',
    evidence: { receipt: 'health-ttl' },
  });
  assert.equal(observed.valid_until, '2026-07-21T12:01:00.000Z');
  clock = Date.parse('2026-07-21T12:02:00.000Z');
  assert.equal(runtime.effectiveHealth('tenant-a', target).failure_reason, 'stale_observation');
});
test('Provider online never propagates to Model, Credential or Endpoint', () => {
  const { runtime } = setup();
  const providerHealth = online('provider', { provider_id: 'provider-a' });
  runtime.observeHealth('tenant-a', providerHealth.target, providerHealth.observation);
  assert.equal(runtime.effectiveHealth('tenant-a', { scope: 'provider', provider_id: 'provider-a' }).status, 'online');
  assert.equal(runtime.effectiveHealth('tenant-a', { scope: 'model', model_id: 'model-a' }).status, 'unknown');
  assert.equal(runtime.effectiveHealth('tenant-a', { scope: 'credential', provider_id: 'provider-a', credential_ref: 'vault://a' }).status, 'unknown');
  assert.equal(runtime.effectiveHealth('tenant-a', { scope: 'endpoint', provider_id: 'provider-a', endpoint_ref: 'endpoint://a' }).status, 'unknown');
});
test('same capability id is isolated by Provider/Model owner', () => {
  const { runtime } = setup();
  const one = { scope: 'capability', provider_id: 'provider-a', capability_id: 'chat' };
  const two = { scope: 'capability', model_id: 'model-a', capability_id: 'chat' };
  runtime.observeHealth('tenant-a', one, online('capability').observation);
  assert.equal(runtime.effectiveHealth('tenant-a', one).status, 'online');
  assert.equal(runtime.effectiveHealth('tenant-a', two).status, 'unknown');
});
test('orphan scoped health is rejected', () => {
  const { runtime } = setup();
  throwsCode(
    () => runtime.effectiveHealth('tenant-a', { scope: 'provider', provider_id: 'missing' }),
    'orphan_provider',
  );
  throwsCode(
    () => runtime.effectiveHealth('tenant-a', { scope: 'model', model_id: 'missing' }),
    'orphan_model',
  );
});
test('validated capability requires fresh evidence', () => {
  assert.equal(capabilityState([capability()], 'chat', now).availability, 'validated');
  assert.equal(capabilityState([capability('validated', { valid_until: '2026-07-21T11:00:00.000Z' })], 'chat', now).availability, 'unknown');
  assert.equal(capabilityState([capability('validated', { evidence: null })], 'chat', now).availability, 'unknown');
  assert.equal(capabilityState([capability('validated', { valid_until: 'not-a-date' })], 'chat', now).availability, 'unknown');
  assert.equal(capabilityState([capability('validated', { validated_at: '2026-07-21T12:01:00.000Z' })], 'chat', now).availability, 'unknown');
});
test('invalid Health metrics fail closed', () => {
  const { runtime } = setup();
  const target = { scope: 'provider', provider_id: 'provider-a' };
  const observation = online('provider', { provider_id: 'provider-a' }).observation;
  throwsCode(() => runtime.observeHealth('tenant-a', target, { ...observation, latency_ms: -1 }), 'invalid_field');
  throwsCode(() => runtime.observeHealth('tenant-a', target, { ...observation, consecutive_failures: 1.5 }), 'invalid_field');
});
test('capability resolution uses Provider, Model and Offering intersection', () => {
  const { runtime } = setup();
  assert.equal(runtime.resolveCapability('tenant-a', 'provider-a', 'model-a', 'chat').satisfied, true);
  assert.equal(runtime.resolveCapability('tenant-a', 'provider-a', 'model-a', 'tools').satisfied, false);
});
test('Provider ready and online does not mask Model unknown', () => {
  const { runtime } = setup();
  const providerHealth = online('provider', { provider_id: 'provider-a' });
  runtime.observeHealth('tenant-a', providerHealth.target, providerHealth.observation);
  const result = runtime.eligibility('tenant-a', 'provider-a', 'model-a', ['chat']);
  assert.equal(result.eligible, false);
  assert(result.reasons.includes('model_health_unknown'));
});
test('ready Provider plus scoped Health and validated capabilities is eligible', () => {
  const { runtime } = setup();
  const providerHealth = online('provider', { provider_id: 'provider-a' });
  const modelHealth = online('model', { model_id: 'model-a' });
  runtime.observeHealth('tenant-a', providerHealth.target, providerHealth.observation);
  runtime.observeHealth('tenant-a', modelHealth.target, modelHealth.observation);
  const result = runtime.eligibility('tenant-a', 'provider-a', 'model-a', ['chat']);
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
});
test('lifecycle disabled bypass is impossible even with online Health', () => {
  const { runtime, providers } = setup();
  const providerHealth = online('provider', { provider_id: 'provider-a' });
  const modelHealth = online('model', { model_id: 'model-a' });
  runtime.observeHealth('tenant-a', providerHealth.target, providerHealth.observation);
  runtime.observeHealth('tenant-a', modelHealth.target, modelHealth.observation);
  providers.transition('tenant-a', 'provider-a', 'disabled', { expected_status: 'ready' });
  const result = runtime.eligibility('tenant-a', 'provider-a', 'model-a', ['chat']);
  assert.equal(result.eligible, false);
  assert(result.reasons.includes('provider_not_ready'));
});
test('recovery from disabled requires configuration and validation again', () => {
  const { providers } = setup();
  providers.transition('tenant-a', 'provider-a', 'disabled');
  throwsCode(() => providers.transition('tenant-a', 'provider-a', 'ready'), 'invalid_lifecycle_transition');
  providers.transition('tenant-a', 'provider-a', 'configured');
  providers.transition('tenant-a', 'provider-a', 'validated');
  assert.equal(providers.transition('tenant-a', 'provider-a', 'ready').status, 'ready');
});

console.log('\n' + passed + ' passed, 0 failed');