#!/usr/bin/env node
/**
 * pass-gold-score-endpoint — integration test contra o backend REAL
 *
 * Sobe backend/server.js de verdade (child process, porta isolada) e bate
 * em GET /api/pass-gold/score. Prova que o endpoint parou de devolver o
 * hardcoded PENDING_EVIDENCE/final:100 e passou a chamar pass-gold-engine.js
 * de fato: sem evidência → NO_EVIDENCE explícito; com evidência real de um
 * patch problemático → score computado (não 100) e pass_gold=false.
 */
import { spawn } from 'child_process';

const ROOT = process.cwd();
const PORT = 18744; // porta alta, distinta de outras suítes
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

async function waitForHealth(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

const childEnv = {
  ...process.env,
  PORT: String(PORT),
  AWS_S3_BUCKET: '',
  SESSION_SECRET: 'pass-gold-score-test-session-secret-32chars-min',
  PROVIDER_VAULT_SECRET: 'pass-gold-score-test-vault-secret-32chars-min',
};

const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: childEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', d => { serverLog += d.toString(); });
child.stderr.on('data', d => { serverLog += d.toString(); });

try {
  const up = await waitForHealth();
  assert(up, 'backend real sobe e responde /api/health dentro de 15s');
  if (!up) throw new Error('backend did not start:\n' + serverLog.slice(-2000));

  // --- sem query params: deve falhar de forma clara, não hardcoded silencioso ---
  const noEvidence = await fetch(`${BASE}/api/pass-gold/score`).then(r => r.json());
  assert(noEvidence.status === 'NO_EVIDENCE', 'sem original_content/patched_content → status NO_EVIDENCE explícito');
  assert(noEvidence.final === null, 'sem evidência → final=null, não mais o hardcoded 100');
  assert(noEvidence.pass_gold === false, 'sem evidência → pass_gold=false');
  assert(typeof noEvidence.pass_gold_reason === 'string' && noEvidence.pass_gold_reason.includes('original_content'), 'motivo explica quais campos faltam');

  // --- evidência real de um patch problemático (sem aegis, baixa confiança) ---
  const badParams = new URLSearchParams({
    original_content: 'function ok() { return 1; }',
    patched_content:  'function ok() { return 1; } // patch',
    confidence: '20',
    risk: 'high',
    aegis_ok: 'false',
  });
  const badScore = await fetch(`${BASE}/api/pass-gold/score?${badParams}`).then(r => r.json());
  assert(typeof badScore.final === 'number', 'com evidência real, final é um número calculado (não mais hardcoded)');
  assert(badScore.final !== 100, 'score real de um patch ruim não é o antigo hardcoded 100');
  assert(badScore.pass_gold === false, 'patch de alto risco/sem aegis não passa PASS GOLD');
  assert(badScore.gates && badScore.gates.build_passed === false, 'gate build_passed reflete aegis_ok=false real');
  assert(badScore.gates && badScore.gates.risk_acceptable === false, 'gate risk_acceptable reflete risk=high real');

  // --- evidência real de um patch bom (aegis ok, alta confiança, baixo risco) ---
  const goodParams = new URLSearchParams({
    original_content: 'function ok() { return 1; }',
    patched_content:  'function ok() { return 2; }',
    confidence: '90',
    risk: 'low',
    aegis_ok: 'true',
    fix_type: 'full_replace',
  });
  const goodScore = await fetch(`${BASE}/api/pass-gold/score?${goodParams}`).then(r => r.json());
  assert(typeof goodScore.final === 'number' && goodScore.final > badScore.final, 'patch bom pontua mais que patch ruim (score realmente varia com o input)');
  assert(goodScore.gates && goodScore.gates.build_passed === true, 'gate build_passed reflete aegis_ok=true real');
  assert(goodScore.promotion_allowed === goodScore.pass_gold, 'promotion_allowed espelha pass_gold real (compat com o consumidor legado)');

} finally {
  child.kill();
}

console.log(`\npass-gold-score-endpoint: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
