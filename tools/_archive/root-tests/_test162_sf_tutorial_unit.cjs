/**
 * _test162_sf_tutorial_unit.cjs — §162 Tutorial SF dedicado
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const bundle = fs.readFileSync(path.join(__dirname, 'frontend/assets/vision-core-bundle.js'), 'utf8');
const html   = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');

console.log('\n=== §162 SF TUTORIAL UNIT TESTS ===\n');

// --- bundle.js: STEPS_SF2 structure ---
console.log('[ bundle.js — STEPS_SF2 ]');
ok('STEPS_SF2 defined',                 bundle.includes('var STEPS_SF2'));
ok("vcRegisterTutorial('sf2')",         bundle.includes("vcRegisterTutorial('sf2'"));
ok("storageKey vc_tutorial_sf2_done",   bundle.includes("'vc_tutorial_sf2_done'"));

// 7 steps — check by unique title fragments
ok('step 1: Software Factory o que e',  bundle.includes('Software Factory — o que é?'));
ok('step 2: Descreva seu projeto',       bundle.includes('Passo 1 — Descreva seu projeto'));
ok('step 3: AUTO-PILOT recomendado',     bundle.includes('AUTO-PILOT (recomendado)'));
ok('step 4: 7 modulos em sequencia',     bundle.includes('7 módulos em sequência'));
ok('step 5: Modo manual',                bundle.includes('Modo manual (avançado)'));
ok('step 6: Gold Gate qualidade',        bundle.includes('Gold Gate — qualidade garantida'));
ok('step 7: Pronto para comecar',        bundle.includes('Pronto para começar!'));

// targets
ok('target vcSfChatInput in STEPS_SF2', (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  return idx >= 0 && bundle.slice(idx, idx + 2200).includes("'#vcSfChatInput'");
})());
ok('target vcSfAutoPilotBtn in STEPS_SF2', (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  return idx >= 0 && bundle.slice(idx, idx + 2200).includes("'#vcSfAutoPilotBtn'");
})());
ok('target vc-sf-module-nav-h in STEPS_SF2', (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  return idx >= 0 && bundle.slice(idx, idx + 2200).includes("'.vc-sf-module-nav-h'");
})());

// --- bundle.js: initSfTutorial wiring ---
console.log('\n[ bundle.js — initSfTutorial ]');
ok('initSfTutorial function',            bundle.includes('function initSfTutorial('));
ok('initSfTutorial() called',            bundle.includes('initSfTutorial();'));
ok("vcSfTutorialBtn referenced",         bundle.includes("'vcSfTutorialBtn'"));
ok("vcStartSectionTutorial('sf2')",      bundle.includes("vcStartSectionTutorial('sf2')"));

// --- index.html ---
console.log('\n[ index.html — HTML + CSS ]');
ok('vcSfTutorialBtn in HTML',            html.includes('id="vcSfTutorialBtn"'));
ok('TUTORIAL text on button',            html.includes('TUTORIAL'));
ok('.vc-sf-tutorial-trigger CSS',        html.includes('.vc-sf-tutorial-trigger'));
ok('button inside sf-page-header',      (() => {
  const headerIdx = html.indexOf('class="vc-sf-page-header"');
  // window of 600 covers nested div + all buttons in header
  return headerIdx >= 0 && html.slice(headerIdx, headerIdx + 600).includes('vcSfTutorialBtn');
})());

// --- STEPS_SF original not broken ---
console.log('\n[ STEPS_SF original intact ]');
ok("vcRegisterTutorial('sf') still present", bundle.includes("vcRegisterTutorial('sf', STEPS_SF"));
ok("sf2 is AFTER sf registration",           (() => {
  const sfIdx  = bundle.indexOf("vcRegisterTutorial('sf', STEPS_SF");
  const sf2Idx = bundle.indexOf("vcRegisterTutorial('sf2'");
  return sfIdx >= 0 && sf2Idx > sfIdx;
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
