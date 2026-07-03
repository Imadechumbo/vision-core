/**
 * §131 — PASS GOLD unit tests
 * Valida que o evidence JSON confirma pass_gold_candidate:true com todas as gates.
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
    if (r === true) {
      console.log(`  PASS: ${desc}`);
      passed++;
    } else {
      console.log(`  FAIL: ${desc} — ${r}`);
      failed++;
    }
  } catch (e) {
    console.log(`  FAIL: ${desc} — threw: ${e.message}`);
    failed++;
  }
}

console.log('=== §131 PASS GOLD unit tests ===\n');

// Load evidence
const evidencePath = path.join(ROOT, '_s131_PASSGOLD_evidence.json');
test('_s131_PASSGOLD_evidence.json existe', () => {
  if (!fs.existsSync(evidencePath)) return 'arquivo não encontrado';
  return true;
});

let d = null;
try {
  const content = fs.readFileSync(evidencePath, 'utf8');
  const idx = content.indexOf('{');
  d = JSON.parse(content.slice(idx));
} catch (e) {
  console.log(`  FAIL: parsing evidence JSON — ${e.message}`);
  failed++;
}

if (d) {
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

  test('backend_not_stub === true nos gates', () => {
    const v = d.gates?.backend_not_stub;
    if (v !== true) return `got: ${v}`;
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

  test('e2e_runtime_status === E2E_RUNTIME_READY', () => {
    if (d.e2e_runtime_status !== 'E2E_RUNTIME_READY') return `got: ${d.e2e_runtime_status}`;
    return true;
  });

  test('evidence_source === go-core', () => {
    const src = d.evidence_source || d.e2e_evidence_source;
    if (src !== 'go-core') return `got: ${src}`;
    return true;
  });

  test('run_live_pass_gold === true', () => {
    if (d.run_live_pass_gold !== true) return `got: ${d.run_live_pass_gold}`;
    return true;
  });

  test('run_live_status === ok', () => {
    if (d.run_live_status !== 'ok') return `got: ${d.run_live_status}`;
    return true;
  });
}

// Script wrapper
test('bin/run-piharness-staging.sh existe', () => {
  const p = path.join(ROOT, 'bin', 'run-piharness-staging.sh');
  if (!fs.existsSync(p)) return 'arquivo não encontrado';
  return true;
});

// Authority contract
test('_s131_authority_contract.json existe', () => {
  const p = path.join(ROOT, '_s131_authority_contract.json');
  if (!fs.existsSync(p)) return 'arquivo não encontrado';
  return true;
});

console.log(`\n=== ${passed + failed} total: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
