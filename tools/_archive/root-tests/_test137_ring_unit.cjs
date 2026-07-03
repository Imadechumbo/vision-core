'use strict';
// §137 — ring central CORE fixo + OK ao terminar
const fs   = require('fs');
const path = require('path');

const ROOT   = __dirname;
const html   = fs.readFileSync(path.join(ROOT, 'frontend/index.html'), 'utf8');
const bundle = fs.readFileSync(path.join(ROOT, 'frontend/assets/vision-core-bundle.js'), 'utf8');

let pass = 0, fail = 0;

function check(label, ok) {
  if (ok) { console.log('  ✅ ' + label); pass++; }
  else     { console.log('  ❌ ' + label); fail++; }
}

console.log('\n§137 ring_unit — CORE fixo + OK ao terminar\n');

// 1. index.html: mcCoreStatus contém CORE
check('index.html mcCoreStatus="CORE"',
  /id="mcCoreStatus">CORE</.test(html));

// 2. index.html: NÃO contém AGUARDA em mcCoreStatus
check('index.html mcCoreStatus NÃO "AGUARDA"',
  !/id="mcCoreStatus">AGUARDA</.test(html));

// 3. bundle NÃO contém #s136-ring
check('bundle NÃO contém #s136-ring',
  !bundle.includes('#s136-ring'));

// 4. bundle NÃO contém s136InitRing
check('bundle NÃO contém s136InitRing',
  !bundle.includes('s136InitRing'));

// 5. bundle contém s137spin
check('bundle contém s137spin',
  bundle.includes('s137spin'));

// 6. bundle contém s137-active
check('bundle contém s137-active',
  bundle.includes('s137-active'));

// 7. bundle contém "OK" perto de mcCoreStatus (flash success)
check('bundle contém "OK" + mcCoreStatus (flash success)',
  bundle.includes("'OK'") && bundle.includes('mcCoreStatus'));

// 8. bundle: stopRing passa success flag ao stopMissionAnimation
check('bundle s136StopRing(result && result.ok)',
  bundle.includes('s136StopRing(result && result.ok)'));

// 9. bundle: error handler passa false
check('bundle s136StopRing(false) no error handler',
  bundle.includes('s136StopRing(false)'));

console.log('\nResultado: ' + pass + ' pass, ' + fail + ' fail\n');
if (fail > 0) process.exit(1);
