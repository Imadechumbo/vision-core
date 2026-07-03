/**
 * §132 — Pipeline E2E unit tests
 */
'use strict';
const fs   = require('fs');
const path = require('path');
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

console.log('=== §132 E2E Pipeline unit tests ===\n');

// 1. Fixture exists
test('_fixture_stress/ dir existe', () => {
  const p = path.join(ROOT, '_fixture_stress');
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) return 'não encontrado';
  return true;
});

const L_FILES = ['src/level1_syntax.py','src/level2_logic.py','src/level3_security.py','src/level4_runtime.py'];
for (const f of L_FILES) {
  test(`_fixture_stress/${f} existe`, () => {
    const p = path.join(ROOT, '_fixture_stress', f);
    if (!fs.existsSync(p)) return 'não encontrado';
    const content = fs.readFileSync(p, 'utf8');
    if (content.length < 100) return `muito pequeno: ${content.length} bytes`;
    return true;
  });
}

// 5. D7 evidence exists
const evidencePath = path.join(ROOT, '_s132_PASSGOLD_evidence.json');
test('_s132_PASSGOLD_evidence.json existe', () => {
  if (!fs.existsSync(evidencePath)) return 'não encontrado';
  return true;
});

let d = null;
try {
  const content = fs.readFileSync(evidencePath, 'utf8');
  const idx = content.indexOf('{');
  d = JSON.parse(content.slice(idx));
} catch (e) {
  console.log(`  FAIL: parsing evidence — ${e.message}`);
  failed++;
}

if (d) {
  test('result === PASS', () => {
    if (d.result !== 'PASS') return `got: ${d.result}`;
    return true;
  });

  test('D0-D7 todos executados', () => {
    const layers = d.layers_executed || [];
    const expected = ['D0','D1','D2','D3','D4','D5','D6','D7'];
    const missing = expected.filter(l => !layers.includes(l));
    if (missing.length > 0) return `faltam: ${missing.join(',')}`;
    return true;
  });

  test('pass_gold_candidate === true', () => {
    if (d.pass_gold_candidate !== true) return `got: ${d.pass_gold_candidate}`;
    return true;
  });

  test('failed_gates é array vazio', () => {
    const fg = d.failed_gates;
    if (!Array.isArray(fg) || fg.length > 0) return `got: ${JSON.stringify(fg)}`;
    return true;
  });

  test('e2e_runtime_status === E2E_RUNTIME_READY', () => {
    if (d.e2e_runtime_status !== 'E2E_RUNTIME_READY') return `got: ${d.e2e_runtime_status}`;
    return true;
  });

  test('go_core_receipt_valid === true', () => {
    if (d.go_core_receipt_valid !== true) return `got: ${d.go_core_receipt_valid}`;
    return true;
  });

  test('pass_gold_authority_binding_valid === true', () => {
    if (d.pass_gold_authority_binding_valid !== true) return `got: ${d.pass_gold_authority_binding_valid}`;
    return true;
  });

  test('runtime_evidence_ready === true', () => {
    if (d.runtime_evidence_ready !== true) return `got: ${d.runtime_evidence_ready}`;
    return true;
  });

  test('e2e_evidence_source === go-core', () => {
    if (d.e2e_evidence_source !== 'go-core') return `got: ${d.e2e_evidence_source}`;
    return true;
  });

  test('e2e_evidence_receipt_id presente', () => {
    if (!d.e2e_evidence_receipt_id) return 'null';
    return true;
  });
}

// Script + fixture zip
test('bin/run-piharness-staging.sh existe', () => {
  const p = path.join(ROOT, 'bin', 'run-piharness-staging.sh');
  if (!fs.existsSync(p)) return 'não encontrado';
  return true;
});

test('_fixture_stress.zip existe', () => {
  const p = path.join(ROOT, '_fixture_stress.zip');
  if (!fs.existsSync(p)) return 'não encontrado';
  return true;
});

test('_deploy98_eb.py existe', () => {
  const p = path.join(ROOT, '_deploy98_eb.py');
  if (!fs.existsSync(p)) return 'não encontrado';
  return true;
});

// AEGIS dirSkip fix in go-core
test('go-core secrets.go tem _fixture_stress em dirSkip', () => {
  const p = path.join(ROOT, 'go-core', 'internal', 'security', 'secrets', 'secrets.go');
  if (!fs.existsSync(p)) return 'arquivo não encontrado';
  const content = fs.readFileSync(p, 'utf8');
  if (!content.includes('_fixture_stress')) return 'não encontrado no código';
  return true;
});

console.log(`\n=== ${passed + failed} total: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
