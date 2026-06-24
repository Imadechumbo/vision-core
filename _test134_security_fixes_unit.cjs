/**
 * §134 — Security Fixes Unit Tests
 * Fix automático L3 + Report de violations no frontend
 */
'use strict';

const http  = require('http');
const fs    = require('fs');
const path  = require('path');

let passed = 0, failed = 0;

function ok(label, cond, detail) {
  if (cond) { console.log('  ✅ ' + label); passed++; }
  else       { console.error('  ❌ ' + label + (detail ? ' — ' + detail : '')); failed++; }
}

function post(port, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: 'localhost', port, path: pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch(e) { resolve({ status: res.statusCode, body: raw }); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(port, pathname) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port, path: pathname }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch(e) { resolve({ status: res.statusCode, body: raw }); } });
    }).on('error', reject);
  });
}

const SAMPLE_VIOLATION = {
  gate: 'secrets_ok',
  category: 'secrets',
  severity: 'HIGH',
  file: 'src/level3_security.py',
  line: 6,
  rule_id: 'AEGIS_SECRET_010',
  message: 'API key or token hardcoded in source code',
};

async function runTests(port) {
  console.log('\n=== §134 Security Fixes Tests (port', port, ')===\n');

  // T1: rota existe e retorna ok:true
  try {
    const r = await post(port, '/api/security/suggest-fixes', { violations: [SAMPLE_VIOLATION] });
    ok('T1: /api/security/suggest-fixes ok:true', r.status === 200 && r.body.ok === true, JSON.stringify(r.body).slice(0,200));
  } catch(e) { ok('T1: /api/security/suggest-fixes ok:true', false, e.message); }

  // T2: suggestions[] tem ao menos 1 item
  try {
    const r = await post(port, '/api/security/suggest-fixes', { violations: [SAMPLE_VIOLATION] });
    ok('T2: suggestions[] length >= 1', Array.isArray(r.body.suggestions) && r.body.suggestions.length >= 1, 'len=' + (r.body.suggestions || []).length);
  } catch(e) { ok('T2: suggestions[] length >= 1', false, e.message); }

  // T3: violation echoed in response
  try {
    const r = await post(port, '/api/security/suggest-fixes', { violations: [SAMPLE_VIOLATION] });
    const s = r.body.suggestions && r.body.suggestions[0];
    ok('T3: violation echoed in suggestion', s && s.violation && s.violation.rule_id === 'AEGIS_SECRET_010', JSON.stringify(s).slice(0,200));
  } catch(e) { ok('T3: violation echoed in suggestion', false, e.message); }

  // T4: empty violations returns empty suggestions
  try {
    const r = await post(port, '/api/security/suggest-fixes', { violations: [] });
    ok('T4: empty violations → suggestions=[]', r.body.ok === true && Array.isArray(r.body.suggestions) && r.body.suggestions.length === 0, JSON.stringify(r.body).slice(0,100));
  } catch(e) { ok('T4: empty violations → suggestions=[]', false, e.message); }

  // T5: anti_stub present
  try {
    const r = await post(port, '/api/security/suggest-fixes', { violations: [SAMPLE_VIOLATION] });
    ok('T5: anti_stub:true', r.body.anti_stub === true);
  } catch(e) { ok('T5: anti_stub:true', false, e.message); }

  // T6: /api/run-live responds (security_violations field present in normalized result)
  // We probe /api/go-core/health to confirm go-core is accessible
  try {
    const r = await get(port, '/api/go-core/health');
    ok('T6: /api/go-core/health responds', r.status === 200 || r.status === 503, 'status=' + r.status);
  } catch(e) { ok('T6: /api/go-core/health responds', false, e.message); }

  console.log('\n--- Static checks ---\n');

  // T7: bundle contains renderSecurityViolations
  const bundlePath = path.join(__dirname, 'frontend/assets/vision-core-bundle.js');
  const bundle = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf8') : '';
  ok('T7: bundle has renderSecurityViolations', bundle.includes('renderSecurityViolations'), 'bundle size=' + bundle.length);

  // T8: bundle contains AEGIS violations header string
  ok('T8: bundle has AEGIS violations header', bundle.includes('AEGIS — '), '');

  // T9: bundle has SUGESTÃO DE FIX string
  ok('T9: bundle has SUGESTÃO DE FIX', bundle.includes('SUGESTÃO DE FIX'), '');

  // T10: bundle injects violations after renderValidationPanel (two call sites)
  const sv134aCount = (bundle.match(/_sv134a/g) || []).length;
  const sv134bCount = (bundle.match(/_sv134b/g) || []).length;
  ok('T10: violations injected after renderValidationPanel (renderApplyFixPanel)', sv134aCount >= 1, 'count=' + sv134aCount);
  ok('T11: violations injected after renderValidationPanel (renderStandardMethodPanel)', sv134bCount >= 1, 'count=' + sv134bCount);

  // T12: goRunner passes security_violations through
  const goRunnerPath = path.join(__dirname, 'backend/src/runtime/goRunner.js');
  const goRunner = fs.existsSync(goRunnerPath) ? fs.readFileSync(goRunnerPath, 'utf8') : '';
  ok('T12: goRunner passes security_violations', goRunner.includes('security_violations'), '');

  // T13: server.js has VIOLATION_FIX_PROMPTS
  const serverPath = path.join(__dirname, 'backend/server.js');
  const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';
  ok('T13: server.js has VIOLATION_FIX_PROMPTS', server.includes('VIOLATION_FIX_PROMPTS'), '');

  // T14: server.js has generateViolationFixes
  ok('T14: server.js has generateViolationFixes', server.includes('generateViolationFixes'), '');

  // T15: server.js has security_fix_suggestions in run-live
  ok('T15: server.js injects security_fix_suggestions into run-live', server.includes('security_fix_suggestions'), '');

  console.log('\n=== RESULT:', passed + failed, 'total,', passed, 'PASS,', failed, 'FAIL ===\n');
}

// Start local server for HTTP tests
const { spawn } = require('child_process');
const srv = spawn('node', ['backend/server.js'], { stdio: ['ignore', 'pipe', 'pipe'] });
let ready = false;
srv.stdout.on('data', (d) => {
  if (!ready && d.toString().includes('SERVIDOR VISION CORE')) {
    ready = true;
    setTimeout(() => {
      runTests(8080).finally(() => { srv.kill(); process.exit(failed > 0 ? 1 : 0); });
    }, 500);
  }
});
srv.stderr.on('data', () => {});
setTimeout(() => { if (!ready) { console.error('Server did not start in 10s'); srv.kill(); process.exit(1); } }, 10000);
