/**
 * _test163_sf_ux_unit.cjs — §163 SF UX: mode tabs + chips + typewriter
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

console.log('\n=== §163 SF UX UNIT TESTS ===\n');

// --- mode tabs HTML ---
console.log('[ index.html — mode tabs ]');
ok('vcSfTabAutopilot in HTML',          html.includes('id="vcSfTabAutopilot"'));
ok('vcSfTabAdvanced in HTML',           html.includes('id="vcSfTabAdvanced"'));
ok('vcSfModeTabs container in HTML',    html.includes('id="vcSfModeTabs"'));
ok('tabs inside sf-page-header',        (() => {
  const idx = html.indexOf('class="vc-sf-page-header"');
  return idx >= 0 && html.slice(idx, idx + 700).includes('vcSfTabAutopilot');
})());

// --- mode tabs CSS ---
console.log('\n[ index.html — mode tabs CSS ]');
ok('.vc-sf-mode-tabs CSS',              html.includes('.vc-sf-mode-tabs'));
ok('.vc-sf-mode-tab CSS',               html.includes('.vc-sf-mode-tab'));
ok('.vc-sf-mode-tab.active CSS',        html.includes('.vc-sf-mode-tab.active'));

// --- example chips HTML ---
console.log('\n[ index.html — example chips ]');
ok('vcSfExamples container',            html.includes('id="vcSfExamples"'));
ok('vc-sf-example-chip class',          html.includes('class="vc-sf-example-chip"'));
ok('data-example attributes',           html.includes('data-example='));
ok('3 chips present', (() => {
  const matches = html.match(/class="vc-sf-example-chip"/g);
  return matches && matches.length >= 3;
})());

// --- chips CSS ---
console.log('\n[ index.html — chips + input CSS ]');
ok('.vc-sf-examples CSS',               html.includes('.vc-sf-examples'));
ok('.vc-sf-example-chip CSS',           html.includes('.vc-sf-example-chip'));
ok('#vcSfChatInput background CSS',     html.includes('#vcSfChatInput') && html.includes('1e1e2e'));
ok('#vcSfChatInput:focus CSS',          html.includes('#vcSfChatInput:focus'));
ok('.vc-typewriter-active::after CSS',  html.includes('.vc-typewriter-active::after'));
ok('@keyframes vcBlink CSS',            html.includes('@keyframes vcBlink'));

// --- bundle.js: mode tabs JS ---
console.log('\n[ bundle.js — initSfModeTabs ]');
ok('vcSfTypewriter function',           bundle.includes('function vcSfTypewriter('));
ok('initSfModeTabs function',           bundle.includes('function initSfModeTabs('));
ok('initSfExampleChips function',       bundle.includes('function initSfExampleChips('));
ok('initSfModeTabs() called',           bundle.includes('initSfModeTabs();'));
ok('initSfExampleChips() called',       bundle.includes('initSfExampleChips();'));
ok("vcSfTabAutopilot referenced in JS", bundle.includes("'vcSfTabAutopilot'"));
ok("vcSfTabAdvanced referenced in JS",  bundle.includes("'vcSfTabAdvanced'"));
ok('module nav hidden on autopilot',    (() => {
  const idx = bundle.indexOf('function initSfModeTabs(');
  return idx >= 0 && bundle.slice(idx, idx + 800).includes("display = 'none'");
})());
ok('_sfShowHome called in tabs',        (() => {
  const idx = bundle.indexOf('function initSfModeTabs(');
  return idx >= 0 && bundle.slice(idx, idx + 800).includes('_sfShowHome()');
})());

// --- bundle.js: example chips JS ---
console.log('\n[ bundle.js — initSfExampleChips ]');
ok('data-example read in JS',           (() => {
  const idx = bundle.indexOf('function initSfExampleChips(');
  return idx >= 0 && bundle.slice(idx, idx + 400).includes("getAttribute('data-example')");
})());
ok('fills vcSfChatInput on click',      (() => {
  const idx = bundle.indexOf('function initSfExampleChips(');
  return idx >= 0 && bundle.slice(idx, idx + 400).includes("'vcSfChatInput'");
})());

// --- bundle.js: typewriter ---
console.log('\n[ bundle.js — vcSfTypewriter ]');
ok('vc-typewriter-active class added',  (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 500).includes('vc-typewriter-active');
})());
ok('vc-typewriter-done class added',    (() => {
  const idx = bundle.indexOf('function vcSfTypewriter(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('vc-typewriter-done');
})());
ok('typewriter applied to resultEl',    bundle.includes('vcSfTypewriter(resultEl,'));
ok('2000 char fallback guard',          bundle.includes('finalPackage.length <= 2000'));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
