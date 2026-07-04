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
// LIMITAÇÃO CONHECIDA — não bloqueia esta implementação, só documentada
// (pedido explícito do humano nesta rodada):
//   status:'connected' não expira sozinho. Se a chave salva no vault for
//   revogada no provedor DEPOIS do teste, o vault continua achando que está
//   tudo bem até alguém clicar "Testar" de novo manualmente — não existe
//   verificação periódica nem TTL. Isso não é pior que o comportamento atual
//   das env vars (que também nunca são reverificadas), mas é um gap real:
//   uma chave revogada com status:'connected' antigo ainda vence sobre uma
//   env var funcional, e só um teste manual novo corrige isso.
// ---------------------------------------------------------------------------

function resolveProviderKey(providerId, envKey, providersStore, decryptFn) {
  const vaultEntry = providersStore && providersStore[providerId];
  if (vaultEntry && vaultEntry.status === 'connected' && vaultEntry.api_key_encrypted) {
    const decrypted = decryptFn(vaultEntry.api_key_encrypted);
    if (decrypted) return decrypted; // vault vence — já provou que conecta
  }
  return envKey || ''; // comportamento de hoje, inalterado
}

function effectiveProviderPriority(defaultIndex, providerId, providersStore) {
  const vaultEntry = providersStore && providersStore[providerId];
  if (vaultEntry && vaultEntry.status === 'connected' && typeof vaultEntry.priority === 'number') {
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

module.exports = { resolveProviderKey, effectiveProviderPriority, sortProvidersByEffectivePriority };
