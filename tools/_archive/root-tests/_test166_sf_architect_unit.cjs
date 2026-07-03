/**
 * _test166_sf_architect_unit.cjs — §166 Arquiteto restaurado + toggle removido
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

console.log('\n=== §166 SF ARCHITECT + TOGGLE UNIT TESTS ===\n');

// --- toggle removed ---
console.log('[ toggle removed ]');
ok('vcSfAutoPilotToggle NOT in HTML',   !html.includes('id="vcSfAutoPilotToggle"'));
ok('vc-sf-ap-toggle NOT active in HTML',!html.includes('class="vc-sf-ap-toggle'));
ok('toggle listener removed from initSfSimpleChat', (() => {
  const idx = bundle.indexOf('function initSfSimpleChat(');
  return idx >= 0 && !bundle.slice(idx, idx + 500).includes('vcSfAutoPilotToggle');
})());

// --- isSfAutoPilotMode function ---
console.log('\n[ isSfAutoPilotMode ]');
ok('isSfAutoPilotMode function defined', bundle.includes('function isSfAutoPilotMode('));
ok('checks vcSfTabAutopilot.active',     (() => {
  const idx = bundle.indexOf('function isSfAutoPilotMode(');
  return idx >= 0 && bundle.slice(idx, idx + 200).includes("'vcSfTabAutopilot'");
})());
ok('handleSfSend uses isSfAutoPilotMode()', (() => {
  const idx = bundle.indexOf('function handleSfSend(');
  return idx >= 0 && bundle.slice(idx, idx + 300).includes('isSfAutoPilotMode()');
})());
ok('handleSfSend NO longer uses vcSfAutoPilotToggle', (() => {
  const idx = bundle.indexOf('function handleSfSend(');
  return idx >= 0 && !bundle.slice(idx, idx + 300).includes('vcSfAutoPilotToggle');
})());

// --- sendSfChatMessage (Arquiteto) ---
console.log('\n[ sendSfChatMessage — Arquiteto ]');
ok('sendSfChatMessage calls /api/sf/mission-composer', (() => {
  const idx = bundle.indexOf('function sendSfChatMessage(');
  return idx >= 0 && bundle.slice(idx, idx + 700).includes('/api/sf/mission-composer');
})());
ok('sendSfChatMessage shows typing indicator',         (() => {
  const idx = bundle.indexOf('function sendSfChatMessage(');
  return idx >= 0 && bundle.slice(idx, idx + 700).includes("addSfChatMsg('assistant'");
})());
ok('sendSfChatMessage uses vcSfTypewriter for reply',  (() => {
  const idx = bundle.indexOf('function sendSfChatMessage(');
  return idx >= 0 && bundle.slice(idx, idx + 1200).includes('vcSfTypewriter(msgEl,');
})());
ok('sendSfChatMessage removes typing on response',     (() => {
  const idx = bundle.indexOf('function sendSfChatMessage(');
  return idx >= 0 && bundle.slice(idx, idx + 950).includes('parentNode.removeChild');
})());
ok('sendSfChatMessage has error handler',              (() => {
  const idx = bundle.indexOf('function sendSfChatMessage(');
  return idx >= 0 && bundle.slice(idx, idx + 1500).includes('.catch(');
})());

// --- input bar simplified ---
console.log('\n[ input bar structure ]');
ok('vcSfSendBtn still in HTML',         html.includes('id="vcSfSendBtn"'));
ok('vcSfChatInput still in HTML',       html.includes('id="vcSfChatInput"'));
ok('vc-sf-input-bar still present',     html.includes('id="vcSfInputBar"'));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
