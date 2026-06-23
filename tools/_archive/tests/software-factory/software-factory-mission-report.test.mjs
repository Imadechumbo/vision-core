import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_MISSION_REPORT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-mission-report.mjs';

function validInput() {
  return {
    report_id: 'mr-v217-test',
    contract_id: 'sfc-v217-test',
    mission_type: 'feature',
    gate_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_MISSION_REPORT_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_MISSION_REPORT_STATUSES.includes('MISSION_REPORT_BLOCKED_INPUT')); console.log('  PASS: has MISSION_REPORT_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_MISSION_REPORT_STATUSES.includes('MISSION_REPORT_BLOCKED_CONTRACT')); console.log('  PASS: has MISSION_REPORT_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_MISSION_REPORT_STATUSES.includes('MISSION_REPORT_READY')); console.log('  PASS: has MISSION_REPORT_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.report_ready, false); assert.ok(r.errors.some(e => e.includes('MISSION_REPORT_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.report_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.report_id; const r = build(input); assert.equal(r.report_ready, false); console.log('  PASS: no report_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.report_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.mission_type; const r = build(input); assert.equal(r.report_ready, false); console.log('  PASS: no mission_type -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.gate_ready = false; const r = build(input); assert.equal(r.report_ready, false); assert.ok(r.errors.some(e => e.startsWith('MISSION_REPORT_BLOCKED_CONTRACT'))); console.log('  PASS: gate_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.report_ready, false); assert.ok(r.errors.some(e => e.startsWith('MISSION_REPORT_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.report_ready, true); console.log('  PASS: valid -> MISSION_REPORT_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v217.0'); console.log('  PASS: schema_version=v217.0'); },
  () => { const r = build(validInput()); assert.ok(r.report_id); assert.ok(r.contract_id); assert.equal(r.mission_type, 'feature'); console.log('  PASS: ids and mission_type set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.sections)); assert.ok(r.sections.length > 0); console.log('  PASS: sections non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.section_count, r.sections.length); console.log('  PASS: section_count matches sections.length'); },
  () => { const r = build(validInput()); assert.ok(r.report_hash && r.report_hash.length === 64); console.log('  PASS: report_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('mission_type')); console.log('  PASS: render: contains mission_type'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) { assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-mission-report tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
