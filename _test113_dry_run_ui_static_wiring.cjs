#!/usr/bin/env node
/* _test113_dry_run_ui_static_wiring.cjs — §113 Etapa A, Fase 3 (polish de UX)
   Asserts estruturais — sem navegador, sem rede, sem backend, sem agent real.
   Confirma: novas funções existem, botão existe no index.html, wiring liga
   o botão ao painel, painel chama a função de polling com o mission type
   correto (sf_dry_run_real), os 8 desfechos de sfDryRunRealMission são
   tratáveis pelo renderer, e nada do §105/§106/§111 foi removido (regressão). */

'use strict';
const fs   = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, 'frontend', 'assets', 'vision-core-bundle.js');
const INDEX  = path.join(__dirname, 'frontend', 'index.html');
const AGENT  = path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js');

for (const f of [BUNDLE, INDEX, AGENT]) {
  if (!fs.existsSync(f)) { console.error('ARQUIVO NÃO ENCONTRADO: ' + f); process.exit(1); }
}

const bundle = fs.readFileSync(BUNDLE, 'utf8');
const index  = fs.readFileSync(INDEX, 'utf8');
const agent  = fs.readFileSync(AGENT, 'utf8');

let passed = 0;
let failed = 0;

function assert(desc, expr) {
  if (expr) { console.log('  ✅ PASS: ' + desc); passed++; }
  else       { console.error('  ❌ FAIL: ' + desc); failed++; }
}

function count(src, pattern) {
  return (src.match(new RegExp(pattern, 'g')) || []).length;
}

console.log('\n§113 Dry-Run UI Static Wiring\n');

/* 1-3. As 3 novas funções existem exatamente 1 vez cada */
assert('vcQueueSfDryRunViaAgent definida 1 vez', count(bundle, 'function vcQueueSfDryRunViaAgent') === 1);
assert('renderSfDryRunResult definida 1 vez',     count(bundle, 'function renderSfDryRunResult') === 1);
assert('renderSfDryRunPanel definida 1 vez',       count(bundle, 'function renderSfDryRunPanel') === 1);

/* 4. A missão enfileirada usa o mission type real já validado pelo backend desde o §111 */
assert(
  'fila usa type: \'sf_dry_run_real\' (mesmo contrato do §111, backend intocado)',
  bundle.includes("type: 'sf_dry_run_real', target_path: targetPath, input: inputDesc")
);

/* 5. Botão de entrada existe no index.html, fora da página SF Builder (sidebar) */
assert(
  'botão #vcOpenDryRunPanelBtn presente no index.html',
  index.includes('id="vcOpenDryRunPanelBtn"')
);

/* 6. Wiring: o botão chama renderSfDryRunPanel() e dropa no chatStream (mesmo host dos outros painéis).
      §117-fix: 'chatStream' no handler era undefined (bug de escopo do §113) — corrigido para
      usar document.getElementById('v298ChatStream') diretamente dentro do handler. */
assert(
  'wiring liga vcOpenDryRunPanelBtn → [chatStream].appendChild(renderSfDryRunPanel())',
  bundle.includes("getElementById('vcOpenDryRunPanelBtn')") &&
  (bundle.includes('chatStream.appendChild(renderSfDryRunPanel())') || /* pré-§117 */
   bundle.includes('_cs.appendChild(renderSfDryRunPanel())'))          /* pós-§117-fix */
);

/* 7. renderSfDryRunPanel valida os 2 campos obrigatórios antes de enfileirar */
assert(
  'painel valida targetPath e inputDesc antes de chamar a fila',
  bundle.includes('if (!targetPath || !inputDesc)')
);

/* 8. Os 8 desfechos de sfDryRunRealMission (vision-agent.js) são exatamente os mesmos
      que o renderer do frontend trata como "sucesso" vs "demais casos" — aqui confirmamos
      que as strings de action usadas no backend/agent existem tal como documentado no §111,
      e que o renderer distingue ao menos os 2 casos com estilo visual próprio (completed/blocked). */
const agentActions = [
  'sf_dry_run_blocked_self_target', 'sf_dry_run_failed', 'sf_dry_run_listing',
  'sf_dry_run_diagnosis_failed', 'sf_dry_run_analysis_only',
  'sf_dry_run_patch_failed', 'sf_dry_run_validation_failed', 'sf_dry_run_completed'
];
assert(
  'as 8 actions de sfDryRunRealMission ainda existem em vision-agent.js (contrato §111 intocado)',
  agentActions.every(a => new RegExp("action:\\s*'" + a + "'").test(agent))
);
assert(
  'renderSfDryRunResult distingue visualmente completed (verde) e blocked_self_target (vermelho)',
  bundle.includes("rd.action === 'sf_dry_run_completed'") &&
  bundle.includes("rd.action === 'sf_dry_run_blocked_self_target'")
);

/* 9. Resultado de sucesso renderiza diff_preview.before/after com textContent (nunca innerHTML
      do conteúdo do projeto-alvo — segurança: repo externo nunca deve ser interpretado como HTML) */
const rsrIdx   = bundle.indexOf('function renderSfDryRunResult');
const rsrEnd   = bundle.indexOf('function renderSfDryRunPanel', rsrIdx);
const rsrBlock = rsrIdx >= 0 && rsrEnd > rsrIdx ? bundle.slice(rsrIdx, rsrEnd) : '';
assert(
  'renderSfDryRunResult usa textContent (não innerHTML) para output/diff_preview do projeto-alvo',
  rsrBlock.includes('diff_preview.before') && rsrBlock.includes('diff_preview.after') &&
  rsrBlock.includes('.textContent =') && !rsrBlock.includes('.innerHTML = rd.')
);

/* 10-13. Regressão — nada do §105/§106/§111 foi removido ou duplicado */
assert('vcQueueApplyPatchViaAgent (§106) intacta — 1 definição', count(bundle, 'function vcQueueApplyPatchViaAgent') === 1);
assert('renderApplyFixPanel (§105) intacta — 1 definição',        count(bundle, 'function renderApplyFixPanel') === 1);
assert('renderStandardMethodPanel (§36/§106) intacta — 1 definição', count(bundle, 'function renderStandardMethodPanel') === 1);
assert('renderValidationPanel (§105) intacta — 1 definição',      count(bundle, 'function renderValidationPanel') === 1);

/* 14. Backend e vision-agent.js NÃO foram tocados nesta etapa — contrato sf_dry_run_real
       já existia desde o §111, esta etapa é frontend-only. Checagem indireta: a action
       'sf_dry_run_completed' continua tendo diff_preview:{before,after} no agent (mesma forma). */
assert(
  'vision-agent.js ainda retorna diff_preview:{before,after} no caso de sucesso (forma intocada)',
  /diff_preview:\s*{\s*before:\s*simResult\.before,\s*after:\s*simResult\.after\s*}/.test(agent)
);

console.log('\n' + (failed === 0 ? '✅ ALL PASS' : '❌ FAILURES') +
  ': ' + passed + '/' + (passed + failed) + '\n');

if (failed > 0) process.exit(1);
