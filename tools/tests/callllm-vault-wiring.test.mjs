#!/usr/bin/env node
/**
 * callllm-vault-wiring — static check (mesmo estilo dos testes §149-§155)
 *
 * A LÓGICA de decisão (vault só vence com status:'connected', etc.) já é
 * testada de verdade, sem mock, em provider-vault-routing.test.mjs (17/17).
 * Este teste cobre a outra metade do risco: será que os 6 providers do
 * callLLM() foram TODOS religados pra resolveProviderKey(), com o id
 * certo, e o loop de fallback usa a lista ORDENADA (não a original)? Não dá
 * pra testar isso fim-a-fim sem gastar uma chamada real de LLM (callLLM()
 * não é exportado — é uma função interna de um arquivo monolítico) — por
 * isso este teste lê o texto-fonte, igual aos testes de wiring já
 * existentes no projeto para §152/§155.
 */
import { readFileSync } from 'fs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const server = readFileSync('backend/server.js', 'utf8');
const callLLMIdx = server.indexOf('async function callLLM(');
const callLLMBody = server.slice(callLLMIdx, callLLMIdx + 6000);

console.log('=== callllm-vault-wiring ===\n');

assert(callLLMIdx >= 0, 'callLLM() existe em server.js');
assert(server.includes("require('./provider-vault-routing')"), 'server.js importa provider-vault-routing.js');

const providerIds = ['openrouter', 'openai', 'anthropic', 'groq', 'deepseek', 'gemini'];
for (const id of providerIds) {
  const re = new RegExp(`id:\\s*'${id}'[\\s\\S]{0,80}key:\\s*resolveProviderKey\\('${id}'`);
  assert(re.test(callLLMBody), `provider '${id}' usa resolveProviderKey('${id}', ...) — não resolveApiKey() direto`);
}

assert(!/key:\s*resolveApiKey\(/.test(callLLMBody), 'nenhum dos 6 providers ainda chama resolveApiKey() direto (todos passaram por resolveProviderKey)');
assert(callLLMBody.includes('sortProvidersByEffectivePriority(providers, _providersStore)'), 'array de providers é reordenado por prioridade efetiva antes do loop de fallback');
assert(/for\s*\(const p of orderedProviders\)/.test(callLLMBody), 'loop de fallback itera a lista ORDENADA (orderedProviders), não a lista bruta');
assert(!/for\s*\(const p of providers\)/.test(callLLMBody), 'loop de fallback não itera mais a lista bruta sem ordenação');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
