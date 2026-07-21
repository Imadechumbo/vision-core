'use strict';

// ---------------------------------------------------------------------------
// AI Provider Vault — regras de roteamento (Fase D(a), decididas com o
// humano ANTES de implementar — ver CLAUDE.md, seção do checkpoint):
//
//   1) O vault só vence sobre a env var pra um provider quando a ÚLTIMA vez
//      que alguém clicou "Testar" naquele provider deu status 'connected'.
//      Vault com status 'untested'/'error'/'http_401'/'no_key'/etc. NUNCA
//      desloca uma chave de env var que já está rodando — cai
//      automaticamente pro comportamento de hoje (env var, sem mudança).
//   2) A prioridade EDITÁVEL da tela só substitui a prioridade-default
//      (posição no array hardcoded do callLLM) pelo mesmo motivo: sem
//      status:'connected', a prioridade salva é ignorada e a ordem de
//      fallback entre providers fica idêntica à de sempre.
//   3) Isolado do server.js pra ser testável com um _providersStore falso
//      (tools/tests/provider-vault-routing.test.mjs) — zero Express, zero
//      decriptação real, zero rede.
//
// Connected status is trusted only within DEFAULT_PROVIDER_STATUS_TTL_MS; stale or
// malformed timestamps fail closed to the environment-key/default-priority path.
// ---------------------------------------------------------------------------

const DEFAULT_PROVIDER_STATUS_TTL_MS = 5 * 60 * 1000;

function hasFreshConnectedStatus(vaultEntry, nowMs = Date.now(), ttlMs = DEFAULT_PROVIDER_STATUS_TTL_MS) {
  if (!vaultEntry || vaultEntry.status !== 'connected' || !vaultEntry.last_tested_at) return false;
  const testedAt = Date.parse(vaultEntry.last_tested_at);
  return Number.isFinite(testedAt) && nowMs - testedAt >= 0 && nowMs - testedAt <= ttlMs;
}

function resolveProviderKey(providerId, envKey, providersStore, decryptFn, nowMs = Date.now()) {
  const vaultEntry = providersStore && providersStore[providerId];
  if (hasFreshConnectedStatus(vaultEntry, nowMs) && vaultEntry.api_key_encrypted) {
    const decrypted = decryptFn(vaultEntry.api_key_encrypted);
    if (decrypted) return decrypted; // vault vence — já provou que conecta
  }
  return envKey || ''; // comportamento de hoje, inalterado
}

function effectiveProviderPriority(defaultIndex, providerId, providersStore, nowMs = Date.now()) {
  const vaultEntry = providersStore && providersStore[providerId];
  if (hasFreshConnectedStatus(vaultEntry, nowMs) && typeof vaultEntry.priority === 'number') {
    return vaultEntry.priority;
  }
  return defaultIndex; // default: ordem hardcoded atual do array do callLLM
}

// Retorna uma NOVA array ordenada — não muta `providers`. O spread `{...p}`
// preserva as funções (buildBody/authHeaders/extractText/urlOverride) de
// cada entrada, só adiciona/sobrescreve o campo `priority`.
function sortProvidersByEffectivePriority(providers, providersStore) {
  return providers
    .map((p, idx) => ({ ...p, priority: effectiveProviderPriority(idx, p.id, providersStore) }))
    .sort((a, b) => a.priority - b.priority);
}

module.exports = { DEFAULT_PROVIDER_STATUS_TTL_MS, hasFreshConnectedStatus, resolveProviderKey, effectiveProviderPriority, sortProvidersByEffectivePriority };
