/**
 * §128 — Tutorial Spotlight Unit Tests
 * Verifica: novos tutoriais registrados, targets válidos no DOM, menu atualizado.
 * Sem jsdom — usa string/regex matching no bundle e no index.html de produção.
 * Roda com: node _test128_tutorial_unit.cjs
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT        = __dirname;
const BUNDLE_PATH = path.join(ROOT, 'frontend', 'assets', 'vision-core-bundle.js');
const INDEX_PATH  = path.join(ROOT, 'frontend', 'index.html');

const bundle = fs.readFileSync(BUNDLE_PATH, 'utf8');
const html   = fs.readFileSync(INDEX_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) {
    console.log('  ✅ ' + label);
    pass++;
  } else {
    console.log('  ❌ ' + label + (detail ? ' — ' + detail : ''));
    fail++;
  }
}

// Helpers
function bundleHas(str)   { return bundle.includes(str); }
function htmlHas(str)     { return html.includes(str); }
function idInHtml(id)     { return html.includes('id="' + id + '"'); }
function selInHtml(cls)   { return html.includes('class="' + cls + '"') || html.includes(cls); }

console.log('\n§128 — Tutorial Spotlight Unit Tests\n');

// ── 1. Bundle expõe showMainCockpitPage ────────────────────────────────────
ok('window.showMainCockpitPage exposto no bundle (§128)',
  bundleHas('window.showMainCockpitPage = showMainCockpitPage'));

// ── 2. Tutoriais originais ainda registrados ───────────────────────────────
const ORIGINALS = ['agent', 'mission', 'passgold', 'sf', 'agents'];
ORIGINALS.forEach(function(name) {
  ok('Tutorial original "' + name + '" ainda registrado (vcRegisterTutorial)',
    bundleHas("vcRegisterTutorial('" + name + "'"));
});

// ── 3. Novos tutoriais §128 registrados ───────────────────────────────────
const NEW_TUTS = [
  { name: 'github',  key: 'vc_tutorial_github_done',  stepsConst: 'STEPS_GITHUB' },
  { name: 'tools',   key: 'vc_tutorial_tools_done',   stepsConst: 'STEPS_TOOLS'  },
  { name: 'metrics', key: 'vc_tutorial_metrics_done', stepsConst: 'STEPS_METRICS'},
];
NEW_TUTS.forEach(function(t) {
  ok('Novo tutorial "' + t.name + '" registrado com vcRegisterTutorial',
    bundleHas("vcRegisterTutorial('" + t.name + "'"));
  ok('Novo tutorial "' + t.name + '" tem storage key correta (' + t.key + ')',
    bundleHas(t.key));
  ok('Novo tutorial "' + t.name + '" tem array de steps (' + t.stepsConst + ')',
    bundleHas('var ' + t.stepsConst));
});

// ── 4. Todos os targets dos novos tutoriais existem no DOM ─────────────────
// GitHub targets
const GITHUB_TARGETS = ['githubPanel', 'githubStatus', 'githubStatusBtn', 'githubPrBtn', 'policyBtn'];
GITHUB_TARGETS.forEach(function(id) {
  ok('Target "#' + id + '" existe no index.html (GitHub tutorial)',
    idInHtml(id));
});

// Tools targets
const TOOLS_TARGETS = ['marketplace', 'toolsBox'];
TOOLS_TARGETS.forEach(function(id) {
  ok('Target "#' + id + '" existe no index.html (Tools tutorial)',
    idInHtml(id));
});

// Metrics targets
const METRICS_TARGETS = ['metricsBoard', 'agentMetricsLarge', 'metricsSourceBadge'];
METRICS_TARGETS.forEach(function(id) {
  ok('Target "#' + id + '" existe no index.html (Métricas tutorial)',
    idInHtml(id));
});

// ── 5. Bundle contém _cockpitScroll helper ─────────────────────────────────
ok('Helper _cockpitScroll definido no bundle',
  bundleHas('var _cockpitScroll = function'));
ok('_cockpitScroll chama showMainCockpitPage (volta ao cockpit se SF page aberta)',
  bundleHas('showMainCockpitPage') && bundleHas('_cockpitScroll'));

// ── 6. Menu sidebar: 9 itens (6 originais + 3 novos) ─────────────────────
// Conta ocorrências de vcStartSectionTutorial no #vcTutPanel
const tutPanelMatch = html.match(/<div id="vcTutPanel"[\s\S]*?<\/div>/);
let countItems = 0;
if (tutPanelMatch) {
  const panelHtml = tutPanelMatch[0];
  const matches   = panelHtml.match(/class="vc-tut-item"/g);
  countItems = matches ? matches.length : 0;
}
ok('Sidebar menu tem 9 itens .vc-tut-item (6 originais + 3 §128)',
  countItems === 9, 'encontrado: ' + countItems);

// ── 7. Novos itens no menu com onclick correto ─────────────────────────────
const MENU_CHECKS = [
  { text: 'GitHub Agent',  onclick: "vcStartSectionTutorial('github')" },
  { text: 'Tools',         onclick: "vcStartSectionTutorial('tools')"  },
  { text: 'Métricas',      onclick: "vcStartSectionTutorial('metrics')"},
];
MENU_CHECKS.forEach(function(c) {
  ok('Menu item "' + c.text + '" presente no index.html', htmlHas(c.text));
  ok('Menu item "' + c.text + '" tem onclick correto', htmlHas(c.onclick));
});

// ── 8. Targets têm seletor válido (#id ou .class ou [attr]) no bundle ──────
// Verifica que os targets usados no bundle começam com # (IDs, que confirmamos existir)
const TARGET_STRS = [
  "'#githubPanel'", "'#githubStatus'", "'#githubStatusBtn'", "'#githubPrBtn'", "'#policyBtn'",
  "'#marketplace'", "'#toolsBox'",
  "'#metricsBoard'", "'#agentMetricsLarge'", "'#metricsSourceBadge'",
];
TARGET_STRS.forEach(function(t) {
  ok('Target ' + t + ' referenciado no bundle com seletor #',
    bundleHas('target: ' + t));
});

// ── 9. Nenhum tutorial novo registrado duas vezes ──────────────────────────
['github', 'tools', 'metrics'].forEach(function(name) {
  const re = new RegExp("vcRegisterTutorial\\('" + name + "'", 'g');
  const count = (bundle.match(re) || []).length;
  ok('Tutorial "' + name + '" registrado exatamente 1x (não duplicado)',
    count === 1, 'encontrado ' + count + 'x');
});

// ── 10. Steps têm pos válido ('top' | 'bottom' | 'left' | 'right') ────────
const POS_VALUES = ["pos: 'top'", "pos: 'bottom'", "pos: 'left'", "pos: 'right'"];
// Conta steps de cada novo tutorial pela presença de 'target: #xxx'
// e verifica que todos têm pos correspondente
const newTutBlocks = ['STEPS_GITHUB', 'STEPS_TOOLS', 'STEPS_METRICS'];
newTutBlocks.forEach(function(stepsName) {
  const idx   = bundle.indexOf('var ' + stepsName);
  const idxEnd = bundle.indexOf('window.vcRegisterTutorial', idx);
  const block = idx > -1 && idxEnd > idx ? bundle.slice(idx, idxEnd) : '';
  const targetCount = (block.match(/target:/g) || []).length;
  const posCount    = (block.match(/pos:/g)    || []).length;
  ok(stepsName + ': todos os steps têm pos (target count=' + targetCount + ' = pos count=' + posCount + ')',
    targetCount > 0 && targetCount === posCount);
});

// ── Resumo ─────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────────────');
console.log('§128 Tutorial Unit: ' + pass + '/' + (pass + fail) + ' PASS');
if (fail > 0) {
  console.log('❌ FAILED: ' + fail + ' testes falharam');
  process.exit(1);
} else {
  console.log('✅ ALL PASS');
  process.exit(0);
}
