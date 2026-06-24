'use strict';
// §140 — v582-sf-modules.js BACKEND_URL fallback fix
const fs   = require('fs');
const path = require('path');

const ROOT   = __dirname;
const v582   = fs.readFileSync(path.join(ROOT, 'frontend/assets/v582-sf-modules.js'), 'utf8');
const bundle = fs.readFileSync(path.join(ROOT, 'frontend/assets/vision-core-bundle.js'), 'utf8');

let pass = 0, fail = 0;
function check(label, ok) {
  if (ok) { console.log('  ✅ ' + label); pass++; }
  else     { console.log('  ❌ ' + label); fail++; }
}

console.log('\n§140 sf_url_unit — BACKEND_URL fallback fix\n');

// 1. v582 contém gateway hardcoded
check('v582-sf-modules.js contém weiganlight (gateway hardcoded)',
  v582.includes('visioncore-api-gateway.weiganlight.workers.dev'));

// 2. v582 NÃO contém "|| ''" na workerUrl
// Verifica que o fallback vazio foi removido
check("v582-sf-modules.js NÃO contém fallback vazio \"|| ''\" na workerUrl",
  !v582.includes("|| ''"));

// 3. bundle principal BACKEND_URL aponta para weiganlight
check('bundle vision-core-bundle.js contém BACKEND_URL weiganlight',
  bundle.includes('visioncore-api-gateway.weiganlight.workers.dev'));

// 4. workerUrl function exists in v582
check('v582-sf-modules.js contém função workerUrl',
  v582.includes('function workerUrl'));

// 5. postSF function exists and uses workerUrl
check('v582-sf-modules.js: postSF usa workerUrl',
  v582.includes('workerUrl(endpoint)') || v582.includes('workerUrl('));

console.log('\nResultado: ' + pass + ' pass, ' + fail + ' fail\n');
if (fail > 0) process.exit(1);
