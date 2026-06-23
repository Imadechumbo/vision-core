/**
 * §133 — Scanner real unit tests
 * Valida que o Go Core escaneia arquivos .py e detecta violations L3.
 */
'use strict';
const fs     = require('fs');
const path   = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname);

let passed = 0;
let failed = 0;

function test(desc, fn) {
  try {
    const r = fn();
    if (r === true) { console.log(`  PASS: ${desc}`); passed++; }
    else { console.log(`  FAIL: ${desc} — ${r}`); failed++; }
  } catch (e) {
    console.log(`  FAIL: ${desc} — threw: ${e.message}`);
    failed++;
  }
}

console.log('=== §133 Scanner Real unit tests ===\n');

// 1. Binary exists
test('bin/vision-core.exe existe', () => {
  if (!fs.existsSync(path.join(ROOT, 'bin', 'vision-core.exe'))) return 'não encontrado';
  return true;
});

// 2. Run Go binary against fixture and capture output
let fixtureResult = null;
const fixturePath = path.join(ROOT, '_fixture_stress');
test('fixture _fixture_stress/ existe', () => {
  if (!fs.existsSync(fixturePath)) return 'não encontrado';
  return true;
});

const goRun = spawnSync(
  path.join(ROOT, 'bin', 'vision-core.exe'),
  ['mission', '-input', 's133-unit-test', '-root', fixturePath],
  { timeout: 60000, encoding: 'utf8' }
);

if (goRun.error) {
  console.log(`  FAIL: Go binary error: ${goRun.error.message}`);
  failed++;
} else {
  const out = (goRun.stdout || '') + (goRun.stderr || '');
  const idx = out.indexOf('{');
  if (idx >= 0) {
    try {
      fixtureResult = JSON.parse(out.slice(idx));
    } catch (e) {
      console.log(`  FAIL: parsing Go output — ${e.message}`);
      failed++;
    }
  }
}

if (fixtureResult) {
  // 3. Scanner scanned > 0 files
  test('scanner: scanned N>0 files no fixture', () => {
    const scanStep = fixtureResult.step_results?.find(s => s.step === 'scanner');
    if (!scanStep) return 'scanner step ausente';
    const msg = scanStep.message || '';
    const match = msg.match(/scanned (\d+) files/);
    if (!match) return `mensagem inesperada: ${msg}`;
    const n = parseInt(match[1]);
    if (n <= 0) return `got: ${n} files (esperava > 0)`;
    return true;
  });

  // 4. security_total_violations > 0
  test('security_total_violations > 0 no fixture', () => {
    const total = fixtureResult.security_total_violations;
    if (!total || total <= 0) return `got: ${total}`;
    return true;
  });

  // 5. security_blocking_total > 0
  test('security_blocking_total > 0 no fixture (L3 violations)', () => {
    const blocking = fixtureResult.security_blocking_total;
    if (!blocking || blocking <= 0) return `got: ${blocking}`;
    return true;
  });

  // 6. pass_secure = false (blocking violations exist)
  test('pass_secure === false no fixture', () => {
    if (fixtureResult.pass_secure !== false) return `got: ${fixtureResult.pass_secure}`;
    return true;
  });

  // 7. AEGIS_SECRET_010 violation present
  test('AEGIS_SECRET_010 detectado em level3_security.py', () => {
    const violations = fixtureResult.security_violations || [];
    const found = violations.find(v =>
      v.rule_id === 'AEGIS_SECRET_010' && v.file && v.file.includes('level3_security')
    );
    if (!found) return `AEGIS_SECRET_010 não encontrado (violations: ${violations.map(v=>v.rule_id).join(',')})`;
    return true;
  });

  // 8. evidence_receipt presente mesmo com violations
  test('evidence_receipt presente mesmo com pass_gold:false', () => {
    if (!fixtureResult.evidence_receipt) return 'evidence_receipt ausente';
    if (!fixtureResult.evidence_receipt.id) return 'evidence_receipt.id ausente';
    if (fixtureResult.evidence_receipt.source !== 'go-core') return `source: ${fixtureResult.evidence_receipt.source}`;
    return true;
  });
}

// 9. Main project still passes
let mainResult = null;
const mainRun = spawnSync(
  path.join(ROOT, 'bin', 'vision-core.exe'),
  ['mission', '-input', 's133-main-verify', '-root', ROOT],
  { timeout: 60000, encoding: 'utf8' }
);
if (!mainRun.error) {
  const out = (mainRun.stdout || '') + (mainRun.stderr || '');
  const idx = out.indexOf('{');
  if (idx >= 0) {
    try { mainResult = JSON.parse(out.slice(idx)); } catch (_) {}
  }
}

if (mainResult) {
  test('main project: security_score === 100 (fixture excluído)', () => {
    if (mainResult.security_score !== 100) return `got: ${mainResult.security_score}`;
    return true;
  });

  test('main project: pass_gold === true', () => {
    if (mainResult.pass_gold !== true) return `got: ${mainResult.pass_gold}`;
    return true;
  });

  test('main project: security_blocking_total === 0', () => {
    if (mainResult.security_blocking_total !== 0) return `got: ${mainResult.security_blocking_total}`;
    return true;
  });

  test('main project: scanner conta >100 files', () => {
    const scanStep = mainResult.step_results?.find(s => s.step === 'scanner');
    const msg = scanStep?.message || '';
    const match = msg.match(/scanned (\d+) files/);
    if (!match) return 'mensagem ausente';
    if (parseInt(match[1]) < 100) return `got: ${match[1]} files`;
    return true;
  });
}

// 10. D7 evidence
const d7Path = path.join(ROOT, '_s133_d7_result.json');
test('_s133_d7_result.json existe', () => {
  if (!fs.existsSync(d7Path)) return 'não encontrado';
  return true;
});

let d7 = null;
if (fs.existsSync(d7Path)) {
  const content = fs.readFileSync(d7Path, 'utf8');
  const idx = content.indexOf('{');
  try { d7 = JSON.parse(content.slice(idx)); } catch (_) {}
}

if (d7) {
  test('D7: pass_gold_candidate === true (main project unaffected)', () => {
    if (d7.pass_gold_candidate !== true) return `got: ${d7.pass_gold_candidate}`;
    return true;
  });
}

// 11. Go source has path != root fix
test('secrets.go tem path != root guard', () => {
  const p = path.join(ROOT, 'go-core', 'internal', 'security', 'secrets', 'secrets.go');
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('path != root')) return 'guard ausente';
  return true;
});

test('scanner.go tem .py em jsExts', () => {
  const p = path.join(ROOT, 'go-core', 'internal', 'scanner', 'scanner.go');
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('".py"')) return '.py não encontrado';
  return true;
});

console.log(`\n=== ${passed + failed} total: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
