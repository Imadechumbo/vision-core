#!/usr/bin/env node
/**
 * provider-vault-crypto — unit test (real roundtrip, zero mocks, zero tokens)
 *
 * Testa o módulo puro backend/provider-vault-crypto.js isoladamente — sem
 * Express, sem S3, sem servidor rodando. Cobre especificamente o caso da
 * "INCERTEZA CONHECIDA" documentada no arquivo: decriptar com a chave errada
 * (rotação de PROVIDER_VAULT_SECRET) deve degradar pra '' sem lançar exceção.
 */
// PROVIDER_VAULT_SECRET é fail-closed (limpeza de dogfood pós-INCIDENTE-4) —
// o módulo lança no carregamento sem uma env var real. Precisa estar setada
// ANTES do import; como um `import` estático é hoisted para antes de
// qualquer outra linha do arquivo, isto exige import dinâmico.
process.env.PROVIDER_VAULT_SECRET = 'provider-vault-crypto-test-secret-32chars-min';
const pvc = (await import('../../backend/provider-vault-crypto.js')).default;
const { encryptProviderKey, decryptProviderKey, maskProviderKey } = pvc;

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

console.log('=== provider-vault-crypto ===\n');

// --- roundtrip básico ---
const plain = 'sk-or-v1-abcdef1234567890';
const enc = encryptProviderKey(plain, 'secret-A');
assert(enc !== plain, 'ciphertext difere do plaintext');
assert(enc.split(':').length === 3, 'formato iv:tag:ciphertext (3 partes hex)');
assert(decryptProviderKey(enc, 'secret-A') === plain, 'decrypt com a mesma chave recupera o plaintext original');

// --- IV aleatório: duas cifragens do mesmo texto não podem ser iguais ---
const enc2 = encryptProviderKey(plain, 'secret-A');
assert(enc !== enc2, 'duas cifragens do mesmo texto produzem ciphertexts diferentes (IV aleatório)');
assert(decryptProviderKey(enc2, 'secret-A') === plain, 'segunda cifragem também decripta corretamente');

// --- cenário de rotação de chave-mestra (INCERTEZA CONHECIDA no código-fonte) ---
assert(decryptProviderKey(enc, 'secret-B') === '', 'decrypt com chave errada (rotação) degrada pra string vazia, não lança exceção');

// --- sem secretOverride, usa PROVIDER_VAULT_SECRET do processo (fail-closed
// desde a limpeza de dogfood pós-INCIDENTE-4 — sem essa env var real, o
// módulo já teria lançado no import acima, então chegar aqui já prova que
// não há fallback público silencioso) ---
const encNoOverride = encryptProviderKey(plain);
assert(decryptProviderKey(encNoOverride) === plain, 'sem secretOverride, usa PROVIDER_VAULT_SECRET do processo e faz roundtrip');
assert(decryptProviderKey(encNoOverride, 'secret-A') === '', 'PROVIDER_VAULT_SECRET do processo é diferente de qualquer secretOverride de teste — nunca colidem');

// --- cache da derivação KDF (Fase D.a): precisa continuar correto quando
// múltiplos secrets diferentes são usados na mesma execução do processo —
// se o cache ignorasse qual secret foi pedido (bug de cache global sem
// chave), este teste de "chave errada degrada pra vazio" (linha acima)
// já teria falhado silenciosamente. Terceiro secret confirma que o cache
// não "gruda" no primeiro valor visto.
const encC = encryptProviderKey(plain, 'secret-C');
assert(decryptProviderKey(encC, 'secret-C') === plain, 'terceiro secret distinto (secret-C) também faz roundtrip corretamente com o cache ativo');
assert(decryptProviderKey(encC, 'secret-A') === '', 'cache não confunde secret-C com secret-A já cacheado anteriormente');

// --- entradas malformadas nunca lançam exceção ---
assert(decryptProviderKey('') === '', 'decrypt de string vazia retorna vazio, não lança');
assert(decryptProviderKey('lixo-sem-formato') === '', 'decrypt de dado corrompido retorna vazio, não lança');
assert(decryptProviderKey(null) === '', 'decrypt de null retorna vazio, não lança');

// --- mascaramento ---
assert(maskProviderKey('sk-or-v1-abcdef1234567890') === 'sk-o****7890', 'maskProviderKey mostra só 4+4 chars');
assert(maskProviderKey('short') === '****', 'maskProviderKey mascara totalmente strings curtas (<=8 chars)');
assert(maskProviderKey('') === '', 'maskProviderKey de string vazia retorna vazio');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
