import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PATCH_EXECUTION_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-patch-execution-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'pepg-v234-test',
    contract_id: 'sfc-v234-test',
    drill_id: 'drill-v234-test',
    drill_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PATCH_EXECUTION_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_EXECUTION_PHASE_GATE_STATUSES.includes('PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: has PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_EXECUTION_PHASE_GATE_STATUSES.includes('PATCH_EXEC_PHASE_GATE_BLOCKED_CONTRACT')); console.log('  PASS: has PATCH_EXEC_PHASE_GATE_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PATCH_EXECUTION_PHASE_GATE_STATUSES.includes('PATCH_EXEC_PHASE_GATE_READY')); console.log('  PASS: has PATCH_EXEC_PHASE_GATE_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.gate_ready, false); assert.ok(r.errors.some(e => e.includes('PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); assert.equal(r.patch_execution_baseline_ready, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.gate_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.phase_gate_id; const r = build(input); assert.equal(r.gate_ready, false); console.log('  PASS: no phase_gate_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.gate_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.drill_id; const r = build(input); assert.equal(r.gate_ready, false); console.log('  PASS: no drill_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.drill_ready = false; const r = build(input); assert.equal(r.gate_ready, false); assert.ok(r.errors.some(e => e.startsWith('PATCH_EXEC_PHASE_GATE_BLOCKED_CONTRACT'))); console.log('  PASS: drill_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.gate_ready, false); assert.ok(r.errors.some(e => e.startsWith('PATCH_EXEC_PHASE_GATE_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.gate_ready, true); console.log('  PASS: valid -> PATCH_EXEC_PHASE_GATE_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v234.0'); console.log('  PASS: schema_version=v234.0'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_id); assert.ok(r.contract_id); assert.ok(r.drill_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.phase_checks)); assert.ok(r.phase_checks.length > 0); console.log('  PASS: phase_checks non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.check_count, r.phase_checks.length); console.log('  PASS: check_count matches phase_checks.length'); },
  () => { const r = build(validInput()); assert.equal(r.phase_passed, false); console.log('  PASS: phase_passed=false by default'); },
  () => { const r = build(validInput()); assert.equal(r.patch_execution_baseline_ready, false); console.log('  PASS: patch_execution_baseline_ready=false by default'); },
  () => { const r = build(validInput()); assert.ok(r.gate_hash && r.gate_hash.length === 64); console.log('  PASS: gate_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_patch_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const r = build(validInput()); assert.ok(r.check_count >= 14, `expected >= 14 checks, got ${r.check_count}`); console.log('  PASS: default phase_checks >= 14 (covers V225-V233)'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('patch_execution_baseline_ready')); console.log('  PASS: render: contains patch_execution_baseline_ready'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_patch_execution_allowed')); console.log('  PASS: render: contains real_patch_execution_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.real_patch_execution_allowed, false);
      assert.equal(r.production_touched, false);
      assert.equal(r.phase_passed, false);
      assert.equal(r.patch_execution_baseline_ready, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-patch-execution-phase-gate tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
