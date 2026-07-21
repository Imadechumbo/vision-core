#!/usr/bin/env node
/**
 * provider-vault-routing — unit test puro (zero servidor, zero rede, zero token)
 *
 * Testa as 3 regras confirmadas pelo humano na Fase D(a):
 *   1) vault só vence sobre env var quando status==='connected'
 *   2) prioridade da tela só substitui a prioridade-default quando
 *      status==='connected'
 *   3) sem cache do estado do vault (dependency injection — cada teste passa
 *      seu próprio _providersStore fake, provando que a função lê o objeto
 *      passado, não algum estado interno memorizado)
 */
import pvr from '../../backend/provider-vault-routing.js';
const { resolveProviderKey, effectiveProviderPriority, sortProvidersByEffectivePriority } = pvr;

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const decryptOk = (enc) => 'decrypted:' + enc; // fake — simula decrypt bem-sucedido
const decryptFails = () => ''; // simulates master-key rotation failure
const fresh = new Date().toISOString();
const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();

console.log('=== provider-vault-routing ===\n');

console.log('[ resolveProviderKey — regra 1: vault só vence com status connected ]');
assert(resolveProviderKey('openai', 'env-key-123', {}, decryptOk) === 'env-key-123', 'sem entrada no vault → usa env var');
assert(resolveProviderKey('openai', 'env-key-123', { openai: { status: 'untested', api_key_encrypted: 'enc' } }, decryptOk) === 'env-key-123', 'vault status=untested → NÃO desloca env var');
assert(resolveProviderKey('openai', 'env-key-123', { openai: { status: 'error', api_key_encrypted: 'enc' } }, decryptOk) === 'env-key-123', 'vault status=error → NÃO desloca env var');
assert(resolveProviderKey('openai', 'env-key-123', { openai: { status: 'http_401', api_key_encrypted: 'enc' } }, decryptOk) === 'env-key-123', 'vault status=http_401 → NÃO desloca env var');
assert(resolveProviderKey('openai', 'env-key-123', { openai: { status: 'connected', last_tested_at: fresh, api_key_encrypted: 'enc' } }, decryptOk) === 'decrypted:enc', 'vault status=connected → VENCE sobre env var');
assert(resolveProviderKey('openai', 'env-key-123', { openai: { status: 'connected', last_tested_at: fresh, api_key_encrypted: 'enc' } }, decryptFails) === 'env-key-123', 'vault connected mas decrypt falha (rotação de chave-mestra) → degrada pra env var, nunca quebra');
assert(resolveProviderKey('openai', '', { openai: { status: 'connected', last_tested_at: fresh, api_key_encrypted: 'enc' } }, decryptOk) === 'decrypted:enc', 'vault connected funciona mesmo sem nenhuma env var configurada');
assert(resolveProviderKey('openai', '', {}, decryptOk) === '', 'sem vault e sem env var → string vazia (provider fica de fora do fallback, comportamento já existente)');

console.log('\n[ effectiveProviderPriority — regra 2: prioridade só conta com status connected ]');
assert(effectiveProviderPriority(3, 'groq', {}) === 3, 'sem vault → prioridade-default (posição no array)');
assert(effectiveProviderPriority(3, 'groq', { groq: { status: 'untested', priority: 1 } }) === 3, 'vault untested com prioridade setada → IGNORADA, usa default');
assert(effectiveProviderPriority(3, 'groq', { groq: { status: 'connected', last_tested_at: fresh, priority: 1 } }) === 1, 'vault connected com prioridade → substitui a default');
assert(effectiveProviderPriority(3, 'groq', { groq: { status: 'connected', last_tested_at: fresh } }) === 3, 'vault connected SEM priority definida → cai pro default (não quebra com undefined)');

console.log('\n[ sortProvidersByEffectivePriority — comportamento default idêntico ao atual quando vault vazio ]');
const baseProviders = [
  { id: 'openrouter', tag: 'A' },
  { id: 'openai', tag: 'B' },
  { id: 'anthropic', tag: 'C' },
  { id: 'groq', tag: 'D' },
];
{
  const sorted = sortProvidersByEffectivePriority(baseProviders, {});
  assert(sorted.map(p => p.id).join(',') === 'openrouter,openai,anthropic,groq', 'vault vazio → ordem idêntica à ordem hardcoded original (zero mudança de comportamento)');
  assert(baseProviders[0].tag === 'A' && !('priority' in baseProviders[0]), 'array original NÃO é mutada (retorna array nova)');
}
{
  // groq (índice 3, prioridade-default mais baixa) testado e conectado com
  // prioridade -1 → precisa bater até o 0 do openrouter (default mais alto
  // do array) pra provar que realmente vai pro topo, não só empatar com ele.
  const store = { groq: { status: 'connected', last_tested_at: fresh, priority: -1 } };
  const sorted = sortProvidersByEffectivePriority(baseProviders, store);
  assert(sorted[0].id === 'groq', 'groq com vault connected + prioridade -1 → vai pro topo do fallback, à frente até do default mais alto (openrouter)');
  assert(typeof sorted[0].tag === 'string', 'demais campos da entrada original (ex: tag) são preservados após o sort');
}
{
  // entrada no vault mas SEM status connected não deve alterar a ordem
  const store = { groq: { status: 'error', priority: -1 } };
  const sorted = sortProvidersByEffectivePriority(baseProviders, store);
  assert(sorted.map(p => p.id).join(',') === 'openrouter,openai,anthropic,groq', 'vault com status!=connected → ordem permanece idêntica à original mesmo com priority setada');
}

assert(resolveProviderKey('openai', 'env-key-123', { openai: { status: 'connected', last_tested_at: stale, api_key_encrypted: 'enc' } }, decryptOk) === 'env-key-123', 'stale connected status falls back safely');
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
