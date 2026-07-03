#!/usr/bin/env node
/* _test106_static_wiring.cjs — §106 Etapa A
   9 asserts estruturais no bundle — sem navegador, sem rede, sem backend.
   Confirma: função compartilhada existe 1 vez, os 2 painéis a chamam,
   código inline antigo removido, nova variável agentBtn106 presente. */

'use strict';
const fs   = require('fs');
const path = require('path');

const BUNDLE = path.join(__dirname, 'frontend', 'assets', 'vision-core-bundle.js');
if (!fs.existsSync(BUNDLE)) { console.error('BUNDLE NOT FOUND: ' + BUNDLE); process.exit(1); }

const src = fs.readFileSync(BUNDLE, 'utf8');

let passed = 0;
let failed = 0;

function assert(desc, expr) {
  if (expr) { console.log('  ✅ PASS: ' + desc); passed++; }
  else       { console.error('  ❌ FAIL: ' + desc); failed++; }
}

function count(pattern) {
  return (src.match(new RegExp(pattern, 'g')) || []).length;
}

console.log('\n§106 Static Wiring — ' + path.basename(BUNDLE) + '\n');

/* 1. Função compartilhada definida exatamente 1 vez */
assert(
  'vcQueueApplyPatchViaAgent definida 1 vez',
  count('function vcQueueApplyPatchViaAgent') === 1
);

/* 2. Total de ocorrências de vcQueueApplyPatchViaAgent( = 3
      (1 definição + 2 chamadas — renderApplyFixPanel + renderStandardMethodPanel) */
assert(
  'vcQueueApplyPatchViaAgent( ocorre 3x (1 def + 2 calls)',
  count('vcQueueApplyPatchViaAgent\\(') === 3
);

/* 3. renderApplyFixPanel chama a função compartilhada (call-site com hermesObj) */
assert(
  'renderApplyFixPanel contém call site com hermesObj',
  src.includes('vcQueueApplyPatchViaAgent(hermesObj, statusEl,')
);

/* 4. renderStandardMethodPanel chama a função compartilhada (call-site com h) */
assert(
  'renderStandardMethodPanel contém call site com h (hermesObj local)',
  src.includes('vcQueueApplyPatchViaAgent(h, statusEl,')
);

/* 5. Código inline antigo removido — pollResult105 não existe mais no bundle */
assert(
  'pollResult105 removido (inline antigo do §105)',
  count('pollResult105') === 0
);

/* 6. Nova função interna pollResult106 existe na função compartilhada */
assert(
  'pollResult106 existe na função compartilhada (≥1 ocorrência)',
  count('pollResult106') >= 1
);

/* 7. renderValidationPanel ainda existe (regressão §105 não quebrou) */
assert(
  'renderValidationPanel definida 1 vez (regressão)',
  count('function renderValidationPanel') === 1
);

/* 8. agentBtn106 presente no bundle (novo botão em renderStandardMethodPanel) */
assert(
  'agentBtn106 presente (≥1 ocorrência)',
  count('agentBtn106') >= 1
);

/* 9. "Aplicar no Vision Agent Local" aparece dentro do bloco renderStandardMethodPanel
      (após o índice da sua definição, antes do próximo comentário de seção) */
const smpIdx = src.indexOf('function renderStandardMethodPanel');
const afterSmp = src.indexOf('/* ── EXECUTAR MISSÃO', smpIdx);
const smpBlock = smpIdx >= 0 && afterSmp > smpIdx ? src.slice(smpIdx, afterSmp) : '';
assert(
  '"📡 Aplicar no Vision Agent Local" no bloco renderStandardMethodPanel',
  smpBlock.includes('Aplicar no Vision Agent Local')
);

console.log('\n' + (failed === 0 ? '✅ ALL PASS' : '❌ FAILURES') +
  ': ' + passed + '/' + (passed + failed) + '\n');

if (failed > 0) process.exit(1);
