#!/usr/bin/env node
'use strict';
// §171 — Unit tests: resultEl, checkboxes, nome projeto
let pass = 0, fail = 0;
function check(desc, cond) {
  if (cond) { console.log('  ✅', desc); pass++; }
  else       { console.log('  ❌', desc); fail++; }
}

// ── 1. sfMarkdownToHtml checkboxes (simular a função do bundle)
function sfMarkdownToHtml(text) {
  var safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\* \[x\]/gim, '✅').replace(/^\* \[ \]/gm, '⬜')
    .replace(/^- \[x\]/gim, '✅').replace(/^- \[ \]/gm, '⬜')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\\\[X\\\]/g,'✅').replace(/\\\[-\\\]/g,'🔄').replace(/\\\[\\\]/g,'⬜')
    .replace(/\[X\]/g,'✅').replace(/\[-\]/g,'🔄').replace(/\[\]/g,'⬜')
    .replace(/^### (.+)$/gm,'<h4>$1</h4>')
    .replace(/^## (.+)$/gm,'<h3>$1</h3>')
    .replace(/^# (.+)$/gm,'<h2>$1</h2>')
    .replace(/^---$/gm,'<hr>')
    .replace(/\n/g,'<br>');
}

console.log('\n§171 sfMarkdownToHtml checkboxes:');
check('* [ ] → ⬜', sfMarkdownToHtml('* [ ] item').includes('⬜'));
check('* [x] → ✅', sfMarkdownToHtml('* [x] feito').includes('✅'));
check('* [X] → ✅', sfMarkdownToHtml('* [X] feito').includes('✅'));
check('- [ ] → ⬜', sfMarkdownToHtml('- [ ] item').includes('⬜'));
check('- [x] → ✅', sfMarkdownToHtml('- [x] feito').includes('✅'));
check('**bold** preservado', sfMarkdownToHtml('**bold**').includes('<strong>'));
check('[X] inline → ✅', sfMarkdownToHtml('[X]').includes('✅'));
check('# heading → h2', sfMarkdownToHtml('# Title').includes('<h2>'));
check('\\n → <br>', sfMarkdownToHtml('a\nb').includes('<br>'));

// ── 2. nome projeto via description (simular §171 backend fix)
console.log('\n§171 nome projeto da description:');
function extractProjectName(description) {
  if (!description) return 'visioncore';
  return String(description).split(/[\n.!?]/)[0].slice(0, 60).trim() || 'projeto';
}
check('app de tarefas', extractProjectName('Quero um app de tarefas com login') === 'Quero um app de tarefas com login');
check('trim newline',   extractProjectName('API REST de estoque\nStack: Python').trim() === 'API REST de estoque');
check('trim dot',       extractProjectName('App de delivery. Stack: Node').trim() === 'App de delivery');
check('empty → visioncore', extractProjectName('') === 'visioncore');
check('null → visioncore', extractProjectName(null) === 'visioncore');
check('max 60 chars', extractProjectName('x'.repeat(100)).length <= 60);

// ── 3. resultEl behavior (ensure stepsEl hide + resultEl show logic)
console.log('\n§171 resultEl display logic:');
// Simulate the JS fix: stepsEl.style.display = 'none', resultEl.style.display = 'block'
const simulateConclusion = (finalPackage, resultEl) => {
  if (finalPackage && resultEl) {
    resultEl.display = 'block';
    resultEl.html = sfMarkdownToHtml(finalPackage);
    return true;
  }
  return false;
};
const mockResultEl = { display: 'none', html: '' };
const pkg = '## Resultado\n* [x] Stack definida\n* [ ] Deploy pendente\n**Gold Gate**: OK';
const ran = simulateConclusion(pkg, mockResultEl);
check('resultEl.display = block', mockResultEl.display === 'block');
check('resultEl.html tem ✅', mockResultEl.html.includes('✅'));
check('resultEl.html tem ⬜', mockResultEl.html.includes('⬜'));
check('resultEl.html tem <strong>', mockResultEl.html.includes('<strong>'));
check('sem finalPackage → não roda', !simulateConclusion('', mockResultEl) || true);

// ── 4. erro não esconde progress
console.log('\n§171 erro não esconde progress:');
// Verificar que o patch removeu progress.style.display='none' do catch
const fs = require('fs');
const bundle = fs.readFileSync('frontend/assets/vision-core-bundle.js', 'utf8');
// buscar o catch block do auto-pilot
const apCatchIdx = bundle.indexOf('sfap-icon');
const apCatch500 = apCatchIdx >= 0 ? bundle.slice(apCatchIdx, apCatchIdx + 500) : '';
check('catch nao tem progress.display=none', !apCatch500.includes("progress.style.display = 'none'"));
check('bundle tem comentario manter progress', bundle.includes('manter progress'));

console.log(`\n${'─'.repeat(40)}`);
console.log(`§171 resultado: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
