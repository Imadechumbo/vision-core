/**
 * _test165_sf_markdown_unit.cjs — §165 markdown render + layout fix
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

console.log('\n=== §165 SF MARKDOWN + LAYOUT UNIT TESTS ===\n');

// --- sfMarkdownToHtml function ---
console.log('[ sfMarkdownToHtml function ]');
ok('sfMarkdownToHtml defined',           bundle.includes('function sfMarkdownToHtml('));
ok('converts **bold** to <strong>',      (() => {
  const idx = bundle.indexOf('function sfMarkdownToHtml(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('<strong>');
})());
ok('converts [X] to ✅',                (() => {
  const idx = bundle.indexOf('function sfMarkdownToHtml(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('✅');
})());
ok('converts [-] to 🔄',               (() => {
  const idx = bundle.indexOf('function sfMarkdownToHtml(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('🔄');
})());
ok('converts ### headings to h4',        (() => {
  const idx = bundle.indexOf('function sfMarkdownToHtml(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('<h4');
})());
ok('escapes HTML first (XSS safe)',      (() => {
  const idx = bundle.indexOf('function sfMarkdownToHtml(');
  return idx >= 0 && bundle.slice(idx, idx + 200).includes('&amp;');
})());
ok('converts newlines to <br>',          (() => {
  const idx = bundle.indexOf('function sfMarkdownToHtml(');
  return idx >= 0 && bundle.slice(idx, idx + 800).includes('<br>');
})());

// --- addSfChatMsg uses innerHTML for assistant ---
console.log('\n[ addSfChatMsg markdown integration ]');
ok('addSfChatMsg uses innerHTML for assistant', (() => {
  const idx = bundle.indexOf('function addSfChatMsg(');
  return idx >= 0 && bundle.slice(idx, idx + 450).includes("el.innerHTML = sfMarkdownToHtml(text)");
})());
ok('addSfChatMsg uses textContent for non-assistant', (() => {
  const idx = bundle.indexOf('function addSfChatMsg(');
  return idx >= 0 && bundle.slice(idx, idx + 450).includes('el.textContent = text');
})());

// --- vcSfTypewriter renders markdown at end ---
console.log('\n[ vcSfTypewriter markdown at end ]');
ok('vcSfTypewriter uses innerHTML at end', (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 700).includes('el.innerHTML = sfMarkdownToHtml(text)');
})());
ok('vcSfTypewriter still char-by-char during animation', (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 700).includes('el.textContent += text[i]');
})());

// --- fullContext is local ---
console.log('\n[ fullContext scope ]');
ok('fullContext is var local (not global)', (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 1200).includes('var fullContext');
})());

// --- CSS layout ---
console.log('\n[ CSS height/layout fixes ]');
ok('vc-sf-home-simple uses calc height',  html.includes('calc(100vh - 180px)'));
ok('vc-sf-chat-history min-height 200px', html.includes('min-height:200px'));
ok('vc-sf-chat-history max-height calc',  html.includes('max-height:calc(100vh'));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
