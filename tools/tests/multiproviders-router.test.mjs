#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import domain from '../../backend/multiproviders-domain.js';
import stateModule from '../../backend/multiproviders-runtime-state.js';
import routerModule from '../../backend/multiproviders-router.js';

const { ProviderRegistry, ModelRegistry, MultiProvidersError } = domain;
const { MultiProvidersRuntimeState } = stateModule;
const { MultiProvidersRouter, failoverAllowed } = routerModule;

const now = Date.parse('2026-07-21T12:00:00.000Z');
const validUntil = '2026-07-21T12:05:00.000Z';
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
function capability(id = 'chat', availability = 'validated') {
  return {
    capability_id: id,
    capability_version: '1',
    availability,
    source: 'test',
    evidence: { receipt: 'cap-' + id },
    validated_at: '2026-07-21T11:55:00.000Z',
    valid_until: validUntil,
  };
}
function provider(id, options = {}) {
  return {
    id,
    tenant_id: 'tenant-a',
    display_name: id,
    vendor: 'vendor-' + id,
    transport: { transport_type: 'test' },
    location: options.location || 'unknown',
    models: ['model-a'],
    capabilities: options.capabilities || [capability()],
    health: { status: 'unknown', scope: 'provider' },
    status: options.status || 'ready',
    latency: options.latency || { p95_ms: 100, window: '5m', sample_size: 10, source: 'test', valid_until: validUntil },
    cost: options.cost || { category: 'metered', estimated_cost_usd: 0.02, currency: 'USD', unit: 'request', source: 'test', valid_until: validUntil },
    privacy: options.privacy || { source: 'test', properties: { data_retention: false, region: 'br' } },
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
function setup(order = ['provider-b', 'provider-a', 'provider-c'], overrides = {}) {
  const providers = new ProviderRegistry();
  const models = new ModelRegistry(providers);
  for (const id of order) providers.register(provider(id, overrides[id]));
  models.register(model());
  for (const id of order) {
    models.linkOffering('tenant-a', id, 'model-a', {
      provider_model_id: 'remote-' + id,
      versions: { contract: '1', provider: '1', transport: '1', configuration: '1' },
      capabilities: [capability()],
      context_limits: { max_tokens: 32000 },
    });
  }
  const runtime = new MultiProvidersRuntimeState({ providerRegistry: providers, modelRegistry: models, clock: () => now });
  for (const id of order) {
    for (const target of [
      { scope: 'provider', provider_id: id },
      { scope: 'model', provider_id: id, model_id: 'model-a' },
    ]) {
      runtime.observeHealth('tenant-a', target, {
        status: 'online',
        checked_at: '2026-07-21T11:59:00.000Z',
        valid_until: validUntil,
        source: 'test',
        evidence: { receipt: 'health-' + id },
      });
    }
  }
  const router = new MultiProvidersRouter({ providerRegistry: providers, modelRegistry: models, runtimeState: runtime, clock: () => now });
  return { providers, models, runtime, router };
}
function request(extra = {}) {
  return {
    tenant_id: 'tenant-a',
    model_id: 'model-a',
    mode: 'automatic',
    required_capabilities: ['chat'],
    operation: { idempotent: true },
    policy: { version: 'policy-1', priorities: {}, default_priority: 100 },
    ...extra,
  };
}

console.log('=== MultiProviders policy routing and failover ===');

test('automatic route filters then selects deterministic candidate', () => {
  const { router } = setup();
  const receipt = router.route(request());
  assert.equal(receipt.decision, 'selected');
  assert.equal(receipt.selected.provider_id, 'provider-a');
  assert.equal(receipt.candidates.length, 3);
});
test('registration order cannot decide a tie', () => {
  const first = setup(['provider-c', 'provider-a', 'provider-b']).router.route(request());
  const second = setup(['provider-b', 'provider-c', 'provider-a']).router.route(request());
  assert.equal(first.selected.provider_id, 'provider-a');
  assert.equal(second.selected.provider_id, 'provider-a');
});
test('explicit policy priority wins without hidden default Provider', () => {
  const { router } = setup();
  const receipt = router.route(request({ policy: { version: 'policy-2', priorities: { 'provider-c': 1 }, default_priority: 100 } }));
  assert.equal(receipt.selected.provider_id, 'provider-c');
});
test('affinity breaks equal-priority ties explicitly', () => {
  const { router } = setup();
  assert.equal(router.route(request({ affinity: ['provider-c'] })).selected.provider_id, 'provider-c');
});
test('known comparable cost orders equal-priority candidates', () => {
  const { router } = setup(undefined, {
    'provider-b': { cost: { category: 'metered', estimated_cost_usd: 0.001, currency: 'USD', unit: 'request', source: 'test', valid_until: validUntil } },
  });
  assert.equal(router.route(request()).selected.provider_id, 'provider-b');
});test('manual mode selects requested eligible Provider', () => {
  const { router } = setup();
  const receipt = router.route(request({ mode: 'manual', provider_id: 'provider-b' }));
  assert.equal(receipt.selected.provider_id, 'provider-b');
});
test('manual ineligible Provider returns no route with reasons', () => {
  const { router, providers } = setup();
  providers.transition('tenant-a', 'provider-b', 'disabled');
  const receipt = router.route(request({ mode: 'manual', provider_id: 'provider-b' }));
  assert.equal(receipt.decision, 'no_eligible_route');
  assert(receipt.candidates.find(item => item.provider_id === 'provider-b').reasons.includes('provider_not_ready'));
});
test('exclusion is a hard constraint', () => {
  const { router } = setup();
  const receipt = router.route(request({ exclusions: ['provider-a', 'provider-b'] }));
  assert.equal(receipt.selected.provider_id, 'provider-c');
});
test('unknown cost is never treated as zero under a budget', () => {
  const { router } = setup(undefined, {
    'provider-a': { cost: { category: 'unknown' } },
    'provider-b': { cost: { category: 'metered', estimated_cost_usd: 0.01, currency: 'USD', unit: 'request', source: 'test', valid_until: validUntil } },
  });
  const receipt = router.route(request({ max_cost_usd: 0.02 }));
  assert.equal(receipt.selected.provider_id, 'provider-b');
  assert(receipt.candidates.find(item => item.provider_id === 'provider-a').reasons.includes('cost_unknown'));
});
test('incomplete cost metadata remains unknown instead of cheap', () => {
  const { router } = setup(undefined, {
    'provider-a': { cost: { category: 'metered', estimated_cost_usd: 0 } },
  });
  const receipt = router.route(request({ max_cost_usd: 1 }));
  assert(receipt.candidates.find(item => item.provider_id === 'provider-a').reasons.includes('cost_unknown'));
});test('privacy is dimensional and never inferred from location', () => {
  const { router } = setup(undefined, {
    'provider-a': { location: 'local', privacy: { source: 'test', properties: { data_retention: true, region: 'br' } } },
  });
  const receipt = router.route(request({ privacy: { data_retention: false } }));
  assert(receipt.candidates.find(item => item.provider_id === 'provider-a').reasons.includes('privacy_requirement_failed'));
  assert.notEqual(receipt.selected.provider_id, 'provider-a');
});
test('latency constraint rejects stale or unknown latency', () => {
  const { router } = setup(undefined, {
    'provider-a': { latency: { p95_ms: 1, window: '5m', sample_size: 10, source: 'test', valid_until: '2026-07-21T11:00:00.000Z' } },
  });
  const receipt = router.route(request({ max_latency_ms: 200 }));
  assert(receipt.candidates.find(item => item.provider_id === 'provider-a').reasons.includes('latency_unknown'));
});
test('context requirement is enforced per offering', () => {
  const { router } = setup();
  const accepted = router.route(request({ min_context_tokens: 16000 }));
  assert.equal(accepted.decision, 'selected');
  const rejected = router.route(request({ min_context_tokens: 64000 }));
  assert.equal(rejected.decision, 'no_eligible_route');
  assert(rejected.candidates.every(item => item.reasons.includes('context_limit_exceeded')));
});
test('benchmark metadata never changes routing or Health', () => {
  const { router, providers } = setup();
  const before = router.route(request()).selected.provider_id;
  const current = providers.get('tenant-a', 'provider-c');
  providers.register({ ...current, extensions: { benchmark: { score: 999999 } } }, { expected_configuration_version: current.versions.configuration });
  const after = router.route(request()).selected.provider_id;
  assert.equal(after, before);
});test('Health and capability eligibility are hard filters', () => {
  const { router, runtime } = setup();
  runtime.observeHealth('tenant-a', { scope: 'model', provider_id: 'provider-a', model_id: 'model-a' }, {
    status: 'offline',
    checked_at: '2026-07-21T11:59:30.000Z',
    valid_until: validUntil,
    source: 'test',
    evidence: { receipt: 'offline-a' },
  });
  const receipt = router.route(request());
  assert(receipt.candidates.find(item => item.provider_id === 'provider-a').reasons.includes('model_health_offline'));
  assert.notEqual(receipt.selected.provider_id, 'provider-a');
});
test('no candidate produces explicit auditable no_eligible_route', () => {
  const { router } = setup();
  const receipt = router.route(request({ required_capabilities: ['missing-capability'] }));
  assert.equal(receipt.decision, 'no_eligible_route');
  assert.equal(receipt.selected, null);
  assert(receipt.candidates.every(candidate => candidate.reasons.includes('capability_not_validated')));
});
test('receipt is deterministic and contains policy/requirements/reasons', () => {
  const { router } = setup();
  const first = router.route(request());
  const second = router.route(request());
  assert.equal(first.receipt_id, second.receipt_id);
  assert.equal(first.policy_version, 'policy-1');
  assert(Array.isArray(first.candidates[0].reasons));
});
test('invalid explicit priorities fail instead of becoming hidden defaults', () => {
  const { router } = setup();
  throwsCode(
    () => router.route(request({ policy: { version: 'policy-bad', priorities: { 'provider-a': 'first' } } })),
    'invalid_policy_priority',
  );
});test('receipt rejects embedded secrets', () => {
  const { router } = setup();
  throwsCode(() => router.route(request({ operation: { idempotent: true, token: 'forbidden' } })), 'secret_field_forbidden');
});
test('safe idempotent operation receives compatible failover plan', () => {
  const { router } = setup();
  const receipt = router.route(request());
  assert.equal(receipt.failover.allowed, true);
  assert.equal(receipt.failover.candidates.length, 2);
  const next = router.nextFailover(receipt, receipt.selected.provider_id, { idempotent: true }, 'timeout');
  assert.equal(next.allowed, true);
  assert.notEqual(next.candidate.provider_id, receipt.selected.provider_id);
});
test('unsafe receipt cannot be reauthorized by nextFailover arguments', () => {
  const { router } = setup();
  const receipt = router.route(request({ operation: { idempotent: false } }));
  const next = router.nextFailover(receipt, receipt.selected.provider_id, { idempotent: true }, 'timeout');
  assert.deepEqual(next, { allowed: false, reason: 'failover_not_safe', candidate: null });
});test('non-idempotent, partial streaming, tools and policy errors forbid failover', () => {
  assert.equal(failoverAllowed({ idempotent: false }), false);
  assert.equal(failoverAllowed({ idempotent: true, streaming_started: true }), false);
  assert.equal(failoverAllowed({ idempotent: true, tools_executed: true }), false);
  assert.equal(failoverAllowed({ idempotent: true, max_retries: 2, retries_executed: 2 }), false);
  assert.equal(failoverAllowed({ idempotent: true, max_retries: 2, retries_executed: 1 }), true);
  assert.equal(failoverAllowed({ idempotent: true }, 'policy'), false);
  assert.equal(failoverAllowed({ idempotent: true }, 'authentication'), false);
});
test('no compatible failover is explicit', () => {
  const { router } = setup(['provider-a']);
  const receipt = router.route(request());
  const next = router.nextFailover(receipt, 'provider-a', { idempotent: true }, 'timeout');
  assert.deepEqual(next, { allowed: false, reason: 'no_compatible_failover', candidate: null });
});
test('router source contains no privileged Provider or Model names', () => {
  const source = fs.readFileSync(new URL('../../backend/multiproviders-router.js', import.meta.url), 'utf8');
  assert.equal(/\b(openai|anthropic|claude|colibri|ollama|gemini|gpt|llama)\b/i.test(source), false);
});

console.log('\n' + passed + ' passed, 0 failed');