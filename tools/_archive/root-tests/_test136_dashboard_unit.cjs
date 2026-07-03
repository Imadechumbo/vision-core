/**
 * §136 — Dashboard de Saúde + Loading Ring + Re-scan
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

let passed = 0, failed = 0;

function ok(label, cond, detail) {
  if (cond) { console.log('  ✅ ' + label); passed++; }
  else       { console.error('  ❌ ' + label + (detail ? ' — ' + detail : '')); failed++; }
}

function req(port, method, pathname, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      host: 'localhost', port, path: pathname, method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, data ? { 'Content-Length': Buffer.byteLength(data) } : {})
    };
    const r = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function runTests(port) {
  console.log('\n=== §136 Dashboard Tests (port', port, ') ===\n');

  // T1: GET /api/security/history — empty initially
  try {
    const r = await req(port, 'GET', '/api/security/history');
    ok('T1: GET /api/security/history ok:true', r.body.ok === true, JSON.stringify(r.body).slice(0,100));
    ok('T2: initial history is array', Array.isArray(r.body.history), 'type=' + typeof r.body.history);
  } catch(e) { ok('T1-T2: GET history', false, e.message); }

  // T3: POST /api/security/history saves event
  try {
    const r = await req(port, 'POST', '/api/security/history', {
      type: 'scan', rule_id: 'AEGIS_SECRET_010', security_score: 95, total_violations: 1,
      timestamp: '2026-06-24T01:00:00Z'
    });
    ok('T3: POST /api/security/history saved:true', r.body.ok === true && r.body.saved === true,
       JSON.stringify(r.body).slice(0,100));
  } catch(e) { ok('T3: POST history', false, e.message); }

  // T4: GET after POST — event present
  try {
    const r = await req(port, 'GET', '/api/security/history');
    ok('T4: event saved in history', r.body.total >= 1 && r.body.history.length >= 1,
       'total=' + r.body.total);
    ok('T5: event has correct type', r.body.history[0] && r.body.history[0].type === 'scan',
       'type=' + (r.body.history[0] || {}).type);
  } catch(e) { ok('T4-T5: GET history after POST', false, e.message); }

  // T6: POST fix event
  try {
    const r = await req(port, 'POST', '/api/security/history', {
      type: 'fix', rule_id: 'AEGIS_SECRET_010', fixed: true, file: 'src/level3_security.py'
    });
    ok('T6: fix event saved', r.body.saved === true, 'total=' + r.body.total);
  } catch(e) { ok('T6: fix event', false, e.message); }

  // T7: anti_stub
  try {
    const r = await req(port, 'GET', '/api/security/history');
    ok('T7: anti_stub:true', r.body.anti_stub === true);
  } catch(e) { ok('T7: anti_stub', false, e.message); }

  console.log('\n--- Static bundle checks ---\n');

  const bundle = fs.readFileSync(path.join(__dirname, 'frontend/assets/vision-core-bundle.js'), 'utf8');

  ok('T8: bundle has s136-ring (SVG circle)', bundle.includes('s136-ring'), '');
  ok('T9: bundle has s136spin keyframe', bundle.includes('s136spin'), '');
  ok('T10: bundle has s136StartRing', bundle.includes('s136StartRing'), '');
  ok('T11: bundle has s136StopRing', bundle.includes('s136StopRing'), '');
  ok('T12: bundle has renderSecurityDashboard', bundle.includes('renderSecurityDashboard'), '');
  ok('T13: bundle has /api/security/history', bundle.includes('/api/security/history'), '');
  ok('T14: bundle has s136SaveHistory', bundle.includes('s136SaveHistory'), '');
  ok('T15: bundle has re-scan text', bundle.includes('Re-scanning'), '');
  ok('T16: dashboard injected after violations (_dash136a)', bundle.includes('_dash136a'), '');
  ok('T17: dashboard injected after violations (_dash136b)', bundle.includes('_dash136b'), '');

  const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');
  ok('T18: server.js has GET /api/security/history', server.includes("app.get('/api/security/history'"), '');
  ok('T19: server.js has POST /api/security/history', server.includes("app.post('/api/security/history'"), '');
  ok('T20: server.js has _s136SecurityHistory', server.includes('_s136SecurityHistory'), '');

  const goRunner = fs.readFileSync(path.join(__dirname, 'backend/src/runtime/goRunner.js'), 'utf8');
  ok('T21: goRunner passes security_score', goRunner.includes('security_score'), '');
  ok('T22: goRunner passes scanned_files', goRunner.includes('scanned_files'), '');

  console.log('\n=== RESULT:', passed + failed, 'total,', passed, 'PASS,', failed, 'FAIL ===\n');
}

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
setTimeout(() => { if (!ready) { console.error('Server did not start'); srv.kill(); process.exit(1); } }, 10000);
