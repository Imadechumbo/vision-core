#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import domain from '../../backend/multiproviders-domain.js';
import stateModule from '../../backend/multiproviders-runtime-state.js';
import routerModule from '../../backend/multiproviders-router.js';
import adapterModule from '../../backend/multiproviders-adapters.js';

const { ProviderRegistry, ModelRegistry, MultiProvidersError } = domain;
const { MultiProvidersRuntimeState } = stateModule;
const { MultiProvidersRouter } = routerModule;
const {
  MultiProvidersAdapterHost,
  InMemoryReferenceAdapter,
  normalizeAdapterError,
  validateAdapter,
} = adapterModule;

const now = Date.parse('2026-07-21T12:00:00.000Z');
const validUntil = '2026-07-21T12:05:00.000Z';
let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log('  PASS ' + name);
    passed += 1;
  } catch (error) {
    console.error('  FAIL ' + name);
    throw error;
  }
}
function capability(availability = 'declared') {
  return {
    capability_id: 'chat',
    capability_version: '1',
    availability,
    source: 'reference-adapter',
    evidence: availability === 'validated' ? { receipt: 'cap-proof' } : null,
    validated_at: availability === 'validated' ? '2026-07-21T11:59:00.000Z' : null,
    valid_until: availability === 'validated' ? validUntil : null,
  };
}
function health(scope) {
  return {
    status: 'online',
    checked_at: '2026-07-21T11:59:00.000Z',
    valid_until: validUntil,
    source: 'reference-adapter',
    evidence: { receipt: 'health-' + scope },
  };
}
function description(extra = {}) {
  return {
    configuration_version: 'reference-config-1',
    provider: {
      id: 'provider-reference',
      display_name: 'Reference Provider',
      vendor: 'reference',
      transport: { transport_type: 'memory', endpoint_ref: 'memory://reference' },
      location: 'embedded-test',
      models: ['model-reference'],
      capabilities: [capability()],
      latency: { p95_ms: 1, window: '5m', sample_size: 10, source: 'reference', valid_until: validUntil },
      cost: { category: 'internal', estimated_cost_usd: 0.001, currency: 'USD', unit: 'request', source: 'reference', valid_until: validUntil },
      privacy: { source: 'reference', properties: { data_retention: false } },
      context: { status: 'known' },
      reasoning: { availability: 'unknown' },
      streaming: { availability: 'declared' },
      tools: { availability: 'unknown' },
      multimodal: { availability: 'unknown' },
      versions: { contract: '1', provider: '1', transport: '1', configuration: 'reference-discovered' },
    },
    models: [{
      model: {
        id: 'model-reference',
        family: 'reference-family',
        display_name: 'Reference Model',
        model_version: '1',
        modalities: ['text'],
        capabilities: [capability()],
        context_limits: { max_tokens: 4096 },
      },
      offering: {
        provider_model_id: 'reference-model-v1',
        versions: { contract: '1', provider: '1', transport: '1', configuration: 'reference-config-1' },
        capabilities: [capability()],
        context_limits: { max_tokens: 4096 },
      },
    }],
    ...extra,
  };
}
function probe(extra = {}) {
  return {
    provider_health: health('provider'),
    transport_health: health('transport'),
    endpoint_health: health('endpoint'),
    credential_health: health('credential'),
    provider_capabilities: [capability('validated')],
    models: [{
      model_id: 'model-reference',
      deployment: 'default',
      health: health('model'),
      capabilities: [capability('validated')],
    }],
    ...extra,
  };
}
function setup({ handler = async context => ({ text: context.payload.text }), adapterDescription, adapterProbe } = {}) {
  const providerRegistry = new ProviderRegistry();
  const modelRegistry = new ModelRegistry(providerRegistry);
  const runtimeState = new MultiProvidersRuntimeState({ providerRegistry, modelRegistry, clock: () => now });
  const router = new MultiProvidersRouter({ providerRegistry, modelRegistry, runtimeState, clock: () => now });
  const host = new MultiProvidersAdapterHost({ providerRegistry, modelRegistry, runtimeState, router });
  const adapter = new InMemoryReferenceAdapter({
    description: adapterDescription || description(),
    probe: adapterProbe || probe(),
    handler,
  });
  host.registerAdapter(adapter);
  return { providerRegistry, modelRegistry, runtimeState, router, host, adapter };
}
function routeRequest(extra = {}) {
  return {
    tenant_id: 'tenant-a',
    model_id: 'model-reference',
    mode: 'automatic',
    required_capabilities: ['chat'],
    operation: { idempotent: true },
    policy: { version: 'policy-reference', priorities: {}, default_priority: 100 },
    ...extra,
  };
}
async function onboardAndCertify(ctx, extra = {}) {
  await ctx.host.onboard('in-memory-reference', {
    tenant_id: 'tenant-a',
    configuration_ref: 'config://reference',
    credential_ref: 'credential://reference',
  });
  return ctx.host.certify('tenant-a', 'provider-reference', {
    credentialResolver: async () => 'ephemeral-credential',
    ...extra,
  });
}

