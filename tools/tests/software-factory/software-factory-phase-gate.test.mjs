import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'pg-v224-test',
    contract_id: 'sfc-v224-test',
    dry_run_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PHASE_GATE_STATUSES.includes('PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: has PHASE_GATE_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PHASE_GATE_STATUSES.includes('PHASE_GATE_BLOCKED_CONTRACT')); console.log('  PASS: has PHASE_GATE_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PHASE_GATE_STATUSES.includes('PHASE_GATE_READY')); console.log('  PASS: has PHASE_GATE_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.gate_ready, false); assert.ok(r.errors.some(e => e.includes('PHASE_GATE_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.software_factory_baseline_ready, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.gate_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.phase_gate_id; const r = build(input); assert.equal(r.gate_ready, false); console.log('  PASS: no phase_gate_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.gate_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.dry_run_ready = false; const r = build(input); assert.equal(r.gate_ready, false); assert.ok(r.errors.some(e => e.startsWith('PHASE_GATE_BLOCKED_CONTRACT'))); console.log('  PASS: dry_run_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.gate_ready, false); assert.ok(r.errors.some(e => e.startsWith('PHASE_GATE_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.gate_ready, true); console.log('  PASS: valid -> PHASE_GATE_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v224.0'); console.log('  PASS: schema_version=v224.0'); },
  () => { const r = build(validInput()); assert.ok(r.phase_gate_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.phase_checks)); assert.ok(r.phase_checks.length > 0); console.log('  PASS: phase_checks non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.check_count, r.phase_checks.length); console.log('  PASS: check_count matches phase_checks.length'); },
  () => { const r = build(validInput()); assert.equal(r.phase_passed, false); console.log('  PASS: phase_passed=false by default'); },
  () => { const r = build(validInput()); assert.equal(r.software_factory_baseline_ready, false); console.log('  PASS: software_factory_baseline_ready=false by default'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_creation_allowed, false); console.log('  PASS: real_pr_creation_allowed=false'); },
  () => { const r = build(validInput()); assert.ok(r.gate_hash && r.gate_hash.length === 64); console.log('  PASS: gate_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const r = build(validInput()); assert.ok(r.check_count >= 20, `expected >= 20 checks, got ${r.check_count}`); console.log('  PASS: default phase_checks >= 20 (covers V201-V223)'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('software_factory_baseline_ready')); console.log('  PASS: render: contains software_factory_baseline_ready'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.real_pr_creation_allowed, false);
      assert.equal(r.software_factory_baseline_ready, false);
      assert.equal(r.phase_passed, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-phase-gate tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
