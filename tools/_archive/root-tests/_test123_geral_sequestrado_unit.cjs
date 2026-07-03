// §123 — Teste de regressão: "Geral" sequestrado pelo último tutorial de seção aberto.
// Usa o vision-core-bundle.js de PRODUÇÃO real (não um mock), com jsdom simulando o
// DOM real extraído de frontend/index.html. Sem isso, o teste poderia "passar" contra
// uma versão simplificada da lógica e não pegar o bug real do arquivo de produção.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const indexHtml = fs.readFileSync(path.join(ROOT, 'frontend/index.html'), 'utf8');
const bundleJs   = fs.readFileSync(path.join(ROOT, 'frontend/assets/vision-core-bundle.js'), 'utf8');

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log('  OK   ' + label); pass++; }
  else      { console.log('  FAIL ' + label); fail++; }
}

const dom = new JSDOM(indexHtml, {
  url: 'https://visioncoreai.pages.dev/',
  runScripts: 'outside-only', // não roda os <script src> do HTML (jszip CDN, etc) — só o que injetarmos
  pretendToBeVisual: true,
});
const { window } = dom;

// silencia ruído esperado (warnings/erros de libs que não existem nesse harness mínimo)
window.console.warn = () => {};
window.console.error = () => {};
// jsdom não implementa fetch; o bundle chama fetch() em código não relacionado a este
// teste (billing, métricas, etc) — stub suficiente pra não quebrar o eval inicial.
window.fetch = function() { return Promise.reject(new Error('fetch stub (não usado neste teste)')); };

try {
  window.eval(bundleJs);
} catch (e) {
  console.error('ERRO ao executar vision-core-bundle.js no harness:', e.message);
  process.exit(2);
}

console.log('\n=== §123: Geral sequestrado pelo último tutorial de seção ===\n');

// 1. Estado inicial: abre o tutorial Geral, confirma título correto (T1, passo 1)
window.vcStartTutorial();
const tituloGeralAntes = window.document.getElementById('vcTutorialTitle').textContent;
check(
  'Geral mostra o passo 1 correto antes de qualquer seção ser aberta',
  tituloGeralAntes.indexOf('Bem-vindo ao Vision Core') !== -1
);

// 2. Abre o tutorial de seção "Agent local" (simulando clique no item do menu)
window.vcStartSectionTutorial('agent');
const tituloAgent = window.document.getElementById('vcTutorialTitle').textContent;
check(
  'Agent local mostra seu próprio passo 1 corretamente',
  tituloAgent.indexOf('Vision Agent Local') !== -1
);

// 3. ESTE é o cenário do bug: clica em "Geral" de novo, depois de já ter aberto uma seção
window.vcStartTutorial();
const tituloGeralDepois = window.document.getElementById('vcTutorialTitle').textContent;
check(
  'Geral mostra o conteúdo do GERAL (não o do Agent local) depois de reabrir',
  tituloGeralDepois.indexOf('Bem-vindo ao Vision Core') !== -1
);
check(
  'Geral NÃO mostra mais o conteúdo da seção anterior (regressão do bug)',
  tituloGeralDepois.indexOf('Vision Agent Local') === -1
);

// 4. Garante que a chave de localStorage também foi restaurada corretamente
//    (bug secundário: _activeStorageKey ficava 'vc_tutorial_agent_done' depois de
//    abrir uma seção, então marcar "não exibir novamente" no Geral gravaria na
//    chave errada).
const noShowCb = window.document.getElementById('vcTutorialNoShow');
noShowCb.checked = true;
window.document.getElementById('vcTutorialSkip').click(); // fecha via "pular" -> closeTutorial()
check(
  '"não exibir novamente" no Geral grava na chave certa (vc_tutorial_done)',
  window.localStorage.getItem('vc_tutorial_done') === '1'
);
check(
  '"não exibir novamente" no Geral NÃO grava na chave do Agent local',
  window.localStorage.getItem('vc_tutorial_agent_done') !== '1'
);

// 5. Round-trip extra: abre outra seção (mission), depois Geral de novo — confirma
//    que o fix não é específico de "agent", é genérico pra qualquer seção.
window.vcStartSectionTutorial('mission');
window.vcStartTutorial();
const tituloGeralRoundtrip2 = window.document.getElementById('vcTutorialTitle').textContent;
check(
  'Geral continua correto depois de Mission control também ter sido aberto',
  tituloGeralRoundtrip2.indexOf('Bem-vindo ao Vision Core') !== -1
);

console.log('\n' + pass + ' passou, ' + fail + ' falhou\n');
process.exit(fail > 0 ? 1 : 0);
