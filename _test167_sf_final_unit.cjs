/**
 * _test167_sf_final_unit.cjs — §167 Arquiteto central + progress fix + tutorial
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

console.log('\n=== §167 SF FINAL FIX UNIT TESTS ===\n');

// --- HTML structure ---
console.log('[ HTML structure ]');
ok('vcSfChatHistory before vcSfAutoPilotProgress', (() => {
  const hIdx = html.indexOf('id="vcSfChatHistory"');
  const pIdx = html.indexOf('id="vcSfAutoPilotProgress"');
  return hIdx >= 0 && pIdx > hIdx;
})());
ok('vcSfAutoPilotProgress NOT inside vcSfChatHistory', (() => {
  // vcSfChatHistory is self-closing div — so progress can't be inside it
  const histLine = html.indexOf('id="vcSfChatHistory"');
  const histClose = html.indexOf('</div>', histLine);
  const progIdx   = html.indexOf('id="vcSfAutoPilotProgress"');
  // progress must come AFTER the closing </div> of history
  return progIdx > histClose;
})());
ok('stepsEl points to vcSfAutoPilotSteps', (() => {
  const idx = bundle.indexOf("var stepsEl");
  return idx >= 0 && bundle.slice(idx, idx + 100).includes("'vcSfAutoPilotSteps'");
})());

// --- Arquiteto message at Auto-Pilot start ---
console.log('\n[ Arquiteto message at start ]');
ok("addSfChatMsg called before progress.display='block'", (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  const slice = idx >= 0 ? bundle.slice(idx, idx + 1000) : '';
  const msgPos = slice.indexOf("addSfChatMsg('assistant'");
  const progPos = slice.indexOf("progress.style.display = 'block'");
  return msgPos >= 0 && progPos > msgPos;
})());
ok("Arquiteto message contains '🏛️'", (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 1000).includes('🏛️');
})());

// --- scroll fix ---
console.log('\n[ scroll setTimeout fix ]');
ok('setTimeout 200ms after result scroll', (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('setTimeout');
})());
ok('scroll inside setTimeout block', (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 800).includes("hist.scrollTop = hist.scrollHeight");
})());

// --- STEPS_SF2 updated ---
console.log('\n[ STEPS_SF2 updated targets ]');
ok('STEPS_SF2 step 1 targets #vcSfHomeControl', (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  return idx >= 0 && bundle.slice(idx, idx + 300).includes("'#vcSfHomeControl'");
})());
ok('STEPS_SF2 step 3 targets #vcSfTabAutopilot', (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  return idx >= 0 && bundle.slice(idx, idx + 900).includes("'#vcSfTabAutopilot'");
})());
ok('STEPS_SF2 step 4 targets #vcSfTabAdvanced',  (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  return idx >= 0 && bundle.slice(idx, idx + 1200).includes("'#vcSfTabAdvanced'");
})());
ok('STEPS_SF2 step 5 targets #vcSfExamples',     (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  return idx >= 0 && bundle.slice(idx, idx + 1500).includes("'#vcSfExamples'");
})());
ok('STEPS_SF2 NO longer targets #vcSfAutoPilotBtn', (() => {
  const idx = bundle.indexOf('var STEPS_SF2');
  const endIdx = bundle.indexOf("window.vcRegisterTutorial('sf2'", idx);
  return idx >= 0 && endIdx > idx && !bundle.slice(idx, endIdx).includes("'#vcSfAutoPilotBtn'");
})());
ok("vcRegisterTutorial('sf2') present", bundle.includes("window.vcRegisterTutorial('sf2'"));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
