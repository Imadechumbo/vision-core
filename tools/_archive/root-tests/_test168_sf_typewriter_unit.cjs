/**
 * _test168_sf_typewriter_unit.cjs — §168 typewriter robusto
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

console.log('\n=== §168 SF TYPEWRITER UNIT TESTS ===\n');

// --- typewriter robustness ---
console.log('[ vcSfTypewriter robusto ]');
ok('el.isConnected check',             (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 700).includes('el.isConnected');
})());
ok('speed variable (fast for long)',   (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 300).includes('text.length > 500');
})());
ok('chunkSize 5 for long texts',       (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 700).includes('text.length > 1000');
})());
ok('chunkSize used in slice',          (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 700).includes('chunkSize');
})());
ok('scroll via el.closest (not el.scrollTop)', (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 800).includes("el.closest('.vc-sf-chat-history')");
})());
ok('final scroll setTimeout 100ms',   (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 1300).includes("setTimeout(function()");
})());
ok('initial delay 30ms (not 50)',      (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 1300).includes('setTimeout(tick, 30)');
})());
ok('markdown at end (innerHTML)',      (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 900).includes('el.innerHTML = sfMarkdownToHtml(text)');
})());

// --- no char limits ---
console.log('\n[ sem limite de chars ]');
ok('Auto-Pilot: sempre vcSfTypewriter', (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  const slice = idx >= 0 ? bundle.slice(idx, idx + 600) : '';
  return slice.includes('vcSfTypewriter(msgEl, finalPackage)') && !slice.includes('finalPackage.length');
})());
ok('sendSfChatMessage: sempre vcSfTypewriter', (() => {
  const idx = bundle.indexOf('function sendSfChatMessage(');
  const slice = idx >= 0 ? bundle.slice(idx, idx + 1300) : '';
  return slice.includes('vcSfTypewriter(msgEl, reply)') && !slice.includes('reply.length');
})());

// --- addSfChatMsg markdown ---
console.log('\n[ addSfChatMsg markdown ]');
ok('addSfChatMsg uses innerHTML for assistant', (() => {
  const idx = bundle.indexOf('function addSfChatMsg(');
  return idx >= 0 && bundle.slice(idx, idx + 450).includes("el.innerHTML = sfMarkdownToHtml(text)");
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
