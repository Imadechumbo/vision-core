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
// PROVIDER_VAULT_SECRET — fail-closed desde a limpeza de resíduos de dogfood
// que se seguiu ao INCIDENTE-4 (mesmo padrão de backend/server.js:377-386,
// requireSessionSecret()): sem a env var real, forte e diferente do literal
// de fallback conhecido, o módulo lança no carregamento — o processo não
// sobe. Isso fecha o mesmo tipo de risco do SESSION_SECRET: antes desta
// mudança, sem PROVIDER_VAULT_SECRET configurado em produção, qualquer
// chave de API de LLM salva pela tela "Configuração Principal" era cifrada
// com um segredo público conhecido, decifrável por qualquer leitor deste
// repositório. Deliberadamente NÃO derivada de SESSION_SECRET/JWT: são
// segredos de propósitos diferentes (sessão de auth vs. cifra de dado em
// repouso) — rotacionar um não pode acidentalmente destruir o outro.
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
// Valor histórico de fallback público — mantido só para o boot recusar
// explicitamente esse literal específico (nunca mais usado como segredo de
// verdade). Construído por concatenação, não como string literal única, pelo
// mesmo motivo do publicFallback em requireSessionSecret().
const KNOWN_INSECURE_FALLBACK = ['vision', 'core', 'dev', 'vault', 'secret', 'change', 'me'].join('-');

function requireProviderVaultSecret() {
  const secret = String(process.env.PROVIDER_VAULT_SECRET || '').trim();
  if (!secret) throw new Error('PROVIDER_VAULT_SECRET_REQUIRED');
  if (secret === KNOWN_INSECURE_FALLBACK) throw new Error('PROVIDER_VAULT_SECRET_INSECURE_PUBLIC_FALLBACK');
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('PROVIDER_VAULT_SECRET_TOO_SHORT');
  return secret;
}

const PROVIDER_VAULT_SECRET = requireProviderVaultSecret();

// Salt fixo de propósito (não aleatório): a derivação precisa ser
// determinística pra conseguir decriptar depois — um salt aleatório por
// chamada tornaria toda decriptação futura impossível.
const KDF_SALT = 'vision-core-provider-vault-v1';

// Fase D(a): callLLM() passa a chamar decryptProviderKey() em TODA chamada
// de LLM (não só quando alguém salva/testa pela tela) — sem isto, cada
// request pagaria de novo o custo deliberadamente alto do scryptSync (mesmo
// N=16384 do hash de senha, ~dezenas de ms). O que é seguro cachear é só a
// CHAVE DERIVADA: ela depende unicamente do secret efetivo (override do
// chamador, ou PROVIDER_VAULT_SECRET fixo do processo) — não cacheia o
// ESTADO do vault (isso continua sendo lido fresco de _providersStore a cada
// chamada, ver provider-vault-routing.js). Map (não uma variável única) pra
// não quebrar os testes que passam secretOverride diferentes na mesma
// execução.
const _kdfKeyCache = new Map();
function vaultEncryptionKey(secretOverride) {
  const secret = secretOverride || PROVIDER_VAULT_SECRET;
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
};
