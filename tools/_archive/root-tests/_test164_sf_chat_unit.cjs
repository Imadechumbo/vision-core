/**
 * _test164_sf_chat_unit.cjs — §164 SF chat simples + URL fetch
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
const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');

console.log('\n=== §164 SF CHAT UNIT TESTS ===\n');

// --- index.html structure ---
console.log('[ index.html — new SF home ]');
ok('vcSfSendBtn in HTML',              html.includes('id="vcSfSendBtn"'));
ok('vcSfAutoPilotToggle in HTML',      html.includes('id="vcSfAutoPilotToggle"'));
ok('vc-sf-input-bar in HTML',          html.includes('class="vc-sf-input-bar"'));
ok('vcSfChatHistory in HTML',          html.includes('id="vcSfChatHistory"'));
ok('vcSfInputBar in HTML',             html.includes('id="vcSfInputBar"'));
ok('vcSfChatInput still present',      html.includes('id="vcSfChatInput"'));
ok('vc-sf-home-simple class',          html.includes('class="vc-sf-home-simple"'));
ok('legacy hidden elements present',   html.includes('id="vcSfChatStream"') && html.includes('id="vcSfChatSendBtn"'));

// --- index.html CSS ---
console.log('\n[ index.html — new CSS ]');
ok('.vc-sf-home-simple CSS',           html.includes('.vc-sf-home-simple'));
ok('.vc-sf-chat-history CSS',          html.includes('.vc-sf-chat-history'));
ok('.vc-sf-chat-msg.user CSS',         html.includes('.vc-sf-chat-msg.user'));
ok('.vc-sf-input-bar CSS',             html.includes('.vc-sf-input-bar'));
ok('.vc-sf-input-field CSS',           html.includes('.vc-sf-input-field'));
ok('.vc-sf-ap-toggle.active CSS',      html.includes('.vc-sf-ap-toggle.active'));
ok('.vc-sf-send-btn CSS',              html.includes('.vc-sf-send-btn'));

// --- bundle.js: new functions ---
console.log('\n[ bundle.js — new functions ]');
ok('handleSfSend function',            bundle.includes('function handleSfSend('));
ok('addSfChatMsg function',            bundle.includes('function addSfChatMsg('));
ok('sendSfChatMessage function',       bundle.includes('function sendSfChatMessage('));
ok('extractUrl function',              bundle.includes('function extractUrl('));
ok('fetchUrlContext function',         bundle.includes('function fetchUrlContext('));
ok('initSfSimpleChat function',        bundle.includes('function initSfSimpleChat('));
ok('initSfSimpleChat() called',        bundle.includes('initSfSimpleChat();'));

// --- bundle.js: logic ---
console.log('\n[ bundle.js — logic ]');
ok("vcSfAutoPilotToggle in handleSfSend", (() => {
  const idx = bundle.indexOf('function handleSfSend(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes("'vcSfAutoPilotToggle'");
})());
ok("extractUrl called in handleSfSend", (() => {
  const idx = bundle.indexOf('function handleSfSend(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('extractUrl(');
})());
ok("fetchUrlContext called for URLs",  (() => {
  const idx = bundle.indexOf('function handleSfSend(');
  return idx >= 0 && bundle.slice(idx, idx + 800).includes('fetchUrlContext(');
})());
ok('/api/sf/fetch-url in fetchUrlContext', (() => {
  const idx = bundle.indexOf('function fetchUrlContext(');
  return idx >= 0 && bundle.slice(idx, idx + 400).includes('/api/sf/fetch-url');
})());
ok('https?:// regex in extractUrl',    (() => {
  const idx = bundle.indexOf('function extractUrl(');
  return idx >= 0 && bundle.slice(idx, idx + 200).includes('https?');
})());
ok('old Enter handler skips with vcSfSendBtn',  bundle.includes("if (!document.getElementById('vcSfSendBtn'))"));
ok('typewriter uses setTimeout(tick, 50)',       (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('setTimeout(tick, 50)');
})());
ok('typewriter removes vc-typewriter-done first', (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes("classList.remove('vc-typewriter-done')");
})());
ok('typewriter char-by-char (text[i])', (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('text[i]');
})());

// --- server.js: fetch-url endpoint ---
console.log('\n[ server.js — /api/sf/fetch-url ]');
ok('/api/sf/fetch-url route exists',   server.includes("app.post('/api/sf/fetch-url'"));
ok('URL validation (startsWith http)', (() => {
  const idx = server.indexOf("app.post('/api/sf/fetch-url'");
  return idx >= 0 && server.slice(idx, idx + 300).includes("startsWith('http')");
})());
ok('3000 char limit on content',       (() => {
  const idx = server.indexOf("app.post('/api/sf/fetch-url'");
  return idx >= 0 && server.slice(idx, idx + 1200).includes('3000');
})());
ok('strips HTML tags from content',    (() => {
  const idx = server.indexOf("app.post('/api/sf/fetch-url'");
  return idx >= 0 && server.slice(idx, idx + 1200).includes('<[^>]+>');
})());
ok('anti_stub: true in response',      (() => {
  const idx = server.indexOf("app.post('/api/sf/fetch-url'");
  return idx >= 0 && server.slice(idx, idx + 1200).includes('anti_stub: true');
})());
ok('timeout protection (setTimeout)',  (() => {
  const idx = server.indexOf("app.post('/api/sf/fetch-url'");
  return idx >= 0 && server.slice(idx, idx + 1700).includes('8000');
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
