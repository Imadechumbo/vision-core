#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../../backend/server.js', import.meta.url), 'utf8');
const hermes = fs.readFileSync(new URL('../../backend/hermes-rca.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../../backend/multiproviders-runtime.js', import.meta.url), 'utf8');

let passed = 0;
function check(condition, message) {
  assert(condition, message);
  console.log('  PASS ' + message);
  passed += 1;
}

console.log('=== MultiProviders legacy runtime wiring ===');

check(runtime.includes('const providerRegistry = new ProviderRegistry()'), 'composition root owns one Provider Registry');
check(runtime.includes('const modelRegistry = new ModelRegistry(providerRegistry)'), 'composition root owns one Model Registry bound to Provider Registry');
check(runtime.includes('const legacyBridge = new LegacyCompatibilityBridge'), 'composition root owns one compatibility bridge');check(runtime.includes('const runtimeState = new MultiProvidersRuntimeState'), 'composition root owns one Health/Capability runtime bound to the same registries');check(runtime.includes('const router = new MultiProvidersRouter'), 'composition root owns one policy router bound to runtime-state');check(runtime.includes('const adapterHost = new MultiProvidersAdapterHost'), 'composition root owns one adapter host and registers no default adapter');
check(!runtime.includes('new InMemoryReferenceAdapter'), 'reference adapter is not a global default by presence');check(runtime.includes("'[multiproviders:legacy] incompatible catalog entries'"), 'incompatibilities are logged with a redacted stable event');
check(server.includes("require('./multiproviders-runtime')"), 'callLLM imports canonical runtime composition');
check(hermes.includes("require('./multiproviders-runtime')"), 'Hermes imports the same canonical runtime composition');
check(server.includes("source_ref: 'server.providerList'"), 'Provider endpoint catalog is characterized without changing its response');
check(server.includes("syncLegacyMultiProviders('server.callLLM', providers.map"), 'callLLM translates legacy candidates before execution');
check(server.includes('.filter(provider => canonicalProviderIds.has(provider.id))'), 'callLLM executes only identities accepted by canonical Registry');
check(hermes.includes("syncLegacyMultiProviders('hermes-rca.callHermes', order"), 'Hermes translates its legacy catalog before execution');
check(hermes.includes('canonicalProviderIds.has(id)'), 'Hermes executes only known or explicitly unknown legacy order entries');
check(!/multiProvidersLegacyBridge\.sync\([\s\S]{0,500}\b(key|api_key|token|secret)\s*:/.test(server), 'callLLM bridge metadata contains no credential fields');
check(!/multiProvidersLegacyBridge\.sync\([\s\S]{0,700}\b(key|api_key|token|secret)\s*:/.test(hermes), 'Hermes bridge metadata contains no credential fields');
check(server.includes("source_ref: 'server.callLLM'"), 'callLLM compatibility source is explicit');
check(hermes.includes("source_ref: 'hermes-rca.callHermes'"), 'Hermes compatibility source is explicit');

console.log('\n' + passed + ' passed, 0 failed');