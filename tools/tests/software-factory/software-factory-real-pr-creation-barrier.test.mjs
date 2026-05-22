import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_CREATION_BARRIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-creation-barrier.mjs';

function validInput() {
  return {
    barrier_id: 'rpcb-v239-test',
    dry_run_id: 'dryrun-v239-test',
    controlled_pr_dry_run_ready: true,
    pr_creation_requested: true,
    pr_creation_authorized: true,
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_CREATION_BARRIER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_BARRIER_STATUSES.includes('PR_CREATION_BARRIER_BLOCKED_INPUT')); console.log('  PASS: has PR_CREATION_BARRIER_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_BARRIER_STATUSES.includes('PR_CREATION_BARRIER_BLOCKED_DRY_RUN')); console.log('  PASS: has PR_CREATION_BARRIER_BLOCKED_DRY_RUN'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_BARRIER_STATUSES.includes('PR_CREATION_BARRIER_DENIED')); console.log('  PASS: has PR_CREATION_BARRIER_DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_BARRIER_STATUSES.includes('PR_CREATION_BARRIER_READY')); console.log('  PASS: has PR_CREATION_BARRIER_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.pr_creation_barrier_ready, false); assert.ok(r.errors.some(e => e.includes('PR_CREATION_BARRIER_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.release_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.pr_creation_barrier_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.barrier_id; const r = build(i); assert.equal(r.pr_creation_barrier_ready, false); console.log('  PASS: no barrier_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.dry_run_id; const r = build(i); assert.equal(r.pr_creation_barrier_ready, false); console.log('  PASS: no dry_run_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.controlled_pr_dry_run_ready = false; const r = build(i); assert.equal(r.pr_creation_barrier_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_CREATION_BARRIER_BLOCKED_DRY_RUN'))); console.log('  PASS: dry_run not ready -> BLOCKED_DRY_RUN'); },
  () => { const i = validInput(); i.pr_creation_requested = false; const r = build(i); assert.equal(r.pr_creation_barrier_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_CREATION_BARRIER_DENIED'))); console.log('  PASS: not requested -> DENIED'); },
  () => { const i = validInput(); i.pr_creation_authorized = false; const r = build(i); assert.equal(r.pr_creation_barrier_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_CREATION_BARRIER_DENIED'))); console.log('  PASS: not authorized -> DENIED'); },

  () => { const r = build(validInput()); assert.equal(r.pr_creation_barrier_ready, true); console.log('  PASS: valid -> PR_CREATION_BARRIER_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v239.0'); console.log('  PASS: schema_version=v239.0'); },
  () => { const r = build(validInput()); assert.ok(r.barrier_id); assert.ok(r.dry_run_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.next_phase, 'V240_SUPERVISED_PR_CREATION_DRILL'); console.log('  PASS: next_phase set'); },
  () => { const r = build(validInput()); assert.ok(r.final_message && r.final_message.includes('V240')); console.log('  PASS: final_message contains V240'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_creation_allowed, false); console.log('  PASS: real_pr_creation_allowed=false even when READY'); },
  () => { const r = build(validInput()); assert.ok(r.barrier_hash && r.barrier_hash.length === 64); console.log('  PASS: barrier_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.barrier_hash, r2.barrier_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('final_message')); console.log('  PASS: render: contains final_message'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.real_pr_creation_allowed, false);
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.production_touched, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-real-pr-creation-barrier tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
