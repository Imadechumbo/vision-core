/**
 * _test161_autopilot_unit.cjs — §161 SF Auto-Pilot
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

console.log('\n=== §161 SF AUTO-PILOT UNIT TESTS ===\n');

// --- bundle.js: structure ---
console.log('[ bundle.js — Auto-Pilot structure ]');
ok('SF_AUTOPILOT_STEPS defined',    bundle.includes('var SF_AUTOPILOT_STEPS'));
ok('runSfAutoPilot function',        bundle.includes('function runSfAutoPilot('));
ok('initSfAutoPilot function',       bundle.includes('function initSfAutoPilot('));
ok('initSfAutoPilot() called',       bundle.includes('initSfAutoPilot();'));
ok('vcSfAutoPilotBtn referenced',    bundle.includes("'vcSfAutoPilotBtn'"));

// --- 7 steps ---
console.log('\n[ bundle.js — 7 steps completeness ]');
ok('step1 project_builder',          bundle.includes("id: 'step1'") && bundle.includes("module: 'project_builder'"));
ok('step2 export_preview',           bundle.includes("id: 'step2'") && bundle.includes("module: 'export_preview'"));
ok('step3 project_templates',        bundle.includes("id: 'step3'") && bundle.includes("module: 'project_templates'"));
ok('step4 mission_composer',         bundle.includes("id: 'step4'") && bundle.includes("module: 'mission_composer'"));
ok('step5 worker_handoff',           bundle.includes("id: 'step5'") && bundle.includes("module: 'worker_handoff'"));
ok('step6 real_file_command',        bundle.includes("id: 'step6'") && bundle.includes("module: 'real_file_command'"));
ok('step7 worker_receipt',           bundle.includes("id: 'step7'") && bundle.includes("module: 'worker_receipt'"));

// --- endpoints used ---
console.log('\n[ bundle.js — endpoints in steps ]');
ok('endpoint mission-composer',      (() => {
  const idx = bundle.indexOf('var SF_AUTOPILOT_STEPS');
  return idx >= 0 && bundle.slice(idx, idx + 900).includes('/api/sf/mission-composer');
})());
ok('endpoint deploy-blueprint',      (() => {
  const idx = bundle.indexOf('var SF_AUTOPILOT_STEPS');
  return idx >= 0 && bundle.slice(idx, idx + 900).includes('/api/sf/deploy-blueprint');
})());
ok('endpoint worker-handoff',        (() => {
  const idx = bundle.indexOf('var SF_AUTOPILOT_STEPS');
  return idx >= 0 && bundle.slice(idx, idx + 900).includes('/api/sf/worker-handoff');
})());
ok('endpoint patch-validator',       (() => {
  const idx = bundle.indexOf('var SF_AUTOPILOT_STEPS');
  return idx >= 0 && bundle.slice(idx, idx + 900).includes('/api/sf/patch-validator');
})());
ok('endpoint gold-gate',             (() => {
  const idx = bundle.indexOf('var SF_AUTOPILOT_STEPS');
  return idx >= 0 && bundle.slice(idx, idx + 1100).includes('/api/sf/gold-gate');
})());

// --- logic details ---
console.log('\n[ bundle.js — Auto-Pilot logic ]');
ok('fullContext accumulation',       (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 2500).includes('fullContext');
})());
ok('autopilot: true in body',        (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 2500).includes('autopilot: true');
})());
ok('Promise .then chain (not async)',bundle.includes('.then(function(data)'));
ok('setTimeout 300ms between steps', (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 3200).includes('setTimeout');
})());
ok('error handler sets .error class', (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 3500).includes("'vc-sf-autopilot-step error'");
})());

// --- index.html ---
console.log('\n[ index.html — HTML + CSS ]');
ok('vcSfAutoPilotBtn in HTML',       html.includes('id="vcSfAutoPilotBtn"'));
ok('vcSfAutoPilotProgress in HTML',  html.includes('id="vcSfAutoPilotProgress"'));
ok('vcSfAutoPilotSteps in HTML',     html.includes('id="vcSfAutoPilotSteps"'));
ok('vcSfAutoPilotResult in HTML',    html.includes('id="vcSfAutoPilotResult"'));
ok('.vc-sf-autopilot-btn CSS',       html.includes('.vc-sf-autopilot-btn'));
ok('.vc-sf-autopilot-progress CSS',  html.includes('.vc-sf-autopilot-progress'));
ok('.vc-sf-autopilot-step CSS',      html.includes('.vc-sf-autopilot-step'));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
