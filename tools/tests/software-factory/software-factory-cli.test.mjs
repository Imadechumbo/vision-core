import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_CLI_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-cli.mjs';

function validInput() {
  return {
    cli_id: 'cli-v219-test',
    contract_id: 'sfc-v219-test',
    orchestrator_ready: true,
    scope_validated: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_CLI_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_CLI_STATUSES.includes('CLI_BLOCKED_INPUT')); console.log('  PASS: has CLI_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_CLI_STATUSES.includes('CLI_BLOCKED_CONTRACT')); console.log('  PASS: has CLI_BLOCKED_CONTRACT'); },
  () => { assert.ok(SOFTWARE_FACTORY_CLI_STATUSES.includes('CLI_READY')); console.log('  PASS: has CLI_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.cli_ready, false); assert.ok(r.errors.some(e => e.includes('CLI_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.cli_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.cli_id; const r = build(input); assert.equal(r.cli_ready, false); console.log('  PASS: no cli_id -> BLOCKED_INPUT'); },
  () => { const input = validInput(); delete input.contract_id; const r = build(input); assert.equal(r.cli_ready, false); console.log('  PASS: no contract_id -> BLOCKED_INPUT'); },

  () => { const input = validInput(); input.orchestrator_ready = false; const r = build(input); assert.equal(r.cli_ready, false); assert.ok(r.errors.some(e => e.startsWith('CLI_BLOCKED_CONTRACT'))); console.log('  PASS: orchestrator_ready=false -> BLOCKED_CONTRACT'); },
  () => { const input = validInput(); input.scope_validated = false; const r = build(input); assert.equal(r.cli_ready, false); assert.ok(r.errors.some(e => e.startsWith('CLI_BLOCKED_CONTRACT'))); console.log('  PASS: scope_validated=false -> BLOCKED_CONTRACT'); },

  () => { const r = build(validInput()); assert.equal(r.cli_ready, true); console.log('  PASS: valid -> CLI_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v219.0'); console.log('  PASS: schema_version=v219.0'); },
  () => { const r = build(validInput()); assert.ok(r.cli_id); assert.ok(r.contract_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.ok(Array.isArray(r.commands)); assert.ok(r.commands.length > 0); console.log('  PASS: commands non-empty'); },
  () => { const r = build(validInput()); assert.equal(r.command_count, r.commands.length); console.log('  PASS: command_count matches commands.length'); },
  () => { const r = build(validInput()); assert.ok(r.cli_hash && r.cli_hash.length === 64); console.log('  PASS: cli_hash 64 chars'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },
  () => { const input = validInput(); input.commands = ['run', 'test']; const r = build(input); assert.equal(r.command_count, 2); assert.equal(r.commands[0].name, 'run'); console.log('  PASS: custom commands used when provided'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('command_count')); console.log('  PASS: render: contains command_count'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) { assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-cli tests ===\n');
console.log('--- all tests ---');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
