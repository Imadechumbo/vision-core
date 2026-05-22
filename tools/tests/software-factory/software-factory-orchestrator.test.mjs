import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_ORCHESTRATOR_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-orchestrator.mjs';

function validInput() {
  return {
    orchestrator_id: 'orch-v218-test',
    contract_id: 'sfc-v218-test',
    report_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ORCHESTRATOR_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_ORCHESTRATOR_STATUSES.includes('ORCHESTRATOR_BLOCKED_INPUT')); console.log('  PASS: has ORCHESTRATOR_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ORCHESTRATOR_STATUSES.includes('ORCHESTRATOR_BLOCKED_CONTRACT')); console.log('  PASS: has ORCHESTRATOR_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ORCHESTRATOR_STATUSES.includes('ORCHESTRATOR_READY')); console.log('  PASS: has ORCHESTRATOR_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.orchestrator_ready, false); assert.ok(r.errors.some(e => e.includes('ORCHESTRATOR_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.orchestrator_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.orchestrator_id; const r = build(input); assert.equal(r.orchestrator_ready, false); console.log('  PASS: no orchestrator_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.orchestrator_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.report_ready = false; const r = build(input); assert.equal(r.orchestrator_ready, false); assert.ok(r.errors.some(e => e.startsWith('ORCHESTRATOR_BLOCKED_CONTRACT'))); console.log('  PASS: report_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.orchestrator_ready, false); assert.ok(r.errors.some(e => e.startsWith('ORCHESTRATOR_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.orchestrator_ready, true); console.log('  PASS: valid -> ORCHESTRATOR_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v218.0'); console.log('  PASS: schema_version=v218.0'); },
  () => { const r = build(validInput()); assert.ok(r.orchestrator_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.pipeline_stages)); assert.ok(r.pipeline_stages.length > 0); console.log('  PASS: pipeline_stages non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.stage_count, r.pipeline_stages.length); console.log('  PASS: stage_count matches pipeline_stages.length'); },
  () => { const r = build(validInput()); assert.ok(r.orchestrator_hash && r.orchestrator_hash.length === 64); console.log('  PASS: orchestrator_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const input = validInput(); input.pipeline_stages = ['init', 'run', 'done']; const r = build(input); assert.equal(r.stage_count, 3); assert.equal(r.pipeline_stages[0].name, 'init'); console.log('  PASS: custom pipeline_stages used when provided'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('stage_count')); console.log('  PASS: render: contains stage_count'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) { assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-orchestrator tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