console.log('=== MultiProviders neutral adapter contract ===');

await test('adapter contract requires describe, probe and invoke', () => {
  assert.throws(() => validateAdapter({ adapter_id: 'broken' }), error => error.code === 'adapter_method_required');
});
await test('duplicate adapter registration fails explicitly', () => {
  const ctx = setup();
  assert.throws(() => ctx.host.registerAdapter(ctx.adapter), error => error.code === 'adapter_already_registered');
});
await test('onboarding registers Provider, Model and Offering but stops at configured', async () => {
  const ctx = setup();
  const result = await ctx.host.onboard('in-memory-reference', {
    tenant_id: 'tenant-a',
    configuration_ref: 'config://reference',
    credential_ref: 'credential://reference',
  });
  assert.equal(result.provider.status, 'configured');
  assert.equal(ctx.modelRegistry.get('tenant-a', 'model-reference').lifecycle, 'available');
  assert.equal(ctx.modelRegistry.listOfferings('tenant-a').length, 1);
});
await test('identical onboarding is idempotent and conflicting binding fails', async () => {
  const ctx = setup();
  const input = { tenant_id: 'tenant-a', configuration_ref: 'config://reference', credential_ref: 'credential://reference' };
  await ctx.host.onboard('in-memory-reference', input);
  assert.equal((await ctx.host.onboard('in-memory-reference', input)).idempotent, true);
  await assert.rejects(
    () => ctx.host.onboard('in-memory-reference', { ...input, configuration_ref: 'config://other' }),
    error => error.code === 'adapter_binding_conflict',
  );
});
await test('adapter description cannot carry secrets', async () => {
  const ctx = setup({ adapterDescription: description({ api_key: 'forbidden' }) });
  await assert.rejects(
    () => ctx.host.onboard('in-memory-reference', { tenant_id: 'tenant-a', configuration_ref: 'config://reference' }),
    error => error.code === 'secret_field_forbidden',
  );
});
await test('invalid later Model leaves no partial canonical state', async () => {
  const invalid = description();
  invalid.models.push({
    model: {
      id: 'model-invalid',
      display_name: 'Invalid',
      model_version: '1',
      modalities: ['text'],
      capabilities: [capability()],
      context_limits: {},
    },
    offering: {
      provider_model_id: 'invalid',
      versions: { contract: '1', provider: '1', transport: '1', configuration: '1' },
      capabilities: [capability()],
    },
  });
  const ctx = setup({ adapterDescription: invalid });
  await assert.rejects(
    () => ctx.host.onboard('in-memory-reference', { tenant_id: 'tenant-a', configuration_ref: 'config://reference' }),
    error => error.code === 'invalid_field',
  );
  assert.equal(ctx.providerRegistry.get('tenant-a', 'provider-reference'), null);
  assert.equal(ctx.modelRegistry.list('tenant-a').length, 0);
});await test('certification records scoped Health/capabilities and reaches READY', async () => {
  const ctx = setup();
  const result = await onboardAndCertify(ctx);
  assert.equal(result.status, 'ready');
  assert.equal(ctx.providerRegistry.get('tenant-a', 'provider-reference').status, 'ready');
  assert.equal(ctx.runtimeState.effectiveHealth('tenant-a', { scope: 'provider', provider_id: 'provider-reference' }).status, 'online');
  assert.equal(ctx.runtimeState.effectiveHealth('tenant-a', { scope: 'model', provider_id: 'provider-reference', model_id: 'model-reference' }).status, 'online');
  assert.equal(ctx.runtimeState.resolveCapability('tenant-a', 'provider-reference', 'model-reference', 'chat').satisfied, true);
});
await test('missing credential blocks certification without false Health', async () => {
  const ctx = setup();
  await ctx.host.onboard('in-memory-reference', {
    tenant_id: 'tenant-a',
    configuration_ref: 'config://reference',
    credential_ref: 'credential://reference',
  });
  await assert.rejects(
    () => ctx.host.certify('tenant-a', 'provider-reference', { credentialResolver: async () => null }),
    error => error.code === 'credential_unavailable',
  );
  assert.equal(ctx.providerRegistry.get('tenant-a', 'provider-reference').status, 'configured');
});
await test('probe timeout leaves Provider configured and does not retry', async () => {
  const ctx = setup();
  let calls = 0;
  ctx.adapter.probe = async ({ signal }) => {
    calls += 1;
    await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('timeout'), { category: 'timeout' }))));
  };
  await ctx.host.onboard('in-memory-reference', {
    tenant_id: 'tenant-a',
    configuration_ref: 'config://reference',
  });
  await assert.rejects(
    () => ctx.host.certify('tenant-a', 'provider-reference', { timeout_ms: 10 }),
    error => error.category === 'timeout',
  );
  assert.equal(calls, 1);
  assert.equal(ctx.providerRegistry.get('tenant-a', 'provider-reference').status, 'configured');
});await test('invalid probe never promotes READY', async () => {
  const ctx = setup({ adapterProbe: probe({ provider_capabilities: [capability('declared')] }) });
  await ctx.host.onboard('in-memory-reference', {
    tenant_id: 'tenant-a',
    configuration_ref: 'config://reference',
  });
  await assert.rejects(
    () => ctx.host.certify('tenant-a', 'provider-reference'),
    error => error.code === 'adapter_certification_failed',
  );
  assert.equal(ctx.providerRegistry.get('tenant-a', 'provider-reference').status, 'configured');
});
await test('router selects certified adapter and execution receives ephemeral credential', async () => {
  let receivedCredential = null;
  const ctx = setup({ handler: async context => {
    receivedCredential = context.credential;
    return { text: context.payload.text.toUpperCase() };
  } });
  await onboardAndCertify(ctx);
  const result = await ctx.host.execute(routeRequest(), { text: 'hello' }, {
    credentialResolver: async () => 'ephemeral-credential',
  });
  assert.equal(result.ok, true);
  assert.equal(result.result.text, 'HELLO');
  assert.equal(receivedCredential, 'ephemeral-credential');
  assert.equal(JSON.stringify(ctx.host).includes('ephemeral-credential'), false);
});
await test('invoke error is normalized and native message is not exposed', async () => {
  const ctx = setup({ handler: async () => {
    throw Object.assign(new Error('sensitive native detail'), { category: 'rate_limit', retryable: true });
  } });
  await onboardAndCertify(ctx);
  const result = await ctx.host.execute(routeRequest(), { text: 'hello' }, {
    credentialResolver: async () => 'ephemeral-credential',
  });
  assert.deepEqual(result.error, { category: 'rate_limit', retryable: true, message: 'rate_limit' });
});
await test('timeout aborts one invoke without implicit retry', async () => {
  let calls = 0;
  const ctx = setup({ handler: async ({ signal }) => {
    calls += 1;
    await new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { category: 'timeout' })));
    });
  } });
  await onboardAndCertify(ctx);
  const result = await ctx.host.execute(routeRequest(), { text: 'hello' }, {
    credentialResolver: async () => 'ephemeral-credential',
    timeout_ms: 10,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.category, 'timeout');
  assert.equal(calls, 1);
});
await test('streaming is returned only when adapter explicitly supports it', async () => {
  const ctx = setup({ handler: async () => (async function* stream() {
    yield 'a';
    yield 'b';
  })() });
  await onboardAndCertify(ctx);
  const result = await ctx.host.execute(routeRequest(), { text: 'stream' }, {
    credentialResolver: async () => 'ephemeral-credential',
  });
  const chunks = [];
  for await (const chunk of result.result) chunks.push(chunk);
  assert.deepEqual(chunks, ['a', 'b']);
});
await test('same Provider id is isolated across tenant bindings', async () => {
  const ctx = setup();
  await ctx.host.onboard('in-memory-reference', {
    tenant_id: 'tenant-a',
    configuration_ref: 'config://reference-a',
  });
  await ctx.host.onboard('in-memory-reference', {
    tenant_id: 'tenant-b',
    configuration_ref: 'config://reference-b',
  });
  assert.equal(ctx.providerRegistry.get('tenant-a', 'provider-reference').tenant_id, 'tenant-a');
  assert.equal(ctx.providerRegistry.get('tenant-b', 'provider-reference').tenant_id, 'tenant-b');
  assert.equal(ctx.modelRegistry.list('tenant-a').length, 1);
  assert.equal(ctx.modelRegistry.list('tenant-b').length, 1);
});await test('adapter core contains no commercial Provider or Colibri special case', () => {
  const source = fs.readFileSync(new URL('../../backend/multiproviders-adapters.js', import.meta.url), 'utf8');
  assert.equal(/\b(openai|anthropic|claude|colibri|ollama|gemini|gpt|llama)\b/i.test(source), false);
});
await test('unknown adapter error becomes neutral provider_error', () => {
  assert.deepEqual(normalizeAdapterError(new Error('native secret')), {
    category: 'provider_error',
    retryable: false,
    message: 'provider_error',
  });
});

console.log('\n' + passed + ' passed, 0 failed');