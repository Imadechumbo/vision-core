/**
 * _test164fix_autopilot_unit.cjs — §164-fix Auto-Pilot resultado no histórico
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

console.log('\n=== §164-fix AUTO-PILOT RESULTADO UNIT TESTS ===\n');

// --- apBtn optional ---
console.log('[ apBtn null-safety ]');
ok('apBtn uses vcSfSendBtn fallback',   bundle.includes("'vcSfSendBtn') || document.getElementById('vcSfAutoPilotBtn'"));
ok('if (!progress) return (not apBtn)', (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('if (!progress) return');
})());
ok('apBtn.disabled = true guarded',     (() => {
  const idx = bundle.indexOf('function runSfAutoPilot(');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('if (apBtn) apBtn.disabled = true');
})());
ok('apBtn.disabled = false guarded (completion)', (() => {
  const idx = bundle.indexOf("statusEl.textContent = '✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 100).includes('if (apBtn) apBtn.disabled = false');
})());
ok('apBtn.disabled = false guarded (error)',      (() => {
  const idx = bundle.indexOf('⚠ Erro em:');  // sem aspas — tem espaço antes de fechar
  return idx >= 0 && bundle.slice(idx, idx + 300).includes('if (apBtn) apBtn.disabled = false');
})());

// --- result in chat history ---
console.log('\n[ resultado em vcSfChatHistory ]');
ok('progress hidden after completion',  (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 400).includes("progress.style.display = 'none'");
})());
ok('progress hidden after error too',   (() => {
  const idx = bundle.indexOf('⚠ Erro em:');
  return idx >= 0 && bundle.slice(idx, idx + 300).includes("progress.style.display = 'none'");
})());
ok('addSfChatMsg called with assistant', (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 400).includes("addSfChatMsg('assistant'");
})());
ok('vcSfTypewriter applied to msgEl',   (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 400).includes('vcSfTypewriter(msgEl,');
})());
ok('scroll vcSfChatHistory after result', (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 650).includes("'vcSfChatHistory'");
})());
ok('2000 char fallback guard preserved', (() => {
  const idx = bundle.indexOf("'✅ Auto-Pilot concluído!'");
  return idx >= 0 && bundle.slice(idx, idx + 400).includes('finalPackage.length <= 2000');
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
