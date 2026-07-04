'use strict';
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// AI Provider Vault — criptografia at-rest (Fase B: decisão do usuário foi
// Opção 3 sobre Opção 2 — env vars do EB continuam default, este vault é um
// override opcional que só entra em jogo quando alguém salva um provider pela
// tela "Configuração Principal"). Isolado do server.js de propósito: permite
// teste unitário real (roundtrip encrypt→decrypt) sem subir Express, S3 ou
// qualquer outra parte do backend — ver tools/tests/provider-vault-crypto.test.mjs.
//
// PROVIDER_VAULT_SECRET — de onde vem HOJE:
//   - Produção (EB): a env var NÃO existe em nenhum deploy ainda — igual ao
//     estado do HOTMART_HOTTOK (§150 no CLAUDE.md): pendente, documentado,
//     não bloqueia a feature. Até alguém adicionar PROVIDER_VAULT_SECRET nas
//     env vars do EB, o código cai no fallback abaixo.
//   - Fallback (dev/local, e produção até o env var real ser configurado):
//     mesma estratégia já usada por SESSION_SECRET em server.js (~linha 376)
//     — uma string hardcoded óbvia (*-change-me*) que funciona mas não
//     deveria ficar em produção pra sempre.
//   - Deliberadamente NÃO derivada de SESSION_SECRET/JWT existentes: são
//     segredos de propósitos diferentes (sessão de auth vs. cifra de dado em
//     repouso) — rotacionar um não pode acidentalmente destruir o outro.
//
// INCERTEZA CONHECIDA — NÃO RESOLVIDA NESTA RODADA:
//   Rotação de PROVIDER_VAULT_SECRET não tem solução aqui. Se o valor dessa
//   env var mudar (rotação manual, incidente, etc.), toda entrada já cifrada
//   com a chave antiga fica PERMANENTEMENTE ilegível — decryptProviderKey()
//   retorna '' (falha silenciosa, ver catch abaixo) e o provider volta a se
//   comportar como "sem chave salva" (cai no fallback de env var do EB, se
//   existir — nunca quebra a request). Não existe ferramenta de
//   re-criptografia/migração de chave nesta versão. Quem for rotacionar de
//   propósito precisa descriptografar tudo com a chave antiga e re-salvar
//   com a nova ANTES de trocar a env var em produção.
// ---------------------------------------------------------------------------
const DEV_FALLBACK_SECRET = 'vision-core-dev-vault-secret-change-me';
// Salt fixo de propósito (não aleatório): a derivação precisa ser
// determinística pra conseguir decriptar depois — um salt aleatório por
// chamada tornaria toda decriptação futura impossível.
const KDF_SALT = 'vision-core-provider-vault-v1';

// Fase D(a): callLLM() passa a chamar decryptProviderKey() em TODA chamada
// de LLM (não só quando alguém salva/testa pela tela) — sem isto, cada
// request pagaria de novo o custo deliberadamente alto do scryptSync (mesmo
// N=16384 do hash de senha, ~dezenas de ms). O que é seguro cachear é só a
// CHAVE DERIVADA: ela depende unicamente de PROVIDER_VAULT_SECRET, que só
// muda com restart do processo — não cacheia o ESTADO do vault (isso
// continua sendo lido fresco de _providersStore a cada chamada, ver
// provider-vault-routing.js). Map (não uma variável única) pra não quebrar
// os testes que passam secretOverride diferentes na mesma execução.
const _kdfKeyCache = new Map();
function vaultEncryptionKey(secretOverride) {
  const secret = secretOverride || process.env.PROVIDER_VAULT_SECRET || DEV_FALLBACK_SECRET;
  if (_kdfKeyCache.has(secret)) return _kdfKeyCache.get(secret);
  const key = crypto.scryptSync(secret, KDF_SALT, 32);
  _kdfKeyCache.set(secret, key);
  return key;
}

function encryptProviderKey(plainText, secretOverride) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultEncryptionKey(secretOverride), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(':');
}

function decryptProviderKey(encoded, secretOverride) {
  try {
    const [ivHex, tagHex, dataHex] = String(encoded || '').split(':');
    if (!ivHex || !tagHex || !dataHex) return '';
    const decipher = crypto.createDecipheriv('aes-256-gcm', vaultEncryptionKey(secretOverride), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return plain.toString('utf8');
  } catch (e) {
    return ''; // chave errada/rotacionada ou dado corrompido — ver INCERTEZA CONHECIDA acima
  }
}

function maskProviderKey(value) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

module.exports = {
  encryptProviderKey,
  decryptProviderKey,
  maskProviderKey,
  vaultEncryptionKey,
  DEV_FALLBACK_SECRET,
};
