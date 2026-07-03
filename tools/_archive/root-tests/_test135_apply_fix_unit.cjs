/**
 * §135 — Apply Fix Unit Tests
 * PatchEngine aplica fix.after em arquivos reais
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
    const req = http.request(
      { host: 'localhost', port, path: pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch(e) { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const FIXTURE_ROOT = path.join(__dirname, '_fixture_stress');
const FIXTURE_FILE = path.join(FIXTURE_ROOT, 'src', 'level3_security.py');

async function runTests(port) {
  console.log('\n=== §135 Apply Fix Tests (port', port, ') ===\n');

  // Save fixture original content for restore
  const originalContent = fs.readFileSync(FIXTURE_FILE, 'utf8');

  // T1: ok:true with valid violation + fix
  try {
    const r = await post(port, '/api/security/apply-fix', {
      violation: { file: 'src/level3_security.py', line: 6, rule_id: 'AEGIS_SECRET_010', message: 'API key' },
      fix: { after: "API_KEY = os.environ.get('API_KEY')" },
      project_root: FIXTURE_ROOT,
    });
    ok('T1: ok:true with valid violation+fix', r.body.ok === true, JSON.stringify(r.body).slice(0,150));

    // T2: before != after
    ok('T2: before != after', r.body.before !== r.body.after, `before="${r.body.before}" after="${r.body.after}"`);

    // T3: backup_created exists
    ok('T3: backup_created present', typeof r.body.backup_created === 'string' && r.body.backup_created.includes('.bak-s135-'), r.body.backup_created);

    // T4: file was actually modified
    const modified = fs.readFileSync(FIXTURE_FILE, 'utf8');
    ok("T4: file modified on disk", modified.includes("os.environ.get('API_KEY')"), 'line 6: ' + modified.split('\n')[5]);

    // Restore fixture
    fs.writeFileSync(FIXTURE_FILE, originalContent, 'utf8');
    // Clean up backup
    if (r.body.backup_created && fs.existsSync(r.body.backup_created)) {
      fs.unlinkSync(r.body.backup_created);
    }
  } catch(e) { ok('T1-T4: apply-fix real', false, e.message); }

  // T5: path traversal returns 403
  try {
    const r = await post(port, '/api/security/apply-fix', {
      violation: { file: '../../etc/passwd', line: 1, rule_id: 'TEST' },
      fix: { after: 'safe' },
    });
    ok('T5: path traversal blocked (403)', r.status === 403 && r.body.error === 'apply_fix_path_traversal_blocked',
       'status=' + r.status + ' error=' + r.body.error);
  } catch(e) { ok('T5: path traversal 403', false, e.message); }

  // T6: missing file returns 404
  try {
    const r = await post(port, '/api/security/apply-fix', {
      violation: { file: 'does_not_exist.py', line: 1, rule_id: 'TEST' },
      fix: { after: 'x' },
      project_root: FIXTURE_ROOT,
    });
    ok('T6: missing file returns 404', r.status === 404 && r.body.error === 'apply_fix_file_not_found',
       'status=' + r.status + ' error=' + r.body.error);
  } catch(e) { ok('T6: missing file 404', false, e.message); }

  // T7: missing violation fields returns 400
  try {
    const r = await post(port, '/api/security/apply-fix', {
      violation: { file: 'x.py' }, // missing line
      fix: { after: 'y' },
    });
    ok('T7: missing line returns 400', r.status === 400, 'status=' + r.status);
  } catch(e) { ok('T7: missing line 400', false, e.message); }

  // T8: missing fix returns 400
  try {
    const r = await post(port, '/api/security/apply-fix', {
      violation: { file: 'x.py', line: 1, rule_id: 'TEST' },
      // no fix
    });
    ok('T8: missing fix returns 400', r.status === 400, 'status=' + r.status);
  } catch(e) { ok('T8: missing fix 400', false, e.message); }

  console.log('\n--- Static checks ---\n');

  // T9: bundle has button string
  const bundle = fs.readFileSync(path.join(__dirname, 'frontend/assets/vision-core-bundle.js'), 'utf8');
  ok('T9: bundle has APLICAR FIX (PatchEngine)', bundle.includes('APLICAR FIX (PatchEngine)'), '');

  // T10: bundle has apply-fix route
  ok('T10: bundle calls /api/security/apply-fix', bundle.includes('/api/security/apply-fix'), '');

  // T11: server.js has apply-fix route
  const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');
  ok('T11: server.js has /api/security/apply-fix', server.includes('/api/security/apply-fix'), '');

  // T12: server.js has path traversal check
  ok('T12: server.js has traversal check', server.includes('apply_fix_path_traversal_blocked'), '');

  // T13: server.js has backup logic
  ok('T13: server.js has backup_created', server.includes('backup_created'), '');

  // T14: fixture restored to original
  const restored = fs.readFileSync(FIXTURE_FILE, 'utf8');
  ok('T14: fixture restored (API_KEY line = original)', restored.includes('sk-prod-abc123xyz789'), 'line 6: ' + restored.split('\n')[5]);

  console.log('\n=== RESULT:', passed + failed, 'total,', passed, 'PASS,', failed, 'FAIL ===\n');
}

// Start server
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
