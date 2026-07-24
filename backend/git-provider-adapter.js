'use strict';

// GitProviderAdapter — interface comum (docs/GIT-PROVIDER-SPEC.md §62, Fase 1).
// Registro simples e fail-closed: um adapter só entra no registro se
// implementar os 7 métodos abaixo; buscar um provider não registrado
// falha de forma visível, nunca retorna undefined silenciosamente.

const GIT_PROVIDER_METHODS = [
  'testConnection',
  'createBranch',
  'commitFiles',
  'createPullRequest',
  'getPullRequestStatus',
  'mergePullRequest',
  'getCIStatus'
];

const _providers = new Map();

function registerGitProvider(name, adapter) {
  if (!name || typeof name !== 'string') {
    throw new Error('git_provider_name_required');
  }
  const missing = GIT_PROVIDER_METHODS.filter((method) => typeof adapter[method] !== 'function');
  if (missing.length) {
    throw new Error(`git_provider_adapter_incomplete: ${name} missing ${missing.join(', ')}`);
  }
  _providers.set(name, adapter);
  return adapter;
}

function getGitProvider(name) {
  const adapter = _providers.get(name);
  if (!adapter) {
    const err = new Error(`git_provider_not_registered: ${name}`);
    err.code = 'git_provider_not_registered';
    throw err;
  }
  return adapter;
}

function listGitProviders() {
  return Array.from(_providers.keys());
}

module.exports = {
  GIT_PROVIDER_METHODS,
  registerGitProvider,
  getGitProvider,
  listGitProviders
};
