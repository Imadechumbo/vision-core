'use strict';

const { ProviderRegistry, ModelRegistry } = require('./multiproviders-domain');
const { LegacyCompatibilityBridge } = require('./multiproviders-legacy-bridge');

const providerRegistry = new ProviderRegistry();
const modelRegistry = new ModelRegistry(providerRegistry);
const legacyBridge = new LegacyCompatibilityBridge({
  providerRegistry,
  modelRegistry,
  tenant_id: 'vision-core-system',
});

function syncLegacyCatalog(source, descriptors) {
  const receipt = legacyBridge.sync(descriptors);
  if (receipt.incompatible.length) {
    console.warn('[multiproviders:legacy] incompatible catalog entries', {
      source,
      entries: receipt.incompatible.map(item => ({ provider_id: item.provider_id, code: item.code })),
    });
  }
  return receipt;
}

module.exports = {
  providerRegistry,
  modelRegistry,
  legacyBridge,
  syncLegacyCatalog,
  tenant_id: 'vision-core-system',
};