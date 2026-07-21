#!/usr/bin/env node
import assert from 'node:assert/strict';
import domain from '../../backend/multiproviders-domain.js';
import bridgeModule from '../../backend/multiproviders-legacy-bridge.js';

const { ProviderRegistry, ModelRegistry, MultiProvidersError } = domain;
const { LegacyCompatibilityBridge, fingerprint } = bridgeModule;

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
function createBridge(tenant = 'tenant-a') {
  const providers = new ProviderRegistry();
  const models = new ModelRegistry(providers);
  return { providers, models, bridge: new LegacyCompatibilityBridge({ providerRegistry: providers, modelRegistry: models, tenant_id: tenant }) };
}
function legacy(id = 'legacy-a', extra = {}) {
  return {
    id,
    display_name: 'Legacy A',
    vendor: 'vendor-a',
    model: 'remote-model-a',
    canonical_model_id: 'model-a',
    model_family: 'family-a',
    configured: true,
    endpoint_ref: 'legacy-endpoint://a',
    configuration_ref: 'legacy-config://a',
    transport_type: 'legacy-http',
    source_ref: 'server:test',
    execution_ref: 'callLLM:' + id,
    ...extra,
  };
}
function throwsCode(fn, code) {
  assert.throws(fn, error => error instanceof MultiProvidersError && error.code === code);
}

console.log('=== MultiProviders legacy compatibility bridge ===');

test('fingerprint is deterministic across object key order', () => {
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
});
test('translation creates canonical provider, model and offering', () => {
  const { bridge, providers, models } = createBridge();
  const receipt = bridge.sync([legacy()]);
  assert.equal(receipt.incompatible.length, 0);
  assert.deepEqual(receipt.translated, [{ provider_id: 'legacy-a', model_id: 'model-a' }]);
  assert.equal(providers.get('tenant-a', 'legacy-a').status, 'configured');
  assert.equal(providers.get('tenant-a', 'legacy-a').health.status, 'unknown');
  assert.equal(models.get('tenant-a', 'model-a').family, 'family-a');
  assert.equal(models.listOfferings('tenant-a', 'model-a')[0].provider_model_id, 'remote-model-a');
  assert.equal(bridge.resolveExecution('legacy-a'), 'callLLM:legacy-a');
});
test('canonical snapshot contains no credential or execution detail', () => {
  const { bridge } = createBridge();
  bridge.sync([legacy()]);
  const serialized = JSON.stringify(bridge.listCanonicalProviders());
  assert.equal(/api_key|token|secret|callLLM/i.test(serialized), false);
});
test('bridge rejects secret-bearing descriptors', () => {
  const { bridge } = createBridge();
  const receipt = bridge.sync([legacy('secret-provider', { key: 'must-not-enter' })]);
  assert.deepEqual(receipt.incompatible, [{ provider_id: 'secret-provider', code: 'legacy_secret_forbidden' }]);
  assert.equal(JSON.stringify(receipt).includes('must-not-enter'), false);
});
test('duplicate legacy provider is explicit and does not create a second authority', () => {
  const { bridge, providers } = createBridge();
  const receipt = bridge.sync([legacy(), legacy()]);
  assert.equal(receipt.translated.length, 1);
  assert.equal(receipt.incompatible[0].code, 'duplicate_legacy_provider');
  assert.equal(providers.list('tenant-a').length, 1);
});
test('repeat sync is idempotent for registry and offering', () => {
  const { bridge, providers, models } = createBridge();
  bridge.sync([legacy()]);
  bridge.sync([legacy()]);
  assert.equal(providers.list('tenant-a').length, 1);
  assert.equal(models.list('tenant-a').length, 1);
  assert.equal(models.listOfferings('tenant-a').length, 1);
  assert.equal(bridge.listReceipts().length, 1);
});
test('missing legacy descriptor is reported but never deleted', () => {
  const { bridge, providers } = createBridge();
  bridge.sync([legacy()]);
  const receipt = bridge.sync([]);
  assert.deepEqual(receipt.missing_since_last_sync, ['legacy-a']);
  assert.equal(providers.get('tenant-a', 'legacy-a').status, 'configured');
});
test('unconfigured legacy descriptor never becomes configured or ready', () => {
  const { bridge, providers } = createBridge();
  bridge.sync([legacy('legacy-b', { configured: false })]);
  assert.equal(providers.get('tenant-a', 'legacy-b').status, 'registered');
});
test('later configuration advances registered provider without trust jump to ready', () => {
  const { bridge, providers } = createBridge();
  bridge.sync([legacy('legacy-c', { configured: false })]);
  const before = providers.get('tenant-a', 'legacy-c').versions.configuration;
  bridge.sync([legacy('legacy-c', { configured: true })]);
  const after = providers.get('tenant-a', 'legacy-c');
  assert.equal(after.status, 'configured');
  assert.notEqual(after.versions.configuration, before);
  assert.equal(after.configuration_ref, 'legacy-config://a');
});
test('changed legacy model adds identity and offering without deleting history', () => {
  const { bridge, providers, models } = createBridge();
  bridge.sync([legacy('legacy-d')]);
  bridge.sync([legacy('legacy-d', { model: 'remote-model-b', canonical_model_id: 'model-b' })]);
  assert.deepEqual(providers.get('tenant-a', 'legacy-d').models.sort(), ['model-a', 'model-b']);
  assert.equal(models.list('tenant-a').length, 2);
  assert.equal(models.listOfferings('tenant-a').length, 2);
});test('removed canonical identity cannot be resurrected by legacy', () => {
  const { bridge, providers, models } = createBridge();
  bridge.sync([legacy()]);
  models.unlinkOffering('tenant-a', 'legacy-a', 'model-a');
  providers.unregister('tenant-a', 'legacy-a', models);
  const receipt = bridge.sync([legacy()]);
  assert.equal(receipt.incompatible[0].code, 'removed_provider_cannot_return');
  assert.equal(providers.get('tenant-a', 'legacy-a').status, 'removed');
});
test('same legacy id remains isolated between tenant-scoped bridges', () => {
  const one = createBridge('tenant-one');
  const two = createBridge('tenant-two');
  one.bridge.sync([legacy('shared')]);
  two.bridge.sync([legacy('shared')]);
  assert.equal(one.providers.get('tenant-two', 'shared'), null);
  assert.equal(two.providers.get('tenant-one', 'shared'), null);
});

console.log('\n' + passed + ' passed, 0 failed');