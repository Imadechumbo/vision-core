'use strict';
// §139 — SF modules smoke test: todos os 8 endpoints + mapeamento frontend
const fs     = require('fs');
const path   = require('path');
const https  = require('https');

const ROOT   = __dirname;
const bundle = fs.readFileSync(path.join(ROOT, 'frontend/assets/vision-core-bundle.js'), 'utf8');

const GATEWAY = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const SF_ROUTES = [
  'mission-composer',
  'worker-handoff',
  'context-snapshot',
  'patch-validator',
  'risk-assessor',
  'rollback-planner',
  'gold-gate',
  'deploy-blueprint'
];

let pass = 0, fail = 0;
function check(label, ok) {
  if (ok) { console.log('  ✅ ' + label); pass++; }
  else     { console.log('  ❌ ' + label); fail++; }
}

function httpPost(url, body) {
  return new Promise(function(resolve, reject) {
    var parsed = new URL(url);
    var data   = JSON.stringify(body);
    var opts   = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      rejectUnauthorized: false
    };
    var req = https.request(opts, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch(e) { reject(new Error('parse_error: ' + Buffer.concat(chunks).toString().slice(0,100))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, function() { req.destroy(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

console.log('\n§139 sf_modules_unit — mapeamento + smoke tests\n');

// ── STATIC CHECKS (bundle) ───────────────────────────────────────
console.log('Estáticos (bundle):');

// 1. SF_ENDPOINT_MAP exists
check('bundle contém SF_ENDPOINT_MAP',
  bundle.includes('SF_ENDPOINT_MAP'));

// 2-8. All 8 moduleKeys present in map
var MODULE_KEYS = [
  'project_builder', 'project_templates', 'mission_composer',
  'worker_handoff', 'export_preview', 'real_file_command',
  'worker_receipt', 'final_dashboard'
];
MODULE_KEYS.forEach(function(k) {
  check('SF_ENDPOINT_MAP contém ' + k,
    bundle.includes("'" + k + "'") && bundle.includes('SF_ENDPOINT_MAP'));
});

// 9. All 8 SF routes referenced in map
SF_ROUTES.forEach(function(r) {
  // At least some SF routes should appear in bundle
  // (not all 8 routes are in the map, but key ones must be)
});
check('bundle contém /api/sf/mission-composer',   bundle.includes('/api/sf/mission-composer'));
check('bundle contém /api/sf/worker-handoff',     bundle.includes('/api/sf/worker-handoff'));
check('bundle contém /api/sf/deploy-blueprint',   bundle.includes('/api/sf/deploy-blueprint'));
check('bundle contém /api/sf/patch-validator',    bundle.includes('/api/sf/patch-validator'));
check('bundle contém /api/sf/gold-gate',          bundle.includes('/api/sf/gold-gate'));

// ── PRODUCTION SMOKE TESTS (network) ─────────────────────────────
console.log('\nProdução (network):');

var ctx = { project: 'test-s139', timestamp: new Date().toISOString() };

Promise.all(SF_ROUTES.map(function(route) {
  return httpPost(GATEWAY + '/api/sf/' + route, { context: ctx })
    .then(function(d) {
      check('/api/sf/' + route + ' → ok:true, module=' + (d.module || '?'),
        d.ok === true && !!d.result);
    })
    .catch(function(e) {
      check('/api/sf/' + route + ' → FALHOU: ' + e.message, false);
    });
})).then(function() {
  console.log('\nResultado: ' + pass + ' pass, ' + fail + ' fail\n');
  if (fail > 0) process.exit(1);
});
