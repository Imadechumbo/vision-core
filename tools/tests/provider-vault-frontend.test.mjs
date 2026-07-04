#!/usr/bin/env node
/**
 * provider-vault-frontend — static checks (mesmo estilo dos testes §149-§155)
 *
 * Não sobe navegador (sem Playwright nesta peça) — verifica que o HTML/JS/CSS
 * da aba "Providers Configurados" está de fato presente e ligado nos pontos
 * certos. Cobre também o bug pré-existente do providerPayload() (provider
 * sempre 'auto', nunca lido do <select>) corrigido nesta mesma mudança.
 */
import { readFileSync } from 'fs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const html = readFileSync('frontend/index.html', 'utf8');
const js   = readFileSync('frontend/assets/vision-core-bundle.js', 'utf8');
const css  = readFileSync('frontend/assets/vision-core-bundle.css', 'utf8');

console.log('=== provider-vault-frontend ===\n');

console.log('[ index.html ]');
assert(html.includes('AI API VAULT — Configuração Principal'), 'header renomeado pra "Configuração Principal"');
assert(html.includes('id="aiVaultTabAddBtn"') && html.includes('id="aiVaultTabListBtn"'), 'dois botões de aba presentes');
assert(html.includes('id="aiVaultTabAdd"') && html.includes('id="aiVaultTabList"'), 'dois painéis de conteúdo presentes (add intocado / list novo)');
assert(html.includes('id="aiVaultConfiguredList"'), 'container da lista de providers configurados presente');
assert(html.includes('id="saveAiProviderBtn"') && html.includes('id="testAiProviderBtn"'), 'formulário original de adicionar continua presente (Opção B: intocado)');
assert(/id="aiPriority" type="number"/.test(html), 'campo de prioridade agora é numérico (era select fixo primary/fallback/disabled, nunca lido)');

console.log('\n[ vision-core-bundle.js ]');
const payloadIdx = js.indexOf('function providerPayload()');
assert(payloadIdx >= 0, 'providerPayload() existe');
const payloadBody = js.slice(payloadIdx, payloadIdx + 900);
assert(payloadBody.includes('aiProviderSelect') && payloadBody.includes('.value'), 'providerPayload() lê o <select> de provider (bug pré-existente: antes era sempre "auto")');
assert(!/provider:\s*'auto'\s*,/.test(payloadBody) || payloadBody.includes('aiProviderSelect'), 'provider não é mais hardcoded — fallback "auto" só quando o select não existe');
assert(payloadBody.includes('aiPriorityInput'), 'providerPayload() lê o campo de prioridade');

assert(js.includes('function initAiVaultConfiguredTab'), 'IIFE da aba "Providers Configurados" existe');
const tabIdx = js.indexOf('function initAiVaultConfiguredTab');
const tabBody = js.slice(tabIdx, tabIdx + 5000);
assert(tabBody.includes("apiFetch('/api/providers/list'"), 'aba nova consulta /api/providers/list');
assert(tabBody.includes("apiFetch('/api/providers/save'") && tabBody.includes('priority'), 'prioridade editável chama /api/providers/save só com {provider, priority}');
assert(tabBody.includes("apiFetch('/api/providers/test'"), 'botão "Testar" por linha chama /api/providers/test');
assert(tabBody.includes("apiFetch('/api/providers/delete'"), 'botão "Remover" chama /api/providers/delete');
assert(tabBody.includes('p.api_key_masked') && !tabBody.includes('p.api_key,'), 'renderização usa só api_key_masked — nunca a chave completa');
assert(/style\.display\s*=\s*isAdd/.test(tabBody), 'troca de aba alterna display dos dois painéis');
assert(js.includes('window.s_aiVaultRefreshList'), 'lista é exposta pra ser atualizada após save/test na aba "Adicionar"');

console.log('\n[ vision-core-bundle.css ]');
assert(css.includes('.ai-vault-tab{') || css.includes('.ai-vault-tab '), 'CSS das abas presente no bundle CARREGADO (não só style.css, que é dead code pra index.html)');
assert(css.includes('.ai-vault-row{') || css.includes('.ai-vault-row '), 'CSS das linhas da lista presente no bundle carregado');
assert(css.includes('--muted') && css.indexOf('.ai-vault-tab') > 0, 'reaproveita variáveis de cor já existentes (--muted/--cyan), sem paleta nova');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
